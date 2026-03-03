mod actions;
mod commands;
pub(crate) mod executor;
mod overlays;
mod scan;
mod tests;
mod view_keys;

use std::path::PathBuf;
use std::time::Instant;

use ratatui::layout::Rect;

use crate::animation::AnimationState;
use crate::components::spinner::Spinner;
use crate::components::suggestions::IdleSuggestionState;
use crate::components::undo_history::UndoHistoryState;
use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::layout::Breakpoint;
use crate::types::{
    ActivityEntry, ActivityKind, ChatMessage, ClickTarget,
    EngineConnectionStatus, FileEntry, InputMode, MessageRole, Mode, Overlay, Panel, ScanResult,
    Selection, ViewState,
};
use crate::views::file_browser;
use crate::views::fix::FixViewState;
use crate::views::passport::PassportViewState;
use crate::views::report::ReportViewState;
use crate::views::scan::ScanViewState;
use crate::views::timeline::TimelineViewState;

pub struct App {
    // Core state
    pub running: bool,
    pub active_panel: Panel,
    pub input_mode: InputMode,
    pub config: TuiConfig,
    pub view_state: ViewState,
    pub mode: Mode,

    // Engine
    pub engine_status: EngineConnectionStatus,
    pub engine_client: EngineClient,

    // Status Log (system messages)
    pub messages: Vec<ChatMessage>,
    pub input: String,
    pub input_cursor: usize,
    pub chat_scroll: usize,
    pub chat_auto_scroll: bool,

    // Input history (separate from chat messages)
    pub input_history: Vec<String>,
    pub history_index: Option<usize>,
    pub history_saved_input: String, // saved input when navigating history

    // Score
    pub last_scan: Option<ScanResult>,
    pub score_history: Vec<f64>,

    // File browser
    pub file_tree: Vec<FileEntry>,
    pub file_browser_index: usize,

    // Code viewer
    pub code_content: Option<String>,
    pub open_file_path: Option<String>,
    pub code_scroll: usize,
    pub selection: Option<Selection>,

    // Terminal
    pub terminal_output: Vec<String>,
    pub terminal_visible: bool,
    pub terminal_scroll: usize,
    pub terminal_auto_scroll: bool,

    // Panels visibility
    pub sidebar_visible: bool,
    pub files_panel_visible: bool,

    // Overlay popups
    pub overlay: Overlay,
    pub overlay_filter: String,
    pub palette_index: usize,

    // View-specific state
    pub scan_view: ScanViewState,
    pub fix_view: FixViewState,
    pub timeline_view: TimelineViewState,
    pub report_view: ReportViewState,
    pub passport_view: PassportViewState,

    // Activity log (Dashboard widget)
    pub activity_log: Vec<ActivityEntry>,

    // Watch mode
    pub watch_active: bool,
    pub watch_last_score: Option<f64>,

    // T904: Pre-fix score for auto-validate delta
    pub pre_fix_score: Option<f64>,

    // Help overlay scroll
    pub help_scroll: usize,

    // Theme picker
    pub theme_picker: Option<crate::theme_picker::ThemePickerState>,

    // Onboarding wizard
    pub onboarding: Option<crate::views::onboarding::OnboardingWizard>,

    // Code viewer search
    pub code_search_query: Option<String>,
    pub code_search_matches: Vec<usize>,
    pub code_search_current: usize,

    // T07: Toast notifications
    pub toasts: crate::components::toast::ToastStack,

    // T07: Confirmation dialog
    pub confirm_dialog: Option<crate::components::confirm_dialog::ConfirmDialog>,

    // T07: Widget zoom
    pub zoom: crate::components::zoom::ZoomState,

    // T07: Fix split ratio (percentage for left panel, 25-75)
    pub fix_split_pct: u16,

    // T07: Complior Zen
    pub zen_messages_used: u32,
    pub zen_messages_limit: u32,
    pub zen_active: bool,

    // T07: Dismiss modal
    pub dismiss_modal: Option<crate::components::quick_actions::DismissModal>,

