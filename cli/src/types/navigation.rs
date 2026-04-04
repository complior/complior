/// Top-level view (screen).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewState {
    Dashboard,   // D, index 0
    Scan,        // S, index 1
    Fix,         // F, index 2
    Passport,    // P, index 3
    Obligations, // O, index 4
    Timeline,    // T, index 5
    Report,      // R, index 6
    Log,         // L, index 7
    Chat,        // C, index 8
}

impl ViewState {
    /// Map key digit to view (1-based) — used by `/view N` command.
    pub const fn from_key(digit: u8) -> Option<Self> {
        match digit {
            1 => Some(Self::Dashboard),
            2 => Some(Self::Scan),
            3 => Some(Self::Fix),
            4 => Some(Self::Passport),
            5 => Some(Self::Obligations),
            6 => Some(Self::Timeline),
            7 => Some(Self::Report),
            8 => Some(Self::Log),
            9 => Some(Self::Chat),
            _ => None,
        }
    }

    /// Map an uppercase letter to a view for letter-key navigation.
    ///
    /// Lowercase letters are reserved for view-specific actions.
    pub const fn from_letter(c: char) -> Option<Self> {
        match c {
            'D' => Some(Self::Dashboard),
            'S' => Some(Self::Scan),
            'F' => Some(Self::Fix),
            'P' => Some(Self::Passport),
            'O' => Some(Self::Obligations),
            'T' => Some(Self::Timeline),
            'R' => Some(Self::Report),
            'L' => Some(Self::Log),
            'C' => Some(Self::Chat),
            _ => None,
        }
    }

    /// 0-based index for tab highlighting.
    pub const fn index(self) -> usize {
        match self {
            Self::Dashboard => 0,
            Self::Scan => 1,
            Self::Fix => 2,
            Self::Passport => 3,
            Self::Obligations => 4,
            Self::Timeline => 5,
            Self::Report => 6,
            Self::Log => 7,
            Self::Chat => 8,
        }
    }

    /// Short display name for footer tabs.
    pub const fn short_name(self) -> &'static str {
        match self {
            Self::Dashboard => "Dashboard",
            Self::Scan => "Scan",
            Self::Fix => "Fix",
            Self::Passport => "Passport",
            Self::Obligations => "Oblig",
            Self::Timeline => "Timeline",
            Self::Report => "Report",
            Self::Log => "Log",
            Self::Chat => "Chat",
        }
    }

    pub const ALL: [Self; 9] = [
        Self::Dashboard,
        Self::Scan,
        Self::Fix,
        Self::Passport,
        Self::Obligations,
        Self::Timeline,
        Self::Report,
        Self::Log,
        Self::Chat,
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
    pub const fn next(self) -> Self {
        match self {
            Self::Scan => Self::Fix,
            Self::Fix => Self::Watch,
            Self::Watch => Self::Scan,
        }
    }
}
