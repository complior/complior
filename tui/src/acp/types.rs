//! JSON-RPC 2.0 envelope types and ACP-specific event structures.

use serde::Deserialize;
use serde_json::Value;

// ─── JSON-RPC 2.0 response/notification envelope ───────────────────────────

#[derive(Debug, Deserialize)]
pub struct AcpResponse {
    #[allow(dead_code)]
    pub jsonrpc: Option<String>,
    pub id: Option<u64>,
    pub result: Option<Value>,
    pub error: Option<Value>,
    pub method: Option<String>,
    pub params: Option<Value>,
}

// ─── Agent capabilities advertised during handshake ─────────────────────────

#[derive(Debug, Clone, Default)]
pub struct AcpCapabilities {
    pub file_write: bool,
    pub tool_call: bool,
}

// ─── Parsed ACP events ─────────────────────────────────────────────────────

/// A structured event received from (or synthesised about) an ACP agent.
#[derive(Debug, Clone)]
pub enum AcpEvent {
    /// Handshake response received — capabilities negotiated.
    Initialized(AcpCapabilities),
    /// A streamed text token.
    Token { text: String },
    /// The agent called a tool.
    ToolCall { id: String, name: String, args: Value },
    /// The agent wants to write a file (intercepted by ComplianceGate).
    FileWrite { path: String, content: String },
    /// Agent finished the current turn.
    Done,
    /// Protocol or subprocess error.
    Error(String),
    /// Compliance gate rejected a file/write.
    GateRejected { path: String, reason: String },
}

impl AcpEvent {
    /// Human-readable single-line representation for the agent grid.
    pub fn display_line(&self) -> String {
        match self {
            Self::Initialized(_) => "[acp] connected".to_string(),
            Self::Token { text } => text.clone(),
            Self::ToolCall { name, .. } => format!("[tool] {name}"),
            Self::FileWrite { path, .. } => format!("[file/write] {path}"),
            Self::GateRejected { path, reason } => {
                format!("[GATE REJECTED] {path}: {reason}")
            }
            Self::Done => "[done]".to_string(),
            Self::Error(e) => format!("[error] {e}"),
        }
    }
}
