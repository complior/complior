use std::io::IsTerminal as _;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use crate::cli::SeverityLevel;
use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::types::Severity;

use super::format::colors::{bold, check_mark, dim, green, red, tree_branch, tree_end};
use super::format::{FormatOptions, format_human, format_json, format_sarif, print_paged};

/// Run a headless (non-TUI) scan and print results to stdout.
/// Returns the exit code: 0 = pass, 1 = fail/error.
#[allow(clippy::too_many_arguments, clippy::fn_params_excessive_bools)]
pub async fn run_headless_scan(
    ci: bool,
    json: bool,
    sarif: bool,
    _no_tui: bool,
    threshold: u32,
    fail_on: Option<SeverityLevel>,
    deep: bool,
    llm: bool,
    cloud: bool,
    quiet: bool,
    agent: Option<&str>,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    // Check engine is reachable
    match client.status().await {
        Ok(status) if status.ready => {}
        Ok(_) => {
            eprintln!("Error: Engine is not ready");
            return 1;
        }
        Err(e) => {
            eprintln!("Error: Cannot connect to engine at {engine_url}: {e}");
            eprintln!("Start with: complior daemon");
            return 1;
        }
    }

    let scan_elapsed = std::time::Instant::now();

    // Tier 3 stub
    if cloud {
        eprintln!("Error: Cloud scanning is not yet available.");
        eprintln!(
            "  Use 'complior scan' for local scanning or 'complior scan --deep' for enhanced analysis."
        );
        return 1;
    }

    // Determine project path
    let scan_path = super::common::resolve_project_path(path);

    // LLM key validation — check local env first, then ask engine
    if llm && !super::common::check_llm_key(&scan_path) {
        // Local env doesn't have key — check if engine has LLM configured
        let engine_has_llm = client
            .get_json("/llm/info")
            .await
            .ok()
            .and_then(|info| info.get("configured")?.as_bool())
            .unwrap_or(false);
        if !engine_has_llm {
            super::common::print_llm_key_error();
            return 1;
        }
    }

    // Deep scan: check uv availability and show tool display
    if deep {
        if !check_uv_available() {
            return 1;
        }
        if !json && !sarif {
            show_deep_scan_tools();
        }
    }

    // Show LLM model info when --llm is used
    if llm && !json && !sarif {
        if let Ok(info) = client.get_json("/llm/info").await {
            let configured = info
                .get("configured")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false);

            if configured {
                // Try 'classify' task first (used by --llm scan), then 'report'
                let task = info.get("classify").or_else(|| info.get("report"));
                if let Some(task_info) = task {
                    let model = task_info
                        .get("modelId")
                        .and_then(|v| v.as_str())
                        .unwrap_or("auto");
                    let provider = task_info
                        .get("provider")
                        .and_then(|v| v.as_str())
                        .unwrap_or("auto");
                    let source = task_info
                        .get("source")
                        .and_then(|v| v.as_str())
                        .unwrap_or("default");
                    let source_label = if source == "env" {
                        let env_var = task_info
                            .get("envVar")
                            .and_then(|v| v.as_str())
                            .unwrap_or("env");
                        format!(" ({})", env_var)
                    } else {
                        String::new()
                    };
                    eprintln!(
                        "  LLM: {} via {}{}",
                        bold(model),
                        provider,
                        dim(&source_label)
                    );
                    if source != "env" {
                        eprintln!(
                            "  {}",
                            dim("Override: set COMPLIOR_MODEL_CLASSIFY in .complior/.env")
                        );
                    }
                } else {
                    // configured but no task routing available
                    let active = info
                        .get("activeProvider")
                        .and_then(|v| v.as_str())
                        .unwrap_or("auto");
                    eprintln!("  LLM: {} via {}", bold("auto"), active);
                }
            } else {
                eprintln!("  LLM: {}", dim("not configured"));
            }
        }
    }

    // Start spinner (stderr, only for TTY and non-JSON/SARIF)
    let spinner_active = Arc::new(AtomicBool::new(false));
    let spinner_handle = if !json && !sarif && std::io::stderr().is_terminal() {
        Some(start_spinner(Arc::clone(&spinner_active)))
    } else {
        None
    };

    // Run scan — route by tier flags
    let result = if deep && llm {
        // Tier 2+ : run tier2 first, then LLM on top
        let body = serde_json::json!({ "path": scan_path });
        let _tier2_result = match client.post_json("/scan/tier2", &body).await {
            Ok(r) => r,
            Err(e) => {
                stop_spinner(&spinner_active, spinner_handle);
                eprintln!("Tier 2 scan failed: {e}");
                return 1;
            }
        };
        // Then LLM
        let llm_result = match client.post_json_long("/scan/llm", &body).await {
            Ok(r) => r,
            Err(e) => {
                stop_spinner(&spinner_active, spinner_handle);
                eprintln!("LLM scan failed: {e}");
                return 1;
            }
        };
        match serde_json::from_value::<crate::types::ScanResult>(llm_result) {
            Ok(r) => {
                stop_spinner(&spinner_active, spinner_handle);
                r
            }
            Err(_e) => {
                stop_spinner(&spinner_active, spinner_handle);
                eprintln!(
                    "Failed to parse engine response. This may indicate a version mismatch between CLI and engine."
                );
                eprintln!("  Try: complior doctor");
                return 1;
            }
        }
    } else if deep {
        // Tier 2 only
        let body = serde_json::json!({ "path": scan_path });
        match client.post_json("/scan/tier2", &body).await {
            Ok(r) => {
                stop_spinner(&spinner_active, spinner_handle);
                match serde_json::from_value::<crate::types::ScanResult>(r) {
                    Ok(result) => result,
                    Err(_e) => {
                        eprintln!(
                            "Failed to parse engine response. This may indicate a version mismatch between CLI and engine."
                        );
                        eprintln!("  Try: complior doctor");
                        return 1;
                    }
                }
            }
            Err(e) => {
                stop_spinner(&spinner_active, spinner_handle);
                eprintln!("Tier 2 scan failed: {e}");
                return 1;
            }
        }
    } else if llm {
        // L5 LLM only
        let body = serde_json::json!({ "path": scan_path });
        match client.post_json_long("/scan/llm", &body).await {
            Ok(r) => {
                stop_spinner(&spinner_active, spinner_handle);
                match serde_json::from_value::<crate::types::ScanResult>(r) {
                    Ok(result) => result,
                    Err(_e) => {
                        eprintln!(
                            "Failed to parse engine response. This may indicate a version mismatch between CLI and engine."
                        );
                        eprintln!("  Try: complior doctor");
                        return 1;
                    }
                }
            }
            Err(e) => {
                stop_spinner(&spinner_active, spinner_handle);
                eprintln!("LLM scan failed: {e}");
                return 1;
            }
        }
    } else {
        // Default: Tier 1 (L1-L4)
        match client.scan(&scan_path).await {
            Ok(r) => {
                stop_spinner(&spinner_active, spinner_handle);
                r
            }
            Err(e) => {
                stop_spinner(&spinner_active, spinner_handle);
                eprintln!("Scan failed: {e}");
                return 1;
            }
        }
    };

    // Filter by agent name if --agent is set
    let result = if let Some(agent_name) = agent {
        let filtered_findings: Vec<_> = result
            .findings
            .into_iter()
            .filter(|f| f.agent_id.as_deref() == Some(agent_name))
            .collect();
        crate::types::ScanResult {
            findings: filtered_findings,
            ..result
        }
    } else {
        result
    };

    // Fetch multi-framework scores (includes OWASP/MITRE if redteam data exists)
    let framework_scores = client.framework_scores().await.ok();

    // Format output (default: human-readable with pager)
    if json {
        println!("{}", format_json(&result));
    } else if sarif {
        println!("{}", format_sarif(&result));
    } else {
        // Read previous score for delta display
        let prev_score = if deep {
            read_last_score(&scan_path)
        } else {
            None
        };

        // Completion summary before detailed report
        let finding_count = result
            .findings
            .iter()
            .filter(|f| f.r#type == crate::types::CheckResultType::Fail)
            .count();
        let layers = if deep && llm {
            "L1-L5"
        } else if deep {
            "L1-L4 + external"
        } else if llm {
            "L1-L4 + L5"
        } else {
            "L1-L4"
        };

        // Split LLM-enhanced count when --llm was used
        let findings_label = if llm {
            let llm_count = result
                .findings
                .iter()
                .filter(|f| {
                    f.r#type == crate::types::CheckResultType::Fail && f.l5_analyzed == Some(true)
                })
                .count();
            let base_count = finding_count.saturating_sub(llm_count);
            if llm_count > 0 {
                format!("{base_count} findings + {llm_count} LLM")
            } else {
                format!("{finding_count} findings")
            }
        } else {
            format!("{finding_count} findings")
        };

        if !quiet {
            eprintln!(
                "  {} Scan complete ({})  {}  {}  {}",
                green(check_mark()),
                layers,
                dim(&findings_label),
                dim(&format!("Score: {:.0}/100", result.score.total_score)),
                dim(&format!("{:.0}s", scan_elapsed.elapsed().as_secs_f64())),
            );
            eprintln!();
        }

        let opts = FormatOptions {
            framework_scores: framework_scores.as_ref().map(|mf| mf.frameworks.clone()),
            quiet,
            prev_score,
        };
        let text = format_human(&result, &opts);
        print_paged(&text);
    }

    // CI env-var output line
    if ci {
        let score = result.score.total_score.round() as u32;
        let grade = super::format::colors::resolve_grade(result.score.total_score);
        let finding_count = result
            .findings
            .iter()
            .filter(|f| f.r#type == crate::types::CheckResultType::Fail)
            .count();
        eprintln!("COMPLIOR_SCORE={score}");
        eprintln!("COMPLIOR_GRADE={grade}");
        eprintln!("COMPLIOR_FINDINGS={finding_count}");
    }

    // Hints (non-CI, non-JSON, non-SARIF)
    if !ci && !json && !sarif {
        // No AI components detected
        let has_ai_findings = result.findings.iter().any(|f| {
            f.check_id.starts_with("l3-")
                || f.check_id.starts_with("l4-")
                || f.check_id.starts_with("l5-")
                || f.check_id.starts_with("ext-")
        });
        if !has_ai_findings && result.score.total_checks > 0 {
            eprintln!();
            eprintln!(
                "  {}",
                super::format::colors::dim(
                    "Note: No AI components detected. Complior is designed for AI systems \
                     under the EU AI Act. If this project uses AI, ensure your dependencies \
                     are installed and source files are accessible."
                )
            );
        }

        // Suggest agent init if no passports found
        let hint_url = format!(
            "/passport/list?path={}",
            super::common::url_encode(&scan_path)
        );
        if let Ok(list) = client.get_json(&hint_url).await {
            let count = list.as_array().map_or(0, std::vec::Vec::len);
            if count == 0 {
                eprintln!();
                eprintln!(
                    "  {}",
                    super::format::colors::dim(
                        "Hint: No agent passports found. Run `complior passport init` for \
                         passport-aware scanning and pre-filled fix scaffolds."
                    )
                );
            }
        }
    }

    // Determine exit code (2 = compliance threshold failure)
    if ci {
        let score = result.score.total_score.round() as u32;
        if score < threshold {
            eprintln!("CI FAIL: Score {score} is below threshold {threshold}");
            return 2;
        }

        // Check fail-on severity
        if let Some(level) = fail_on {
            let has_severity = result.findings.iter().any(|f| match level {
                SeverityLevel::Critical => matches!(f.severity, Severity::Critical),
                SeverityLevel::High => {
                    matches!(f.severity, Severity::Critical | Severity::High)
                }
                SeverityLevel::Medium => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium
                    )
                }
                SeverityLevel::Low => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium | Severity::Low
                    )
                }
            });
            if has_severity {
                eprintln!(
                    "CI FAIL: Found findings at severity '{}' or above",
                    level.as_str()
                );
                return 2;
            }
        }
    }

    0
}

