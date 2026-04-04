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
    pub const fn label(&self) -> &str {
        match self {
            Self::FalsePositive => "False positive",
            Self::AcceptedRisk => "Accepted risk",
            Self::WillFixLater => "Will fix later",
            Self::NotApplicable => "Not applicable",
            Self::Other(_) => "Other",
        }
    }

    /// Human-readable description of what this dismiss reason means.
    pub const fn description(&self) -> &str {
        match self {
            Self::FalsePositive => {
                "The scanner flagged this incorrectly — the requirement is already satisfied."
            }
            Self::AcceptedRisk => {
                "You acknowledge this issue but accept the risk (document the justification)."
            }
            Self::WillFixLater => "You plan to address this before the compliance deadline.",
            Self::NotApplicable => {
                "This requirement doesn't apply to your AI system type/risk level."
            }
            Self::Other(_) => "Provide a custom reason for dismissing this finding.",
        }
    }

    /// The 5 standard dismiss reasons (for modal selection).
    pub const fn all() -> [Self; 5] {
        [
            Self::FalsePositive,
            Self::AcceptedRisk,
            Self::WillFixLater,
            Self::NotApplicable,
            Self::Other(String::new()),
        ]
    }
}

/// State for the dismiss modal (shown when 'd' pressed on finding).
#[derive(Debug, Clone)]
pub struct DismissModal {
    pub cursor: usize,
    pub reasons: Vec<DismissReason>,
}

impl DismissModal {
    pub fn new(_finding_index: usize) -> Self {
        Self {
            cursor: 0,
            reasons: DismissReason::all().to_vec(),
        }
    }

    pub const fn move_up(&mut self) {
        self.cursor = self.cursor.saturating_sub(1);
    }

    pub const fn move_down(&mut self) {
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