    // T08: Responsive layout breakpoint
    #[allow(dead_code)] // TODO(T10): use for responsive widget selection
    pub breakpoint: Breakpoint,

    // T08: Mouse click areas (populated each render frame)
    pub click_areas: Vec<(Rect, ClickTarget)>,
    pub scroll_events: Vec<Instant>,

    // T08: Undo history
    pub undo_history: UndoHistoryState,

    // T08: Colon-command mode
    pub colon_mode: bool,

    // T08: Idle suggestions
    pub idle_suggestions: IdleSuggestionState,

    // T08: Animations
    pub animation: AnimationState,

    // T09: What-If scenario state
    pub whatif: crate::components::whatif::WhatIfState,

    // UI
    pub spinner: Spinner,
    pub project_path: PathBuf,
    pub operation_start: Option<Instant>,
}

const MAX_HISTORY: usize = 50;
const MAX_TERMINAL_LINES: usize = 1000;
const MAX_ACTIVITY_LOG: usize = 10;

impl App {
    pub fn new(config: TuiConfig) -> Self {
        let engine_client = EngineClient::new(&config);
        let sidebar_visible = config.sidebar_visible;
        let animations_enabled = config.animations_enabled;
        let project_path = config
            .project_path
            .as_deref()
            .map(PathBuf::from)
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

        let app = Self {
            running: true,
            active_panel: Panel::Chat,
            input_mode: InputMode::Normal,
            config,
            view_state: ViewState::Dashboard,
            mode: Mode::Scan,
            engine_status: EngineConnectionStatus::Disconnected,
            engine_client,
            messages: vec![ChatMessage::new(
                MessageRole::System,
                "Welcome to Complior. Use /scan to start, /help for commands.".to_string(),
            )],
            input: String::new(),
            input_cursor: 0,
            chat_scroll: 0,
            chat_auto_scroll: true,
            input_history: Vec::new(),
            history_index: None,
            history_saved_input: String::new(),
            last_scan: None,
            score_history: Vec::new(),
            file_tree: Vec::new(),
            file_browser_index: 0,
            code_content: None,
            open_file_path: None,
            code_scroll: 0,
            selection: None,
            terminal_output: Vec::new(),
            terminal_visible: false,
            terminal_scroll: 0,
            terminal_auto_scroll: true,
            sidebar_visible,
            files_panel_visible: true,
            overlay: Overlay::None,
            overlay_filter: String::new(),
            palette_index: 0,
            scan_view: ScanViewState::default(),
            fix_view: FixViewState::default(),
            timeline_view: TimelineViewState::default(),
            report_view: ReportViewState::default(),
            passport_view: PassportViewState::default(),
            activity_log: Vec::new(),
            watch_active: false,
            watch_last_score: None,
            pre_fix_score: None,
            help_scroll: 0,
            theme_picker: None,
            onboarding: None,
            code_search_query: None,
            code_search_matches: Vec::new(),
            code_search_current: 0,
            toasts: crate::components::toast::ToastStack::new(),
            confirm_dialog: None,
            zoom: crate::components::zoom::ZoomState::new(),
            fix_split_pct: 40,
            zen_messages_used: 0,
            zen_messages_limit: 1000,
            zen_active: false,
            dismiss_modal: None,
            breakpoint: Breakpoint::Medium,
            click_areas: Vec::new(),
            scroll_events: Vec::new(),
            undo_history: UndoHistoryState::new(),
            colon_mode: false,
            idle_suggestions: IdleSuggestionState::new(),
            animation: AnimationState::new(animations_enabled),
            whatif: crate::components::whatif::WhatIfState::new(),
            spinner: Spinner::new(),
            project_path,
            operation_start: None,
        };

        app
    }

