use std::time::Instant;

use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph};
use ratatui::Frame;

use crate::theme;

const AUTO_DISMISS_SECS: u64 = 3;
const MAX_VISIBLE: usize = 5;

/// Type of toast notification.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToastKind {
    Success,
    Info,
    Warning,
    Error,
}

impl ToastKind {
    pub fn marker(self) -> &'static str {
        match self {
            Self::Success => "[OK]",
            Self::Info => "[i]",
            Self::Warning => "[!]",
            Self::Error => "[X]",
        }
    }
}

/// A single toast notification.
#[derive(Debug, Clone)]
pub struct Toast {
    pub kind: ToastKind,
    pub message: String,
    pub created_at: Instant,
}

impl Toast {
    pub fn new(kind: ToastKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
            created_at: Instant::now(),
        }
    }

    pub fn is_expired(&self) -> bool {
        self.created_at.elapsed().as_secs() >= AUTO_DISMISS_SECS
    }
}

/// Stack of toast notifications (newest on top, max 5 visible).
#[derive(Debug, Clone, Default)]
pub struct ToastStack {
    pub toasts: Vec<Toast>,
}

impl ToastStack {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn push(&mut self, kind: ToastKind, message: impl Into<String>) {
        let toast = Toast::new(kind, message);
        self.toasts.push(toast);
        if self.toasts.len() > MAX_VISIBLE {
            self.toasts.remove(0);
        }
    }

    /// Remove expired toasts. Returns number removed.
    pub fn gc(&mut self) -> usize {
        let before = self.toasts.len();
        self.toasts.retain(|t| !t.is_expired());
        before - self.toasts.len()
    }

    pub fn visible(&self) -> &[Toast] {
        let start = self.toasts.len().saturating_sub(MAX_VISIBLE);
        &self.toasts[start..]
    }

    pub fn is_empty(&self) -> bool {
        self.toasts.is_empty()
    }
}

/// Render toast stack as overlay in upper-right corner.
pub fn render_toasts(frame: &mut Frame, area: Rect, stack: &ToastStack) {
    let t = theme::theme();
    let toasts = stack.visible();
    if toasts.is_empty() {
        return;
    }

    let toast_width: u16 = 42;
    let toast_height = toasts.len() as u16 + 2;
    let x = area.x + area.width.saturating_sub(toast_width + 1);
    let y = area.y + 1;
    let rect = Rect::new(
        x,
        y,
        toast_width.min(area.width),
        toast_height.min(area.height),
    );

    frame.render_widget(Clear, rect);

    let lines: Vec<Line<'_>> = toasts
        .iter()
        .map(|toast| {
            let color = match toast.kind {
                ToastKind::Success => t.zone_green,
                ToastKind::Info => t.accent,
                ToastKind::Warning => t.zone_yellow,
                ToastKind::Error => t.zone_red,
            };
            Line::from(vec![
                Span::styled(
                    toast.kind.marker(),
                    Style::default().fg(color).add_modifier(Modifier::BOLD),
                ),
                Span::styled(format!(" {}", toast.message), Style::default().fg(t.fg)),
            ])
        })
        .collect();

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border))
        .style(Style::default().bg(t.bg));
    let paragraph = Paragraph::new(lines).block(block);
    frame.render_widget(paragraph, rect);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_toast_lifecycle() {
        let toast = Toast::new(ToastKind::Success, "Fix applied");
        assert!(!toast.is_expired());
        assert_eq!(toast.kind, ToastKind::Success);
        assert_eq!(toast.message, "Fix applied");
    }

    #[test]
    fn test_toast_stack_push_and_max() {
        let mut stack = ToastStack::default();
        for i in 0..7 {
            stack.push(ToastKind::Info, format!("msg {i}"));
        }
        // Max 5
        assert_eq!(stack.toasts.len(), 5);
        // Oldest removed, newest kept
        assert!(stack.toasts[4].message.contains('6'));
    }

    #[test]
    fn test_toast_stack_visible() {
        let mut stack = ToastStack::default();
        stack.push(ToastKind::Success, "a");
        stack.push(ToastKind::Error, "b");
        assert_eq!(stack.visible().len(), 2);
    }

    #[test]
    fn test_toast_stack_gc() {
        let mut stack = ToastStack::default();
        // Can't easily test time-based expiry in unit tests without sleeping,
        // but we can test that gc works when no toasts expired.
        stack.push(ToastKind::Info, "fresh");
        let removed = stack.gc();
        assert_eq!(removed, 0);
        assert_eq!(stack.toasts.len(), 1);
    }

    #[test]
    fn test_toast_kind_markers() {
        assert_eq!(ToastKind::Success.marker(), "[OK]");
        assert_eq!(ToastKind::Info.marker(), "[i]");
        assert_eq!(ToastKind::Warning.marker(), "[!]");
        assert_eq!(ToastKind::Error.marker(), "[X]");
    }
}
