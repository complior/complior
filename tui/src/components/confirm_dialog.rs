use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph, Wrap};
use ratatui::Frame;

use crate::theme;

/// A confirmation dialog for destructive actions.
#[derive(Debug, Clone)]
pub struct ConfirmDialog {
    pub title: String,
    pub message: String,
    pub file_count: usize,
    pub score_impact: Option<f64>,
    pub on_confirm: ConfirmAction,
}

/// What action to perform on confirmation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfirmAction {
    BatchApply,
    UndoMultiple,
    OverwriteDocs,
    ResetScan,
}

impl ConfirmDialog {
    pub fn batch_apply(count: usize, impact: f64) -> Self {
        Self {
            title: "Confirm Batch Apply".to_string(),
            message: format!("Apply {count} fixes?"),
            file_count: count,
            score_impact: Some(impact),
            on_confirm: ConfirmAction::BatchApply,
        }
    }
}

/// Render confirmation dialog as a centered modal.
pub fn render_confirm_dialog(frame: &mut Frame, dialog: &ConfirmDialog) {
    let t = theme::theme();
    let area = centered_rect(50, 12, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(format!(" {} ", dialog.title))
        .title_style(Style::default().fg(t.zone_yellow).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.zone_yellow))
        .style(Style::default().bg(t.bg));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::vertical([
        Constraint::Min(4),
        Constraint::Length(1),
    ])
    .split(inner);

    let mut lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            format!("  {}", dialog.message),
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
        )),
    ];

    if let Some(impact) = dialog.score_impact {
        lines.push(Line::from(vec![
            Span::styled("  Score impact: ", Style::default().fg(t.muted)),
            Span::styled(
                format!("+{impact:.0} points"),
                Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD),
            ),
        ]));
    }

    lines.push(Line::from(Span::styled(
        format!("  Files affected: {}", dialog.file_count),
        Style::default().fg(t.muted),
    )));

    let body = Paragraph::new(lines).wrap(Wrap { trim: false });
    frame.render_widget(body, chunks[0]);

    let footer = Paragraph::new(Line::from(vec![
        Span::styled("  [y]", Style::default().fg(t.accent)),
        Span::styled(" Confirm  ", Style::default().fg(t.muted)),
        Span::styled("[N]", Style::default().fg(t.accent)),
        Span::styled(" Cancel (default)", Style::default().fg(t.muted)),
    ]));
    frame.render_widget(footer, chunks[1]);
}

fn centered_rect(width: u16, height: u16, area: Rect) -> Rect {
    let x = area.x + area.width.saturating_sub(width) / 2;
    let y = area.y + area.height.saturating_sub(height) / 2;
    Rect::new(x, y, width.min(area.width), height.min(area.height))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_confirm_dialog_creation() {
        let dialog = ConfirmDialog::batch_apply(5, 12.0);
        assert_eq!(dialog.on_confirm, ConfirmAction::BatchApply);
        assert_eq!(dialog.file_count, 5);
        assert!(dialog.score_impact.is_some());
        assert!(dialog.message.contains('5'));
    }
}
