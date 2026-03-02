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
