use std::time::Instant;

use crate::types::{ChatMessage, MessageRole, Overlay, ViewState};
use crate::views::fix::FixViewState;

use super::{App, AppCommand};

impl App {
    pub(crate) fn try_tab_complete(&mut self) {
        // Colon mode tab completion
        if self.colon_mode {
            let partial = &self.input;
            if let Some(completed) =
                crate::components::command_palette::complete_colon_command(partial)
            {
                self.input = completed.to_string();
                self.input_cursor = self.input.len();
            }
            return;
        }

        if self.input.starts_with('/') {
            let partial = &self.input[1..];
            if let Some(completed) =
                crate::components::command_palette::complete_command(partial)
            {
                self.input = completed.to_string();
                self.input_cursor = self.input.len();
            }
            return;
        }

        let before_cursor = &self.input[..self.input_cursor];

        // Obligation completion: scan backwards for @OBL- or @OBL (without dash)
        if let Some(start) = before_cursor.rfind("@OBL-") {
            let prefix = &self.input[start + 5..self.input_cursor];
            let matches = crate::obligations::autocomplete_obl(prefix);
            if let Some(obl) = matches.first() {
                let replacement = format!("@OBL-{}", obl.id);
                self.input
                    .replace_range(start..self.input_cursor, &replacement);
                self.input_cursor = start + replacement.len();
            }
        } else if let Some(start) = before_cursor.rfind("@OBL") {
            // "@OBL" without dash — insert dash and complete
            let prefix = &self.input[start + 4..self.input_cursor];
            let matches = crate::obligations::autocomplete_obl(prefix);
            if let Some(obl) = matches.first() {
                let replacement = format!("@OBL-{}", obl.id);
                self.input
                    .replace_range(start..self.input_cursor, &replacement);
                self.input_cursor = start + replacement.len();
            }
        } else if let Some(start) = before_cursor.rfind("@Art.") {
            let prefix = &self.input[start + 5..self.input_cursor];
            let matches = crate::obligations::autocomplete_obl(prefix);
            if let Some(obl) = matches.first() {
                let replacement = format!("@OBL-{}", obl.id);
                self.input
                    .replace_range(start..self.input_cursor, &replacement);
                self.input_cursor = start + replacement.len();
            }
        } else if let Some(start) = before_cursor.rfind("@Art") {
            // "@Art" without dot — still complete
            let prefix = &self.input[start + 4..self.input_cursor];
            let matches = crate::obligations::autocomplete_obl(prefix);
            if let Some(obl) = matches.first() {
                let replacement = format!("@OBL-{}", obl.id);
                self.input
                    .replace_range(start..self.input_cursor, &replacement);
                self.input_cursor = start + replacement.len();
            }
        }
    }

