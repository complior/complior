use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph, Wrap};
use ratatui::Frame;

use crate::theme;

/// State for the inline diff overlay shown after Selection→AI.
#[derive(Debug, Clone)]
pub struct DiffOverlayState {
    pub file_path: String,
    pub original_lines: Vec<String>,
    pub suggested_lines: Vec<String>,
    pub visible: bool,
}

impl DiffOverlayState {
    pub fn new(file_path: String, original: Vec<String>, suggested: Vec<String>) -> Self {
        Self {
            file_path,
            original_lines: original,
            suggested_lines: suggested,
            visible: true,
        }
    }
}

/// Render the diff overlay as a modal popup.
pub fn render_diff_overlay(frame: &mut Frame, state: &DiffOverlayState) {
    let t = theme::theme();
    let height = (state.original_lines.len() + state.suggested_lines.len() + 6)
        .min(20) as u16;
    let area = centered_rect(70, height, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Suggested Fix ")
        .title_style(Style::default().fg(t.accent).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border_focused))
        .style(Style::default().bg(t.bg));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::vertical([
        Constraint::Min(3),
        Constraint::Length(1),
    ])
    .split(inner);

    // --- Diff lines ---
    let mut lines: Vec<Line> = Vec::new();

    for line in &state.original_lines {
        lines.push(Line::from(Span::styled(
            format!("- {line}"),
            Style::default().fg(t.diff_removed),
        )));
    }
    for line in &state.suggested_lines {
        lines.push(Line::from(Span::styled(
            format!("+ {line}"),
            Style::default().fg(t.diff_added),
        )));
    }

    let diff = Paragraph::new(lines).wrap(Wrap { trim: false });
    frame.render_widget(diff, chunks[0]);

    // --- Footer ---
    let footer = Paragraph::new(Line::from(vec![
        Span::styled("[a]", Style::default().fg(t.accent)),
        Span::styled("pply  ", Style::default().fg(t.muted)),
        Span::styled("[d]", Style::default().fg(t.accent)),
        Span::styled("ismiss  ", Style::default().fg(t.muted)),
        Span::styled("[c]", Style::default().fg(t.accent)),
        Span::styled("opy", Style::default().fg(t.muted)),
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
    fn test_diff_overlay_creation() {
        let state = DiffOverlayState::new(
            "src/main.rs".to_string(),
            vec!["let x = 1;".to_string()],
            vec!["let x = 1; // AI disclosure".to_string()],
        );
        assert!(state.visible);
        assert_eq!(state.original_lines.len(), 1);
        assert_eq!(state.suggested_lines.len(), 1);
    }
}
