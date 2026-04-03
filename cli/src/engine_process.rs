use std::net::TcpListener;
#[cfg(unix)]
use std::os::unix::process::CommandExt as _;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

use crate::engine_client::EngineClient;

/// Status of the engine child process.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EngineProcessStatus {
    /// Not started yet.
    NotStarted,
    /// Starting up (spawned, waiting for health).
    Starting,
    /// Running and healthy.
    Running,
    /// Process exited or was killed.
    Stopped,
    /// Using an external engine (--engine-url).
    External,
    /// Failed after max restart attempts.
    Failed,
}

/// Manages an engine child process (auto-launch).
pub struct EngineManager {
    child: Option<Child>,
    pub port: u16,
    pub status: EngineProcessStatus,
    restart_count: u8,
    engine_dir: PathBuf,
    project_path: Option<PathBuf>,
}

const MAX_RESTARTS: u8 = 3;

impl EngineManager {
    /// Create a manager for auto-launch mode.
    /// `workspace_root` should be the complior repo root (containing `engine/`).
    pub fn new(workspace_root: &std::path::Path) -> Self {
        Self {
            child: None,
            port: 0,
            status: EngineProcessStatus::NotStarted,
            restart_count: 0,
            engine_dir: workspace_root.join("engine").join("core"),
            project_path: None,
        }
    }

    /// Create a manager pointing directly at an engine directory (e.g. from COMPLIOR_ENGINE_DIR).
    pub fn from_engine_dir(engine_dir: &std::path::Path) -> Self {
        Self {
            child: None,
            port: 0,
            status: EngineProcessStatus::NotStarted,
            restart_count: 0,
            engine_dir: engine_dir.to_path_buf(),
            project_path: None,
        }
    }

    /// Set the project path that the engine should operate on.
    pub fn with_project_path(mut self, path: &Path) -> Self {
        self.project_path = Some(path.to_path_buf());
        self
    }

    /// Create a manager for external mode (`--engine-url` provided).
    pub const fn external(port: u16) -> Self {
        Self {
            child: None,
            port,
            status: EngineProcessStatus::External,
            restart_count: 0,
            engine_dir: PathBuf::new(),
            project_path: None,
        }
    }

    /// Find a free port and spawn the engine.
    pub fn start(&mut self) -> Result<u16, String> {
        self.start_inner(None, false)
    }

    /// Start the engine with PID file and optional watch mode.
    /// The TS engine will write the PID file at `pid_path` on startup.
    pub fn start_with_pid(&mut self, pid_path: &Path, watch: bool) -> Result<u16, String> {
        self.start_inner(Some(pid_path), watch)
    }

