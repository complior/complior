use std::collections::HashMap;
use std::path::PathBuf;

use serde::Deserialize;

/// Transport protocol used to communicate with a guest agent.
#[derive(Debug, Clone, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AgentProtocol {
    /// Classic PTY (stdin/stdout raw bytes) — backward-compatible default.
    #[default]
    Pty,
    /// Agent Client Protocol — JSON-RPC 2.0 over stdio.
    Acp,
}

/// Configuration for a single guest coding agent.
#[derive(Debug, Clone, Deserialize)]
pub struct AgentConfig {
    /// Machine-readable identifier, e.g. `"claude-code"`.
    pub id: String,
    /// Human-readable name shown in the UI, e.g. `"Claude Code"`.
    pub display_name: String,
    /// Binary name or path, e.g. `"claude"`.
    pub binary: String,
    /// CLI arguments passed to the binary.
    #[serde(default)]
    pub args: Vec<String>,
    /// Regex pattern matched against stdout to detect the ready/idle state.
    /// Only used for PTY-protocol agents.
    pub ready_pattern: String,
    /// Extra environment variables injected into the agent process.
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// Whether to auto-launch this agent on startup.
    #[serde(default)]
    pub auto_start: bool,
    /// Transport protocol: "pty" (default) or "acp".
    #[serde(default)]
    pub protocol: AgentProtocol,
}

/// Wrapper for `agents.toml` top-level.
#[derive(Debug, Deserialize)]
struct AgentsFile {
    #[serde(default)]
    agent: Vec<AgentConfig>,
}

/// Load agent configurations from `~/.config/complior/agents.toml`.
///
/// Falls back to built-in defaults if the file is absent or invalid.
pub fn load_registry() -> Vec<AgentConfig> {
    if let Some(path) = agents_config_path() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(file) = toml::from_str::<AgentsFile>(&content) {
                if !file.agent.is_empty() {
                    return file.agent;
                }
            }
        }
    }
    default_registry()
}

/// Returns the default path `~/.config/complior/agents.toml`.
pub fn agents_config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("complior").join("agents.toml"))
}

/// Built-in default agents (Claude Code + Codex CLI).
fn default_registry() -> Vec<AgentConfig> {
    vec![
        super::claude_code::claude_code_defaults(),
        super::codex::codex_defaults(),
    ]
}
