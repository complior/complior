//! ACP session — analogous to `AgentSession` but for JSON-RPC agents.

use std::io;

use crate::agents::registry::AgentConfig;
use crate::pty::session::AgentState;

use super::client::AcpClient;
use super::gate::{ComplianceGate, GateDecision};
use super::types::AcpEvent;

/// An active ACP session hosting a guest coding agent.
pub struct AcpSession {
    pub id: usize,
    pub config: AgentConfig,
    pub state: AgentState,
    /// Ordered log of events for display in the Agent Grid.
    pub events: Vec<AcpEvent>,
    /// Scroll offset for the agent's viewport.
    pub scroll_offset: usize,
    client: AcpClient,
    gate: ComplianceGate,
}

impl AcpSession {
    /// Spawn the agent subprocess and perform the ACP handshake.
    ///
    /// On success the session is in `AgentState::Ready`.
    /// On handshake failure the session starts in `AgentState::Starting`
    /// (will retry in subsequent poll cycles).
    pub async fn spawn(id: usize, config: AgentConfig) -> io::Result<Self> {
        let mut client = AcpClient::spawn(&config)?;

        let state = match client.initialize().await {
            Ok(caps) => {
                tracing::info!(
                    "ACP handshake OK (file_write={}, tool_call={})",
                    caps.file_write,
                    caps.tool_call
                );
                AgentState::Ready
            }
            Err(e) => {
                tracing::warn!("ACP handshake failed: {e}");
                AgentState::Starting
            }
        };

        Ok(Self {
            id,
            config,
            state,
            events: Vec::new(),
            scroll_offset: 0,
            client,
            gate: ComplianceGate::new(),
        })
    }

    /// Send a prompt to the agent.
    pub async fn send_prompt(&mut self, text: &str) -> io::Result<()> {
        self.state = AgentState::Working;
        self.client.prompt(text).await
    }

    /// Kill the agent subprocess.
    pub fn kill(&mut self) {
        self.client.cancel();
        self.state = AgentState::Dead;
    }

    /// Drain pending events from the client, run file/write events through
    /// the compliance gate, and push all events to `self.events`.
    ///
    /// Returns gate notifications as `(message, is_rejection)` pairs so the
    /// caller can surface them as toast messages.
    pub async fn poll_events(&mut self) -> Vec<(String, bool)> {
        let mut notifications = Vec::new();

        loop {
            match self.client.events.try_recv() {
                Ok(event) => {
                    match &event {
                        AcpEvent::FileWrite { path, content } => {
                            match self.gate.check_file_write(path, content) {
                                GateDecision::Pass => {
                                    let msg = format!(
                                        "Compliance gate: PASS — {}",
                                        path
                                    );
                                    notifications.push((msg, false));
                                    self.events.push(event);
                                }
                                GateDecision::Reject { reason } => {
                                    let msg = format!(
                                        "Compliance gate: REJECTED — {reason}"
                                    );
                                    notifications.push((msg.clone(), true));
                                    // Replace the event with a GateRejected marker
                                    self.events.push(AcpEvent::GateRejected {
                                        path: path.clone(),
                                        reason: reason.clone(),
                                    });
                                }
                            }
                        }
                        AcpEvent::Done => {
                            self.state = AgentState::Ready;
                            self.events.push(event);
                        }
                        AcpEvent::Error(_) => {
                            self.state = AgentState::Dead;
                            self.events.push(event);
                        }
                        AcpEvent::Initialized(_) => {
                            self.state = AgentState::Ready;
                            self.events.push(event);
                        }
                        _ => {
                            self.events.push(event);
                        }
                    }
                }
                Err(tokio::sync::mpsc::error::TryRecvError::Empty) => break,
                Err(tokio::sync::mpsc::error::TryRecvError::Disconnected) => {
                    if self.state != AgentState::Dead {
                        self.state = AgentState::Dead;
                        self.events.push(AcpEvent::Error(
                            "agent process exited".to_string(),
                        ));
                    }
                    break;
                }
            }
        }

        notifications
    }