/// US-S05-34: Compliance diff — compare scan against a base branch.
pub async fn run_scan_diff(
    base_branch: &str,
    json: bool,
    fail_on_regression: bool,
    comment: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    // Check engine
    match client.status().await {
        Ok(status) if status.ready => {}
        Ok(_) => {
            eprintln!("Error: Engine is not ready");
            return 1;
        }
        Err(e) => {
            eprintln!("Error: Cannot connect to engine at {engine_url}: {e}");
            return 1;
        }
    }

    let scan_path = super::common::resolve_project_path(path);

    // Get changed files via git
    let changed_files = get_changed_files(base_branch, &scan_path);
    if changed_files.is_empty() {
        if !json {
            println!("No changed files found between HEAD and {base_branch}.");
        }
        return 0;
    }

    if !json {
        eprintln!(
            "Scanning diff against {base_branch} ({} files changed)...",
            changed_files.len()
        );
    }

    // POST /scan/diff with changed files
    let body = serde_json::json!({
        "path": scan_path,
        "changedFiles": changed_files,
        "markdown": comment,
    });

    match client.post_json("/scan/diff", &body).await {
        Ok(result) => {
            if let Some(err) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or(err);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&result).unwrap_or_default()
                );
            } else {
                print_diff_human(&result);
            }

            // Post PR comment if requested
            if comment && let Some(md) = result.get("markdown").and_then(|v| v.as_str()) {
                post_pr_comment(md);
            }

            // Check regression
            if fail_on_regression {
                let regression = result
                    .get("hasRegression")
                    .and_then(serde_json::Value::as_bool)
                    .unwrap_or(false);
                if regression {
                    eprintln!("CI FAIL: Compliance regression detected");
                    return 2;
                }
            }

            0
        }
        Err(e) => {
            eprintln!("Scan diff failed: {e}");
            1
        }
    }
}

