use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use crate::app::App;
use crate::types::{InputMode, Panel};

pub enum Action {
    Quit,
    NextPanel,
    ToggleTerminal,
    SubmitInput,
    InsertChar(char),
    DeleteChar,
    MoveCursorLeft,
    MoveCursorRight,
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
    None,
}

pub fn handle_key_event(key: KeyEvent, app: &App) -> Action {
    // Global shortcuts
    if key.modifiers.contains(KeyModifiers::CONTROL) {
        match key.code {
            KeyCode::Char('c') => return Action::Quit,
            KeyCode::Char('t') => return Action::ToggleTerminal,
            KeyCode::Char('k') if app.input_mode == InputMode::Visual => {
                return Action::SendSelectionToAi;
            }
            KeyCode::Char('d') => return Action::ScrollHalfPageDown,
            KeyCode::Char('u') => return Action::ScrollHalfPageUp,
            _ => {}
        }
    }

    match app.input_mode {
        InputMode::Insert => handle_insert_mode(key),
        InputMode::Normal => handle_normal_mode(key, app),
        InputMode::Command => handle_command_mode(key),
        InputMode::Visual => handle_visual_mode(key),
    }
}

fn handle_insert_mode(key: KeyEvent) -> Action {
    match key.code {
        KeyCode::Enter => Action::SubmitInput,
        KeyCode::Char(c) => Action::InsertChar(c),
        KeyCode::Backspace => Action::DeleteChar,
        KeyCode::Left => Action::MoveCursorLeft,
        KeyCode::Right => Action::MoveCursorRight,
        KeyCode::Esc => Action::EnterNormalMode,
        KeyCode::Tab => Action::NextPanel,
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
        KeyCode::Enter => match app.active_panel {
            Panel::FileBrowser => Action::OpenFile,
            _ => Action::SubmitInput,
        },
        KeyCode::Char(' ') if app.active_panel == Panel::FileBrowser => Action::ToggleExpand,
        KeyCode::Char('y') if app.active_panel == Panel::DiffPreview => Action::AcceptDiff,
        KeyCode::Char('n') if app.active_panel == Panel::DiffPreview => Action::RejectDiff,
        _ => Action::None,
    }
}

fn handle_command_mode(key: KeyEvent) -> Action {
    match key.code {
        KeyCode::Enter => Action::SubmitInput,
        KeyCode::Char(c) => Action::InsertChar(c),
        KeyCode::Backspace => Action::DeleteChar,
        KeyCode::Esc => Action::EnterNormalMode,
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
