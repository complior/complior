use std::path::PathBuf;
use std::time::Instant;

use crate::components::spinner::Spinner;
use crate::config::TuiConfig;
use crate::engine_client::{EngineClient, SseEvent};
use crate::input::Action;
use crate::providers::ProviderConfig;
use crate::types::{
    ChatBlock, ChatMessage, DiffContent, EngineConnectionStatus, FileEntry, InputMode,
    MessageRole, Mode, Overlay, Panel, ScanResult, Selection, ViewState,
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

    // UI
    pub spinner: Spinner,
    pub project_path: PathBuf,
    pub operation_start: Option<Instant>,
}

const MAX_HISTORY: usize = 50;
const MAX_TERMINAL_LINES: usize = 1000;

impl App {
    pub fn new(config: TuiConfig) -> Self {
        let engine_client = EngineClient::new(&config);
        let sidebar_visible = config.sidebar_visible;
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
            spinner: Spinner::new(),
            project_path,
            operation_start: None,
        }
    }

    pub fn tick(&mut self) {
        self.spinner.advance();
    }

    /// Elapsed seconds since operation started.
    pub fn elapsed_secs(&self) -> Option<u64> {
        self.operation_start.map(|s| s.elapsed().as_secs())
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

    pub fn apply_action(&mut self, action: Action) -> Option<AppCommand> {
        // Handle overlay-specific input first
        if self.overlay == Overlay::ProviderSetup {
            return crate::components::provider_setup::handle_provider_setup_action(self, action);
        }
        if self.overlay == Overlay::ModelSelector {
            return crate::components::model_selector::handle_model_selector_action(self, action);
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

                if self.input_mode == InputMode::Command || text.starts_with('/') {
                    let cmd = text.trim_start_matches('/');
                    self.input_mode = InputMode::Insert;
                    return self.handle_command(cmd);
                }

                // Chat message
                self.messages.push(ChatMessage::new(
                    MessageRole::User,
                    text.clone(),
                ));
                self.chat_auto_scroll = true;
                Some(AppCommand::Chat(text))
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
                self.handle_view_key(c);
                return None;
            }
            Action::ViewEnter => {
                self.handle_view_enter();
                return None;
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
            Action::None => None,
        }
    }

    fn handle_overlay_action(&mut self, action: Action) -> Option<AppCommand> {
        match action {
            Action::EnterNormalMode | Action::Quit => {
                if self.overlay == Overlay::GettingStarted {
                    crate::session::mark_first_run_done();
                }
                self.overlay = Overlay::None;
                self.overlay_filter.clear();
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
                            // Insert @path into input
                            let mention = format!("@{path} ");
                            self.input.push_str(&mention);
                            self.input_cursor = self.input.len();
                        }
                    }
                    Overlay::GettingStarted => {
                        self.overlay = Overlay::None;
                        crate::session::mark_first_run_done();
                    }
                    Overlay::Help => {
                        self.overlay = Overlay::None;
                    }
                    Overlay::ProviderSetup | Overlay::ModelSelector => {
                        // Handled by dedicated component handlers above
                        self.overlay = Overlay::None;
                    }
                    Overlay::None => {}
                }
                None
            }
            // Ignore no-op keys (arrows etc.) — don't dismiss overlay
            Action::None | Action::ScrollUp | Action::ScrollDown
            | Action::HistoryUp | Action::HistoryDown => None,
            _ => {
                // Dismiss Help/GettingStarted on any real action
                if self.overlay == Overlay::GettingStarted {
                    self.overlay = Overlay::None;
                    crate::session::mark_first_run_done();
                } else if self.overlay == Overlay::Help {
                    self.overlay = Overlay::None;
                }
                None
            }
        }
    }

    fn try_tab_complete(&mut self) {
        if self.input.starts_with('/') {
            let partial = &self.input[1..];
            if let Some(completed) = crate::components::command_palette::complete_command(partial) {
                self.input = completed.to_string();
                self.input_cursor = self.input.len();
            }
        }
    }

    fn handle_command(&mut self, cmd: &str) -> Option<AppCommand> {
        let parts: Vec<&str> = cmd.splitn(2, ' ').collect();
        match parts.first().copied() {
            Some("scan") => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Scanning project...".to_string(),
                ));
                self.operation_start = Some(Instant::now());
                Some(AppCommand::Scan)
            }
            Some("edit") => {
                let path = parts.get(1).unwrap_or(&"").to_string();
                if path.is_empty() {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Usage: /edit <file-path>".to_string(),
                    ));
                    None
                } else {
                    Some(AppCommand::OpenFile(path))
                }
            }
            Some("run") => {
                let command = parts.get(1).unwrap_or(&"").to_string();
                if command.is_empty() {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Usage: /run <command>".to_string(),
                    ));
                    None
                } else {
                    self.terminal_visible = true;
                    Some(AppCommand::RunCommand(command))
                }
            }
            Some("clear") => {
                self.terminal_output.clear();
                self.terminal_scroll = 0;
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Terminal cleared.".to_string(),
                ));
                None
            }
            Some("reconnect") => Some(AppCommand::Reconnect),
            Some("theme") => {
                let name = parts.get(1).unwrap_or(&"").to_string();
                if name.is_empty() {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Themes: dark, light, high-contrast. Usage: /theme <name>".to_string(),
                    ));
                    None
                } else {
                    Some(AppCommand::SwitchTheme(name))
                }
            }
            Some("save") => {
                let name = parts.get(1).unwrap_or(&"latest").to_string();
                Some(AppCommand::SaveSession(name))
            }
            Some("load") => {
                let name = parts.get(1).unwrap_or(&"latest").to_string();
                Some(AppCommand::LoadSession(name))
            }
            Some("sessions") => {
                let sessions = crate::session::list_sessions();
                if sessions.is_empty() {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "No saved sessions.".to_string(),
                    ));
                } else {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        format!("Sessions: {}", sessions.join(", ")),
                    ));
                }
                None
            }
            Some("help") => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    concat!(
                        "Commands:\n",
                        "  /scan          — Scan project for compliance\n",
                        "  /edit <path>   — Open file in viewer\n",
                        "  /run <cmd>     — Run shell command\n",
                        "  /clear         — Clear terminal output\n",
                        "  /reconnect     — Reconnect to engine\n",
                        "  /theme <name>  — Switch theme (dark/light/high-contrast)\n",
                        "  /view <1-6>    — Switch to view (Dashboard/Scan/Fix/Chat/Timeline/Report)\n",
                        "  /save [name]   — Save session\n",
                        "  /load [name]   — Load session\n",
                        "  /sessions      — List saved sessions\n",
                        "  /provider      — Configure LLM provider\n",
                        "  /model         — Switch model (also Ctrl+M)\n",
                        "  /welcome       — Show getting started\n",
                        "  /help          — Show this help\n",
                        "\n",
                        "Shortcuts:\n",
                        "  @file          — Reference file in message\n",
                        "  !cmd           — Run shell command directly\n",
                        "  1-6            — Switch view (Normal mode)\n",
                        "  Tab            — Toggle mode (Scan/Fix/Watch)\n",
                        "  Alt+1..5       — Jump to panel\n",
                        "  Ctrl+P         — Command palette\n",
                        "  Ctrl+B         — Toggle sidebar\n",
                        "  Ctrl+T         — Toggle terminal\n",
                        "  V              — Visual select (code viewer)\n",
                        "  Ctrl+K         — Send selection to AI\n",
                        "  ?              — Help (Normal mode)\n",
                        "  q              — Quit\n",
                    )
                    .to_string(),
                ));
                None
            }
            Some("provider") => {
                self.overlay = Overlay::ProviderSetup;
                self.provider_setup_step = 0;
                self.provider_setup_selected = 0;
                self.provider_setup_key_input.clear();
                self.provider_setup_error = None;
                None
            }
            Some("model") => {
                if crate::providers::is_configured(&self.provider_config) {
                    self.overlay = Overlay::ModelSelector;
                    self.model_selector_index = 0;
                } else {
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "No providers configured. Use /provider first.".to_string(),
                    ));
                }
                None
            }
            Some("view") => {
                let num_str = parts.get(1).unwrap_or(&"").trim();
                if let Ok(num) = num_str.parse::<u8>() {
                    if let Some(view) = ViewState::from_key(num) {
                        self.view_state = view;
                        return None;
                    }
                }
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Usage: /view <1-6> (Dashboard/Scan/Fix/Chat/Timeline/Report)".to_string(),
                ));
                None
            }
            Some("welcome") => {
                self.overlay = Overlay::GettingStarted;
                None
            }
            _ => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!("Unknown command: /{cmd}. Type /help for usage."),
                ));
                None
            }
        }
    }

    pub fn handle_sse_event(&mut self, event: SseEvent) {
        match event {
            SseEvent::Thinking(text) => {
                let thinking = self.streaming_thinking.get_or_insert_with(String::new);
                thinking.push_str(&text);
            }
            SseEvent::Token(token) => {
                let response = self.streaming_response.get_or_insert_with(String::new);
                response.push_str(&token);
            }
            SseEvent::ToolCall { id: _, tool_name, args } => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!("Tool call: {tool_name}"),
                ));
                if let Some(msg) = self.messages.last_mut() {
                    msg.blocks.push(ChatBlock::ToolCall { tool_name, args });
                }
            }
            SseEvent::ToolResult { id: _, tool_name, result, is_error } => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!("Tool result: {tool_name}{}",
                        if is_error { " (error)" } else { "" }),
                ));
                if let Some(msg) = self.messages.last_mut() {
                    msg.blocks.push(ChatBlock::ToolResult { tool_name, result, is_error });
                }
            }
            SseEvent::Usage { prompt_tokens, completion_tokens } => {
                self.last_token_usage = Some((prompt_tokens, completion_tokens));
            }
            SseEvent::Done => {
                if let Some(response) = self.streaming_response.take() {
                    let mut msg = ChatMessage::new(MessageRole::Assistant, response);
                    if let Some(thinking) = self.streaming_thinking.take() {
                        if !thinking.is_empty() {
                            msg.blocks.insert(0, ChatBlock::Thinking(thinking));
                        }
                    }
                    msg.blocks.push(ChatBlock::Text(msg.content.clone()));
                    self.messages.push(msg);
                    self.chat_auto_scroll = true;
                }
                self.streaming_thinking = None;
                self.operation_start = None;
            }
            SseEvent::Error(err) => {
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    format!("Error: {err}"),
                ));
                self.streaming_response = None;
                self.streaming_thinking = None;
                self.operation_start = None;
            }
        }
    }

    pub fn set_scan_result(&mut self, result: ScanResult) {
        let score = result.score.total_score;
        self.score_history.push(score);
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
    }

    pub fn load_file_tree(&mut self) {
        self.file_tree = file_browser::build_file_tree(&self.project_path);
    }

    pub fn open_file(&mut self, path: &str, content: String) {
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

    /// Handle view-specific single-char key presses (Normal mode).
    fn handle_view_key(&mut self, c: char) {
        match self.view_state {
            ViewState::Scan => {
                if let Some(filter) =
                    crate::views::scan::FindingsFilter::from_key(c)
                {
                    self.scan_view.findings_filter = filter;
                    self.scan_view.selected_finding = Some(0);
                } else if c == 'f' && self.scan_view.detail_open {
                    // Go to Fix View with current finding
                    self.scan_view.detail_open = false;
                    self.view_state = ViewState::Fix;
                    if let Some(scan) = &self.last_scan {
                        self.fix_view = FixViewState::from_scan(&scan.findings);
                    }
                }
            }
            ViewState::Fix => match c {
                ' ' => self.fix_view.toggle_current(),
                'a' => self.fix_view.select_all(),
                'n' => self.fix_view.deselect_all(),
                'd' => self.fix_view.diff_visible = !self.fix_view.diff_visible,
                _ => {}
            },
            ViewState::Report => {
                if c == 'e' {
                    if let Some(scan) = &self.last_scan {
                        match crate::views::report::export_report(scan) {
                            Ok(path) => {
                                self.report_view.export_status =
                                    crate::views::report::ExportStatus::Done(path.clone());
                                self.messages.push(ChatMessage::new(
                                    MessageRole::System,
                                    format!("Report exported: {path}"),
                                ));
                            }
                            Err(e) => {
                                self.report_view.export_status =
                                    crate::views::report::ExportStatus::Error(e.clone());
                                self.messages.push(ChatMessage::new(
                                    MessageRole::System,
                                    format!("Export failed: {e}"),
                                ));
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    /// Handle Enter key in view context.
    fn handle_view_enter(&mut self) {
        match self.view_state {
            ViewState::Scan => {
                if self.scan_view.detail_open {
                    // Close detail
                    self.scan_view.detail_open = false;
                } else if self.last_scan.is_some() {
                    // Open finding detail
                    self.scan_view.detail_open = true;
                }
            }
            ViewState::Fix => {
                if self.fix_view.results.is_some() {
                    // Dismiss results
                    self.fix_view.results = None;
                } else if self.fix_view.selected_count() > 0 {
                    // Apply fixes (placeholder — engine API not yet connected)
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        "Fix apply not yet connected to engine. Re-scan to verify.".to_string(),
                    ));
                }
            }
            _ => {}
        }
    }

    /// Handle Esc key in view context.
    fn handle_view_escape(&mut self) {
        match self.view_state {
            ViewState::Scan => {
                if self.scan_view.detail_open {
                    self.scan_view.detail_open = false;
                }
            }
            ViewState::Fix => {
                if self.fix_view.results.is_some() {
                    self.fix_view.results = None;
                }
            }
            _ => {}
        }
    }
}

#[derive(Debug)]
pub enum AppCommand {
    Scan,
    Chat(String),
    OpenFile(String),
    RunCommand(String),
    Reconnect,
    SwitchTheme(String),
    SaveSession(String),
    LoadSession(String),
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