    /// Return the last `n` events as display lines (most recent last).
    pub fn last_lines(&self, n: usize) -> Vec<String> {
        let start = self.events.len().saturating_sub(n);
        self.events[start..].iter().map(AcpEvent::display_line).collect()
    }
}

// ─── Integration tests ─────────────────────────────────────────────────────
//
// These tests spawn the `mock_acp_agent` binary (built alongside the main
// binary). The `CARGO_BIN_EXE_mock_acp_agent` env var is set by Cargo when
// running tests for a binary/library crate that also compiles binaries.

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agents::registry::AgentProtocol;
    use std::collections::HashMap;

    fn mock_config() -> AgentConfig {
        // The mock binary is in target/debug/ (one level above the deps/ dir
        // where the test executable lives).
        let binary = std::env::current_exe()
            .ok()
            .and_then(|p| {
                // Test exe is typically in target/debug/deps/
                // or target/debug/ — try both.
                let parent = p.parent()?;
                let candidate = parent.join("mock_acp_agent");
                if candidate.exists() {
                    return Some(candidate);
                }
                let grandparent = parent.parent()?;
                let candidate2 = grandparent.join("mock_acp_agent");
                if candidate2.exists() {
                    return Some(candidate2);
                }
                None
            })
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| {
                // Last-resort: use CARGO_MANIFEST_DIR (compile-time) + ../target/debug/
                let manifest = env!("CARGO_MANIFEST_DIR");
                format!("{manifest}/../target/debug/mock_acp_agent")
            });

        AgentConfig {
            id: "mock-acp".to_string(),
            display_name: "Mock ACP Agent".to_string(),
            binary,
            args: Vec::new(),
            ready_pattern: String::new(),
            env: HashMap::new(),
            auto_start: false,
            protocol: AgentProtocol::Acp,
        }
    }

    #[tokio::test]
    async fn test_acp_handshake() {
        let session = AcpSession::spawn(0, mock_config()).await;
        assert!(
            session.is_ok(),
            "ACP session spawn should succeed: {:?}",
            session.err()
        );
        let session = session.unwrap();
        assert_eq!(
            session.state,
            AgentState::Ready,
            "session should be Ready after handshake"
        );
    }

    #[tokio::test]
    async fn test_gate_rejects_env_file() {
        let mut session = AcpSession::spawn(0, mock_config()).await.expect("spawn");
        session.send_prompt("write some files").await.expect("prompt");

        tokio::time::sleep(std::time::Duration::from_millis(300)).await;

        let notifications = session.poll_events().await;

        let rejections: Vec<_> = notifications.iter().filter(|(_, r)| *r).collect();
        assert!(
            !rejections.is_empty(),
            "gate should reject .env: got {notifications:?}"
        );
        assert!(
            rejections[0].0.contains("REJECTED"),
            "rejection msg should contain REJECTED: {}",
            rejections[0].0
        );
    }

    #[tokio::test]
    async fn test_gate_passes_clean_file() {
        let mut session = AcpSession::spawn(0, mock_config()).await.expect("spawn");
        session.send_prompt("write some files").await.expect("prompt");

        tokio::time::sleep(std::time::Duration::from_millis(300)).await;

        let notifications = session.poll_events().await;

        let passes: Vec<_> = notifications.iter().filter(|(_, r)| !*r).collect();
        assert!(
            !passes.is_empty(),
            "gate should pass README.md: got {notifications:?}"
        );
        assert!(
            passes[0].0.contains("PASS"),
            "pass msg should contain PASS: {}",
            passes[0].0
        );
    }

    #[tokio::test]
    async fn test_events_logged_in_session() {
        let mut session = AcpSession::spawn(0, mock_config()).await.expect("spawn");
        session.send_prompt("hello").await.expect("prompt");

        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        session.poll_events().await;

        assert!(!session.events.is_empty(), "session.events should be non-empty");
        let lines = session.last_lines(20);
        assert!(!lines.is_empty(), "last_lines should return display text");
    }
}
