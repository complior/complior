/// Reason for dismissing a finding.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DismissReason {
    FalsePositive,
    AcceptedRisk,
    WillFixLater,
    NotApplicable,
    Other(String),
}

impl DismissReason {
    pub fn label(&self) -> &str {
        match self {
            Self::FalsePositive => "False positive",
            Self::AcceptedRisk => "Accepted risk",
            Self::WillFixLater => "Will fix later",
            Self::NotApplicable => "Not applicable",
            Self::Other(_) => "Other",
        }
    }

    /// The 5 standard dismiss reasons (for modal selection).
    pub fn all() -> [Self; 5] {
        [
            Self::FalsePositive,
            Self::AcceptedRisk,
            Self::WillFixLater,
            Self::NotApplicable,
            Self::Other(String::new()),
        ]
    }
}

/// Quick action dispatched from Scan view.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QuickAction {
    /// Fix: send finding to Fix view
    Fix,
    /// Explain: send "Explain OBL-xxx" to Chat
    Explain,
    /// Dismiss: open dismiss modal with reason selection
    Dismiss,
    /// Open: open file in $EDITOR
    Open,
}

impl QuickAction {
    pub fn from_key(c: char) -> Option<Self> {
        match c {
            'f' => Some(Self::Fix),
            'x' => Some(Self::Explain),
            'd' => Some(Self::Dismiss),
            'o' => Some(Self::Open),
            _ => None,
        }
    }
}

/// State for the dismiss modal (shown when 'd' pressed on finding).
#[derive(Debug, Clone)]
pub struct DismissModal {
    pub finding_index: usize,
    pub cursor: usize,
    pub reasons: Vec<DismissReason>,
}

impl DismissModal {
    pub fn new(finding_index: usize) -> Self {
        Self {
            finding_index,
            cursor: 0,
            reasons: DismissReason::all().to_vec(),
        }
    }

    pub fn move_up(&mut self) {
        self.cursor = self.cursor.saturating_sub(1);
    }

    pub fn move_down(&mut self) {
        if self.cursor + 1 < self.reasons.len() {
            self.cursor += 1;
        }
    }

    pub fn selected_reason(&self) -> &DismissReason {
        &self.reasons[self.cursor]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quick_action_from_key() {
        assert_eq!(QuickAction::from_key('f'), Some(QuickAction::Fix));
        assert_eq!(QuickAction::from_key('x'), Some(QuickAction::Explain));
        assert_eq!(QuickAction::from_key('d'), Some(QuickAction::Dismiss));
        assert_eq!(QuickAction::from_key('o'), Some(QuickAction::Open));
        assert_eq!(QuickAction::from_key('z'), None);
    }

    #[test]
    fn test_dismiss_modal_navigation() {
        let mut modal = DismissModal::new(0);
        assert_eq!(modal.cursor, 0);
        modal.move_down();
        assert_eq!(modal.cursor, 1);
        modal.move_up();
        assert_eq!(modal.cursor, 0);
        modal.move_up(); // clamp
        assert_eq!(modal.cursor, 0);
    }

    #[test]
    fn test_dismiss_reasons() {
        let reasons = DismissReason::all();
        assert_eq!(reasons.len(), 5);
        assert_eq!(reasons[0].label(), "False positive");
    }
}
