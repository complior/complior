use crossterm::event::{KeyCode, KeyEvent, KeyModifiers, MouseEvent, MouseEventKind, MouseButton};

use crate::app::App;
use crate::types::{ClickTarget, InputMode, Overlay, Panel, ViewState};

/// User actions produced by keyboard/mouse input mapping.
///
/// Each variant represents a semantic action that the app can handle.
/// Key bindings are defined in `handle_key_event()` below.
pub enum Action {
    /// Quit the application (Ctrl+C).
    Quit,
    /// Cycle to the next panel (Tab in Insert mode).
    NextPanel,
    /// Toggle the terminal panel (Ctrl+T).
    ToggleTerminal,
    /// Toggle the sidebar panel (Ctrl+B).
    ToggleSidebar,
    /// Toggle the files panel (Ctrl+F).
    ToggleFilesPanel,
    /// Close the currently open file viewer.
    CloseFile,
    /// Submit the current input (Enter in Insert mode).
    SubmitInput,
    /// Insert a character into the input buffer.
    InsertChar(char),
    /// Delete the character before the cursor (Backspace).
    DeleteChar,
    /// Move cursor left in input buffer.
    MoveCursorLeft,
    /// Move cursor right in input buffer.
    MoveCursorRight,
    /// Navigate input history up (Arrow Up).
    HistoryUp,
    /// Navigate input history down (Arrow Down).
    HistoryDown,
    /// Trigger tab completion for commands, @OBL- references, etc.
    TabComplete,
    /// Scroll content up by one line (k / Arrow Up in Normal mode).
    ScrollUp,
    /// Scroll content down by one line (j / Arrow Down in Normal mode).
    ScrollDown,
    /// Scroll half a page up (Ctrl+U).
    ScrollHalfPageUp,
    /// Scroll half a page down (Ctrl+D).
    ScrollHalfPageDown,
    /// Scroll to top of content (g in Normal mode).
    ScrollToTop,
    /// Scroll to bottom of content (G in Normal mode).
    ScrollToBottom,
    /// Enter Insert mode (i in Normal mode).
    EnterInsertMode,
    /// Enter Normal mode (Esc).
    EnterNormalMode,
    /// Enter Visual select mode (V in Normal mode).
    EnterVisualMode,
    /// Enter command mode (/ prefix).
    EnterCommandMode,
    /// Enter colon-command mode (: in Normal mode).
    EnterColonMode,
    /// Extend visual selection up.
    SelectionUp,
    /// Extend visual selection down.
    SelectionDown,
    /// Send visual selection to AI chat (Ctrl+K in Visual mode).
    SendSelectionToAi,
    /// Accept a proposed diff.
    AcceptDiff,
    /// Reject a proposed diff.
    RejectDiff,
    /// Toggle expand/collapse of a tree node.
    ToggleExpand,
    /// Open the selected file in the viewer.
    OpenFile,
    /// Open the command palette overlay (Ctrl+P).
    ShowCommandPalette,
    /// Open the file picker overlay.
    ShowFilePicker,
    /// Open the help overlay (? in Normal mode).
    ShowHelp,
    /// Focus a specific panel (Alt+1..5).
    FocusPanel(Panel),
    /// Open the model selector overlay (M in Normal mode).
    ShowModelSelector,
    /// Open the provider setup overlay.
    ShowProviderSetup,
    /// Jump to a specific line number.
    GotoLine,
    /// Switch to a numbered view (1-6 in Normal mode).
    SwitchView(ViewState),
    /// Toggle mode (Scan/Fix/Watch via Tab in Normal mode).
    ToggleMode,
    /// Trigger a compliance scan (Ctrl+S).
    StartScan,
    /// Toggle file watcher mode.
    WatchToggle,
    /// Open the theme picker overlay.
    ShowThemePicker,
    /// Start inline code search (/ in Normal mode on code viewer).
    CodeSearch,
    /// Jump to next code search match (n).
    CodeSearchNext,
    /// Jump to previous code search match (N).
    CodeSearchPrev,
    /// Undo the last action (Ctrl+Z).
    Undo,
    /// Show the undo history overlay (U in Normal mode).
    ShowUndoHistory,
    /// Mouse click at a specific UI target.
    ClickAt(ClickTarget),
    /// Mouse scroll by N lines (positive = down, negative = up).
    ScrollLines(i32),
    /// View-specific single-char key press (delegated to active view).
    ViewKey(char),
    /// View-specific Enter key press.
    ViewEnter,
    /// View-specific Escape key press.
    ViewEscape,
    /// No action (unhandled key).
    None,
}

