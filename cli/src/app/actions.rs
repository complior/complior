use std::time::Instant;

use crate::input::Action;
use crate::types::{
    ChatMessage, ClickTarget, InputMode, MessageRole, Overlay, Panel, Selection, ViewState,
};
use crate::views::file_browser;
use crate::views::fix::FixViewState;

use super::{App, AppCommand};

impl App {
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
                    ViewState::Fix => {
                        if self.fix_view.is_single_fix() {
                            self.cycle_single_fix(-1);
                        } else {
                            self.fix_view.navigate_up();
                        }
                    }
                    ViewState::Timeline => {
                        self.timeline_view.scroll_offset =
                            self.timeline_view.scroll_offset.saturating_sub(1);
                    }
                    ViewState::Report => {
                        self.report_view.scroll_offset =
                            self.report_view.scroll_offset.saturating_sub(1);
                    }
                    ViewState::Passport => {
                        use crate::views::passport::{PassportDetailMode, PassportViewMode};
                        if self.passport_view.view_mode == PassportViewMode::AgentList {
                            if self.passport_view.selected_passport > 0 {
                                self.passport_view.selected_passport -= 1;
                            }
                        } else if self.passport_view.detail_mode == PassportDetailMode::ObligationChecklist {
                            self.passport_view.obligation_scroll =
                                self.passport_view.obligation_scroll.saturating_sub(1);
                        } else if self.passport_view.selected_index > 0 {
                            self.passport_view.selected_index -= 1;
                        }
                    }
                    ViewState::Obligations => {
                        let filtered_len = self.obligations_view.filtered_obligations().len();
                        if filtered_len > 0 && self.obligations_view.selected_index > 0 {
                            self.obligations_view.selected_index -= 1;
                        }
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
                    ViewState::Fix => {
                        if self.fix_view.is_single_fix() {
                            self.cycle_single_fix(1);
                        } else {
                            self.fix_view.navigate_down();
                        }
                    }
                    ViewState::Timeline => {
                        self.timeline_view.scroll_offset += 1;
                    }
                    ViewState::Report => {
                        self.report_view.scroll_offset += 1;
                    }
                    ViewState::Passport => {
                        use crate::views::passport::{PassportDetailMode, PassportViewMode};
                        if self.passport_view.view_mode == PassportViewMode::AgentList {
                            let max = self.passport_view.loaded_passports.len().saturating_sub(1);
                            if self.passport_view.selected_passport < max {
                                self.passport_view.selected_passport += 1;
                            }
                        } else if self.passport_view.detail_mode == PassportDetailMode::ObligationChecklist {
                            self.passport_view.obligation_scroll += 1;
                        } else {
                            let max = self.passport_view.fields.len().saturating_sub(1);
                            if self.passport_view.selected_index < max {
                                self.passport_view.selected_index += 1;
                            }
                        }
                    }
                    ViewState::Obligations => {
                        let filtered_len = self.obligations_view.filtered_obligations().len();
                        if filtered_len > 0
                            && self.obligations_view.selected_index < filtered_len.saturating_sub(1)
                        {
                            self.obligations_view.selected_index += 1;
                        }
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

                // Plain text — not a command; Complior is a wrapper, not an LLM chat
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Unknown input. Use /help or :scan".to_string(),
                ));
                self.chat_auto_scroll = true;
                None
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
                self.active_panel = Panel::Chat;
                self.messages.push(ChatMessage::new(
                    MessageRole::System,
                    "Diff applied.".to_string(),
                ));
                None
            }
            Action::RejectDiff => {
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
                self.palette_index = 0;
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
            Action::SwitchView(view) => {
                self.view_state = view;
                // Populate Fix view from latest scan when switching to it
                if view == ViewState::Fix {
                    if let Some(scan) = &self.last_scan {
                        self.fix_view = FixViewState::from_scan(&scan.findings);
                    }
                }
                // Auto-load obligations when switching to Obligations view
                if view == ViewState::Obligations && self.obligations_view.obligations.is_empty() {
                    return Some(AppCommand::LoadObligations);
                }
                // Auto-load passports when switching to Passport view
                if view == ViewState::Passport && self.passport_view.loaded_passports.is_empty() {
                    return Some(AppCommand::LoadPassports);
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
}
