use std::collections::HashMap;
use super::registry::{AgentConfig, AgentProtocol};

/// Default configuration for the Claude Code CLI agent.
pub fn claude_code_defaults() -> AgentConfig {
    AgentConfig {
        id: "claude-code".into(),
        display_name: "Claude Code".into(),
        binary: "claude".into(),
        args: vec![],
        ready_pattern: r"> $".into(),
        env: HashMap::new(),
        auto_start: false,
        protocol: AgentProtocol::Pty,
    }
}
