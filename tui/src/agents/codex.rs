use std::collections::HashMap;
use super::registry::{AgentConfig, AgentProtocol};

/// Default configuration for the Codex CLI agent.
pub fn codex_defaults() -> AgentConfig {
    AgentConfig {
        id: "codex".into(),
        display_name: "Codex CLI".into(),
        binary: "codex".into(),
        args: vec![],
        ready_pattern: r"codex>".into(),
        env: HashMap::new(),
        auto_start: false,
        protocol: AgentProtocol::Pty,
    }
}