// ── Phase 6 helpers ─────────────────────────────────────────────

/// Start a spinner on stderr showing elapsed time.
fn start_spinner(active: Arc<AtomicBool>) -> tokio::task::JoinHandle<()> {
    active.store(true, Ordering::SeqCst);
    tokio::spawn(async move {
        let frames = ['◐', '◓', '◑', '◒'];
        let mut i: usize = 0;
        let start = std::time::Instant::now();
        while active.load(Ordering::SeqCst) {
            let elapsed = start.elapsed().as_secs();
            eprint!(
                "\r  {} Scanning... ({}s)",
                frames[i % frames.len()],
                elapsed
            );
            i += 1;
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
        eprint!("\r{}\r", " ".repeat(40)); // clear spinner line
    })
}

/// Stop the spinner.
fn stop_spinner(active: &AtomicBool, handle: Option<tokio::task::JoinHandle<()>>) {
    active.store(false, Ordering::SeqCst);
    if let Some(h) = handle {
        h.abort();
        eprint!("\r{}\r", " ".repeat(40)); // clear spinner line
    }
}

/// Check if `uv` is available (required for --deep).
fn check_uv_available() -> bool {
    match std::process::Command::new("uv")
        .arg("--version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
    {
        Ok(s) if s.success() => true,
        _ => {
            eprintln!(
                "  {}  {}",
                red("X"),
                bold("Error: uv not found. Deep scan requires uv for tool management.")
            );
            eprintln!("     Install: curl -LsSf https://astral.sh/uv/install.sh | sh");
            false
        }
    }
}

/// Show deep scan tool download/cache display.
/// First run: show 3 progress bars with pending status.
/// Cached: single compact line.
fn show_deep_scan_tools() {
    let tools_dir = dirs::home_dir()
        .map(|h| h.join(".complior/tools"))
        .unwrap_or_default();

    let tools = [
        ("Semgrep", "semgrep"),
        ("Bandit", "bandit"),
        ("ModelScan", "modelscan"),
    ];

    let all_cached = tools_dir.exists()
        && tools
            .iter()
            .all(|(_, dir_name)| tools_dir.join(dir_name).exists());

    if all_cached {
        // Compact single line for repeat runs
        eprintln!(
            "  Deep scan tools: Semgrep, Bandit, ModelScan  {}",
            green(&format!("{} ready", check_mark()))
        );
    } else {
        // First run or partial install — show individual tool status
        eprintln!();
        eprintln!(
            "  {}",
            bold("First run — downloading deep scan tools (~150MB)")
        );

        for (i, (name, dir_name)) in tools.iter().enumerate() {
            let cached = tools_dir.join(dir_name).exists();
            let status = if cached {
                format!("{}  cached", green(check_mark()))
            } else {
                dim("pending").clone()
            };
            let bar = if cached {
                super::format::colors::bar_filled().repeat(20)
            } else {
                super::format::colors::bar_empty().repeat(20)
            };
            let prefix = if i < tools.len() - 1 {
                tree_branch()
            } else {
                tree_end()
            };
            eprintln!("  {}  {:<20}{}  {}", prefix, name, dim(&bar), status);
        }
        eprintln!();
    }
}

/// Read previous scan score from `.complior/last-scan.json` for delta display.
fn read_last_score(project_path: &str) -> Option<f64> {
    let path = std::path::Path::new(project_path).join(".complior/last-scan.json");
    let content = std::fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&content).ok()?;
    v.get("score")?.get("totalScore")?.as_f64()
}

fn get_changed_files(base_branch: &str, project_path: &str) -> Vec<String> {
    let output = std::process::Command::new("git")
        .args(["diff", "--name-only", &format!("{base_branch}...HEAD")])
        .current_dir(project_path)
        .output();

    match output {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout)
            .lines()
            .filter(|l| !l.is_empty())
            .map(String::from)
            .collect(),
        Ok(o) => {
            // Fallback: try without merge-base syntax
            let fallback = std::process::Command::new("git")
                .args(["diff", "--name-only", base_branch])
                .current_dir(project_path)
                .output();
            match fallback {
                Ok(f) if f.status.success() => String::from_utf8_lossy(&f.stdout)
                    .lines()
                    .filter(|l| !l.is_empty())
                    .map(String::from)
                    .collect(),
                _ => {
                    eprintln!(
                        "Warning: git diff failed: {}",
                        String::from_utf8_lossy(&o.stderr).trim()
                    );
                    vec![]
                }
            }
        }
        Err(e) => {
            eprintln!("Warning: Could not run git: {e}");
            vec![]
        }
    }
}