pub fn handle_key_event(key: KeyEvent, app: &App) -> Action {
    // Global shortcuts (always active)
    if key.modifiers.contains(KeyModifiers::CONTROL) {
        match key.code {
            KeyCode::Char('c') => return Action::Quit,
            KeyCode::Char('t') => return Action::ToggleTerminal,
            KeyCode::Char('b') => return Action::ToggleSidebar,
            KeyCode::Char('f') => return Action::ToggleFilesPanel,
            KeyCode::Char('p') => return Action::ShowCommandPalette,
            // Note: Ctrl+M is indistinguishable from Enter in terminals (both send CR).
            // Model selector is mapped to 'M' (Shift+M) in Normal mode instead.
            KeyCode::Char('s') => return Action::StartScan,
            KeyCode::Char('k') if app.input_mode == InputMode::Visual => {
                return Action::SendSelectionToAi;
            }
            KeyCode::Char('z') => return Action::Undo,
            KeyCode::Char('d') => return Action::ScrollHalfPageDown,
            KeyCode::Char('u') => return Action::ScrollHalfPageUp,
            _ => {}
        }
    }

    // Alt+N panel shortcuts
    if key.modifiers.contains(KeyModifiers::ALT) {
        match key.code {
            KeyCode::Char('1') => return Action::FocusPanel(Panel::Chat),
            KeyCode::Char('2') => return Action::FocusPanel(Panel::Score),
            KeyCode::Char('3') => return Action::FocusPanel(Panel::FileBrowser),
            KeyCode::Char('4') => return Action::FocusPanel(Panel::CodeViewer),
            KeyCode::Char('5') => return Action::FocusPanel(Panel::Terminal),
            _ => {}
        }
    }

    // If an overlay is active, route input there
    if app.overlay != Overlay::None {
        return handle_overlay_keys(key, &app.overlay);
    }

    match app.input_mode {
        InputMode::Insert => handle_insert_mode(key),
        InputMode::Normal => handle_normal_mode(key, app),
        InputMode::Command => handle_command_mode(key),
        InputMode::Visual => handle_visual_mode(key),
    }
}

pub fn handle_mouse_event(event: MouseEvent, app: &App) -> Action {
    match event.kind {
        MouseEventKind::ScrollUp => {
            let lines = scroll_line_count(app);
            Action::ScrollLines(-lines)
        }
        MouseEventKind::ScrollDown => {
            let lines = scroll_line_count(app);
            Action::ScrollLines(lines)
        }
        MouseEventKind::Down(MouseButton::Left) => {
            let col = event.column;
            let row = event.row;
            // Hit-test against registered click areas
            for (rect, target) in &app.click_areas {
                if col >= rect.x
                    && col < rect.x + rect.width
                    && row >= rect.y
                    && row < rect.y + rect.height
                {
                    return Action::ClickAt(target.clone());
                }
            }
            Action::None
        }
        _ => Action::None,
    }
}

/// Compute scroll lines based on recent scroll event frequency (acceleration).
fn scroll_line_count(app: &App) -> i32 {
    let now = std::time::Instant::now();
    let recent = app
        .scroll_events
        .iter()
        .filter(|&&t| now.duration_since(t).as_millis() < 300)
        .count();
    if recent >= 3 {
        let accel = app.config.scroll_acceleration;
        (accel * 3.0) as i32
    } else {
        1
    }
}

#[cfg(test)]
pub fn scroll_line_count_for_test(app: &App) -> i32 {
    scroll_line_count(app)
}