    pub fn tick(&mut self) -> Option<AppCommand> {
        self.spinner.advance();
        self.toasts.gc();

        // Idle suggestion: check if idle > 10s and no blockers
        if self.idle_suggestions.current.is_none()
            && self.idle_suggestions.is_idle(10)
            && !self.scan_view.scanning
            && self.overlay == Overlay::None
            && self.input_mode != InputMode::Insert
            && !self.idle_suggestions.recently_dismissed()
            && !self.idle_suggestions.fetch_pending
        {
            // Mark fetch as pending so we don't re-trigger every tick
            self.idle_suggestions.fetch_pending = true;
            return Some(AppCommand::FetchSuggestions);
        }
        None
    }

    /// Elapsed seconds since operation started.
    pub fn elapsed_secs(&self) -> Option<u64> {
        self.operation_start.map(|s| s.elapsed().as_secs())
    }

    /// Rebuild mouse click targets based on current terminal size and view state.
    pub fn rebuild_click_areas(&mut self, width: u16, height: u16) {
        use crate::types::ClickTarget;
        self.click_areas.clear();

        // Footer view tabs — letter-key tabs across the bottom line
        let footer_y = height.saturating_sub(1);
        let tab_width: u16 = 10;
        for (i, view) in ViewState::ALL.iter().enumerate() {
            let x = (i as u16) * tab_width;
            if x + tab_width <= width {
                self.click_areas.push((
                    Rect::new(x, footer_y, tab_width, 1),
                    ClickTarget::ViewTab(*view),
                ));
            }
        }

        // Sidebar area (if visible) — click on sidebar to toggle
        let bp = crate::layout::Breakpoint::from_width(width);
        if bp.show_sidebar() && self.sidebar_visible {
            let sb_w = bp.sidebar_width();
            let sb_x = width.saturating_sub(sb_w);
            self.click_areas.push((
                Rect::new(sb_x, 0, sb_w, height.saturating_sub(2)),
                ClickTarget::SidebarToggle,
            ));
        }

        // Scan view: finding rows
        if self.view_state == ViewState::Scan {
            let count = self.last_scan.as_ref().map_or(0, |s| s.findings.len());
            let start_y: u16 = 5; // approximate start of findings list
            for i in 0..count.min(20) {
                self.click_areas.push((
                    Rect::new(0, start_y + i as u16, width / 2, 1),
                    ClickTarget::FindingRow(i),
                ));
            }
        }

        // Fix view: checkboxes
        if self.view_state == ViewState::Fix {
            let start_y: u16 = 3;
            for i in 0..self.fix_view.fixable_findings.len().min(20) {
                self.click_areas.push((
                    Rect::new(0, start_y + i as u16, width / 2, 1),
                    ClickTarget::FixCheckbox(i),
                ));
            }
        }
    }

    pub fn next_panel(&mut self) {
        self.active_panel = match self.active_panel {
            Panel::Chat => Panel::Score,
            Panel::Score => {
                if self.code_content.is_some() {
                    Panel::CodeViewer
                } else {
                    Panel::FileBrowser
                }
            }
            Panel::FileBrowser | Panel::CodeViewer => {
                if self.terminal_visible {
                    Panel::Terminal
                } else {
                    Panel::Chat
                }
            }
            Panel::Terminal => Panel::Chat,
            Panel::DiffPreview => Panel::Chat,
        };
    }

    fn push_to_history(&mut self, text: &str) {
        if text.is_empty() {
            return;
        }
        // Don't duplicate consecutive entries
        if self.input_history.last().is_some_and(|last| last == text) {
            return;
        }
        self.input_history.push(text.to_string());
        if self.input_history.len() > MAX_HISTORY {
            self.input_history.remove(0);
        }
        self.history_index = None;
    }

    pub fn history_up(&mut self) {
        if self.input_history.is_empty() {
            return;
        }
        match self.history_index {
            None => {
                self.history_saved_input = self.input.clone();
                self.history_index = Some(self.input_history.len() - 1);
            }
            Some(0) => return,
            Some(i) => self.history_index = Some(i - 1),
        }
        if let Some(i) = self.history_index {
            self.input = self.input_history[i].clone();
            self.input_cursor = self.input.len();
        }
    }