fn print_diff_human(value: &serde_json::Value) {
    let before = value
        .get("scoreBefore")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let after = value
        .get("scoreAfter")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let delta = value
        .get("scoreDelta")
        .and_then(serde_json::Value::as_i64)
        .unwrap_or(0);
    let new_count = value
        .get("newFindings")
        .and_then(|v| v.as_array())
        .map_or(0, std::vec::Vec::len);
    let resolved_count = value
        .get("resolvedFindings")
        .and_then(|v| v.as_array())
        .map_or(0, std::vec::Vec::len);
    let unchanged = value
        .get("unchangedCount")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let regression = value
        .get("hasRegression")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);

    let delta_str = if delta > 0 {
        format!("+{delta}")
    } else {
        format!("{delta}")
    };

    println!();
    println!("  Compliance Diff");
    println!("  ---------------");
    println!("  Score: {before}% -> {after}% ({delta_str}%)");
    println!("  New findings:      {new_count}");
    println!("  Resolved:          {resolved_count}");
    println!("  Unchanged:         {unchanged}");
    if regression {
        println!("  Status:            REGRESSION DETECTED");
    } else {
        println!("  Status:            OK");
    }
    println!();

    if let Some(findings) = value.get("newFindings").and_then(|v| v.as_array())
        && !findings.is_empty()
    {
        println!("  New Findings:");
        for f in findings {
            let sev = f.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
            let msg = f.get("message").and_then(|v| v.as_str()).unwrap_or("?");
            let file = f.get("file").and_then(|v| v.as_str()).unwrap_or("-");
            println!("    [{sev}] {msg} ({file})");
        }
        println!();
    }

    if let Some(findings) = value.get("resolvedFindings").and_then(|v| v.as_array())
        && !findings.is_empty()
    {
        println!("  Resolved Findings:");
        for f in findings {
            let sev = f.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
            let msg = f.get("message").and_then(|v| v.as_str()).unwrap_or("?");
            println!("    [{sev}] {msg}");
        }
        println!();
    }
}

fn post_pr_comment(markdown: &str) {
    let output = std::process::Command::new("gh")
        .args(["pr", "comment", "--body", markdown])
        .output();

    match output {
        Ok(o) if o.status.success() => {
            eprintln!("PR comment posted successfully.");
        }
        Ok(o) => {
            eprintln!(
                "Warning: Failed to post PR comment: {}",
                String::from_utf8_lossy(&o.stderr).trim()
            );
        }
        Err(_) => {
            eprintln!("Warning: `gh` CLI not found. Install GitHub CLI to post PR comments.");
        }
    }
}
