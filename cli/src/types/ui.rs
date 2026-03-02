use super::navigation::ViewState;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputMode {
    Normal,
    Insert,
    Command,
    Visual,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EngineConnectionStatus {
    Connecting,
    Connected,
    Disconnected,
    Error,
}

/// Click target for mouse hit-testing (T806).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClickTarget {
    ViewTab(ViewState),
    FindingRow(usize),
    FixCheckbox(usize),
    SidebarToggle,
}
