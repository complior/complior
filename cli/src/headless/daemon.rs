//! Daemon management commands: start, status, stop.

use std::path::Path;
use std::process::Stdio;

use crate::cli::DaemonAction;
use crate::config::TuiConfig;
use crate::daemon;
use crate::engine_client::EngineClient;

/// Entry point for `complior daemon [action] [--watch]`.
pub async fn run_daemon(
    action: Option<&DaemonAction>,
    top_level_watch: bool,
    project_path: &Path,
    config: &TuiConfig,
) {
    match action {
        Some(DaemonAction::Status) => run_daemon_status(project_path, config).await,
        Some(DaemonAction::Stop) => run_daemon_stop(project_path),
        Some(DaemonAction::Start { watch, port }) => {
            run_daemon_start(*watch || top_level_watch, *port, project_path, config).await;
        }
        // `complior daemon` (no subcommand) = `complior daemon start --watch`
        None => {
            run_daemon_start(true, None, project_path, config).await;
        }
    }
}

/// Start the daemon (foreground). If already running, print info and exit.
async fn run_daemon_start(
    watch: bool,
    port: Option<u16>,
    project_path: &Path,
    _config: &TuiConfig,
) {
    // Check for existing daemon
    if let Some(info) = daemon::find_running_daemon(project_path) {
        println!(
            "Daemon already running on port {} (PID {}), started at {}",
            info.port, info.pid, info.started_at
        );
        return;
    }

    let pid_path = daemon::pid_file_path(project_path);

    // Determine engine directory
    let engine_dir = find_engine_dir();

    let entry = engine_dir.join("src").join("server.ts");
    if !entry.exists() {
        eprintln!("Error: Engine not found at {}", entry.display());
        std::process::exit(1);
    }

    // Find a port: use --port if given, otherwise try default 3099, then any free port
    let target_port = port.unwrap_or_else(|| {
        crate::engine_process::find_preferred_port(crate::config::DEFAULT_ENGINE_PORT)
            .unwrap_or_else(|e| {
                eprintln!("Error: Cannot find free port: {e}");
                std::process::exit(1);
            })
    });

    // Ensure .complior/ exists
    if let Some(parent) = pid_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    println!("Starting Complior daemon on port {target_port}...");
    if watch {
        println!("File watcher enabled.");
    }

    // Spawn TS engine
    let mut cmd = std::process::Command::new("npx");
    cmd.args(["tsx", "src/server.ts"])
        .current_dir(&engine_dir)
        .env("PORT", target_port.to_string())
        .env("COMPLIOR_PID_FILE", pid_path.to_string_lossy().as_ref())
        .env(
            "COMPLIOR_PROJECT_PATH",
            project_path.to_string_lossy().as_ref(),
        )
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    if watch {
        cmd.env("COMPLIOR_WATCH", "1");
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error: Failed to spawn engine: {e}");
            std::process::exit(1);
        }
    };

    // Wait for engine health
    let client = EngineClient::from_url(&format!("http://127.0.0.1:{target_port}"));
    let ready = wait_for_engine(&client).await;

    if ready {
        println!(
            "Complior daemon running on port {target_port} (PID {})",
            child.id()
        );
    } else {
        eprintln!("Warning: Engine started but health check timed out. It may still be loading.");
    }

    // Stay foreground — wait for Ctrl+C
    match tokio::signal::ctrl_c().await {
        Ok(()) => {
            println!("\nShutting down daemon...");
        }
        Err(e) => {
            eprintln!("Error waiting for Ctrl+C: {e}");
        }
    }

    // Kill child process
    let _ = child.kill();
    let _ = child.wait();

    // Clean up PID file (engine should have done it, but just in case)
    daemon::remove_pid_file(&pid_path);
    println!("Daemon stopped.");
}

