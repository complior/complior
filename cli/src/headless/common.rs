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
    ensure_engine_for(config, &std::env::current_dir().unwrap_or_default()).await
}

/// Like `ensure_engine` but with an explicit project path (used by commands
/// that accept a `[path]` argument, so the engine writes files to the correct directory).
pub(crate) async fn ensure_engine_for(config: &TuiConfig, project_path: &std::path::Path) -> Result<EngineClient, i32> {
    let project_path = project_path.to_path_buf();
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
        let mut mgr = EngineManager::new(&root).with_project_path(&project_path);
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

/// Resolve project path from an optional CLI flag, falling back to CWD.
/// Always returns an absolute path (relative paths resolved against CWD).
pub(crate) fn resolve_project_path(path: Option<&str>) -> String {
    resolve_project_path_buf(path).to_string_lossy().to_string()
}

/// Resolve project path as `PathBuf` from an optional CLI flag, falling back to CWD.
/// Always returns an absolute path (relative paths resolved against CWD).
pub(crate) fn resolve_project_path_buf(path: Option<&str>) -> std::path::PathBuf {
    let cwd = std::env::current_dir().unwrap_or_default();
    match path {
        Some(p) => {
            let pb = std::path::PathBuf::from(p);
            if pb.is_absolute() { pb } else { cwd.join(pb) }
        }
        None => cwd,
    }
}

