use std::time::Instant;

use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

use crate::theme;

#[derive(Debug, Clone)]
pub struct Suggestion {
    pub kind: SuggestionKind,
    pub text: String,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SuggestionKind {
    Tip,
    Fix,
    DeadlineWarning,
    ScoreImprovement,
    NewFeature,
}

pub struct IdleSuggestionState {
    pub current: Option<Suggestion>,
    pub last_input: Instant,
    pub fetch_pending: bool,
    dismissed_at: Option<Instant>,
}

impl IdleSuggestionState {
    pub fn new() -> Self {
        Self {
            current: None,
            last_input: Instant::now(),
            fetch_pending: false,
            dismissed_at: None,
        }
    }

    pub fn reset_timer(&mut self) {
        self.last_input = Instant::now();
    }

    pub fn is_idle(&self, seconds: u64) -> bool {
        self.last_input.elapsed().as_secs() >= seconds
    }


    #[allow(dead_code)]
    pub const fn should_show(&self, app_busy: bool) -> bool {
        self.current.is_some() && !app_busy
    }

    pub fn dismiss(&mut self) {
        self.current = None;
        self.fetch_pending = false;
        self.dismissed_at = Some(Instant::now());
    }

    /// Returns true if dismissed within the last 30 seconds.
    pub fn recently_dismissed(&self) -> bool {
        self.dismissed_at
            .is_some_and(|t| t.elapsed().as_secs() < 30)
    }
}

pub fn render_suggestion(frame: &mut Frame, area: Rect, suggestion: &Suggestion) {
    let t = theme::theme();

    let kind_label = match suggestion.kind {
        SuggestionKind::Tip => "tip",
        SuggestionKind::Fix => "fix",
        SuggestionKind::DeadlineWarning => "deadline",
        SuggestionKind::ScoreImprovement => "score",
        SuggestionKind::NewFeature => "new",
    };

    let mut lines = vec![Line::from(vec![
        Span::styled(
            format!(" [{kind_label}] "),
            Style::default().fg(t.accent),
        ),
        Span::styled(&*suggestion.text, Style::default().fg(t.muted)),
    ])];

    if let Some(detail) = &suggestion.detail {
        lines.push(Line::from(Span::styled(
            format!("         {detail}"),
            Style::default().fg(t.muted),
        )));
    }

    frame.render_widget(Paragraph::new(lines), area);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn idle_resets_on_input() {
        let mut state = IdleSuggestionState::new();
        // Artificially make it look idle
        state.last_input = Instant::now() - std::time::Duration::from_secs(15);
        assert!(state.is_idle(10));

        state.reset_timer();
        assert!(!state.is_idle(10));
    }

    #[test]
    fn idle_suppressed_scan() {
        let state = IdleSuggestionState::new();
        // app_busy=true should suppress
        assert!(!state.should_show(true));
    }

    #[test]
    fn idle_suppressed_overlay() {
        let state = IdleSuggestionState::new();
        // No current suggestion
        assert!(!state.should_show(false));
    }

    #[test]
    fn suggestion_dismiss() {
        let mut state = IdleSuggestionState::new();
        state.current = Some(Suggestion {
            kind: SuggestionKind::Tip,
            text: "test".to_string(),
            detail: None,
        });
        assert!(state.current.is_some());

        state.dismiss();
        assert!(state.current.is_none());
        assert!(state.recently_dismissed());
    }
}
