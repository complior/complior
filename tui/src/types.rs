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
    pub category: String,
    pub weight: f64,
    pub score: f64,
    pub obligation_count: u32,
    pub passed_count: u32,
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
        let mut state = s.serialize_struct("CategoryScore", 5)?;
        state.serialize_field("category", &self.category)?;
        state.serialize_field("weight", &self.weight)?;
        state.serialize_field("score", &self.score)?;
        state.serialize_field("obligationCount", &self.obligation_count)?;
        state.serialize_field("passedCount", &self.passed_count)?;
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

/// Activity log entry for the Dashboard widget.
#[derive(Debug, Clone)]
pub struct ActivityEntry {
    pub timestamp: String,
    pub kind: ActivityKind,
    pub detail: String,
}

/// Kind of activity logged to the Dashboard.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActivityKind {
    Scan,
    Fix,
    Chat,
    Watch,
    FileOpen,
}

impl ActivityKind {
    pub fn icon(self) -> char {
        match self {
            Self::Scan => 'S',
            Self::Fix => 'F',
            Self::Chat => 'C',
            Self::Watch => 'W',
            Self::FileOpen => 'O',
        }
    }
}

/// Top-level view (screen) — keys 1-6 in Normal mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewState {
    Dashboard,
    Scan,
    Fix,
    Chat,
    Timeline,
    Report,
}

impl ViewState {
    /// Map key digit to view (1-based).
    pub fn from_key(digit: u8) -> Option<Self> {
        match digit {
            1 => Some(Self::Dashboard),
            2 => Some(Self::Scan),
            3 => Some(Self::Fix),
            4 => Some(Self::Chat),
            5 => Some(Self::Timeline),
            6 => Some(Self::Report),
            _ => None,
        }
    }

    /// 0-based index for tab highlighting.
    pub fn index(self) -> usize {
        match self {
            Self::Dashboard => 0,
            Self::Scan => 1,
            Self::Fix => 2,
            Self::Chat => 3,
            Self::Timeline => 4,
            Self::Report => 5,
        }
    }

    /// Short display name for footer tabs.
    pub fn short_name(self) -> &'static str {
        match self {
            Self::Dashboard => "Dashboard",
            Self::Scan => "Scan",
            Self::Fix => "Fix",
            Self::Chat => "Chat",
            Self::Timeline => "Timeline",
            Self::Report => "Report",
        }
    }

    pub const ALL: [ViewState; 6] = [
        Self::Dashboard,
        Self::Scan,
        Self::Fix,
        Self::Chat,
        Self::Timeline,
        Self::Report,
    ];
}

/// Operating mode — cycles with Tab in Normal mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Scan,
    Fix,
    Watch,
}

impl Mode {
    pub fn next(self) -> Self {
        match self {
            Self::Scan => Self::Fix,
            Self::Fix => Self::Watch,
            Self::Watch => Self::Scan,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Scan => "SCAN",
            Self::Fix => "FIX",
            Self::Watch => "WATCH",
        }
    }
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
    ThemePicker,
    Onboarding,
    ConfirmDialog,
    DismissModal,
    UndoHistory,
}

/// Click target for mouse hit-testing (T806).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClickTarget {
    ViewTab(ViewState),
    PanelFocus(Panel),
    FindingRow(usize),
    FixCheckbox(usize),
    SidebarToggle,
}
