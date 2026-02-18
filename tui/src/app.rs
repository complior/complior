use std::path::PathBuf;

use crate::components::spinner::Spinner;
use crate::config::TuiConfig;
use crate::engine_client::{EngineClient, SseEvent};
use crate::input::Action;
use crate::types::{
    ChatMessage, DiffContent, EngineConnectionStatus, FileEntry, InputMode, MessageRole, Panel,
    ScanResult, Selection,
};
use crate::views::file_browser;

pub struct App {
    // Core state
    pub running: bool,
    pub active_panel: Panel,
    pub input_mode: InputMode,
    pub config: TuiConfig,

    // Engine
    pub engine_status: EngineConnectionStatus,
    pub engine_client: EngineClient,

    // Chat
    pub messages: Vec<ChatMessage>,
    pub input: String,
    pub input_cursor: usize,
    pub streaming_response: Option<String>,

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

    // Diff
    pub diff_content: Option<DiffContent>,

    // UI
    pub spinner: Spinner,
    pub project_path: PathBuf,
}

impl App {
    pub fn new(config: TuiConfig) -> Self {
        let engine_client = EngineClient::new(&config);
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
            engine_status: EngineConnectionStatus::Connecting,
            engine_client,
            messages: vec![ChatMessage {
                role: MessageRole::System,
                content: "Welcome to Complior. Type a message or /scan to start.".to_string(),
            }],
            input: String::new(),
            input_cursor: 0,
            streaming_response: None,
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
            diff_content: None,
            spinner: Spinner::new(),
            project_path,
        }
    }

    pub fn tick(&mut self) {
        self.spinner.advance();
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

    pub fn apply_action(&mut self, action: Action) -> Option<AppCommand> {
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
            Action::ScrollUp => {
                match self.active_panel {
                    Panel::CodeViewer => {
                        self.code_scroll = self.code_scroll.saturating_sub(1);
                    }
                    Panel::FileBrowser => {
                        self.file_browser_index = self.file_browser_index.saturating_sub(1);
                    }
                    _ => {}
                }
                None
            }
            Action::ScrollDown => {
                match self.active_panel {
                    Panel::CodeViewer => {
                        self.code_scroll += 1;
                    }
                    Panel::FileBrowser => {
                        if self.file_browser_index + 1 < self.file_tree.len() {
                            self.file_browser_index += 1;
                        }
                    }
                    _ => {}
                }
                None
            }
            Action::ScrollHalfPageUp => {
                self.code_scroll = self.code_scroll.saturating_sub(10);
                None
            }
            Action::ScrollHalfPageDown => {
                self.code_scroll += 10;
                None
            }
            Action::ScrollToTop => {
                self.code_scroll = 0;
                None
            }
            Action::ScrollToBottom => {
                self.code_scroll = usize::MAX;
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

                if self.input_mode == InputMode::Command || text.starts_with('/') {
                    let cmd = text.trim_start_matches('/');
                    self.input_mode = InputMode::Insert;
                    return self.handle_command(cmd);
                }

                // Chat message
                self.messages.push(ChatMessage {
                    role: MessageRole::User,
                    content: text.clone(),
                });
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
                self.messages.push(ChatMessage {
                    role: MessageRole::System,
                    content: "Diff applied.".to_string(),
                });
                None
            }
            Action::RejectDiff => {
                self.diff_content = None;
                self.active_panel = Panel::Chat;
                self.messages.push(ChatMessage {
                    role: MessageRole::System,
                    content: "Diff rejected.".to_string(),
                });
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
                        file_browser::toggle_expand(&mut self.file_tree, self.file_browser_index);
                        None
                    } else {
                        let path = entry.path.to_string_lossy().to_string();
                        Some(AppCommand::OpenFile(path))
                    }
                } else {
                    None
                }
            }
            Action::None => None,
        }
    }

    fn handle_command(&mut self, cmd: &str) -> Option<AppCommand> {
        let parts: Vec<&str> = cmd.splitn(2, ' ').collect();
        match parts.first().copied() {
            Some("scan") => {
                self.messages.push(ChatMessage {
                    role: MessageRole::System,
                    content: "Scanning project...".to_string(),
                });
                Some(AppCommand::Scan)
            }
            Some("edit") => {
                let path = parts.get(1).unwrap_or(&"").to_string();
                if path.is_empty() {
                    self.messages.push(ChatMessage {
                        role: MessageRole::System,
                        content: "Usage: /edit <file-path>".to_string(),
                    });
                    None
                } else {
                    Some(AppCommand::OpenFile(path))
                }
            }
            Some("run") => {
                let command = parts.get(1).unwrap_or(&"").to_string();
                if command.is_empty() {
                    self.messages.push(ChatMessage {
                        role: MessageRole::System,
                        content: "Usage: /run <command>".to_string(),
                    });
                    None
                } else {
                    self.terminal_visible = true;
                    Some(AppCommand::RunCommand(command))
                }
            }
            Some("help") => {
                self.messages.push(ChatMessage {
                    role: MessageRole::System,
                    content: concat!(
                        "Commands:\n",
                        "  /scan          — Scan project for compliance\n",
                        "  /edit <path>   — Open file in viewer\n",
                        "  /run <cmd>     — Run shell command\n",
                        "  /help          — Show this help\n",
                        "\n",
                        "Navigation:\n",
                        "  Tab — switch panel  |  j/k — scroll\n",
                        "  V — visual select   |  Ctrl+K — send to AI\n",
                        "  i — insert mode     |  q — quit\n",
                    )
                    .to_string(),
                });
                None
            }
            _ => {
                self.messages.push(ChatMessage {
                    role: MessageRole::System,
                    content: format!("Unknown command: /{cmd}. Type /help for usage."),
                });
                None
            }
        }
    }

    pub fn handle_sse_event(&mut self, event: SseEvent) {
        match event {
            SseEvent::Token(token) => {
                let response = self.streaming_response.get_or_insert_with(String::new);
                response.push_str(&token);
            }
            SseEvent::Done => {
                if let Some(response) = self.streaming_response.take() {
                    self.messages.push(ChatMessage {
                        role: MessageRole::Assistant,
                        content: response,
                    });
                }
            }
            SseEvent::Error(err) => {
                self.messages.push(ChatMessage {
                    role: MessageRole::System,
                    content: format!("Error: {err}"),
                });
                self.streaming_response = None;
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

        self.messages.push(ChatMessage {
            role: MessageRole::System,
            content: format!(
                "Scan complete: {:.0}/100 ({zone}) — {} files, {} checks ({} pass, {} fail)",
                score,
                result.files_scanned,
                result.score.total_checks,
                result.score.passed_checks,
                result.score.failed_checks,
            ),
        });

        self.last_scan = Some(result);
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
}

#[derive(Debug)]
pub enum AppCommand {
    Scan,
    Chat(String),
    OpenFile(String),
    RunCommand(String),
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
        assert_eq!(app.messages.last().map(|m| m.content.as_str()), Some("Hello world"));
    }
}
