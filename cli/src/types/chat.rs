use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: MessageRole,
    pub content: String,
    pub blocks: Vec<ChatBlock>,
    pub timestamp: String,
}

impl ChatMessage {
    pub fn new(role: MessageRole, content: String) -> Self {
        Self {
            role,
            content,
            blocks: Vec::new(),
            timestamp: chrono_now(),
        }
    }
}

pub fn chrono_now() -> String {
    // Simple HH:MM format from system time
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let hours = (now % 86400) / 3600;
    let mins = (now % 3600) / 60;
    format!("{hours:02}:{mins:02}")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

/// Rich content blocks within a chat message (agent events).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChatBlock {
    Text(String),
    Thinking(String),
    ToolCall {
        tool_name: String,
        args: String,
    },
    ToolResult {
        tool_name: String,
        result: String,
        is_error: bool,
    },
}

/// State of an in-progress SSE stream from the LLM.
#[derive(Debug, Clone, Default)]
pub struct StreamingState {
    pub partial_text: String,
    pub blocks: Vec<ChatBlock>,
    pub active: bool,
    /// When the stream started (for elapsed time display).
    pub stream_start: Option<std::time::Instant>,
}

/// LLM config passed per-request (provider/model/apiKey).
#[derive(Debug, Clone, Default)]
pub struct LlmSessionConfig {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub api_key: Option<String>,
}