fn handle_overlay_keys(key: KeyEvent, overlay: &Overlay) -> Action {
    // Navigable overlays: ThemePicker, Onboarding — support j/k/arrows for scrolling
    let navigable = matches!(overlay, Overlay::ThemePicker | Overlay::Onboarding | Overlay::DismissModal | Overlay::ConfirmDialog | Overlay::UndoHistory | Overlay::CommandPalette);
    match key.code {
        KeyCode::Esc => Action::EnterNormalMode,
        KeyCode::Enter => Action::SubmitInput,
        KeyCode::Char('j') | KeyCode::Down if navigable => Action::ScrollDown,
        KeyCode::Char('k') | KeyCode::Up if navigable => Action::ScrollUp,
        KeyCode::Char(c) => Action::InsertChar(c),
        KeyCode::Backspace => Action::DeleteChar,
        _ => Action::None,
    }
}

fn handle_insert_mode(key: KeyEvent) -> Action {
    match key.code {
        KeyCode::Enter => Action::SubmitInput,
        KeyCode::Char(c) => Action::InsertChar(c),
        KeyCode::Backspace => Action::DeleteChar,
        KeyCode::Left => Action::MoveCursorLeft,
        KeyCode::Right => Action::MoveCursorRight,
        KeyCode::Up => Action::HistoryUp,
        KeyCode::Down => Action::HistoryDown,
        KeyCode::Esc => Action::EnterNormalMode,
        KeyCode::Tab => Action::TabComplete,
        _ => Action::None,
    }
}

fn handle_normal_mode(key: KeyEvent, app: &App) -> Action {
    match key.code {
        KeyCode::Char('q') => Action::Quit,
        KeyCode::Tab => Action::ToggleMode,
        KeyCode::Char('1') => Action::SwitchView(ViewState::Dashboard),
        KeyCode::Char('2') => Action::SwitchView(ViewState::Scan),
        KeyCode::Char('3') => Action::SwitchView(ViewState::Fix),
        KeyCode::Char('4') => Action::SwitchView(ViewState::Chat),
        KeyCode::Char('5') => Action::SwitchView(ViewState::Timeline),
        KeyCode::Char('6') => Action::SwitchView(ViewState::Report),
        KeyCode::Char('i') => Action::EnterInsertMode,
        // '/' opens code search when in CodeViewer, command mode otherwise
        KeyCode::Char('/') if app.active_panel == Panel::CodeViewer => Action::CodeSearch,
        KeyCode::Char('/') => Action::EnterCommandMode,
        KeyCode::Char('n') if app.active_panel == Panel::CodeViewer
            && app.code_search_query.is_some() => Action::CodeSearchNext,
        KeyCode::Char('N') if app.active_panel == Panel::CodeViewer
            && app.code_search_query.is_some() => Action::CodeSearchPrev,
        KeyCode::Char('j') | KeyCode::Down => Action::ScrollDown,
        KeyCode::Char('k') | KeyCode::Up => Action::ScrollUp,
        KeyCode::Char('g') => Action::ScrollToTop,
        KeyCode::Char('G') => Action::ScrollToBottom,
        KeyCode::Char('v') | KeyCode::Char('V') => Action::EnterVisualMode,
        KeyCode::Char(':') => Action::EnterColonMode,
        KeyCode::Char('U') => Action::ShowUndoHistory,
        KeyCode::Char('w') => Action::WatchToggle,
        KeyCode::Char('M') => Action::ShowModelSelector,
        KeyCode::Char('T') => Action::ShowThemePicker,
        KeyCode::Char('?') => Action::ShowHelp,
        KeyCode::Char('@') => Action::ShowFilePicker,
        KeyCode::Enter => match app.active_panel {
            Panel::FileBrowser => Action::OpenFile,
            _ if matches!(app.view_state, ViewState::Scan | ViewState::Fix) => Action::ViewEnter,
            _ => Action::SubmitInput,
        },
        KeyCode::Char(' ') if app.view_state == ViewState::Fix => Action::ViewKey(' '),
        KeyCode::Char(' ') if app.active_panel == Panel::FileBrowser => Action::ToggleExpand,
        KeyCode::Char('y') if app.active_panel == Panel::DiffPreview => Action::AcceptDiff,
        KeyCode::Char('n') if app.active_panel == Panel::DiffPreview => Action::RejectDiff,
        KeyCode::Backspace if app.active_panel == Panel::CodeViewer => Action::CloseFile,
        // View-specific Esc
        KeyCode::Esc if matches!(app.view_state, ViewState::Scan | ViewState::Fix | ViewState::Dashboard) => {
            Action::ViewEscape
        }
        KeyCode::Esc if app.active_panel == Panel::CodeViewer => Action::CloseFile,
        // View-specific char keys — Scan/Fix/Report/Dashboard views
        KeyCode::Char(c @ ('a' | 'c' | 'h' | 'm' | 'l' | 'f' | 'd' | 'e' | 'n' | 'x' | 'o' | '<' | '>'))
            if matches!(
                app.view_state,
                ViewState::Scan | ViewState::Fix | ViewState::Report | ViewState::Dashboard
            ) =>
        {
            Action::ViewKey(c)
        }
        _ => Action::None,
    }
}