    pub fn history_down(&mut self) {
        let Some(i) = self.history_index else {
            return;
        };
        if i + 1 >= self.input_history.len() {
            // Back to saved input
            self.history_index = None;
            self.input = std::mem::take(&mut self.history_saved_input);
            self.input_cursor = self.input.len();
        } else {
            self.history_index = Some(i + 1);
            self.input = self.input_history[i + 1].clone();
            self.input_cursor = self.input.len();
        }
    }

    pub fn add_terminal_line(&mut self, line: String) {
        self.terminal_output.push(line);
        if self.terminal_output.len() > MAX_TERMINAL_LINES {
            self.terminal_output.remove(0);
        }
        if self.terminal_auto_scroll {
            self.terminal_scroll = self.terminal_output.len().saturating_sub(1);
        }
    }

    pub fn push_activity(&mut self, kind: ActivityKind, detail: impl Into<String>) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let hours = (now % 86400) / 3600;
        let mins = (now % 3600) / 60;
        let timestamp = format!("{hours:02}:{mins:02}");

        self.activity_log.push(ActivityEntry {
            timestamp,
            kind,
            detail: detail.into(),
        });
        if self.activity_log.len() > MAX_ACTIVITY_LOG {
            self.activity_log.remove(0);
        }
    }

    pub async fn load_file_tree(&mut self) {
        let path = self.project_path.clone();
        if let Ok(tree) = tokio::task::spawn_blocking(move || {
            file_browser::build_file_tree(&path)
        })
        .await
        {
            self.file_tree = tree;
        }
    }

    pub fn open_file(&mut self, path: &str, content: String) {
        self.push_activity(ActivityKind::Scan, path.to_string());
        self.code_content = Some(content);
        self.open_file_path = Some(path.to_string());
        self.code_scroll = 0;
        self.selection = None;
        self.active_panel = Panel::CodeViewer;
    }

    pub fn to_session_data(&self) -> crate::session::SessionData {
        crate::session::SessionData {
            messages: self.messages.clone(),
            score_history: self.score_history.clone(),
            open_file_path: self.open_file_path.clone(),
            terminal_output: self
                .terminal_output
                .iter()
                .rev()
                .take(100)
                .rev()
                .cloned()
                .collect(),
            last_scan: self.last_scan.clone(),
        }
    }

    pub fn load_session_data(&mut self, data: crate::session::SessionData) {
        self.messages = data.messages;
        self.score_history = data.score_history;
        self.open_file_path = data.open_file_path;
        self.terminal_output = data.terminal_output;
        self.last_scan = data.last_scan;
    }
}

/// Commands that `apply_action()` can emit for async execution by the event loop.
/// Some variants are dispatched indirectly (e.g., `SaveTheme` via overlay confirmation)
/// so not all call sites are statically visible.
#[derive(Debug)]
#[allow(dead_code)] // TODO(T10): wire remaining variants or remove after feature audit
pub enum AppCommand {
    Scan,
    AutoScan,
    OpenFile(String),
    RunCommand(String),
    Reconnect,
    SwitchTheme(String),
    SaveSession(String),
    LoadSession(String),
    ToggleWatch,
    Undo(Option<u32>),
    FetchUndoHistory,
    FetchSuggestions,
    WhatIf(String),
    FixDryRun(Vec<String>),
    /// Async: persist theme name to config file.
    SaveTheme(String),
    /// Async: mark onboarding as completed in config.
    MarkOnboardingComplete,
    /// Async: mark first-run marker file.
    MarkFirstRunDone,
    /// Async: list saved sessions.
    ListSessions,
    /// Apply selected fixes to files on disk, then auto-rescan.
    ApplyFixes,
    /// Async: export compliance report to markdown file.
    ExportReport,
    /// Complete onboarding: save config + credentials, trigger post-completion action.
    CompleteOnboarding,
    /// Save partial onboarding progress for resume.
    SaveOnboardingPartial(usize),
    /// Load Agent Passports from engine.
    LoadPassports,
}
