/// Which dashboard widget is currently zoomed to full-screen.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ZoomedWidget {
    ScoreGauge,
    DeadlineCountdown,
    ActivityLog,
    ScoreSparkline,
    FindingsList,
}

impl ZoomedWidget {
    pub fn title(self) -> &'static str {
        match self {
            Self::ScoreGauge => "Score Gauge (Expanded)",
            Self::DeadlineCountdown => "Deadlines (Expanded)",
            Self::ActivityLog => "Activity Log (Expanded)",
            Self::ScoreSparkline => "Score History (Expanded)",
            Self::FindingsList => "Findings (Expanded)",
        }
    }
}

/// State for widget zoom/expand feature.
#[derive(Debug, Clone, Default)]
pub struct ZoomState {
    pub zoomed: Option<ZoomedWidget>,
    /// Which widget index is focused (0-3 for 2x2 grid).
    pub focus_index: usize,
}

impl ZoomState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_zoomed(&self) -> bool {
        self.zoomed.is_some()
    }

    /// Toggle zoom on the currently focused widget.
    pub fn toggle(&mut self) {
        if self.zoomed.is_some() {
            self.zoomed = None;
        } else {
            self.zoomed = Some(Self::widget_for_index(self.focus_index));
        }
    }

    /// Close zoom (Esc).
    pub fn close(&mut self) {
        self.zoomed = None;
    }

    /// Map focus index to widget kind.
    fn widget_for_index(index: usize) -> ZoomedWidget {
        match index {
            0 => ZoomedWidget::ScoreGauge,
            1 => ZoomedWidget::DeadlineCountdown,
            2 => ZoomedWidget::ActivityLog,
            3 => ZoomedWidget::ScoreSparkline,
            _ => ZoomedWidget::ScoreGauge,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zoom_toggle() {
        let mut state = ZoomState::default();
        assert!(!state.is_zoomed());

        state.toggle();
        assert!(state.is_zoomed());
        assert_eq!(state.zoomed, Some(ZoomedWidget::ScoreGauge));

        state.toggle();
        assert!(!state.is_zoomed());
    }

    #[test]
    fn test_zoom_close() {
        let mut state = ZoomState::default();
        state.focus_index = 2;
        state.toggle();
        assert_eq!(state.zoomed, Some(ZoomedWidget::ActivityLog));

        state.close();
        assert!(!state.is_zoomed());
    }

    #[test]
    fn test_zoom_widget_mapping() {
        let mut state = ZoomState::default();

        state.focus_index = 0;
        state.toggle();
        assert_eq!(state.zoomed, Some(ZoomedWidget::ScoreGauge));
        state.close();

        state.focus_index = 1;
        state.toggle();
        assert_eq!(state.zoomed, Some(ZoomedWidget::DeadlineCountdown));
        state.close();

        state.focus_index = 3;
        state.toggle();
        assert_eq!(state.zoomed, Some(ZoomedWidget::ScoreSparkline));
    }
}
