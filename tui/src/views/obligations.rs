use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

pub fn render_obligations_view(frame: &mut Frame, area: Rect, _app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .title(" EU AI Act Obligations ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            "  108 EU AI Act Obligations — Coming in S03",
            Style::default().fg(t.accent),
        )),
        Line::raw(""),
        Line::from(Span::styled(
            "  Obligation tracking and drill-down will be available here.",
            Style::default().fg(t.muted),
        )),
    ];
    frame.render_widget(Paragraph::new(lines), inner);
}
