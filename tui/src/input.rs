use crossterm::event::{KeyCode, KeyEvent, KeyModifiers, MouseEvent, MouseEventKind};

use crate::app::App;
use crate::types::{InputMode, Overlay, Panel};

pub enum Action {
    Quit,
    NextPanel,
    ToggleTerminal,
    ToggleSidebar,
    ToggleFilesPanel,
    CloseFile,
    SubmitInput,
    InsertChar(char),
    DeleteChar,
    MoveCursorLeft,
    MoveCursorRight,
    HistoryUp,
    HistoryDown,
    TabComplete,
    ScrollUp,
    ScrollDown,
    ScrollHalfPageUp,
    ScrollHalfPageDown,
    ScrollToTop,
    ScrollToBottom,
    EnterInsertMode,
    EnterNormalMode,
    EnterVisualMode,
    EnterCommandMode,
    SelectionUp,
    SelectionDown,
    SendSelectionToAi,
    AcceptDiff,
    RejectDiff,
    ToggleExpand,
    OpenFile,
    ShowCommandPalette,
    ShowFilePicker,
    ShowHelp,
    FocusPanel(Panel),
    ShowModelSelector,
    ShowProviderSetup,
    GotoLine,
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
            KeyCode::Char('m') => return Action::ShowModelSelector,
            KeyCode::Char('k') if app.input_mode == InputMode::Visual => {
                return Action::SendSelectionToAi;
            }
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
        return handle_overlay_keys(key);
    }

    match app.input_mode {
        InputMode::Insert => handle_insert_mode(key),
        InputMode::Normal => handle_normal_mode(key, app),
        InputMode::Command => handle_command_mode(key),
        InputMode::Visual => handle_visual_mode(key),
    }
}

pub fn handle_mouse_event(event: MouseEvent, _app: &App) -> Action {
    match event.kind {
        MouseEventKind::ScrollUp => Action::ScrollUp,
        MouseEventKind::ScrollDown => Action::ScrollDown,
        _ => Action::None,
    }
}

fn handle_overlay_keys(key: KeyEvent) -> Action {
    match key.code {
        KeyCode::Esc => Action::EnterNormalMode,
        KeyCode::Enter => Action::SubmitInput,
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
        KeyCode::Tab => Action::NextPanel,
        KeyCode::Char('i') => Action::EnterInsertMode,
        KeyCode::Char('/') => Action::EnterCommandMode,
        KeyCode::Char('j') | KeyCode::Down => Action::ScrollDown,
        KeyCode::Char('k') | KeyCode::Up => Action::ScrollUp,
        KeyCode::Char('g') => Action::ScrollToTop,
        KeyCode::Char('G') => Action::ScrollToBottom,
        KeyCode::Char('V') => Action::EnterVisualMode,
        KeyCode::Char('?') => Action::ShowHelp,
        KeyCode::Char('@') => Action::ShowFilePicker,
        KeyCode::Enter => match app.active_panel {
            Panel::FileBrowser => Action::OpenFile,
            _ => Action::SubmitInput,
        },
        KeyCode::Char(' ') if app.active_panel == Panel::FileBrowser => Action::ToggleExpand,
        KeyCode::Char('y') if app.active_panel == Panel::DiffPreview => Action::AcceptDiff,
        KeyCode::Char('n') if app.active_panel == Panel::DiffPreview => Action::RejectDiff,
        KeyCode::Backspace if app.active_panel == Panel::CodeViewer => Action::CloseFile,
        KeyCode::Esc if app.active_panel == Panel::CodeViewer => Action::CloseFile,
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
