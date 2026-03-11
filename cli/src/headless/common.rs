//! Shared helpers for headless CLI commands.

use std::fmt::Write;

use crate::config::TuiConfig;
use crate::daemon;
use crate::engine_client::EngineClient;
use crate::engine_process::EngineManager;

/// Percent-encode a string for use in URL query parameters.
pub(crate) fn url_encode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(b as char);
            }
            _ => {
                let _ = write!(result, "%{b:02X}");
            }
        }
    }
    result
}

/// Resolve engine client: walk up from CWD to find daemon PID file, fall back to config default.
pub(crate) fn resolve_client(config: &TuiConfig) -> EngineClient {
    let mut dir = std::env::current_dir().unwrap_or_default();
    loop {
        if let Some(info) = daemon::find_running_daemon(&dir) {
            return EngineClient::from_url(&format!("http://127.0.0.1:{}", info.port));
        }
        if !dir.pop() {
            break;
        }
    }
    EngineClient::new(config)
}

/// Create an engine client and verify the engine is running.
/// Daemon-aware retry with exponential backoff: if a daemon PID is found,
/// retries up to 25 times (~6.4s) to allow cold start.
/// Without a PID, retries only 5 times (~3.1s) before auto-launching.
pub(crate) async fn ensure_engine(config: &TuiConfig) -> Result<EngineClient, i32> {
    let project_path = std::env::current_dir().unwrap_or_default();
    let daemon_exists = daemon::find_running_daemon(&project_path).is_some();

    // First try: check for existing daemon
    let client = resolve_client(config);

    // Daemon PID found → longer retry (engine cold start takes 2-5s)
    // No daemon PID → short retry before falling through to auto-launch
    let max_retries: u32 = if daemon_exists { 25 } else { 5 };
    let initial_delay_ms = 200u64;

    for attempt in 0..max_retries {
        match client.status().await {
            Ok(status) if status.ready => return Ok(client),
            _ => {
                if attempt < max_retries - 1 {
                    let delay = initial_delay_ms * 2u64.pow(attempt.min(4));
                    tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
                }
            }
        }
    }

    if daemon_exists {
        // Daemon PID exists but engine is still unresponsive — do NOT
        // auto-launch a second engine (prevents PID conflict / competing instances).
        let total_wait: u64 = (0..max_retries)
            .map(|a| initial_delay_ms * 2u64.pow(a.min(4)))
            .sum();
        eprintln!(
            "Error: Daemon process found but engine not responding after ~{}s.",
            total_wait / 1000
        );
        eprintln!("Try: complior daemon stop && complior daemon start");
        return Err(1);
    }

    // No running daemon found — try to auto-start engine
    let engine_root = super::agent::find_engine_root(&project_path);

    if let Some(root) = engine_root {
        eprintln!("Engine not responding. Starting engine...");
        let pid_path = daemon::pid_file_path(&project_path);
        let mut mgr = EngineManager::new(&root);
        match mgr.start_with_pid(&pid_path, false) {
            Ok(port) => {
                let new_client = EngineClient::from_url(&format!("http://127.0.0.1:{port}"));
                if mgr.wait_for_ready(&new_client).await {
                    // Leak the manager so it doesn't get dropped (and killed) when this
                    // function returns. The engine stays alive for the duration of the command.
                    std::mem::forget(mgr);
                    return Ok(new_client);
                }
                eprintln!("Error: Engine started but failed health check.");
            }
            Err(e) => {
                eprintln!("Error: Could not auto-start engine: {e}");
            }
        }
    }

    eprintln!("Error: Engine not running. Start with: complior daemon");
    Err(1)
}

/// Canonical onboarding step labels (matches engine STEP_DEFINITIONS).
pub(crate) const ONBOARDING_STEP_NAMES: [&str; 5] = [
    "Detect Project",
    "First Compliance Scan",
    "Generate Agent Passport",
    "Top-3 Quick Fixes",
    "Generate Compliance Document",
];

/// Resolve project path from an optional CLI flag, falling back to CWD.
pub(crate) fn resolve_project_path(path: Option<&str>) -> String {
    path.map(ToString::to_string)
        .unwrap_or_else(|| {
            std::env::current_dir()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string()
        })
}

/// Resolve project path as `PathBuf` from an optional CLI flag, falling back to CWD.
pub(crate) fn resolve_project_path_buf(path: Option<&str>) -> std::path::PathBuf {
    path.map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
}