    fn start_inner(&mut self, pid_path: Option<&Path>, watch: bool) -> Result<u16, String> {
        let entry = self.engine_dir.join("src").join("server.ts");
        if !entry.exists() {
            return Err(format!("Engine not found at {}", entry.display()));
        }

        let port = find_preferred_port(crate::config::DEFAULT_ENGINE_PORT)
            .map_err(|e| format!("Cannot find free port: {e}"))?;
        self.port = port;

        let mut cmd = Command::new("npx");
        cmd.args(["tsx", "src/server.ts"])
            .current_dir(&self.engine_dir)
            .env("PORT", port.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(unix)]
        cmd.process_group(0); // Own process group so we can kill npx + tsx + node together

        if let Some(path) = pid_path {
            cmd.env("COMPLIOR_PID_FILE", path.to_string_lossy().as_ref());
        }
        if let Some(ref pp) = self.project_path {
            cmd.env("COMPLIOR_PROJECT_PATH", pp.to_string_lossy().as_ref());
        }
        if watch {
            cmd.env("COMPLIOR_WATCH", "1");
        }

        // Forward LLM API keys so eval --llm and fix --ai work.
        // Source 1: project's .complior/.env (user's API keys)
        // Source 2: parent process env (CI, terminal export, etc.)
        // Project .complior/.env has priority — user's explicit config wins.
        let mut forwarded_keys: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        let api_key_names = [
            "OPENROUTER_API_KEY",
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
        ];

        // Load from parent env first (lower priority)
        for key in &api_key_names {
            if let Ok(val) = std::env::var(key) {
                forwarded_keys.insert(key.to_string(), val);
            }
        }

        // Load from project .complior/.env (higher priority — overwrites parent env)
        if let Some(ref pp) = self.project_path {
            let env_file = pp.join(".complior").join(".env");
            if let Ok(content) = std::fs::read_to_string(&env_file) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() || trimmed.starts_with('#') { continue; }
                    if let Some(eq_pos) = trimmed.find('=') {
                        let key = trimmed[..eq_pos].trim();
                        let val = trimmed[eq_pos + 1..].trim().trim_matches(|c| c == '"' || c == '\'');
                        if api_key_names.contains(&key) {
                            forwarded_keys.insert(key.to_string(), val.to_string());
                        }
                    }
                }
            }
        }

        for (key, val) in &forwarded_keys {
            cmd.env(key, val);
        }

        let child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn engine: {e}"))?;

        self.child = Some(child);
        self.status = EngineProcessStatus::Starting;
        Ok(port)
    }

    /// Blocking health-check loop (30 × 200ms = 6 seconds max).
    pub async fn wait_for_ready(&mut self, client: &EngineClient) -> bool {
        for _ in 0..30 {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            if let Ok(status) = client.status().await
                && status.ready
            {
                self.status = EngineProcessStatus::Running;
                return true;
            }
        }
        false
    }

    /// Check if child process is still alive.
    pub fn is_alive(&mut self) -> bool {
        if matches!(self.status, EngineProcessStatus::External) {
            return true; // Not our process to manage
        }
        if matches!(self.status, EngineProcessStatus::Failed) {
            return false; // Don't touch status — already gave up
        }
        if let Some(ref mut child) = self.child {
            if matches!(child.try_wait(), Ok(None)) {
                true // Still running
            } else {
                self.status = EngineProcessStatus::Stopped;
                false
            }
        } else {
            false
        }
    }

    /// Try to restart the engine (up to `MAX_RESTARTS`).
    pub fn try_restart(&mut self) -> Result<u16, String> {
        if self.status == EngineProcessStatus::External {
            return Err("Cannot restart external engine".to_string());
        }
        if self.restart_count >= MAX_RESTARTS {
            self.status = EngineProcessStatus::Failed;
            return Err(format!("Max restarts ({MAX_RESTARTS}) exceeded"));
        }
        self.restart_count += 1;
        self.shutdown();
        self.start()
    }

    /// Kill the child process group and clean up.
    pub fn shutdown(&mut self) {
        if let Some(ref mut child) = self.child {
            #[cfg(unix)]
            {
                // Kill the entire process group (npx + tsx + node) via negative PID
                let pid = child.id() as i32;
                unsafe { libc::kill(-pid, libc::SIGTERM); }
                // Give processes a moment to exit gracefully
                std::thread::sleep(std::time::Duration::from_millis(200));
                // Force kill if still alive
                unsafe { libc::kill(-pid, libc::SIGKILL); }
            }
            #[cfg(not(unix))]
            {
                let _ = child.kill();
            }
            let _ = child.wait();
        }
        self.child = None;
        if self.status != EngineProcessStatus::External {
            self.status = EngineProcessStatus::Stopped;
        }
    }

    /// Build the engine URL from the port.
    pub fn engine_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }
}

impl Drop for EngineManager {
    fn drop(&mut self) {
        self.shutdown();
    }
}

/// Try to bind to the preferred port first (default 3099), fall back to any free port.
/// This ensures daemon and TUI auto-launch prefer the well-known port,
/// so TUI can connect without needing PID file discovery.
pub fn find_preferred_port(preferred: u16) -> std::io::Result<u16> {
    // Try the preferred port first
    if TcpListener::bind(format!("127.0.0.1:{preferred}")).is_ok() {
        return Ok(preferred);
    }
    // Preferred port is taken — find any free port
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    Ok(port)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_manager_creation() {
        let mgr = EngineManager::new(std::path::Path::new("/tmp"));
        assert_eq!(mgr.status, EngineProcessStatus::NotStarted);
        assert_eq!(mgr.port, 0);
    }

    #[test]
    fn test_engine_manager_external_mode() {
        let mgr = EngineManager::external(4000);
        assert_eq!(mgr.status, EngineProcessStatus::External);
        assert_eq!(mgr.port, 4000);
        assert_eq!(mgr.engine_url(), "http://127.0.0.1:4000");
    }

    #[test]
    fn test_engine_url_construction() {
        let mut mgr = EngineManager::new(std::path::Path::new("/tmp"));
        mgr.port = 5555;
        assert_eq!(mgr.engine_url(), "http://127.0.0.1:5555");
    }

    #[test]
    fn test_max_restarts_exceeded() {
        let mut mgr = EngineManager::new(std::path::Path::new("/tmp"));
        mgr.restart_count = MAX_RESTARTS;
        let result = mgr.try_restart();
        assert!(result.is_err());
        assert_eq!(mgr.status, EngineProcessStatus::Failed);
    }

    #[test]
    fn test_external_mode_shutdown_is_safe() {
        let mut mgr = EngineManager::external(3099);
        mgr.shutdown();
        // Should remain External, not Stopped
        assert_eq!(mgr.status, EngineProcessStatus::External);
    }

    #[test]
    fn test_start_with_pid_missing_engine_returns_error() {
        let mut mgr = EngineManager::new(std::path::Path::new("/tmp/nonexistent"));
        let result = mgr.start_with_pid(std::path::Path::new("/tmp/test.pid"), true);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Engine not found"));
    }
}