/// Show daemon status.
async fn run_daemon_status(project_path: &Path, config: &TuiConfig) {
    match daemon::find_running_daemon(project_path) {
        None => {
            println!("No daemon running.");
            println!("Start one with: complior daemon");
        }
        Some(info) => {
            println!("Daemon running:");
            println!("  PID:        {}", info.pid);
            println!("  Port:       {}", info.port);
            println!("  Started at: {}", info.started_at);

            // Try to get engine status
            let url = config
                .engine_url_override
                .clone()
                .unwrap_or_else(|| format!("http://127.0.0.1:{}", info.port));
            let client = EngineClient::from_url(&url);
            match client.status().await {
                Ok(status) if status.ready => {
                    println!("  Engine:     ready");
                    if let Some(ref ver) = status.version {
                        println!("  Version:    {ver}");
                    }
                }
                Ok(_) => {
                    println!("  Engine:     not ready");
                }
                Err(_) => {
                    println!("  Engine:     unreachable");
                }
            }
        }
    }
}

/// Stop the running daemon.
fn run_daemon_stop(project_path: &Path) {
    let pid_path = daemon::pid_file_path(project_path);

    match daemon::find_running_daemon(project_path) {
        None => {
            println!("No daemon running.");
        }
        Some(info) => {
            println!("Stopping daemon (PID {})...", info.pid);

            // Send SIGTERM
            #[cfg(unix)]
            {
                unsafe {
                    libc::kill(info.pid.cast_signed(), libc::SIGTERM);
                }

                // Wait up to 5 seconds for graceful shutdown
                let mut stopped = false;
                for _ in 0..50 {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    if !daemon::is_process_alive(info.pid) {
                        stopped = true;
                        break;
                    }
                }

                if !stopped {
                    eprintln!("Daemon did not stop gracefully, sending SIGKILL...");
                    unsafe {
                        libc::kill(info.pid.cast_signed(), libc::SIGKILL);
                    }
                    std::thread::sleep(std::time::Duration::from_millis(200));
                }
            }

            #[cfg(not(unix))]
            {
                // Windows: use taskkill for graceful stop, then force after timeout
                let graceful = std::process::Command::new("taskkill")
                    .args(["/PID", &info.pid.to_string()])
                    .output();
                match graceful {
                    Ok(o) if o.status.success() => {
                        // Wait up to 5 seconds for process to exit
                        for _ in 0..25 {
                            std::thread::sleep(std::time::Duration::from_millis(200));
                            if !daemon::is_process_alive(info.pid) {
                                break;
                            }
                        }
                        if daemon::is_process_alive(info.pid) {
                            eprintln!("Daemon did not stop gracefully, forcing...");
                            let _ = std::process::Command::new("taskkill")
                                .args(["/F", "/PID", &info.pid.to_string()])
                                .output();
                            std::thread::sleep(std::time::Duration::from_millis(200));
                        }
                    }
                    _ => {
                        // Graceful failed, try force
                        let _ = std::process::Command::new("taskkill")
                            .args(["/F", "/PID", &info.pid.to_string()])
                            .output();
                        std::thread::sleep(std::time::Duration::from_millis(200));
                    }
                }
            }

            // Clean up PID file
            daemon::remove_pid_file(&pid_path);
            println!("Daemon stopped.");
        }
    }
}

/// Determine the engine directory from env or workspace root.
fn find_engine_dir() -> std::path::PathBuf {
    // Check env var first (Docker/custom setups)
    if let Ok(dir) = std::env::var("COMPLIOR_ENGINE_DIR") {
        return std::path::PathBuf::from(dir);
    }

    // Default: workspace root / engine / core
    let workspace_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."));
    workspace_root.join("engine").join("core")
}

/// Wait for the engine to become healthy (30 × 200ms = 6s).
async fn wait_for_engine(client: &EngineClient) -> bool {
    for _ in 0..30 {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        if let Ok(status) = client.status().await
            && status.ready
        {
            return true;
        }
    }
    false
}
