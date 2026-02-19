use std::net::TcpListener;
use std::path::PathBuf;
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
            engine_dir: workspace_root.join("engine"),
        }
    }

    /// Create a manager for external mode (`--engine-url` provided).
    pub fn external(port: u16) -> Self {
        Self {
            child: None,
            port,
            status: EngineProcessStatus::External,
            restart_count: 0,
            engine_dir: PathBuf::new(),
        }
    }

    /// Find a free port and spawn the engine.
    pub fn start(&mut self) -> Result<u16, String> {
        let entry = self.engine_dir.join("src").join("server.ts");
        if !entry.exists() {
            return Err(format!("Engine not found at {}", entry.display()));
        }

        let port = find_free_port().map_err(|e| format!("Cannot find free port: {e}"))?;
        self.port = port;

        let child = Command::new("npx")
            .args(["tsx", "src/server.ts"])
            .current_dir(&self.engine_dir)
            .env("PORT", port.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
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

    /// Kill the child process and clean up.
    pub fn shutdown(&mut self) {
        if let Some(ref mut child) = self.child {
            let _ = child.kill();
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

/// Find a free TCP port by binding to port 0.
fn find_free_port() -> std::io::Result<u16> {
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
}
