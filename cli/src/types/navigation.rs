/// Top-level view (screen).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewState {
    Dashboard,    // D, index 0
    Scan,         // S, index 1
    Fix,          // F, index 2
    Passport,     // P, index 3 (stub)
    Timeline,     // T, index 4
    Report,       // R, index 5
    Log,          // L, index 6
}

impl ViewState {
    /// Map key digit to view (1-based) — used by `/view N` command.
    pub fn from_key(digit: u8) -> Option<Self> {
        match digit {
            1 => Some(Self::Dashboard),
            2 => Some(Self::Scan),
            3 => Some(Self::Fix),
            4 => Some(Self::Passport),
            5 => Some(Self::Timeline),
            6 => Some(Self::Report),
            7 => Some(Self::Log),
            _ => None,
        }
    }

    /// Map an uppercase letter to a view for letter-key navigation.
    ///
    /// Lowercase letters are reserved for view-specific actions.
    pub fn from_letter(c: char) -> Option<Self> {
        match c {
            'D' => Some(Self::Dashboard),
            'S' => Some(Self::Scan),
            'F' => Some(Self::Fix),
            'P' => Some(Self::Passport),
            'T' => Some(Self::Timeline),
            'R' => Some(Self::Report),
            'L' => Some(Self::Log),
            _ => None,
        }
    }

    /// 0-based index for tab highlighting.
    pub fn index(self) -> usize {
        match self {
            Self::Dashboard => 0,
            Self::Scan => 1,
            Self::Fix => 2,
            Self::Passport => 3,
            Self::Timeline => 4,
            Self::Report => 5,
            Self::Log => 6,
        }
    }

    /// Short display name for footer tabs.
    pub fn short_name(self) -> &'static str {
        match self {
            Self::Dashboard => "Dashboard",
            Self::Scan => "Scan",
            Self::Fix => "Fix",
            Self::Passport => "Passport",
            Self::Timeline => "Timeline",
            Self::Report => "Report",
            Self::Log => "Log",
        }
    }

    pub const ALL: [ViewState; 7] = [
        Self::Dashboard,
        Self::Scan,
        Self::Fix,
        Self::Passport,
        Self::Timeline,
        Self::Report,
        Self::Log,
    ];
}

/// Operating mode — cycles with Tab in Normal mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Scan,
    Fix,
    Watch,
}

impl Mode {
    pub fn next(self) -> Self {
        match self {
            Self::Scan => Self::Fix,
            Self::Fix => Self::Watch,
            Self::Watch => Self::Scan,
        }
    }
}
