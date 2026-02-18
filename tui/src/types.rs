use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// --- Engine API response types (mirror TS Engine JSON) ---

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Zone {
    Red,
    Yellow,
    Green,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    pub check_id: String,
    pub r#type: String,
    pub message: String,
    pub severity: Severity,
    #[serde(default)]
    pub obligation_id: Option<String>,
    #[serde(default)]
    pub article_reference: Option<String>,
    #[serde(default)]
    pub fix: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryScore {
    pub category_id: String,
    pub category_name: String,
    pub score: f64,
    pub passed: u32,
    pub failed: u32,
    pub skipped: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreBreakdown {
    pub total_score: f64,
    pub zone: Zone,
    pub category_scores: Vec<CategoryScore>,
    pub critical_cap_applied: bool,
    pub total_checks: u32,
    pub passed_checks: u32,
    pub failed_checks: u32,
    pub skipped_checks: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub score: ScoreBreakdown,
    pub findings: Vec<Finding>,
    pub project_path: String,
    pub scanned_at: String,
    pub duration: u64,
    pub files_scanned: u32,
}

// Re-derive Serialize for nested types used in session save
impl Serialize for ScoreBreakdown {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("ScoreBreakdown", 8)?;
        state.serialize_field("totalScore", &self.total_score)?;
        state.serialize_field("zone", &format!("{:?}", self.zone).to_lowercase())?;
        state.serialize_field("categoryScores", &self.category_scores)?;
        state.serialize_field("criticalCapApplied", &self.critical_cap_applied)?;
        state.serialize_field("totalChecks", &self.total_checks)?;
        state.serialize_field("passedChecks", &self.passed_checks)?;
        state.serialize_field("failedChecks", &self.failed_checks)?;
        state.serialize_field("skippedChecks", &self.skipped_checks)?;
        state.end()
    }
}

impl Serialize for CategoryScore {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("CategoryScore", 6)?;
        state.serialize_field("categoryId", &self.category_id)?;
        state.serialize_field("categoryName", &self.category_name)?;
        state.serialize_field("score", &self.score)?;
        state.serialize_field("passed", &self.passed)?;
        state.serialize_field("failed", &self.failed)?;
        state.serialize_field("skipped", &self.skipped)?;
        state.end()
    }
}

impl Serialize for Finding {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("Finding", 4)?;
        state.serialize_field("checkId", &self.check_id)?;
        state.serialize_field("type", &self.r#type)?;
        state.serialize_field("message", &self.message)?;
        state.serialize_field("severity", &format!("{:?}", self.severity).to_lowercase())?;
        state.end()
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct EngineStatus {
    pub ready: bool,
    #[serde(default)]
    pub version: Option<String>,
}

// --- TUI-internal types ---

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

fn chrono_now() -> String {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Panel {
    Chat,
    Score,
    FileBrowser,
    CodeViewer,
    Terminal,
    DiffPreview,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputMode {
    Normal,
    Insert,
    Command,
    Visual,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EngineConnectionStatus {
    Connecting,
    Connected,
    Disconnected,
    Error,
}

#[derive(Debug, Clone)]
pub struct FileEntry {
    pub path: PathBuf,
    pub name: String,
    pub is_dir: bool,
    pub depth: usize,
    pub expanded: bool,
}

#[derive(Debug, Clone)]
pub struct Selection {
    pub start_line: usize,
    pub end_line: usize,
}

#[derive(Debug, Clone)]
pub struct DiffLine {
    pub kind: DiffLineKind,
    pub content: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiffLineKind {
    Context,
    Added,
    Removed,
    Header,
}

#[derive(Debug, Clone)]
pub struct DiffContent {
    pub file_path: String,
    pub lines: Vec<DiffLine>,
}

/// Rich content blocks within a chat message (agent events).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChatBlock {
    Text(String),
    Thinking(String),
    ToolCall { tool_name: String, args: String },
    ToolResult { tool_name: String, result: String, is_error: bool },
}

/// Overlay state for popups (command palette, file picker, help, getting started, providers)
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Overlay {
    None,
    CommandPalette,
    FilePicker,
    Help,
    GettingStarted,
    ProviderSetup,
    ModelSelector,
}
