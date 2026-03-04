use tokio::sync::mpsc;

use super::{App, AppCommand};
use crate::components;
use crate::config;

/// Percent-encode a string for use in URL query parameters.
fn url_encode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(b as char);
            }
            _ => {
                result.push_str(&format!("%{b:02X}"));
            }
        }
    }
    result
}
use crate::session;
use crate::types;
use crate::views;
use crate::watcher;

impl App {
    /// Extract the project path and name from the first loaded passport.
    /// Returns `None` if no passport is loaded.
    fn passport_path_name(&self) -> Option<(String, String)> {
        let passport = self.passport_view.loaded_passports.get(self.passport_view.selected_passport)?;
        let name = passport
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        let path = self.project_path.to_string_lossy().to_string();
        Some((path, name))
    }
}

#[allow(clippy::too_many_lines)]
pub async fn execute_command(
    app: &mut App,
    cmd: AppCommand,
    watch_tx: &mpsc::UnboundedSender<std::path::PathBuf>,
    watch_handle: &mut Option<tokio::task::JoinHandle<()>>,
) {
    match cmd {
        AppCommand::ToggleWatch => {
            if app.watch_active {
                // Stop watcher
                if let Some(handle) = watch_handle.take() {
                    handle.abort();
                }
                app.watch_active = false;
                app.mode = types::Mode::Scan;
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    "Watch mode stopped.".to_string(),
                ));
            } else {
                // Start watcher
                *watch_handle = Some(watcher::spawn_watcher(
                    app.project_path.clone(),
                    watch_tx.clone(),
                ));
                app.watch_active = true;
                app.mode = types::Mode::Watch;
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    "Watch mode started. Editing files will trigger auto-scan.".to_string(),
                ));
            }
        }
        AppCommand::AutoScan => {
            // Save previous score for regression detection
            let prev_score = app.last_scan.as_ref().map(|s| s.score.total_score);
            app.watch_last_score = prev_score;

            // T904: Check if this auto-scan is a fix validation
            let is_fix_validation = app.pre_fix_score.is_some();
            let fix_old_score = app.pre_fix_score.take();

            let path = app.project_path.to_string_lossy().to_string();
            match app.engine_client.scan(&path).await {
                Ok(result) => {
                    let new_score = result.score.total_score;
                    app.set_scan_result(result);

                    if is_fix_validation {
                        // T904: Fix validation — show delta toast
                        if let Some(old) = fix_old_score {
                            let diff = new_score - old;
                            let msg = format!("Fix verified: Score {old:.0} → {new_score:.0} ({diff:+.0})");
                            if diff > 0.0 {
                                app.toasts.push(
                                    components::toast::ToastKind::Success,
                                    &msg,
                                );
                            } else {
                                app.toasts.push(
                                    components::toast::ToastKind::Warning,
                                    &msg,
                                );
                            }
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                msg,
                            ));
                        }
                    } else {
                        // Regular watch-mode regression detection
                        if let Some(old) = prev_score {
                            let diff = new_score - old;
                            if diff < -5.0 {
                                app.messages.push(types::ChatMessage::new(
                                    types::MessageRole::System,
                                    format!(
                                        "REGRESSION: Score dropped {:.0} → {:.0} ({diff:+.0})",
                                        old, new_score
                                    ),
                                ));
                            } else if diff > 0.0 {
                                app.messages.push(types::ChatMessage::new(
                                    types::MessageRole::System,
                                    format!(
                                        "IMPROVED: Score {:.0} → {:.0} ({diff:+.0})",
                                        old, new_score
                                    ),
                                ));
                            }
                        }
                    }
                }
                Err(e) => {
                    if is_fix_validation {
                        app.toasts.push(
                            components::toast::ToastKind::Warning,
                            "Re-scan failed after fix. Run /scan manually.",
                        );
                    }
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Auto-scan failed: {e}"),
                    ));
                }
            }
        }
        AppCommand::Scan => {
            let path = app.project_path.to_string_lossy().to_string();
            match app.engine_client.scan(&path).await {
                Ok(result) => app.set_scan_result(result),
                Err(e) => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Scan failed: {e}"),
                    ));
                    app.operation_start = None;
                }
            }
        }
        AppCommand::OpenFile(path) => match app.engine_client.read_file(&path).await {
            Ok(content) => app.open_file(&path, content),
            Err(_) => {
                // Fallback: try reading locally
                match tokio::fs::read_to_string(&path).await {
                    Ok(content) => app.open_file(&path, content),
                    Err(e) => {
                        app.messages.push(types::ChatMessage::new(
                            types::MessageRole::System,
                            format!("Cannot open file: {e}"),
                        ));
                    }
                }
            }
        },
        AppCommand::RunCommand(command) => {
            app.add_terminal_line(format!("$ {command}"));
            match app.engine_client.run_command(&command).await {
                Ok(output) => {
                    for line in output.lines() {
                        app.add_terminal_line(line.to_string());
                    }
                }
                Err(e) => {
                    app.add_terminal_line(format!("Error: {e}"));
                }
            }
        }
        AppCommand::Reconnect => {
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                "Reconnecting to engine...".to_string(),
            ));
            match app.engine_client.status().await {
                Ok(status) if status.ready => {
                    app.engine_status = types::EngineConnectionStatus::Connected;
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "Reconnected successfully.".to_string(),
                    ));
                }
                _ => {
                    app.engine_status = types::EngineConnectionStatus::Disconnected;
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "Reconnect failed. Is engine running?".to_string(),
                    ));
                }
            }
        }
        AppCommand::SwitchTheme(name) => {
            crate::theme::init_theme(&name);
            app.messages.push(types::ChatMessage::new(
                types::MessageRole::System,
                format!("Theme switched to: {name}"),
            ));
        }
        AppCommand::SaveSession(name) => {
            let data = app.to_session_data();
            match session::save_session(&data, &name).await {
                Ok(()) => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Session saved: {name}"),
                    ));
                }
                Err(e) => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Save failed: {e}"),
                    ));
                }
            }
        }
        AppCommand::LoadSession(name) => match session::load_session(&name).await {
            Ok(data) => {
                app.load_session_data(data);
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    format!("Session loaded: {name}"),
                ));
            }
            Err(e) => {
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    format!("Load failed: {e}"),
                ));
            }
        },
        AppCommand::Undo(id) => {
            match app.engine_client.undo(id).await {
                Ok(result) => {
                    let msg = result
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Undo applied");
                    app.toasts.push(
                        components::toast::ToastKind::Success,
                        msg.to_string(),
                    );
                    app.push_activity(types::ActivityKind::Fix, "Undo");
                    app.animation.start_checkmark();
                }
                Err(_) => {
                    app.toasts.push(
                        components::toast::ToastKind::Warning,
                        "Nothing to undo",
                    );
                }
            }
        }
        AppCommand::FetchUndoHistory => {
            match app.engine_client.undo_history().await {
                Ok(entries) => {
                    app.undo_history.entries = entries
                        .iter()
                        .filter_map(|v| {
                            Some(components::undo_history::UndoEntry {
                                id: v.get("id")?.as_u64()? as u32,
                                timestamp: v
                                    .get("timestamp")
                                    .and_then(|t| t.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                action: v
                                    .get("action")
                                    .and_then(|a| a.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                status: match v
                                    .get("status")
                                    .and_then(|s| s.as_str())
                                    .unwrap_or("applied")
                                {
                                    "undone" => {
                                        components::undo_history::UndoStatus::Undone
                                    }
                                    "baseline" => {
                                        components::undo_history::UndoStatus::Baseline
                                    }
                                    _ => {
                                        components::undo_history::UndoStatus::Applied
                                    }
                                },
                                score_delta: v
                                    .get("scoreDelta")
                                    .and_then(|d| d.as_f64()),
                            })
                        })
                        .collect();
                    app.undo_history.selected = 0;
                }
                Err(_) => {
                    app.undo_history.entries.clear();
                }
            }
        }
        AppCommand::FetchSuggestions => {
            app.idle_suggestions.fetch_pending = false;
            match app.engine_client.suggestions().await {
                Ok(items) if !items.is_empty() => {
                    if let Some(first) = items.first() {
                        let kind_str = first
                            .get("kind")
                            .and_then(|k| k.as_str())
                            .unwrap_or("tip");
                        let kind = match kind_str {
                            "fix" => components::suggestions::SuggestionKind::Fix,
                            "deadline" => {
                                components::suggestions::SuggestionKind::DeadlineWarning
                            }
                            "score" => {
                                components::suggestions::SuggestionKind::ScoreImprovement
                            }
                            "new" => {
                                components::suggestions::SuggestionKind::NewFeature
                            }
                            _ => components::suggestions::SuggestionKind::Tip,
                        };
                        app.idle_suggestions.current =
                            Some(components::suggestions::Suggestion {
                                kind,
                                text: first
                                    .get("text")
                                    .and_then(|t| t.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                detail: first
                                    .get("detail")
                                    .and_then(|d| d.as_str())
                                    .map(String::from),
                            });
                    }
                }
                _ => {
                    // Engine doesn't have /suggestions or returned empty — use local context
                    let suggestion = build_local_suggestion(app);
                    app.idle_suggestions.current = Some(suggestion);
                }
            }
        }
        // T905: What-If scenario analysis
        AppCommand::WhatIf(scenario) => {
            app.whatif.pending = true;
            let current_score = app
                .last_scan
                .as_ref()
                .map_or(50.0, |s| s.score.total_score);

            match app.engine_client.whatif(&scenario).await {
                Ok(result) => {
                    // Parse engine response
                    let projected = result
                        .get("projectedScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(current_score - 5.0);
                    let obligations: Vec<String> = result
                        .get("newObligations")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect()
                        })
                        .unwrap_or_default();
                    let effort = result
                        .get("effortDays")
                        .and_then(|v| v.as_u64())
                        .map(|d| d as u32);

                    let whatif_result = components::whatif::WhatIfResult {
                        scenario: scenario.clone(),
                        current_score,
                        projected_score: projected,
                        new_obligations: obligations,
                        effort_days: effort,
                    };
                    let msg = components::whatif::format_whatif_message(&whatif_result);
                    app.whatif.result = Some(whatif_result);
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::Assistant,
                        msg,
                    ));
                }
                Err(_) => {
                    app.toasts.push(
                        components::toast::ToastKind::Warning,
                        "What-if requires engine connection",
                    );
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "What-if analysis unavailable — engine not connected.".to_string(),
                    ));
                }
            }
            app.whatif.pending = false;
        }
        // T906: Dry-run mode
        AppCommand::FixDryRun(selected) => {
            match app.engine_client.fix_dry_run(&selected).await {
                Ok(result) => {
                    // Parse dry-run response
                    let changes: Vec<String> = result
                        .get("changes")
                        .and_then(|v| v.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| {
                                    let path = v.get("path")?.as_str()?;
                                    let action = v.get("action")?.as_str().unwrap_or("MODIFY");
                                    let delta = v.get("scoreDelta")?.as_f64().unwrap_or(0.0);
                                    Some(format!("  {path:<40} [{action}]  +{delta:.0} score"))
                                })
                                .collect()
                        })
                        .unwrap_or_default();
                    let predicted = result
                        .get("predictedScore")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0);

                    let current = app
                        .last_scan
                        .as_ref()
                        .map_or(0.0, |s| s.score.total_score);
                    let delta = predicted - current;
                    let mut msg = format!(
                        "Dry-Run Fix Analysis (no files modified)\n\
                         Would modify {} files:\n",
                        changes.len()
                    );
                    for change in &changes {
                        msg.push_str(change);
                        msg.push('\n');
                    }
                    msg.push_str(&format!(
                        "\nPredicted score: {current:.0} -> {predicted:.0} ({delta:+.0})\n\
                         Run /fix to apply."
                    ));

                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::Assistant,
                        msg,
                    ));
                }
                Err(_) => {
                    // Offline: simulate from predicted impact
                    let current = app
                        .last_scan
                        .as_ref()
                        .map_or(0.0, |s| s.score.total_score);
                    let impact = app.fix_view.total_predicted_impact() as f64;
                    let predicted = (current + impact).min(100.0);
                    let msg = format!(
                        "Dry-Run Fix Analysis (offline estimate)\n\
                         Selected fixes: {}\n\
                         Predicted score: {current:.0} -> {predicted:.0} (+{impact:.0})\n\n\
                         Note: Detailed file changes unavailable offline.\n\
                         Run /fix to apply.",
                        selected.len()
                    );
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::Assistant,
                        msg,
                    ));
                    app.toasts.push(
                        components::toast::ToastKind::Info,
                        "Dry-run estimate (offline)",
                    );
                }
            }
        }
        AppCommand::ApplyFixes => {
            use views::fix::{apply_fix_to_file, FixItemStatus};

            let old_score = app.last_scan.as_ref().map_or(0.0, |s| s.score.total_score);
            app.pre_fix_score = Some(old_score);

            let selected_indices: Vec<usize> = app
                .fix_view
                .fixable_findings
                .iter()
                .enumerate()
                .filter(|(_, item)| item.selected)
                .map(|(i, _)| i)
                .collect();

            let mut applied: u32 = 0;
            let mut failed: u32 = 0;
            let mut details: Vec<String> = Vec::new();

            for idx in &selected_indices {
                let finding_index = app.fix_view.fixable_findings[*idx].finding_index;
                let finding = app
                    .last_scan
                    .as_ref()
                    .and_then(|s| s.findings.get(finding_index))
                    .cloned();

                if let Some(f) = finding {
                    let result = apply_fix_to_file(&app.project_path, &f);
                    if result.success {
                        app.fix_view.fixable_findings[*idx].status = FixItemStatus::Applied;
                        applied += 1;
                    } else {
                        app.fix_view.fixable_findings[*idx].status = FixItemStatus::Failed;
                        failed += 1;
                    }
                    details.push(result.detail);
                } else {
                    app.fix_view.fixable_findings[*idx].status = FixItemStatus::Failed;
                    failed += 1;
                    details.push("Finding not found in scan".to_string());
                }
            }

            app.fix_view.applying = false;

            // Log details
            for d in &details {
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    d.clone(),
                ));
            }

            // Show results (predicted score — will be updated by AutoScan)
            let impact = app.fix_view.total_predicted_impact() as f64;
            app.fix_view.results = Some(views::fix::FixResults {
                applied,
                failed,
                old_score,
                new_score: (old_score + impact).min(100.0),
            });

            if applied > 0 {
                app.toasts.push(
                    components::toast::ToastKind::Success,
                    format!("{applied} fix(es) applied to disk. Re-scanning..."),
                );
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                app.activity_log.push(types::ActivityEntry {
                    timestamp: format!("{:02}:{:02}", (now % 86400) / 3600, (now % 3600) / 60),
                    kind: types::ActivityKind::Fix,
                    detail: format!("{applied} applied, {failed} failed"),
                });
                // Auto-rescan to validate actual score (inline to avoid recursion)
                let path = app.project_path.to_string_lossy().to_string();
                let fix_old_score = app.pre_fix_score.take();
                match app.engine_client.scan(&path).await {
                    Ok(result) => {
                        let new_score = result.score.total_score;
                        app.set_scan_result(result);
                        // Update fix results with real score
                        if let Some(ref mut r) = app.fix_view.results {
                            r.new_score = new_score;
                        }
                        if let Some(old) = fix_old_score {
                            let diff = new_score - old;
                            let msg = format!("Fix verified: Score {old:.0} → {new_score:.0} ({diff:+.0})");
                            app.toasts.push(
                                if diff > 0.0 { components::toast::ToastKind::Success }
                                else { components::toast::ToastKind::Warning },
                                &msg,
                            );
                        }
                    }
                    Err(e) => {
                        app.toasts.push(
                            components::toast::ToastKind::Warning,
                            "Re-scan failed after fix. Run /scan manually.",
                        );
                        app.messages.push(types::ChatMessage::new(
                            types::MessageRole::System,
                            format!("Re-scan failed: {e}"),
                        ));
                    }
                }
            } else {
                app.toasts.push(
                    components::toast::ToastKind::Warning,
                    format!("No fixes applied. {failed} failed."),
                );
            }
        }
        AppCommand::SaveTheme(name) => {
            config::save_theme(&name).await;
        }
        AppCommand::MarkOnboardingComplete => {
            config::mark_onboarding_complete().await;
        }
        AppCommand::MarkFirstRunDone => {
            session::mark_first_run_done().await;
        }
        AppCommand::ListSessions => {
            let sessions = session::list_sessions().await;
            if sessions.is_empty() {
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    "No saved sessions.".to_string(),
                ));
            } else {
                app.messages.push(types::ChatMessage::new(
                    types::MessageRole::System,
                    format!("Sessions: {}", sessions.join(", ")),
                ));
            }
        }
        AppCommand::ExportReport => {
            if let Some(scan) = &app.last_scan {
                match views::report::export_report(scan).await {
                    Ok(path) => {
                        app.report_view.export_status =
                            views::report::ExportStatus::Done(path.clone());
                        app.toasts.push(
                            components::toast::ToastKind::Success,
                            format!("Exported: {path}"),
                        );
                        app.messages.push(types::ChatMessage::new(
                            types::MessageRole::System,
                            format!("Report exported: {path}"),
                        ));
                    }
                    Err(e) => {
                        app.report_view.export_status =
                            views::report::ExportStatus::Error(e.clone());
                        app.toasts.push(
                            components::toast::ToastKind::Error,
                            format!("Export failed: {e}"),
                        );
                    }
                }
            }
        }
        AppCommand::CompleteOnboarding => {
            // 1. Save config from wizard
            if let Some(ref wiz) = app.onboarding {
                config::save_onboarding_results(wiz).await;
            }

            // 2. Collect project type for post-completion action
            let project_type = app
                .onboarding
                .as_ref()
                .and_then(|w| w.project_type.clone())
                .unwrap_or_else(|| "existing".to_string());

            // 3. Close wizard
            app.onboarding = None;
            app.overlay = types::Overlay::None;
            app.config.onboarding_completed = true;

            app.toasts.push(
                components::toast::ToastKind::Info,
                "Setup complete! Use /scan to check compliance.",
            );

            // 4. Post-completion action based on project_type
            match project_type.as_str() {
                "existing" => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "Running first scan...".to_string(),
                    ));
                    // Trigger scan directly (avoid recursive execute_command)
                    let path = app.project_path.to_string_lossy().to_string();
                    match app.engine_client.scan(&path).await {
                        Ok(result) => app.set_scan_result(result),
                        Err(e) => {
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                format!("First scan failed: {e}. Use /scan to retry."),
                            ));
                        }
                    }
                }
                "new" => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "Compliance structure created. Use /scan when you add AI tools."
                            .to_string(),
                    ));
                }
                "demo" => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        "Run `complior init` in your project, then /scan to check compliance."
                            .to_string(),
                    ));
                }
                _ => {}
            }
        }
        AppCommand::SaveOnboardingPartial(last_step) => {
            config::save_onboarding_partial(last_step).await;
        }
        AppCommand::LoadPassports => {
            let path = app.project_path.to_string_lossy().to_string();
            let url = format!("/agent/list?path={}", url_encode(&path));
            match app.engine_client.get_json(&url).await {
                Ok(result) => {
                    if let Some(arr) = result.as_array() {
                        app.passport_view.loaded_passports = arr.clone();
                        app.passport_view.load_from_passports();
                        let count = arr.len();
                        if count > 0 {
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                format!("Loaded {count} passport(s) from engine."),
                            ));
                        }
                    }
                }
                Err(_) => {
                    // Silently fail — passports may not exist yet
                }
            }
        }
        AppCommand::LoadPassportCompleteness => {
            if let Some((path, name)) = app.passport_path_name() {
                let url = format!("/agent/completeness?path={}&name={}", url_encode(&path), url_encode(&name));
                match app.engine_client.get_json(&url).await {
                    Ok(result) => {
                        app.passport_view.completeness_data = Some(result);
                    }
                    Err(e) => {
                        app.messages.push(types::ChatMessage::new(
                            types::MessageRole::System,
                            format!("Failed to load completeness: {e}"),
                        ));
                    }
                }
            }
        }
        AppCommand::ValidatePassport => {
            if let Some((path, name)) = app.passport_path_name() {
                let url = format!("/agent/validate?path={}&name={}", url_encode(&path), url_encode(&name));
                match app.engine_client.get_json(&url).await {
                    Ok(result) => {
                        let valid = result
                            .get("valid")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        let msg = if valid {
                            format!("Passport '{name}' is valid.")
                        } else {
                            let errors = result
                                .get("errors")
                                .and_then(|v| v.as_array())
                                .map(|arr| {
                                    arr.iter()
                                        .filter_map(|v| v.as_str())
                                        .collect::<Vec<_>>()
                                        .join(", ")
                                })
                                .unwrap_or_default();
                            format!("Passport '{name}' validation failed: {errors}")
                        };
                        app.toasts.push(
                            if valid {
                                components::toast::ToastKind::Success
                            } else {
                                components::toast::ToastKind::Warning
                            },
                            &msg,
                        );
                        app.messages.push(types::ChatMessage::new(
                            types::MessageRole::System,
                            msg,
                        ));
                    }
                    Err(e) => {
                        app.toasts.push(
                            components::toast::ToastKind::Warning,
                            format!("Validation failed: {e}"),
                        );
                    }
                }
            } else {
                app.toasts.push(
                    components::toast::ToastKind::Warning,
                    "No passport loaded. Run `complior agent init` first.",
                );
            }
        }
        AppCommand::GeneratePassportFria => {
            if let Some((path, name)) = app.passport_path_name() {
                let body = serde_json::json!({ "path": path, "name": name });
                match app.engine_client.post_json("/agent/fria", &body).await {
                    Ok(result) => {
                        let output_path = result
                            .get("savedPath")
                            .and_then(|v| v.as_str())
                            .unwrap_or("(unknown)");
                        let msg = format!("FRIA report generated: {output_path}");
                        app.toasts
                            .push(components::toast::ToastKind::Success, &msg);
                        app.messages.push(types::ChatMessage::new(
                            types::MessageRole::System,
                            msg,
                        ));
                    }
                    Err(e) => {
                        app.toasts.push(
                            components::toast::ToastKind::Warning,
                            format!("FRIA generation failed: {e}"),
                        );
                    }
                }
            } else {
                app.toasts.push(
                    components::toast::ToastKind::Warning,
                    "No passport loaded. Run `complior agent init` first.",
                );
            }
        }
        AppCommand::ExportPassport => {
            if let Some((path, name)) = app.passport_path_name() {
                let url = format!("/agent/show?path={}&name={}", url_encode(&path), url_encode(&name));
                match app.engine_client.get_json(&url).await {
                    Ok(result) => {
                        let json_str =
                            serde_json::to_string_pretty(&result).unwrap_or_default();
                        let export_path = format!("{name}-passport-export.json");
                        match tokio::fs::write(&export_path, &json_str).await {
                            Ok(()) => {
                                let msg = format!("Passport exported: {export_path}");
                                app.toasts.push(
                                    components::toast::ToastKind::Success,
                                    &msg,
                                );
                                app.messages.push(types::ChatMessage::new(
                                    types::MessageRole::System,
                                    msg,
                                ));
                            }
                            Err(e) => {
                                app.toasts.push(
                                    components::toast::ToastKind::Warning,
                                    format!("Export failed: {e}"),
                                );
                            }
                        }
                    }
                    Err(e) => {
                        app.toasts.push(
                            components::toast::ToastKind::Warning,
                            format!("Export failed: {e}"),
                        );
                    }
                }
            } else {
                app.toasts.push(
                    components::toast::ToastKind::Warning,
                    "No passport loaded. Run `complior agent init` first.",
                );
            }
        }
        AppCommand::LoadObligations => {
            match app.engine_client.get_json("/obligations").await {
                Ok(result) => {
                    if let Some(arr) = result.as_array() {
                        app.obligations_view.load_from_json(arr);
                        let count = arr.len();
                        let covered = app.obligations_view.covered_count();
                        if count > 0 {
                            app.messages.push(types::ChatMessage::new(
                                types::MessageRole::System,
                                format!(
                                    "Loaded {count} obligations ({covered} covered)."
                                ),
                            ));
                        }
                    }
                }
                Err(e) => {
                    app.messages.push(types::ChatMessage::new(
                        types::MessageRole::System,
                        format!("Failed to load obligations: {e}"),
                    ));
                }
            }
        }
    }
}

