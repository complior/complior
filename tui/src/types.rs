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

/// Finding type classification for code-first UX.
///
/// - **A (Code Fix):** Code-level findings — bare API calls, security patterns, SDK issues.
/// - **B (Missing File):** Missing documentation or config files.
/// - **C (Config Change):** Configuration, dependency, or cross-layer issues.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FindingType {
    A, // Code fix
    B, // Missing file / document
    C, // Config change
}

impl FindingType {
    /// Short badge text for list display.
    pub fn badge(self) -> &'static str {
        match self {
            Self::A => "[A]",
            Self::B => "[B]",
            Self::C => "[C]",
        }
    }

    /// Human-readable label.
    pub fn label(self) -> &'static str {
        match self {
            Self::A => "Code Fix",
            Self::B => "Missing File",
            Self::C => "Config Change",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeContextLine {
    pub num: u32,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeContext {
    pub lines: Vec<CodeContextLine>,
    pub start_line: u32,
    #[serde(default)]
    pub highlight_line: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixDiff {
    pub before: Vec<String>,
    pub after: Vec<String>,
    pub start_line: u32,
    pub file_path: String,
    /// Import line to add at top of file (e.g. "import { complior } from '@complior/sdk'").
    #[serde(default)]
    pub import_line: Option<String>,
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
    #[serde(default)]
    pub file: Option<String>,
    #[serde(default)]
    pub line: Option<u32>,
    #[serde(default)]
    pub code_context: Option<CodeContext>,
    #[serde(default)]
    pub fix_diff: Option<FixDiff>,
}

impl Finding {
    /// Classify finding into A/B/C type based on check_id prefix.
    ///
    /// - l4-/l5-/cross- → Type A (code-level)
    /// - l1-/l2-/missing → Type B (missing file/document)
    /// - l3- → Type C (config/dependency)
    pub fn finding_type(&self) -> FindingType {
        if self.check_id.starts_with("l4-")
            || self.check_id.starts_with("l5-")
            || self.check_id.starts_with("cross-")
        {
            FindingType::A
        } else if self.check_id.starts_with("l3-") {
            FindingType::C
        } else {
            // l1-, l2-, missing-*, EU-AIA-* (mock) → Type B
            FindingType::B
        }
    }

    /// Predicted score impact if this finding is fixed.
    pub fn predicted_impact(&self) -> i32 {
        match self.severity {
            Severity::Critical => 8,
            Severity::High => 5,
            Severity::Medium => 3,
            Severity::Low => 1,
            Severity::Info => 0,
        }
    }

    /// Short file:line label for display.
    pub fn file_line_label(&self) -> Option<String> {
        match (&self.file, self.line) {
            (Some(f), Some(l)) => Some(format!("{f}:{l}")),
            (Some(f), None) => Some(f.clone()),
            _ => None,
        }
    }
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
        let mut state = s.serialize_struct("Finding", 11)?;
        state.serialize_field("checkId", &self.check_id)?;
        state.serialize_field("type", &self.r#type)?;
        state.serialize_field("message", &self.message)?;
        state.serialize_field("severity", &format!("{:?}", self.severity).to_lowercase())?;
        state.serialize_field("obligationId", &self.obligation_id)?;
        state.serialize_field("articleReference", &self.article_reference)?;
        state.serialize_field("fix", &self.fix)?;
        state.serialize_field("file", &self.file)?;
        state.serialize_field("line", &self.line)?;
        state.serialize_field("codeContext", &self.code_context)?;
        state.serialize_field("fixDiff", &self.fix_diff)?;
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
    Watch,
}

impl ActivityKind {
    pub fn icon(self) -> char {
        match self {
            Self::Scan => 'S',
            Self::Fix => 'F',
            Self::Watch => 'W',
        }
    }
}

/// Top-level view (screen).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewState {
    Dashboard,    // D, index 0
    Scan,         // S, index 1
    Fix,          // F, index 2
    Passport,     // P, index 3 (stub)
    Obligations,  // O, index 4 (stub)
    Timeline,     // T, index 5
    Report,       // R, index 6
    Log,          // L, index 7
}

impl ViewState {
    /// Map key digit to view (1-based) — used by `/view N` command.
    pub fn from_key(digit: u8) -> Option<Self> {
        match digit {
            1 => Some(Self::Dashboard),
            2 => Some(Self::Scan),
            3 => Some(Self::Fix),
            4 => Some(Self::Passport),
            5 => Some(Self::Obligations),
            6 => Some(Self::Timeline),
            7 => Some(Self::Report),
            8 => Some(Self::Log),
            _ => None,
        }
    }

    /// Map an uppercase letter to a view for letter-key navigation.
    ///
    /// Lowercase letters are reserved for view-specific actions.
    pub fn from_letter(c: char) -> Option<Self> {
        match c {
            'D' => Some(Self::Dashboard),
            'S' => Some(Self::Scan),
            'F' => Some(Self::Fix),
            'P' => Some(Self::Passport),
            'O' => Some(Self::Obligations),
            'T' => Some(Self::Timeline),
            'R' => Some(Self::Report),
            'L' => Some(Self::Log),
            _ => None,
        }
    }

    /// 0-based index for tab highlighting.
    pub fn index(self) -> usize {
        match self {
            Self::Dashboard => 0,
            Self::Scan => 1,
            Self::Fix => 2,
            Self::Passport => 3,
            Self::Obligations => 4,
            Self::Timeline => 5,
            Self::Report => 6,
            Self::Log => 7,
        }
    }

    /// Short display name for footer tabs.
    pub fn short_name(self) -> &'static str {
        match self {
            Self::Dashboard => "Dashboard",
            Self::Scan => "Scan",
            Self::Fix => "Fix",
            Self::Passport => "Passport",
            Self::Obligations => "Oblig",
            Self::Timeline => "Timeline",
            Self::Report => "Report",
            Self::Log => "Log",
        }
    }

    pub const ALL: [ViewState; 8] = [
        Self::Dashboard,
        Self::Scan,
        Self::Fix,
        Self::Passport,
        Self::Obligations,
        Self::Timeline,
        Self::Report,
        Self::Log,
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

}

/// Overlay state for popups (command palette, file picker, help, getting started).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Overlay {
    None,
    CommandPalette,
    FilePicker,
    Help,
    GettingStarted,
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
    FindingRow(usize),
    FixCheckbox(usize),
    SidebarToggle,
}