    pub fn handle_command(&mut self, cmd: &str) -> Option<AppCommand> {
        let parts: Vec<&str> = cmd.splitn(2, ' ').collect();
        match parts.first().copied() {
            Some("scan") => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Scanning project...".to_string(),
                ));
                self.operation_start = Some(Instant::now());
                Some(AppCommand::Scan)
            }
            Some("edit") => {
                let path = parts.get(1).unwrap_or(&"").to_string();
                if path.is_empty() {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Usage: /edit <file-path>".to_string(),
                    ));
                    None
                } else {
                    Some(AppCommand::OpenFile(path))
                }
            }
            Some("run") => {
                let command = parts.get(1).unwrap_or(&"").to_string();
                if command.is_empty() {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Usage: /run <command>".to_string(),
                    ));
                    None
                } else {
                    self.terminal_visible = true;
                    Some(AppCommand::RunCommand(command))
                }
            }
            Some("clear") => {
                self.terminal_output.clear();
                self.terminal_scroll = 0;
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Terminal cleared.".to_string(),
                ));
                None
            }
            Some("reconnect") => Some(AppCommand::Reconnect),
            Some("theme") => {
                let name = parts.get(1).unwrap_or(&"").to_string();
                if name.is_empty() {
                    // Open theme picker overlay
                    self.theme_picker =
                        Some(crate::theme_picker::ThemePickerState::new());
                    self.overlay = Overlay::ThemePicker;
                    None
                } else {
                    Some(AppCommand::SwitchTheme(name))
                }
            }
            Some("save") => {
                let name = parts.get(1).unwrap_or(&"latest").to_string();
                Some(AppCommand::SaveSession(name))
            }
            Some("load") => {
                let name = parts.get(1).unwrap_or(&"latest").to_string();
                Some(AppCommand::LoadSession(name))
            }
            Some("sessions") => Some(AppCommand::ListSessions),
            Some("help") => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    concat!(
                        "Commands:\n",
                        "  /scan          — Scan project for compliance\n",
                        "  /status        — Show compliance status summary\n",
                        "  /fix           — Open Fix view\n",
                        "  /fix --dry-run — Preview fixes without applying\n",
                        "  /explain       — Explain top compliance finding\n",
                        "  /report        — Open Report view\n",
                        "  /edit <path>   — Open file in viewer\n",
                        "  /run <cmd>     — Run shell command\n",
                        "  /clear         — Clear terminal output\n",
                        "  /reconnect     — Reconnect to engine\n",
                        "  /theme <name>  — Switch theme (dark/light/high-contrast)\n",
                        "  /watch         — Toggle file watch mode\n",
                        "  /view <1-9>    — Switch to view (Dashboard/Scan/Fix/Passport/Oblig/Timeline/Report/Log/Chat)\n",
                        "  /save [name]   — Save session\n",
                        "  /load [name]   — Load session\n",
                        "  /sessions      — List saved sessions\n",
                        "  /whatif <text> — What-if scenario analysis\n",
                        "  /welcome       — Show getting started\n",
                        "  /help          — Show this help\n",
                        "\n",
                        "Shortcuts:\n",
                        "  @file          — Reference file in message\n",
                        "  !cmd           — Run shell command directly\n",
                        "  1-9            — Switch view (Normal mode)\n",
                        "  Tab            — Toggle mode (Scan/Fix/Watch)\n",
                        "  Alt+1..5       — Jump to panel\n",
                        "  Ctrl+P         — Command palette\n",
                        "  Ctrl+B         — Toggle sidebar\n",
                        "  Ctrl+T         — Toggle terminal\n",
                        "  V              — Visual select (code viewer)\n",
                        "  Ctrl+K         — Send selection to AI\n",
                        "  ?              — Help (Normal mode)\n",
                        "  q              — Quit\n",
                    )
                    .to_string(),
                ));
                None
            }
            Some("model") => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Model selector unavailable in wrapper mode. Complior wraps coding agents, not LLMs directly.".to_string(),
                ));
                None
            }
            Some("view") => {
                let num_str = parts.get(1).unwrap_or(&"").trim();
                if let Ok(num) = num_str.parse::<u8>() {
                    if let Some(view) = ViewState::from_key(num) {
                        self.view_state = view;
                        return None;
                    }
                }
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Usage: /view <1-9> (Dashboard/Scan/Fix/Passport/Oblig/Timeline/Report/Log/Chat)"
                        .to_string(),
                ));
                None
            }
            Some("watch") => Some(AppCommand::ToggleWatch),
            Some("welcome") => {
                self.overlay = Overlay::GettingStarted;
                None
            }
            // T905: What-If scenario command
            Some("whatif") => {
                let scenario = parts.get(1).unwrap_or(&"").to_string();
                if scenario.is_empty() {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Usage: /whatif <scenario> (e.g. /whatif expand to UK)"
                            .to_string(),
                    ));
                    None
                } else {
                    Some(AppCommand::WhatIf(scenario))
                }
            }
            // T906: Dry-run fix (also /fix --dry-run)
            Some("fix") => {
                let args = parts.get(1).unwrap_or(&"").to_string();
                if args.contains("--dry-run") {
                    let selected: Vec<String> = self
                        .fix_view
                        .fixable_findings
                        .iter()
                        .filter(|f| f.selected)
                        .map(|f| f.check_id.clone())
                        .collect();
                    if selected.is_empty() {
                        self.messages.push(ChatMessage::new(
                            MessageRole::System,
                            "No fixes selected. Go to Fix view (3) and select fixes first."
                                .to_string(),
                        ));
                        None
                    } else {
                        Some(AppCommand::FixDryRun(selected))
                    }
                } else {
                    // Regular /fix: switch to Fix view
                    self.view_state = ViewState::Fix;
                    if let Some(scan) = &self.last_scan {
                        self.fix_view = FixViewState::from_scan(&scan.findings);
                    }
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Switched to Fix view. Select fixes and press Enter to apply."
                            .to_string(),
                    ));
                    None
                }
            }
            Some("status") => {
                if let Some(scan) = &self.last_scan {
                    let total = scan.score.total_score;
                    let passed = scan.score.passed_checks;
                    let failed = scan.score.failed_checks;
                    let zone = match scan.score.zone {
                        crate::types::Zone::Green => "Green ✓",
                        crate::types::Zone::Yellow => "Yellow ⚠",
                        crate::types::Zone::Red => "Red ✗",
                    };
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        format!(
                            "Compliance Status: {total:.0}/100 [{zone}] — {passed} passed, {failed} failed\nRun /fix to apply auto-fixes or /report for full report."
                        ),
                    ));
                } else {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "No scan data. Run /scan first.".to_string(),
                    ));
                }
                None
            }
            Some("explain") => {
                if let Some(scan) = &self.last_scan {
                    if let Some(finding) = scan.findings.iter()
                        .find(|f| matches!(f.severity, crate::types::Severity::High | crate::types::Severity::Critical))
                        .or_else(|| scan.findings.first())
                    {
                        self.messages.push(ChatMessage::new(
                            MessageRole::System,
                            format!(
                                "Finding: {} [{}]\nSeverity: {:?}\nMessage: {}\nAsk me to /fix this or explain further.",
                                finding.check_id, finding.obligation_id.as_deref().unwrap_or("-"),
                                finding.severity, finding.message
                            ),
                        ));
                    } else {
                        self.messages.push(ChatMessage::new(
                            MessageRole::System,
                            "No findings to explain. Run /scan first.".to_string(),
                        ));
                    }
                } else {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "No scan data. Run /scan first.".to_string(),
                    ));
                }
                None
            }
            Some("report") => {
                self.view_state = ViewState::Report;
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Switched to Report view. Use /export to generate a file.".to_string(),
                ));
                None
            }
            Some("export") => {
                if self.last_scan.is_some() {
                    Some(AppCommand::ExportReport)
                } else {
                    let format = parts.get(1).unwrap_or(&"md");
                    self.toasts.push(
                        crate::components::toast::ToastKind::Warning,
                        format!("No scan data. Run /scan first (format: {format})"),
                    );
                    None
                }
            }
            _ => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!("Unknown command: /{cmd}. Type /help for usage."),
                ));
                None
            }
        }
    }

    /// Handle colon-command input (`:cmd` syntax from Normal mode).
    pub(crate) fn handle_colon_command(&mut self, input: &str) -> Option<AppCommand> {
        let parts: Vec<&str> = input.splitn(2, ' ').collect();
        match parts.first().copied() {
            Some("scan") | Some("s") => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Scanning project...".to_string(),
                ));
                self.operation_start = Some(Instant::now());
                Some(AppCommand::Scan)
            }
            Some("fix") => {
                let target = parts.get(1).unwrap_or(&"").to_string();
                if target.is_empty() {
                    self.view_state = ViewState::Fix;
                    if let Some(scan) = &self.last_scan {
                        self.fix_view = FixViewState::from_scan(&scan.findings);
                    }
                    self.toasts.push(
                        crate::components::toast::ToastKind::Info,
                        "Fix view opened",
                    );
                } else {
                    self.toasts.push(
                        crate::components::toast::ToastKind::Info,
                        format!("Fix: {target}"),
                    );
                }
                None
            }
            Some("theme") => {
                let name = parts.get(1).unwrap_or(&"").to_string();
                if name.is_empty() {
                    self.theme_picker =
                        Some(crate::theme_picker::ThemePickerState::new());
                    self.overlay = Overlay::ThemePicker;
                    None
                } else {
                    Some(AppCommand::SwitchTheme(name))
                }
            }
            Some("export") => {
                if self.last_scan.is_some() {
                    Some(AppCommand::ExportReport)
                } else {
                    let format = parts.get(1).unwrap_or(&"md");
                    self.toasts.push(
                        crate::components::toast::ToastKind::Warning,
                        format!("No scan data. Run :scan first (format: {format})"),
                    );
                    None
                }
            }
            Some("status") | Some("st") => {
                if let Some(scan) = &self.last_scan {
                    let total = scan.score.total_score;
                    let passed = scan.score.passed_checks;
                    let failed = scan.score.failed_checks;
                    let zone = match scan.score.zone {
                        crate::types::Zone::Green => "Green ✓",
                        crate::types::Zone::Yellow => "Yellow ⚠",
                        crate::types::Zone::Red => "Red ✗",
                    };
                    self.toasts.push(
                        crate::components::toast::ToastKind::Info,
                        format!("Score: {total:.0}/100 [{zone}] — {passed}✓ {failed}✗"),
                    );
                } else {
                    self.toasts.push(
                        crate::components::toast::ToastKind::Warning,
                        "No scan data — run :scan first",
                    );
                }
                None
            }
            Some("explain") | Some("ex") => {
                if let Some(scan) = &self.last_scan {
                    if let Some(finding) = scan.findings.iter()
                        .find(|f| matches!(f.severity, crate::types::Severity::High | crate::types::Severity::Critical))
                        .or_else(|| scan.findings.first())
                    {
                        self.toasts.push(
                            crate::components::toast::ToastKind::Info,
                            format!("{}: {}", finding.check_id, finding.message),
                        );
                    } else {
                        self.toasts.push(
                            crate::components::toast::ToastKind::Info,
                            "No findings — project looks compliant!",
                        );
                    }
                } else {
                    self.toasts.push(
                        crate::components::toast::ToastKind::Warning,
                        "No scan data — run :scan first",
                    );
                }
                None
            }
            Some("report") | Some("r") => {
                self.view_state = ViewState::Report;
                self.toasts.push(
                    crate::components::toast::ToastKind::Info,
                    "Report view opened",
                );
                None
            }
            Some("watch") | Some("w") => Some(AppCommand::ToggleWatch),
            Some("quit") | Some("q") => {
                self.running = false;
                None
            }
            Some("help") | Some("h") => {
                self.overlay = Overlay::Help;
                self.help_scroll = 0;
                None
            }
            Some("undo") | Some("u") => Some(AppCommand::Undo(None)),
            Some("view") | Some("v") => {
                let num_str = parts.get(1).unwrap_or(&"").trim();
                if let Ok(num) = num_str.parse::<u8>() {
                    if let Some(view) = ViewState::from_key(num) {
                        self.view_state = view;
                        return None;
                    }
                }
                self.toasts.push(
                    crate::components::toast::ToastKind::Warning,
                    "Usage: :view <1-9>",
                );
                None
            }
            Some("animations") => {
                self.animation.enabled = !self.animation.enabled;
                let status = if self.animation.enabled {
                    "on"
                } else {
                    "off"
                };
                self.toasts.push(
                    crate::components::toast::ToastKind::Info,
                    format!("Animations: {status}"),
                );
                None
            }
            // T905: What-If scenario (colon mode)
            Some("whatif") | Some("wi") => {
                let scenario = parts[1..].join(" ");
                if scenario.is_empty() {
                    self.toasts.push(
                        crate::components::toast::ToastKind::Warning,
                        "Usage: :whatif <scenario>",
                    );
                    None
                } else {
                    Some(AppCommand::WhatIf(scenario))
                }
            }
            // T906: Dry-run mode (colon mode)
            Some("dry-run") | Some("dr") => {
                let selected: Vec<String> = self
                    .fix_view
                    .fixable_findings
                    .iter()
                    .filter(|f| f.selected)
                    .map(|f| f.check_id.clone())
                    .collect();
                if selected.is_empty() {
                    self.toasts.push(
                        crate::components::toast::ToastKind::Warning,
                        "No fixes selected. Select fixes in Fix view first.",
                    );
                    None
                } else {
                    Some(AppCommand::FixDryRun(selected))
                }
            }
            Some("llm") | Some("settings") => {
                self.llm_settings = Some(crate::llm_settings::LlmSettingsState::new(&self.llm_config));
                self.overlay = Overlay::LlmSettings;
                None
            }
            _ => {
                self.toasts.push(
                    crate::components::toast::ToastKind::Warning,
                    format!("Unknown: :{input}. Try :help"),
                );
                None
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::app::App;
    use crate::config::TuiConfig;
    use crate::types::ViewState;

    fn make_app() -> App {
        crate::theme::init_theme("dark");
        App::new(TuiConfig::default())
    }

    // US-S0204: named tests — slash commands

    /// `/status` with no scan shows a prompt to run /scan.
    #[test]
    fn test_slash_status_no_scan() {
        let mut app = make_app();
        let cmd = app.handle_command("status");
        assert!(cmd.is_none());
        let last = app.messages.last().expect("message pushed");
        assert!(last.content.contains("/scan") || last.content.contains("No scan"),
            "status without scan should prompt for /scan");
    }

    /// `/explain` with no scan pushes an informative message.
    #[test]
    fn test_slash_explain_no_scan() {
        let mut app = make_app();
        let cmd = app.handle_command("explain");
        assert!(cmd.is_none());
        let last = app.messages.last().expect("message pushed");
        assert!(last.content.contains("scan") || last.content.contains("No scan"),
            "explain without scan should ask for scan first");
    }

    /// `/report` switches view to Report.
    #[test]
    fn test_slash_report_switches_view() {
        let mut app = make_app();
        let cmd = app.handle_command("report");
        assert!(cmd.is_none());
        assert_eq!(app.view_state, ViewState::Report,
            "/report should switch to Report view");
    }
}
