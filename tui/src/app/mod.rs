mod commands;
mod sse;
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
use crate::input::Action;
use crate::layout::Breakpoint;
use crate::providers::ProviderConfig;
use crate::types::{
    ActivityEntry, ActivityKind, ChatMessage, ClickTarget, DiffContent,
    EngineConnectionStatus, FileEntry, InputMode, MessageRole, Mode, Overlay, Panel, ScanResult,
    Selection, ViewState,
};
use crate::views::file_browser;
use crate::views::fix::FixViewState;
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

    // Chat
    pub messages: Vec<ChatMessage>,
    pub input: String,
    pub input_cursor: usize,
    pub streaming_response: Option<String>,
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

    // Streaming thinking + usage
    pub streaming_thinking: Option<String>,
    pub last_token_usage: Option<(u32, u32)>,

    // Diff
    pub diff_content: Option<DiffContent>,

    // Panels visibility
    pub sidebar_visible: bool,
    pub files_panel_visible: bool,

    // Overlay popups
    pub overlay: Overlay,
    pub overlay_filter: String,

    // Provider / model selection
    pub provider_config: ProviderConfig,
    pub provider_setup_step: usize,
    pub provider_setup_selected: usize,
    pub provider_setup_key_input: String,
    pub provider_setup_error: Option<String>,
    pub model_selector_index: usize,

    // View-specific state
    pub scan_view: ScanViewState,
    pub fix_view: FixViewState,
    pub timeline_view: TimelineViewState,
    pub report_view: ReportViewState,

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

    // Diff overlay (Selection→AI result)
    pub diff_overlay: Option<crate::components::diff_overlay::DiffOverlayState>,

    // T07: Toast notifications
    pub toasts: crate::components::toast::ToastStack,

    // T07: Confirmation dialog
    pub confirm_dialog: Option<crate::components::confirm_dialog::ConfirmDialog>,

    // T07: Widget zoom
    pub zoom: crate::components::zoom::ZoomState,

    // T07: Fix split ratio (percentage for left panel, 25-75)
    pub fix_split_pct: u16,

    // T07: Context usage
    pub context_pct: u8,
    pub context_max_messages: usize,

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

        Self {
            running: true,
            active_panel: Panel::Chat,
            input_mode: InputMode::Insert,
            config,
            view_state: ViewState::Dashboard,
            mode: Mode::Scan,
            engine_status: EngineConnectionStatus::Connecting,
            engine_client,
            messages: vec![ChatMessage::new(
                MessageRole::System,
                "Welcome to Complior. Type a message or /scan to start.".to_string(),
            )],
            input: String::new(),
            input_cursor: 0,
            streaming_response: None,
            streaming_thinking: None,
            last_token_usage: None,
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
            diff_content: None,
            sidebar_visible,
            files_panel_visible: true,
            overlay: Overlay::None,
            overlay_filter: String::new(),
            provider_config: crate::providers::load_provider_config(),
            provider_setup_step: 0,
            provider_setup_selected: 0,
            provider_setup_key_input: String::new(),
            provider_setup_error: None,
            model_selector_index: 0,
            scan_view: ScanViewState::default(),
            fix_view: FixViewState::default(),
            timeline_view: TimelineViewState::default(),
            report_view: ReportViewState::default(),
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
            diff_overlay: None,
            toasts: crate::components::toast::ToastStack::new(),
            confirm_dialog: None,
            zoom: crate::components::zoom::ZoomState::new(),
            fix_split_pct: 40,
            context_pct: 0,
            context_max_messages: 32,
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
        }
    }

    pub fn tick(&mut self) -> Option<AppCommand> {
        self.spinner.advance();
        self.toasts.gc();
        // Update context usage
        self.context_pct =
            crate::widgets::context_meter::context_pct(self.messages.len(), self.context_max_messages);

        // Idle suggestion: check if idle > 10s and no blockers
        if self.idle_suggestions.current.is_none()
            && self.idle_suggestions.is_idle(10)
            && !self.scan_view.scanning
            && self.overlay == Overlay::None
            && self.input_mode != InputMode::Insert
            && self.streaming_response.is_none()
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

        // Footer view tabs (last 2 lines): "1 dash 2 scan 3 fix 4 chat 5 time 6 report"
        // Each tab is ~8 chars wide, spread across the bottom line
        let footer_y = height.saturating_sub(1);
        let tab_width: u16 = 10;
        let views = [
            ViewState::Dashboard,
            ViewState::Scan,
            ViewState::Fix,
            ViewState::Chat,
            ViewState::Timeline,
            ViewState::Report,
        ];
        for (i, view) in views.iter().enumerate() {
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

    pub fn apply_action(&mut self, action: Action) -> Option<AppCommand> {
        // Reset idle suggestion timer on any non-None action
        if !matches!(action, Action::None) {
            self.idle_suggestions.reset_timer();
        }

        // Dismiss idle suggestion on any action
        if self.idle_suggestions.current.is_some() && !matches!(action, Action::None) {
            self.idle_suggestions.dismiss();
        }

        // Handle overlay-specific input first
        if self.overlay == Overlay::ProviderSetup {
            return self.apply_provider_setup_result(
                crate::components::provider_setup::handle_provider_setup_action(self, action),
            );
        }
        if self.overlay == Overlay::ModelSelector {
            return self.apply_model_selector_result(
                crate::components::model_selector::handle_model_selector_action(self, action),
            );
        }
        if self.overlay != Overlay::None {
            return self.handle_overlay_action(action);
        }

        match action {
            Action::Quit => {
                self.running = false;
                None
            }
            Action::NextPanel => {
                self.next_panel();
                None
            }
            Action::ToggleTerminal => {
                self.terminal_visible = !self.terminal_visible;
                None
            }
            Action::ToggleSidebar => {
                self.sidebar_visible = !self.sidebar_visible;
                None
            }
            Action::ToggleFilesPanel => {
                self.files_panel_visible = !self.files_panel_visible;
                None
            }
            Action::CloseFile => {
                self.code_content = None;
                self.open_file_path = None;
                self.code_scroll = 0;
                self.selection = None;
                self.active_panel = Panel::FileBrowser;
                None
            }
            Action::InsertChar(c) => {
                self.input.insert(self.input_cursor, c);
                self.input_cursor += c.len_utf8();
                None
            }
            Action::DeleteChar => {
                if self.input_cursor > 0 {
                    let mut boundary = self.input_cursor - 1;
                    while !self.input.is_char_boundary(boundary) {
                        boundary -= 1;
                    }
                    self.input.remove(boundary);
                    self.input_cursor = boundary;
                }
                None
            }
            Action::MoveCursorLeft => {
                if self.input_cursor > 0 {
                    let mut boundary = self.input_cursor - 1;
                    while !self.input.is_char_boundary(boundary) {
                        boundary -= 1;
                    }
                    self.input_cursor = boundary;
                }
                None
            }
            Action::MoveCursorRight => {
                if self.input_cursor < self.input.len() {
                    let mut boundary = self.input_cursor + 1;
                    while boundary < self.input.len()
                        && !self.input.is_char_boundary(boundary)
                    {
                        boundary += 1;
                    }
                    self.input_cursor = boundary;
                }
                None
            }
            Action::HistoryUp => {
                self.history_up();
                None
            }
            Action::HistoryDown => {
                self.history_down();
                None
            }
            Action::TabComplete => {
                self.try_tab_complete();
                None
            }
            Action::ScrollUp => {
                match self.view_state {
                    ViewState::Scan => {
                        let count = self.filtered_findings_count();
                        self.scan_view.navigate_up();
                        let _ = count; // used for bounds checking inside navigate_up
                    }
                    ViewState::Fix => self.fix_view.navigate_up(),
                    ViewState::Timeline => {
                        self.timeline_view.scroll_offset =
                            self.timeline_view.scroll_offset.saturating_sub(1);
                    }
                    ViewState::Report => {
                        self.report_view.scroll_offset =
                            self.report_view.scroll_offset.saturating_sub(1);
                    }
                    _ => match self.active_panel {
                        Panel::CodeViewer => {
                            self.code_scroll = self.code_scroll.saturating_sub(1);
                        }
                        Panel::FileBrowser => {
                            self.file_browser_index =
                                self.file_browser_index.saturating_sub(1);
                        }
                        Panel::Terminal => {
                            self.terminal_scroll =
                                self.terminal_scroll.saturating_sub(1);
                            self.terminal_auto_scroll = false;
                        }
                        Panel::Chat => {
                            self.chat_scroll = self.chat_scroll.saturating_sub(1);
                            self.chat_auto_scroll = false;
                        }
                        _ => {}
                    },
                }
                None
            }
            Action::ScrollDown => {
                match self.view_state {
                    ViewState::Scan => {
                        let count = self.filtered_findings_count();
                        self.scan_view.navigate_down(count);
                    }
                    ViewState::Fix => self.fix_view.navigate_down(),
                    ViewState::Timeline => {
                        self.timeline_view.scroll_offset += 1;
                    }
                    ViewState::Report => {
                        self.report_view.scroll_offset += 1;
                    }
                    _ => match self.active_panel {
                        Panel::CodeViewer => {
                            self.code_scroll += 1;
                        }
                        Panel::FileBrowser => {
                            if self.file_browser_index + 1 < self.file_tree.len() {
                                self.file_browser_index += 1;
                            }
                        }
                        Panel::Terminal => {
                            self.terminal_scroll += 1;
                            if self.terminal_scroll + 1 >= self.terminal_output.len() {
                                self.terminal_auto_scroll = true;
                            }
                        }
                        Panel::Chat => {
                            self.chat_scroll += 1;
                        }
                        _ => {}
                    },
                }
                None
            }
            Action::ScrollHalfPageUp => {
                match self.active_panel {
                    Panel::Chat => {
                        self.chat_scroll = self.chat_scroll.saturating_sub(10);
                        self.chat_auto_scroll = false;
                    }
                    _ => {
                        self.code_scroll = self.code_scroll.saturating_sub(10);
                    }
                }
                None
            }
            Action::ScrollHalfPageDown => {
                match self.active_panel {
                    Panel::Chat => self.chat_scroll += 10,
                    _ => self.code_scroll += 10,
                }
                None
            }
            Action::ScrollToTop => {
                self.code_scroll = 0;
                None
            }
            Action::ScrollToBottom => {
                self.code_scroll = usize::MAX;
                self.chat_auto_scroll = true;
                None
            }
            Action::EnterInsertMode => {
                self.input_mode = InputMode::Insert;
                None
            }
            Action::EnterNormalMode => {
                self.input_mode = InputMode::Normal;
                self.selection = None;
                self.colon_mode = false;
                None
            }
            Action::EnterVisualMode => {
                self.input_mode = InputMode::Visual;
                let line = self.code_scroll;
                self.selection = Some(Selection {
                    start_line: line,
                    end_line: line,
                });
                None
            }
            Action::EnterCommandMode => {
                self.input_mode = InputMode::Command;
                self.input.clear();
                self.input_cursor = 0;
                None
            }
            Action::SelectionUp => {
                if let Some(sel) = &mut self.selection {
                    sel.end_line = sel.end_line.saturating_sub(1);
                    if sel.end_line < sel.start_line {
                        sel.start_line = sel.end_line;
                    }
                }
                None
            }
            Action::SelectionDown => {
                if let Some(sel) = &mut self.selection {
                    sel.end_line += 1;
                }
                None
            }
            Action::SubmitInput => {
                let text = std::mem::take(&mut self.input);
                self.input_cursor = 0;

                if text.is_empty() {
                    return None;
                }

                self.push_to_history(&text);

                // Handle `!` bash prefix
                if let Some(cmd) = text.strip_prefix('!') {
                    if !cmd.is_empty() {
                        self.terminal_visible = true;
                        self.messages.push(ChatMessage::new(
                            MessageRole::System,
                            format!("$ {cmd}"),
                        ));
                        return Some(AppCommand::RunCommand(cmd.to_string()));
                    }
                }

                // Colon-command mode: route to handle_colon_command
                if self.colon_mode {
                    self.colon_mode = false;
                    self.input_mode = InputMode::Normal;
                    return self.handle_colon_command(&text);
                }

                if self.input_mode == InputMode::Command || text.starts_with('/') {
                    // Code search: if in CodeViewer and text doesn't start with /
                    if self.active_panel == Panel::CodeViewer && !text.starts_with('/') {
                        // Treat as code search query
                        if let Some(content) = &self.code_content {
                            let matches = crate::views::code_viewer::find_search_matches(content, &text);
                            self.code_search_current = 0;
                            if !matches.is_empty() {
                                self.code_scroll = matches[0];
                            }
                            self.code_search_matches = matches;
                            self.code_search_query = Some(text);
                        }
                        self.input_mode = InputMode::Normal;
                        return None;
                    }
                    let cmd = text.trim_start_matches('/');
                    self.input_mode = InputMode::Insert;
                    return self.handle_command(cmd);
                }

                // Chat message — inject obligation context if @OBL-xxx tokens present
                let chat_text = crate::obligations::inject_obligation_context(&text);
                self.messages.push(ChatMessage::new(
                    MessageRole::User,
                    text,
                ));
                self.chat_auto_scroll = true;
                Some(AppCommand::Chat(chat_text))
            }
            Action::SendSelectionToAi => {
                if let (Some(content), Some(sel)) = (&self.code_content, &self.selection) {
                    let lines: Vec<&str> = content.lines().collect();
                    let start = sel.start_line.min(lines.len().saturating_sub(1));
                    let end = sel.end_line.min(lines.len().saturating_sub(1));
                    let selected: String = lines[start..=end].join("\n");

                    let file = self.open_file_path.as_deref().unwrap_or("unknown");
                    let context = format!(
                        "[selected {count} lines from {file}:{start_l}-{end_l}]\n```\n{code}\n```",
                        count = end - start + 1,
                        start_l = start + 1,
                        end_l = end + 1,
                        code = selected
                    );

                    self.input_mode = InputMode::Insert;
                    self.active_panel = Panel::Chat;
                    self.input = context;
                }
                None
            }
            Action::AcceptDiff => {
                self.diff_content = None;
                self.active_panel = Panel::Chat;
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Diff applied.".to_string(),
                ));
                None
            }
            Action::RejectDiff => {
                self.diff_content = None;
                self.active_panel = Panel::Chat;
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Diff rejected.".to_string(),
                ));
                None
            }
            Action::ToggleExpand => {
                let idx = self.file_browser_index;
                file_browser::toggle_expand(&mut self.file_tree, idx);
                None
            }
            Action::OpenFile => {
                if let Some(entry) = self.file_tree.get(self.file_browser_index) {
                    if entry.is_dir {
                        file_browser::toggle_expand(
                            &mut self.file_tree,
                            self.file_browser_index,
                        );
                        None
                    } else {
                        let path = entry.path.to_string_lossy().to_string();
                        Some(AppCommand::OpenFile(path))
                    }
                } else {
                    None
                }
            }
            Action::ShowCommandPalette => {
                self.overlay = Overlay::CommandPalette;
                self.overlay_filter.clear();
                None
            }
            Action::ShowFilePicker => {
                self.overlay = Overlay::FilePicker;
                self.overlay_filter.clear();
                None
            }
            Action::ShowHelp => {
                self.overlay = Overlay::Help;
                self.help_scroll = 0;
                None
            }
            Action::ShowModelSelector => {
                if crate::providers::is_configured(&self.provider_config) {
                    self.overlay = Overlay::ModelSelector;
                    self.model_selector_index = 0;
                } else {
                    self.overlay = Overlay::ProviderSetup;
                    self.provider_setup_step = 0;
                    self.provider_setup_selected = 0;
                    self.provider_setup_key_input.clear();
                    self.provider_setup_error = None;
                }
                None
            }
            Action::ShowProviderSetup => {
                self.overlay = Overlay::ProviderSetup;
                self.provider_setup_step = 0;
                self.provider_setup_selected = 0;
                self.provider_setup_key_input.clear();
                self.provider_setup_error = None;
                None
            }
            Action::SwitchView(view) => {
                self.view_state = view;
                // Populate Fix view from latest scan when switching to it
                if view == ViewState::Fix {
                    if let Some(scan) = &self.last_scan {
                        self.fix_view = FixViewState::from_scan(&scan.findings);
                    }
                }
                None
            }
            Action::ToggleMode => {
                self.mode = self.mode.next();
                None
            }
            Action::FocusPanel(panel) => {
                self.active_panel = panel;
                None
            }
            Action::WatchToggle => {
                return Some(AppCommand::ToggleWatch);
            }
            Action::ShowThemePicker => {
                self.theme_picker = Some(crate::theme_picker::ThemePickerState::new());
                self.overlay = Overlay::ThemePicker;
                None
            }
            Action::CodeSearch => {
                // Enter command mode to type search query
                self.input_mode = InputMode::Command;
                self.input.clear();
                self.input_cursor = 0;
                None
            }
            Action::CodeSearchNext => {
                if !self.code_search_matches.is_empty() {
                    self.code_search_current =
                        (self.code_search_current + 1) % self.code_search_matches.len();
                    self.code_scroll = self.code_search_matches[self.code_search_current];
                }
                None
            }
            Action::CodeSearchPrev => {
                if !self.code_search_matches.is_empty() {
                    self.code_search_current = if self.code_search_current == 0 {
                        self.code_search_matches.len() - 1
                    } else {
                        self.code_search_current - 1
                    };
                    self.code_scroll = self.code_search_matches[self.code_search_current];
                }
                None
            }
            Action::StartScan => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Scanning project...".to_string(),
                ));
                self.operation_start = Some(Instant::now());
                self.scan_view.scanning = true;
                return Some(AppCommand::Scan);
            }
            Action::ViewKey(c) => {
                return self.handle_view_key(c);
            }
            Action::ViewEnter => {
                return self.handle_view_enter();
            }
            Action::ViewEscape => {
                self.handle_view_escape();
                return None;
            }
            Action::GotoLine => {
                // Parse `:N` from command input
                let text = std::mem::take(&mut self.input);
                self.input_cursor = 0;
                self.input_mode = InputMode::Normal;
                if let Ok(line) = text.parse::<usize>() {
                    self.code_scroll = line.saturating_sub(1);
                }
                None
            }
            Action::Undo => {
                return Some(AppCommand::Undo(None));
            }
            Action::ShowUndoHistory => {
                self.overlay = Overlay::UndoHistory;
                return Some(AppCommand::FetchUndoHistory);
            }
            Action::EnterColonMode => {
                self.input_mode = InputMode::Command;
                self.colon_mode = true;
                self.input.clear();
                self.input_cursor = 0;
                None
            }
            Action::ClickAt(target) => {
                match target {
                    ClickTarget::ViewTab(view) => {
                        self.view_state = view;
                        if view == ViewState::Fix {
                            if let Some(scan) = &self.last_scan {
                                self.fix_view = FixViewState::from_scan(&scan.findings);
                            }
                        }
                    }
                    ClickTarget::PanelFocus(panel) => {
                        self.active_panel = panel;
                    }
                    ClickTarget::FindingRow(idx) => {
                        self.scan_view.selected_finding = Some(idx);
                    }
                    ClickTarget::FixCheckbox(idx) => {
                        self.fix_view.toggle_at(idx);
                    }
                    ClickTarget::SidebarToggle => {
                        self.sidebar_visible = !self.sidebar_visible;
                    }
                }
                None
            }
            Action::ScrollLines(lines) => {
                self.scroll_events.push(Instant::now());
                // Trim old events (keep last 500ms)
                let cutoff = Instant::now() - std::time::Duration::from_millis(500);
                self.scroll_events.retain(|&t| t > cutoff);

                if lines > 0 {
                    for _ in 0..lines {
                        self.apply_action(Action::ScrollDown);
                    }
                } else {
                    for _ in 0..(-lines) {
                        self.apply_action(Action::ScrollUp);
                    }
                }
                None
            }
            Action::None => None,
        }
    }

    fn apply_model_selector_result(
        &mut self,
        result: crate::components::model_selector::ModelSelectorResult,
    ) -> Option<AppCommand> {
        use crate::components::model_selector::ModelSelectorResult;
        match result {
            ModelSelectorResult::Navigate(idx) => {
                self.model_selector_index = idx;
                None
            }
            ModelSelectorResult::Select {
                model_id,
                provider_id,
                message,
            } => {
                self.provider_config.active_model = model_id;
                self.provider_config.active_provider = provider_id;
                self.messages
                    .push(ChatMessage::new(MessageRole::System, message));
                self.overlay = Overlay::None;
                Some(AppCommand::SaveProviderConfig)
            }
            ModelSelectorResult::Close => {
                self.overlay = Overlay::None;
                None
            }
            ModelSelectorResult::Noop => None,
        }
    }

    fn apply_provider_setup_result(
        &mut self,
        result: crate::components::provider_setup::ProviderSetupResult,
    ) -> Option<AppCommand> {
        use crate::components::provider_setup::ProviderSetupResult;
        match result {
            ProviderSetupResult::NavigateProvider(idx) => {
                self.provider_setup_selected = idx;
                None
            }
            ProviderSetupResult::AdvanceToKeyInput => {
                self.provider_setup_step = 1;
                self.provider_setup_key_input.clear();
                None
            }
            ProviderSetupResult::KeyChar(c) => {
                self.provider_setup_key_input.push(c);
                None
            }
            ProviderSetupResult::KeyBackspace => {
                self.provider_setup_key_input.pop();
                None
            }
            ProviderSetupResult::SubmitKey {
                provider_id,
                api_key,
                first_model_id,
            } => {
                self.provider_config.providers.insert(
                    provider_id.clone(),
                    crate::providers::ProviderEntry {
                        api_key,
                    },
                );
                if self.provider_config.active_provider.is_empty() {
                    self.provider_config.active_provider = provider_id;
                    if let Some(model_id) = first_model_id {
                        self.provider_config.active_model = model_id;
                    }
                }
                self.provider_setup_error = None;
                self.provider_setup_step = 3;
                Some(AppCommand::SaveProviderConfig)
            }
            ProviderSetupResult::BackToSelect => {
                self.provider_setup_step = 0;
                None
            }
            ProviderSetupResult::Retry => {
                self.provider_setup_step = 1;
                self.provider_setup_key_input.clear();
                self.provider_setup_error = None;
                None
            }
            ProviderSetupResult::ConfirmSuccess => {
                self.overlay = Overlay::None;
                None
            }
            ProviderSetupResult::Close => {
                self.overlay = Overlay::None;
                None
            }
            ProviderSetupResult::Noop => None,
        }
    }

    fn handle_theme_picker_action(&mut self, action: Action) -> Option<AppCommand> {
        match action {
            Action::ScrollDown => {
                if let Some(tp) = &mut self.theme_picker {
                    tp.move_down();
                }
                None
            }
            Action::ScrollUp => {
                if let Some(tp) = &mut self.theme_picker {
                    tp.move_up();
                }
                None
            }
            Action::SubmitInput => {
                // Apply selected theme and close
                let name = self
                    .theme_picker
                    .as_ref()
                    .map(|tp| tp.selected_name().to_string())
                    .unwrap_or_default();
                self.theme_picker = None;
                self.overlay = Overlay::None;
                if !name.is_empty() {
                    crate::theme::init_theme(&name);
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        format!("Theme: {name}"),
                    ));
                    self.toasts.push(crate::components::toast::ToastKind::Info, format!("Theme: {name}"));
                    return Some(AppCommand::SaveTheme(name));
                }
                None
            }
            Action::EnterNormalMode | Action::Quit => {
                self.theme_picker = None;
                self.overlay = Overlay::None;
                None
            }
            _ => None,
        }
    }

    fn handle_onboarding_action(&mut self, action: Action) -> Option<AppCommand> {
        use crate::views::onboarding::{OnboardingWizard, StepKind};

        // Determine current step kind
        let step_kind = self
            .onboarding
            .as_ref()
            .and_then(|wiz| wiz.current().map(|s| s.kind.clone()));

        // Special handling for TextInput steps (substep routing)
        if let Some(StepKind::TextInput { .. }) = &step_kind {
            return self.handle_onboarding_text_input(action);
        }

        match action {
            Action::ScrollDown => {
                if let Some(wiz) = &mut self.onboarding {
                    wiz.move_cursor_down();
                    // ThemeSelect: live preview on cursor move
                    if matches!(step_kind, Some(StepKind::ThemeSelect)) {
                        let theme_names = ["dark", "light", "nord", "solarized-light"];
                        if let Some(name) = theme_names.get(wiz.cursor) {
                            crate::theme::init_theme(name);
                        }
                    }
                }
                None
            }
            Action::ScrollUp => {
                if let Some(wiz) = &mut self.onboarding {
                    wiz.move_cursor_up();
                    // ThemeSelect: live preview on cursor move
                    if matches!(step_kind, Some(StepKind::ThemeSelect)) {
                        let theme_names = ["dark", "light", "nord", "solarized-light"];
                        if let Some(name) = theme_names.get(wiz.cursor) {
                            crate::theme::init_theme(name);
                        }
                    }
                }
                None
            }
            Action::InsertChar(' ') => {
                if matches!(step_kind, Some(StepKind::Checkbox | StepKind::Radio | StepKind::ThemeSelect)) {
                    if let Some(wiz) = &mut self.onboarding {
                        wiz.toggle_selection();
                    }
                }
                None
            }
            Action::InsertChar('a') => {
                if matches!(step_kind, Some(StepKind::Checkbox))
                    && let Some(wiz) = &mut self.onboarding
                {
                    wiz.select_all();
                }
                None
            }
            Action::InsertChar('n') => {
                if matches!(step_kind, Some(StepKind::Checkbox))
                    && let Some(wiz) = &mut self.onboarding
                {
                    wiz.select_minimum();
                }
                None
            }
            Action::SubmitInput => {
                // Handle post-step side effects before advancing
                if let Some(wiz) = &mut self.onboarding {
                    if wiz.completed {
                        // Already on completion screen — close wizard
                        let summary = wiz.result_summary.clone();
                        if let Some(s) = &summary {
                            self.messages.push(ChatMessage::new(
                                MessageRole::System,
                                format!("Setup complete: {s}"),
                            ));
                        }
                        self.onboarding = None;
                        self.overlay = Overlay::None;
                        return Some(AppCommand::CompleteOnboarding);
                    }

                    let current_id = wiz.current().map(|s| s.id);

                    // Step 5 (workspace_trust): "No, exit" → quit
                    if current_id == Some("workspace_trust") {
                        let selected_idx = wiz.steps[wiz.current_step]
                            .selected
                            .first()
                            .copied()
                            .unwrap_or(0);
                        if selected_idx == 1 {
                            // "No, exit"
                            self.messages.push(ChatMessage::new(
                                MessageRole::System,
                                "Run complior in a trusted folder.".to_string(),
                            ));
                            self.onboarding = None;
                            self.overlay = Overlay::None;
                            self.running = false;
                            return None;
                        }
                    }
                }

                // Advance to next step
                let completed = self
                    .onboarding
                    .as_mut()
                    .is_some_and(OnboardingWizard::next_step);

                // Post-advance side effects
                if let Some(wiz) = &mut self.onboarding {
                    let prev_step = wiz
                        .active_steps
                        .iter()
                        .position(|&i| i == wiz.current_step)
                        .and_then(|pos| pos.checked_sub(1).map(|p| wiz.active_steps[p]));

                    // After Step 4 (project_type): update project_type and recalculate skips
                    if prev_step.and_then(|ps| wiz.steps.get(ps)).map(|s| s.id) == Some("project_type") {
                        let pt = wiz.selected_config_value("project_type");
                        wiz.project_type = Some(pt);
                        wiz.recalculate_active_steps();
                    }

                    // After Step 1 (welcome_theme): apply selected theme
                    if prev_step.and_then(|ps| wiz.steps.get(ps)).map(|s| s.id) == Some("welcome_theme") {
                        let theme_name = wiz.selected_config_value("welcome_theme");
                        crate::theme::init_theme(&theme_name);
                    }
                }

                if completed {
                    // Show summary step — not closing yet
                    // The summary step's SubmitInput will close
                }
                None
            }
            Action::DeleteChar => {
                // Backspace = previous step
                if let Some(wiz) = &mut self.onboarding {
                    wiz.prev_step();
                }
                None
            }
            Action::EnterNormalMode | Action::Quit => {
                // Esc = save partial + close wizard
                let last_step = self
                    .onboarding
                    .as_ref()
                    .map(|wiz| wiz.current_step)
                    .unwrap_or(0);
                self.onboarding = None;
                self.overlay = Overlay::None;
                Some(AppCommand::SaveOnboardingPartial(last_step))
            }
            _ => None,
        }
    }

    /// Handle input for TextInput steps (Step 3: AI Provider).
    fn handle_onboarding_text_input(&mut self, action: Action) -> Option<AppCommand> {
        let substep = self
            .onboarding
            .as_ref()
            .map(|wiz| wiz.provider_substep)
            .unwrap_or(0);

        match substep {
            0 => {
                // Provider select (radio-like)
                match action {
                    Action::ScrollDown => {
                        if let Some(wiz) = &mut self.onboarding {
                            wiz.move_cursor_down();
                        }
                    }
                    Action::ScrollUp => {
                        if let Some(wiz) = &mut self.onboarding {
                            wiz.move_cursor_up();
                        }
                    }
                    Action::SubmitInput => {
                        if let Some(wiz) = &mut self.onboarding {
                            let selected = wiz.cursor;
                            wiz.steps[wiz.current_step].selected = vec![selected];
                            if selected == 3 {
                                // Offline mode — skip key input, advance
                                wiz.validation_message =
                                    Some("Offline mode: static scan only.".to_string());
                                return self.advance_onboarding();
                            }
                            // Go to key input substep
                            wiz.provider_substep = 1;
                            wiz.steps[wiz.current_step].text_value.clear();
                            wiz.text_cursor = 0;
                        }
                    }
                    Action::DeleteChar => {
                        // Backspace = previous step
                        if let Some(wiz) = &mut self.onboarding {
                            wiz.prev_step();
                        }
                    }
                    Action::EnterNormalMode | Action::Quit => {
                        let last_step = self
                            .onboarding
                            .as_ref()
                            .map(|wiz| wiz.current_step)
                            .unwrap_or(0);
                        self.onboarding = None;
                        self.overlay = Overlay::None;
                        return Some(AppCommand::SaveOnboardingPartial(last_step));
                    }
                    _ => {}
                }
            }
            1 => {
                // Key text input
                match action {
                    Action::InsertChar(c) => {
                        if let Some(wiz) = &mut self.onboarding {
                            wiz.steps[wiz.current_step].text_value.push(c);
                            wiz.text_cursor += 1;
                        }
                    }
                    Action::DeleteChar => {
                        if let Some(wiz) = &mut self.onboarding {
                            let val = &mut wiz.steps[wiz.current_step].text_value;
                            if !val.is_empty() {
                                val.pop();
                                wiz.text_cursor = wiz.text_cursor.saturating_sub(1);
                            } else {
                                // Empty text + backspace → go back to provider select
                                wiz.provider_substep = 0;
                            }
                        }
                    }
                    Action::SubmitInput => {
                        if let Some(wiz) = &mut self.onboarding {
                            let key = wiz.steps[wiz.current_step].text_value.clone();
                            if key.is_empty() {
                                return None;
                            }
                            // Simple format validation
                            let provider = wiz.selected_config_value("ai_provider");
                            let valid = match provider.as_str() {
                                "openrouter" => key.starts_with("sk-or-"),
                                "anthropic" => key.starts_with("sk-ant-"),
                                "openai" => key.starts_with("sk-"),
                                _ => true,
                            };
                            if valid {
                                wiz.validation_message =
                                    Some("Valid. Key accepted.".to_string());
                                wiz.provider_substep = 3;
                            } else {
                                wiz.validation_message = Some(format!(
                                    "Invalid key format for {provider}. Check your key."
                                ));
                                wiz.provider_substep = 3;
                            }
                        }
                    }
                    Action::EnterNormalMode => {
                        // Esc → back to provider select
                        if let Some(wiz) = &mut self.onboarding {
                            wiz.provider_substep = 0;
                            wiz.steps[wiz.current_step].text_value.clear();
                        }
                    }
                    _ => {}
                }
            }
            3 => {
                // Result screen
                match action {
                    Action::SubmitInput => {
                        if let Some(wiz) = &self.onboarding {
                            let msg = wiz.validation_message.as_deref().unwrap_or("");
                            if msg.starts_with("Invalid") {
                                // Retry
                                if let Some(wiz) = &mut self.onboarding {
                                    wiz.provider_substep = 1;
                                    wiz.steps[wiz.current_step].text_value.clear();
                                    wiz.text_cursor = 0;
                                }
                            } else {
                                // Valid — advance to next step
                                return self.advance_onboarding();
                            }
                        }
                    }
                    Action::DeleteChar => {
                        // Back to key input
                        if let Some(wiz) = &mut self.onboarding {
                            wiz.provider_substep = 1;
                            wiz.steps[wiz.current_step].text_value.clear();
                            wiz.text_cursor = 0;
                        }
                    }
                    Action::EnterNormalMode | Action::Quit => {
                        let last_step = self
                            .onboarding
                            .as_ref()
                            .map(|wiz| wiz.current_step)
                            .unwrap_or(0);
                        self.onboarding = None;
                        self.overlay = Overlay::None;
                        return Some(AppCommand::SaveOnboardingPartial(last_step));
                    }
                    _ => {}
                }
            }
            _ => {}
        }
        None
    }

    /// Helper: advance onboarding wizard to next step and handle side effects.
    fn advance_onboarding(&mut self) -> Option<AppCommand> {
        let completed = self
            .onboarding
            .as_mut()
            .map(|wiz| wiz.next_step())
            .unwrap_or(false);

        // Post-advance side effects
        if let Some(wiz) = &mut self.onboarding {
            if let Some(prev_step) = wiz
                .active_steps
                .iter()
                .position(|&i| i == wiz.current_step)
                .and_then(|pos| {
                    if pos > 0 {
                        Some(wiz.active_steps[pos - 1])
                    } else {
                        None
                    }
                })
            {
                if wiz.steps.get(prev_step).map(|s| s.id) == Some("project_type") {
                    let pt = wiz.selected_config_value("project_type");
                    wiz.project_type = Some(pt);
                    wiz.recalculate_active_steps();
                }
            }
        }

        if completed {
            if let Some(wiz) = &self.onboarding {
                if let Some(summary) = &wiz.result_summary {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        format!("Setup complete: {summary}"),
                    ));
                }
            }
            self.onboarding = None;
            self.overlay = Overlay::None;
            return Some(AppCommand::CompleteOnboarding);
        }
        None
    }

    fn handle_overlay_action(&mut self, action: Action) -> Option<AppCommand> {
        // --- Theme Picker overlay ---
        if self.overlay == Overlay::ThemePicker {
            return self.handle_theme_picker_action(action);
        }

        // --- Onboarding overlay ---
        if self.overlay == Overlay::Onboarding {
            return self.handle_onboarding_action(action);
        }

        // --- Confirm Dialog overlay ---
        if self.overlay == Overlay::ConfirmDialog {
            match action {
                Action::InsertChar('y' | 'Y') => {
                    self.confirm_dialog = None;
                    self.overlay = Overlay::None;
                    self.toasts.push(crate::components::toast::ToastKind::Success, "Confirmed");
                }
                Action::EnterNormalMode | Action::Quit
                | Action::InsertChar('n' | 'N') => {
                    self.confirm_dialog = None;
                    self.overlay = Overlay::None;
                }
                _ => {}
            }
            return None;
        }

        // --- Undo History overlay ---
        if self.overlay == Overlay::UndoHistory {
            match action {
                Action::ScrollDown => self.undo_history.navigate_down(),
                Action::ScrollUp => self.undo_history.navigate_up(),
                Action::SubmitInput => {
                    // Undo selected entry
                    let id = self.undo_history.selected_id();
                    self.overlay = Overlay::None;
                    if let Some(id) = id {
                        return Some(AppCommand::Undo(Some(id)));
                    }
                }
                Action::EnterNormalMode | Action::Quit => {
                    self.overlay = Overlay::None;
                }
                _ => {}
            }
            return None;
        }

        // --- Dismiss Modal overlay ---
        if self.overlay == Overlay::DismissModal {
            match action {
                Action::ScrollDown => {
                    if let Some(modal) = &mut self.dismiss_modal {
                        modal.move_down();
                    }
                }
                Action::ScrollUp => {
                    if let Some(modal) = &mut self.dismiss_modal {
                        modal.move_up();
                    }
                }
                Action::SubmitInput => {
                    if let Some(modal) = &self.dismiss_modal {
                        let reason = modal.selected_reason();
                        self.toasts.push(
                            crate::components::toast::ToastKind::Info,
                            format!("Dismissed: {reason:?}"),
                        );
                    }
                    self.dismiss_modal = None;
                    self.overlay = Overlay::None;
                }
                Action::EnterNormalMode | Action::Quit => {
                    self.dismiss_modal = None;
                    self.overlay = Overlay::None;
                }
                _ => {}
            }
            return None;
        }

        match action {
            Action::EnterNormalMode | Action::Quit => {
                let was_getting_started = self.overlay == Overlay::GettingStarted;
                self.overlay = Overlay::None;
                self.overlay_filter.clear();
                if was_getting_started {
                    return Some(AppCommand::MarkFirstRunDone);
                }
                None
            }
            Action::InsertChar(c) => {
                self.overlay_filter.push(c);
                None
            }
            Action::DeleteChar => {
                self.overlay_filter.pop();
                None
            }
            Action::SubmitInput => {
                let filter = std::mem::take(&mut self.overlay_filter);
                match self.overlay {
                    Overlay::CommandPalette => {
                        self.overlay = Overlay::None;
                        if let Some(cmd) = crate::components::command_palette::complete_command(&filter) {
                            let cmd = cmd.trim_start_matches('/');
                            return self.handle_command(cmd);
                        }
                    }
                    Overlay::FilePicker => {
                        self.overlay = Overlay::None;
                        let matches = crate::components::file_picker::fuzzy_match_files(
                            &self.file_tree,
                            &filter,
                        );
                        if let Some(first) = matches.first() {
                            let path = first.path.to_string_lossy().to_string();
                            let mention = format!("@{path} ");
                            self.input.push_str(&mention);
                            self.input_cursor = self.input.len();
                        }
                    }
                    Overlay::GettingStarted => {
                        self.overlay = Overlay::None;
                        return Some(AppCommand::MarkFirstRunDone);
                    }
                    Overlay::Help => {
                        self.overlay = Overlay::None;
                    }
                    Overlay::ProviderSetup | Overlay::ModelSelector => {
                        self.overlay = Overlay::None;
                    }
                    Overlay::ConfirmDialog => {
                        self.confirm_dialog = None;
                        self.overlay = Overlay::None;
                    }
                    Overlay::DismissModal => {
                        self.dismiss_modal = None;
                        self.overlay = Overlay::None;
                    }
                    Overlay::None | Overlay::ThemePicker | Overlay::Onboarding
                    | Overlay::UndoHistory => {}
                }
                None
            }
            // Help overlay scroll with j/k
            Action::ScrollUp if self.overlay == Overlay::Help => {
                self.help_scroll = self.help_scroll.saturating_sub(1);
                None
            }
            Action::ScrollDown if self.overlay == Overlay::Help => {
                self.help_scroll += 1;
                None
            }
            // Ignore no-op keys
            Action::None | Action::ScrollUp | Action::ScrollDown
            | Action::HistoryUp | Action::HistoryDown => None,
            _ => {
                if self.overlay == Overlay::GettingStarted {
                    self.overlay = Overlay::None;
                    return Some(AppCommand::MarkFirstRunDone);
                } else if self.overlay == Overlay::Help {
                    self.overlay = Overlay::None;
                }
                None
            }
        }
    }

    pub fn set_scan_result(&mut self, result: ScanResult) {
        let score = result.score.total_score;
        let old_score = self.score_history.last().copied().unwrap_or(0.0);
        self.push_activity(ActivityKind::Scan, format!("{score:.0}/100"));
        self.score_history.push(score);

        // T08: Push counter animation on score change
        if self.animation.enabled && (old_score - score).abs() > 0.5 {
            self.animation.push(crate::animation::Animation::new(
                crate::animation::AnimKind::Counter {
                    from: old_score as u32,
                    to: score as u32,
                },
                800,
            ));
        }
        if self.score_history.len() > 20 {
            self.score_history.remove(0);
        }

        let zone = match result.score.zone {
            crate::types::Zone::Green => "GREEN",
            crate::types::Zone::Yellow => "YELLOW",
            crate::types::Zone::Red => "RED",
        };

        self.messages.push(ChatMessage::new(
            MessageRole::System,
            format!(
                "Scan complete: {:.0}/100 ({zone}) — {} files, {} checks ({} pass, {} fail)",
                score,
                result.files_scanned,
                result.score.total_checks,
                result.score.passed_checks,
                result.score.failed_checks,
            ),
        ));

        // Update scan view state
        self.scan_view.set_complete(result.files_scanned);
        self.scan_view.selected_finding = None;
        self.scan_view.detail_open = false;

        self.last_scan = Some(result);
        self.operation_start = None;
        self.chat_auto_scroll = true;

        // T07: Toast notification for scan completion
        let toast_msg = format!("Scan complete: {score:.0}/100 ({zone})");
        let kind = if score >= 80.0 {
            crate::components::toast::ToastKind::Success
        } else if score >= 50.0 {
            crate::components::toast::ToastKind::Warning
        } else {
            crate::components::toast::ToastKind::Error
        };
        self.toasts.push(kind, toast_msg);
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
        self.push_activity(ActivityKind::FileOpen, path.to_string());
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

    /// Count findings matching the current scan view filter.
    fn filtered_findings_count(&self) -> usize {
        self.last_scan
            .as_ref()
            .map_or(0, |s| {
                s.findings
                    .iter()
                    .filter(|f| self.scan_view.findings_filter.matches(f.severity))
                    .count()
            })
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
    Chat(String),
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
    /// Async: export compliance report to markdown file.
    ExportReport,
    /// Async: save provider config after model/provider change.
    SaveProviderConfig,
    /// Complete onboarding: save config + credentials, trigger post-completion action.
    CompleteOnboarding,
    /// Save partial onboarding progress for resume.
    SaveOnboardingPartial(usize),
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine_client::SseEvent;

    #[test]
    fn test_app_creation() {
        let app = App::new(TuiConfig::default());
        assert!(app.running);
        assert_eq!(app.active_panel, Panel::Chat);
        assert_eq!(app.input_mode, InputMode::Insert);
        assert_eq!(app.messages.len(), 1);
        assert!(app.sidebar_visible);
    }

    #[test]
    fn test_panel_cycling() {
        let mut app = App::new(TuiConfig::default());
        assert_eq!(app.active_panel, Panel::Chat);
        app.next_panel();
        assert_eq!(app.active_panel, Panel::Score);
        app.next_panel();
        assert_eq!(app.active_panel, Panel::FileBrowser);
        app.next_panel();
        assert_eq!(app.active_panel, Panel::Chat);
    }

    #[test]
    fn test_command_parsing() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("help");
        assert!(cmd.is_none());
        assert!(app.messages.len() > 1);
    }

    #[test]
    fn test_scan_command() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("scan");
        assert!(matches!(cmd, Some(AppCommand::Scan)));
        assert!(app.operation_start.is_some());
    }

    #[test]
    fn test_sse_token_streaming() {
        let mut app = App::new(TuiConfig::default());
        app.handle_sse_event(SseEvent::Token("Hello".to_string()));
        assert_eq!(app.streaming_response.as_deref(), Some("Hello"));

        app.handle_sse_event(SseEvent::Token(" world".to_string()));
        assert_eq!(app.streaming_response.as_deref(), Some("Hello world"));

        app.handle_sse_event(SseEvent::Done);
        assert!(app.streaming_response.is_none());
        assert_eq!(
            app.messages.last().map(|m| m.content.as_str()),
            Some("Hello world")
        );
    }

    #[test]
    fn test_input_history() {
        let mut app = App::new(TuiConfig::default());
        app.push_to_history("/scan");
        app.push_to_history("hello");
        assert_eq!(app.input_history.len(), 2);

        // Navigate up
        app.input = "current".to_string();
        app.history_up();
        assert_eq!(app.input, "hello");
        app.history_up();
        assert_eq!(app.input, "/scan");

        // Navigate down
        app.history_down();
        assert_eq!(app.input, "hello");
        app.history_down();
        assert_eq!(app.input, "current");
    }

    #[test]
    fn test_terminal_buffer_limit() {
        let mut app = App::new(TuiConfig::default());
        for i in 0..1050 {
            app.add_terminal_line(format!("line {i}"));
        }
        assert_eq!(app.terminal_output.len(), MAX_TERMINAL_LINES);
        assert!(app.terminal_output[0].contains("50")); // first 50 lines removed
    }

    #[test]
    fn test_bang_bash_prefix() {
        let mut app = App::new(TuiConfig::default());
        app.input = "!ls -la".to_string();
        app.input_cursor = app.input.len();
        let cmd = app.apply_action(Action::SubmitInput);
        assert!(matches!(cmd, Some(AppCommand::RunCommand(c)) if c == "ls -la"));
        assert!(app.terminal_visible);
    }

    #[test]
    fn test_activity_log_capped_at_10() {
        use crate::types::ActivityKind;
        let mut app = App::new(TuiConfig::default());
        for i in 0..15 {
            app.push_activity(ActivityKind::Scan, format!("scan {i}"));
        }
        assert_eq!(app.activity_log.len(), 10);
        // Oldest entries should have been dropped
        assert!(app.activity_log[0].detail.contains("5"));
        assert!(app.activity_log[9].detail.contains("14"));
    }

    #[test]
    fn test_score_history_load_from_disk() {
        let mut app = App::new(TuiConfig::default());
        // Simulate loading score history (as from session restore)
        let history = vec![42.0, 55.0, 68.0, 75.0, 82.0];
        app.score_history = history.clone();
        assert_eq!(app.score_history.len(), 5);
        assert_eq!(app.score_history, history);
    }

    #[test]
    fn test_watch_command_returns_toggle() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("watch");
        assert!(matches!(cmd, Some(AppCommand::ToggleWatch)));
    }

    #[test]
    fn test_reconnect_command() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("reconnect");
        assert!(matches!(cmd, Some(AppCommand::Reconnect)));
    }

    #[test]
    fn test_theme_command() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("theme light");
        assert!(matches!(cmd, Some(AppCommand::SwitchTheme(n)) if n == "light"));
    }

    #[test]
    fn test_view_command() {
        let mut app = App::new(TuiConfig::default());
        assert_eq!(app.view_state, ViewState::Dashboard);

        let cmd = app.handle_command("view 4");
        assert!(cmd.is_none());
        assert_eq!(app.view_state, ViewState::Chat);

        let cmd = app.handle_command("view 2");
        assert!(cmd.is_none());
        assert_eq!(app.view_state, ViewState::Scan);

        // Invalid view number
        let cmd = app.handle_command("view 9");
        assert!(cmd.is_none());
        assert_eq!(app.view_state, ViewState::Scan);
    }

    #[test]
    fn test_obl_tab_complete_without_dash() {
        let mut app = App::new(TuiConfig::default());
        app.input = "@OBL".to_string();
        app.input_cursor = 4;
        app.input_mode = InputMode::Insert;
        app.apply_action(crate::input::Action::TabComplete);
        // Should complete to @OBL-001 (first obligation)
        assert!(app.input.starts_with("@OBL-0"));
        assert!(app.input.len() > 4);
    }

    #[test]
    fn test_obl_tab_complete_with_dash() {
        let mut app = App::new(TuiConfig::default());
        app.input = "@OBL-".to_string();
        app.input_cursor = 5;
        app.input_mode = InputMode::Insert;
        app.apply_action(crate::input::Action::TabComplete);
        // Should complete to @OBL-001
        assert_eq!(app.input, "@OBL-001");
    }

    // ── T06 tests ──

    #[test]
    fn test_theme_picker_open_close() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());
        assert!(app.theme_picker.is_none());
        assert_eq!(app.overlay, Overlay::None);

        // Open theme picker
        app.apply_action(Action::ShowThemePicker);
        assert!(app.theme_picker.is_some());
        assert_eq!(app.overlay, Overlay::ThemePicker);

        // Close with Esc
        app.apply_action(Action::EnterNormalMode);
        assert!(app.theme_picker.is_none());
        assert_eq!(app.overlay, Overlay::None);
    }

    #[test]
    fn test_theme_picker_apply() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());

        // Open theme picker
        app.apply_action(Action::ShowThemePicker);
        assert_eq!(app.overlay, Overlay::ThemePicker);

        // Navigate to a different theme (move down)
        app.apply_action(Action::ScrollDown);

        // Apply with Enter
        app.apply_action(Action::SubmitInput);
        assert_eq!(app.overlay, Overlay::None);
        assert!(app.theme_picker.is_none());
        // Should have a system message about theme change
        assert!(app.messages.iter().any(|m| m.content.contains("Theme:")));
    }

    #[test]
    fn test_onboarding_wizard_flow() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());

        // Open onboarding
        app.onboarding = Some(crate::views::onboarding::OnboardingWizard::new());
        app.overlay = Overlay::Onboarding;

        // Navigate and select
        app.apply_action(Action::ScrollDown); // cursor to option 1
        app.apply_action(Action::InsertChar(' ')); // select it

        // Next step
        app.apply_action(Action::SubmitInput);
        assert_eq!(app.overlay, Overlay::Onboarding); // still open

        // Skip rest with Esc
        app.apply_action(Action::EnterNormalMode);
        assert_eq!(app.overlay, Overlay::None);
        assert!(app.onboarding.is_none());
    }

    #[test]
    fn test_code_search_submission() {
        let mut app = App::new(TuiConfig::default());
        app.code_content = Some("hello world\nfoo bar\nhello again".to_string());
        app.active_panel = Panel::CodeViewer;

        // Simulate code search: enter command mode, type query, submit
        app.apply_action(Action::CodeSearch);
        assert_eq!(app.input_mode, InputMode::Command);

        // Type search query
        app.input = "hello".to_string();
        app.input_cursor = 5;

        // Submit (should detect CodeViewer + no '/' prefix → code search)
        app.apply_action(Action::SubmitInput);

        assert_eq!(app.code_search_query.as_deref(), Some("hello"));
        assert_eq!(app.code_search_matches, vec![0, 2]);
        assert_eq!(app.code_scroll, 0); // jumped to first match
    }

    #[test]
    fn test_theme_command_opens_picker() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("theme");
        assert!(cmd.is_none());
        assert_eq!(app.overlay, Overlay::ThemePicker);
        assert!(app.theme_picker.is_some());
    }

    // ── T08 Tests ──

    #[test]
    fn test_click_areas_rebuilt_on_dashboard() {
        let mut app = App::new(TuiConfig::default());
        app.view_state = ViewState::Dashboard;
        app.rebuild_click_areas(120, 40);
        // Should have at least 6 view tabs in footer
        let tab_count = app.click_areas.iter()
            .filter(|(_, t)| matches!(t, crate::types::ClickTarget::ViewTab(_)))
            .count();
        assert_eq!(tab_count, 6);
    }

    #[test]
    fn test_click_areas_sidebar_toggle_when_visible() {
        let mut app = App::new(TuiConfig::default());
        app.sidebar_visible = true;
        app.rebuild_click_areas(120, 40); // Medium breakpoint, sidebar visible
        let has_sidebar = app.click_areas.iter()
            .any(|(_, t)| matches!(t, crate::types::ClickTarget::SidebarToggle));
        assert!(has_sidebar, "Medium width with sidebar visible should have SidebarToggle");
    }

    #[test]
    fn test_click_areas_no_sidebar_on_small_terminal() {
        let mut app = App::new(TuiConfig::default());
        app.sidebar_visible = true;
        app.rebuild_click_areas(80, 30); // Small breakpoint
        let has_sidebar = app.click_areas.iter()
            .any(|(_, t)| matches!(t, crate::types::ClickTarget::SidebarToggle));
        assert!(!has_sidebar, "Small terminal should not have SidebarToggle");
    }

    #[test]
    fn test_idle_suggestion_triggers_fetch() {
        let mut app = App::new(TuiConfig::default());
        app.input_mode = InputMode::Normal;
        // Simulate 15s idle
        app.idle_suggestions.last_input = std::time::Instant::now() - std::time::Duration::from_secs(15);
        let cmd = app.tick();
        assert!(matches!(cmd, Some(AppCommand::FetchSuggestions)));
        assert!(app.idle_suggestions.fetch_pending);
    }

    #[test]
    fn test_idle_no_fetch_when_insert_mode() {
        let mut app = App::new(TuiConfig::default());
        app.input_mode = InputMode::Insert;
        app.idle_suggestions.last_input = std::time::Instant::now() - std::time::Duration::from_secs(15);
        let cmd = app.tick();
        assert!(cmd.is_none(), "Should not trigger fetch in insert mode");
    }

    #[test]
    fn test_colon_mode_activation() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());
        app.input_mode = InputMode::Normal;
        let _cmd = app.apply_action(Action::EnterColonMode);
        assert!(app.colon_mode);
        assert_eq!(app.input_mode, InputMode::Command);
    }
}