fn handle_command_mode(key: KeyEvent) -> Action {
    match key.code {
        KeyCode::Enter => Action::SubmitInput,
        KeyCode::Char(c) => Action::InsertChar(c),
        KeyCode::Backspace => Action::DeleteChar,
        KeyCode::Esc => Action::EnterNormalMode,
        KeyCode::Tab => Action::TabComplete,
        _ => Action::None,
    }
}

fn handle_visual_mode(key: KeyEvent) -> Action {
    match key.code {
        KeyCode::Esc => Action::EnterNormalMode,
        KeyCode::Char('j') | KeyCode::Down => Action::SelectionDown,
        KeyCode::Char('k') | KeyCode::Up => Action::SelectionUp,
        KeyCode::Char('y') => Action::AcceptDiff,
        KeyCode::Char('n') => Action::RejectDiff,
        _ => Action::None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    #[test]
    fn test_watch_key_w_action() {
        let app = App::new(crate::config::TuiConfig::default());
        let mut test_app = app;
        test_app.input_mode = InputMode::Normal;

        let action = handle_key_event(key(KeyCode::Char('w')), &test_app);
        assert!(matches!(action, Action::WatchToggle));
    }

    #[test]
    fn test_theme_picker_overlay_jk_navigation() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::ThemePicker;

        let action_j = handle_key_event(key(KeyCode::Char('j')), &app);
        assert!(matches!(action_j, Action::ScrollDown));

        let action_k = handle_key_event(key(KeyCode::Char('k')), &app);
        assert!(matches!(action_k, Action::ScrollUp));

        let action_down = handle_key_event(key(KeyCode::Down), &app);
        assert!(matches!(action_down, Action::ScrollDown));

        let action_up = handle_key_event(key(KeyCode::Up), &app);
        assert!(matches!(action_up, Action::ScrollUp));
    }

    #[test]
    fn test_onboarding_overlay_jk_navigation() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::Onboarding;

        let action_j = handle_key_event(key(KeyCode::Char('j')), &app);
        assert!(matches!(action_j, Action::ScrollDown));

        let action_k = handle_key_event(key(KeyCode::Char('k')), &app);
        assert!(matches!(action_k, Action::ScrollUp));
    }

    #[test]
    fn test_non_navigable_overlay_jk_inserts() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::FilePicker;

        // In non-navigable overlays, j/k should produce InsertChar
        let action_j = handle_key_event(key(KeyCode::Char('j')), &app);
        assert!(matches!(action_j, Action::InsertChar('j')));
    }

    #[test]
    fn test_command_palette_jk_navigates() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::CommandPalette;

        // CommandPalette is navigable — j/k should scroll
        let action_j = handle_key_event(key(KeyCode::Char('j')), &app);
        assert!(matches!(action_j, Action::ScrollDown));
        let action_k = handle_key_event(key(KeyCode::Char('k')), &app);
        assert!(matches!(action_k, Action::ScrollUp));
    }

    #[test]
    fn test_model_selector_shift_m_in_normal_mode() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = InputMode::Normal;

        let action = handle_key_event(key(KeyCode::Char('M')), &app);
        assert!(matches!(action, Action::ShowModelSelector));
    }
}
