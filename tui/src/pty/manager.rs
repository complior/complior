use std::io;

use portable_pty::PtySize;

use crate::acp::AcpSession;
use crate::agents::registry::{AgentConfig, AgentProtocol};

use super::session::{AgentSession, AgentState};

/// A handle to an active agent session, either PTY or ACP.
pub enum AgentHandle {
    Pty(AgentSession),
    Acp(AcpSession),
}

impl AgentHandle {
    pub fn id(&self) -> usize {
        match self {
            Self::Pty(s) => s.id,
            Self::Acp(s) => s.id,
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            Self::Pty(s) => &s.config.display_name,
            Self::Acp(s) => &s.config.display_name,
        }
    }

    pub fn state(&self) -> AgentState {
        match self {
            Self::Pty(s) => s.state,
            Self::Acp(s) => s.state,
        }
    }

    pub fn config(&self) -> &AgentConfig {
        match self {
            Self::Pty(s) => &s.config,
            Self::Acp(s) => &s.config,
        }
    }

    /// Return the last `n` lines for display in the agent grid.
    ///
    /// For PTY sessions: uses the VT100 screen emulator (handles cursor-
    /// positioned output from interactive TUI agents like Claude Code).
    /// Falls back to the raw ring buffer if the vt100 screen is empty.
    pub fn last_lines(&self, n: usize) -> Vec<String> {
        match self {
            Self::Pty(s) => {
                let rows = s.screen_rows(n);
                if rows.iter().any(|l| !l.is_empty()) {
                    rows
                } else if let Ok(guard) = s.output.lock() {
                    guard.visible_lines(n)
                } else {
                    Vec::new()
                }
            }
            Self::Acp(s) => s.last_lines(n),
        }
    }

    /// Kill the agent session.
    pub fn kill(&mut self) {
        match self {
            Self::Pty(s) => s.kill(),
            Self::Acp(s) => s.kill(),
        }
    }

    /// Send raw bytes to a PTY session (used for passthrough mode).
    pub fn send_raw(&mut self, bytes: &[u8]) {
        if let Self::Pty(s) = self {
            if let Err(e) = s.send_raw(bytes) {
                tracing::warn!("PTY send_raw error: {e}");
            }
        }
    }

    /// Send raw text input (PTY) or a prompt (ACP).
    ///
    /// For ACP sessions this is a fire-and-forget spawn (errors are logged).
    pub fn send_input(&mut self, text: &str) {
        match self {
            Self::Pty(s) => {
                if let Err(e) = s.send_input(text) {
                    tracing::warn!("PTY send_input error: {e}");
                }
            }
            Self::Acp(_) => {
                // ACP prompts are async; caller should use send_prompt_async
                // or drive via AppCommand.
                tracing::debug!("send_input called on ACP session — use send_prompt_async");
            }
        }
    }

    /// Check if this is an ACP handle.
    pub fn is_acp(&self) -> bool {
        matches!(self, Self::Acp(_))
    }

    /// Downcast to mutable ACP session.
    pub fn as_acp_mut(&mut self) -> Option<&mut AcpSession> {
        match self {
            Self::Acp(s) => Some(s),
            Self::Pty(_) => None,
        }
    }

    /// Downcast to PTY session (immutable).
    pub fn as_pty(&self) -> Option<&AgentSession> {
        match self {
            Self::Pty(s) => Some(s),
            Self::Acp(_) => None,
        }
    }

    /// Downcast to mutable PTY session.
    pub fn as_pty_mut(&mut self) -> Option<&mut AgentSession> {
        match self {
            Self::Pty(s) => Some(s),
            Self::Acp(_) => None,
        }
    }
}

// ─── AgentManager ──────────────────────────────────────────────────────────

/// Manages all active agent sessions (PTY and ACP).
///
/// `PtyManager` is a type alias for backward compatibility.
pub struct AgentManager {
    handles: Vec<AgentHandle>,
    next_id: usize,
}

impl AgentManager {
    pub fn new() -> Self {
        Self { handles: Vec::new(), next_id: 0 }
    }

    /// Spawn a new agent session and return its id.
    ///
    /// Dispatches to PTY or ACP based on `config.protocol`.
    pub async fn launch(
        &mut self,
        config: AgentConfig,
        size: PtySize,
    ) -> io::Result<usize> {
        let id = self.next_id;
        self.next_id += 1;

        let handle = match config.protocol {
            AgentProtocol::Acp => {
                let session = AcpSession::spawn(id, config).await?;
                AgentHandle::Acp(session)
            }
            AgentProtocol::Pty => {
                let session = AgentSession::spawn(id, config, size)?;
                AgentHandle::Pty(session)
            }
        };

        self.handles.push(handle);
        Ok(id)
    }

    pub fn get(&self, id: usize) -> Option<&AgentHandle> {
        self.handles.iter().find(|h| h.id() == id)
    }

    pub fn get_mut(&mut self, id: usize) -> Option<&mut AgentHandle> {
        self.handles.iter_mut().find(|h| h.id() == id)
    }

    /// Kill a session (marks Dead but keeps entry for display).
    pub fn kill(&mut self, id: usize) {
        if let Some(handle) = self.get_mut(id) {
            handle.kill();
        }
    }

    /// Remove a Dead session from the list entirely.
    pub fn remove_dead(&mut self, id: usize) {
        self.handles.retain(|h| !(h.id() == id && h.state() == AgentState::Dead));
    }

    pub fn sessions(&self) -> &[AgentHandle] {
        &self.handles
    }

    /// Resize all live PTY sessions.
    pub fn resize_all(&mut self, size: PtySize) {
        for handle in &mut self.handles {
            if let AgentHandle::Pty(s) = handle {
                s.resize(size);
            }
        }
    }

    /// Poll all PTY sessions for exit and update their state.
    pub fn poll_exits(&mut self) {
        for handle in &mut self.handles {
            if let AgentHandle::Pty(s) = handle {
                s.poll_exit();
            }
        }
    }

    pub fn session_count(&self) -> usize {
        self.handles.len()
    }

    /// Get a mutable PTY session reference (backward-compat helper).
    pub fn get_pty_mut(&mut self, id: usize) -> Option<&mut AgentSession> {
        self.handles
            .iter_mut()
            .find(|h| h.id() == id)
            .and_then(AgentHandle::as_pty_mut)
    }

    /// Poll all ACP sessions for new events.
    ///
    /// Returns gate notifications as `(message, is_rejection)` pairs.
    pub async fn poll_acp_events(&mut self) -> Vec<(String, bool)> {
        let mut all = Vec::new();
        for handle in &mut self.handles {
            if let AgentHandle::Acp(session) = handle {
                let notifs = session.poll_events().await;
                all.extend(notifs);
            }
        }
        all
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Backward-compatible alias — existing code using `PtyManager` continues to work.
pub type PtyManager = AgentManager;