/// Build a context-aware suggestion from local app state when engine /suggestions is unavailable.
pub fn build_local_suggestion(app: &App) -> components::suggestions::Suggestion {
    use components::suggestions::{Suggestion, SuggestionKind};

    // Priority 1: If no scan yet, suggest scanning
    if app.last_scan.is_none() {
        return Suggestion {
            kind: SuggestionKind::Tip,
            text: "Try /scan to check your project's compliance score".into(),
            detail: Some("Press any key to dismiss".into()),
        };
    }

    let scan = app.last_scan.as_ref().expect("last_scan: guarded by is_none check above");
    let score = scan.score.total_score;

    // Priority 2: Findings present — suggest fix
    let finding_count = scan.findings.len();
    if finding_count > 0 {
        return Suggestion {
            kind: SuggestionKind::Fix,
            text: format!("Score {score:.0}/100. {finding_count} findings to fix — press 3 for Fix view"),
            detail: Some("Quick wins can boost your score significantly".into()),
        };
    }

    // Priority 3: Deadline warning
    if score < 80.0 {
        return Suggestion {
            kind: SuggestionKind::DeadlineWarning,
            text: format!("Score {score:.0}/100 — EU AI Act full enforcement Aug 2, 2026"),
            detail: Some("Press 5 for Timeline view".into()),
        };
    }

    // Priority 4: High score celebration
    Suggestion {
        kind: SuggestionKind::ScoreImprovement,
        text: format!("Score {score:.0}/100 — Looking good! Run /scan to verify latest changes"),
        detail: None,
    }
}