/// Print onboarding status (step list + progress).
///
/// `step_command` is the CLI command prefix for the "Next" hint,
/// e.g. `"complior onboarding step"` or `"complior agent onboard --step"`.
pub(crate) fn print_onboarding_status(value: &serde_json::Value, step_command: &str) {
    let progress = value.get("progress");
    let pct = progress
        .and_then(|p| p.get("percentage"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let completed_steps = progress
        .and_then(|p| p.get("completedSteps"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    println!();
    println!("Onboarding: {completed_steps}/5 steps ({pct}%)");
    println!("{}", "-".repeat(40));

    if let Some(state) = value.get("state") {
        if let Some(steps) = state.get("steps").and_then(|v| v.as_array()) {
            for step in steps {
                let num = step.get("step").and_then(|v| v.as_u64()).unwrap_or(0);
                let label = step
                    .get("label")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let status = step
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("pending");
                let icon = match status {
                    "completed" => "\u{2713}",
                    "in_progress" => "\u{25b6}",
                    "skipped" => "-",
                    _ => " ",
                };
                println!("  {icon} {num}. {label}");
            }
        }

        let current = state
            .get("currentStep")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let status = state
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("?");
        if status == "in_progress" && current > 0 {
            println!();
            println!("Next: {step_command} {current}");
        } else if status == "completed" {
            println!();
            println!("Onboarding complete!");
        }
    }

    println!();
}

/// Print the result of a single onboarding step.
///
/// `step_command` is the CLI command prefix for the "Next" hint.
pub(crate) fn print_onboarding_step_result(value: &serde_json::Value, step: u32, step_command: &str) {
    let name = ONBOARDING_STEP_NAMES
        .get(step as usize - 1)
        .unwrap_or(&"?");

    println!();
    println!("\u{2713} Step {step}: {name}");

    if let Some(data) = value.get("data") {
        match step {
            1 => {
                let lang = data
                    .get("language")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let fw = data
                    .get("framework")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let ai = data
                    .get("aiLibraries")
                    .and_then(|v| v.as_array())
                    .map(|a| {
                        a.iter()
                            .filter_map(|v| v.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    })
                    .unwrap_or_default();
                println!("  Language:  {lang}");
                println!("  Framework: {fw}");
                if !ai.is_empty() {
                    println!("  AI SDKs:   {ai}");
                }
            }
            2 => {
                let score = data
                    .get("score")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let files = data
                    .get("filesScanned")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let findings = data
                    .get("totalFindings")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                println!("  Score:    {score}%");
                println!("  Files:    {files}");
                println!("  Findings: {findings}");
            }
            3 => {
                let count = data
                    .get("agentsFound")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                println!("  Agents discovered: {count}");
                if let Some(agents) = data.get("agents").and_then(|v| v.as_array()) {
                    for agent in agents {
                        let n = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let lvl = agent
                            .get("autonomyLevel")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        println!("    - {n} ({lvl})");
                    }
                }
            }
            4 => {
                if let Some(fixes) = data.get("fixes").and_then(|v| v.as_array()) {
                    println!("  Suggested fixes: {}", fixes.len());
                    for fix in fixes {
                        let msg = fix.get("message").and_then(|v| v.as_str()).unwrap_or("?");
                        let sev = fix.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
                        println!("    [{sev}] {msg}");
                    }
                }
            }
            5 => {
                let doc_type = data
                    .get("documentType")
                    .and_then(|v| v.as_str())
                    .unwrap_or("none");
                if doc_type == "fria" {
                    let saved_path = data
                        .get("savedPath")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?");
                    println!("  Generated: FRIA report");
                    println!("  Saved to:  {saved_path}");
                } else {
                    let msg = data
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("No document needed");
                    println!("  {msg}");
                }
            }
            _ => {}
        }
    }

    if let Some(progress) = value.get("progress") {
        let pct = progress
            .get("percentage")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let completed_steps = progress
            .get("completedSteps")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        println!("  Progress: {completed_steps}/5 ({pct}%)");

        if pct < 100 {
            let next = step + 1;
            if next <= 5 {
                println!();
                println!("Next: {step_command} {next}");
            }
        } else {
            println!();
            println!("Onboarding complete!");
        }
    }

    println!();
}
