use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::DiffLineKind;

pub fn render_diff(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Diff Preview ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(diff) = &app.diff_content else {
        let msg = Paragraph::new("No diff to show.").style(theme::muted_style());
        frame.render_widget(msg, inner);
        return;
    };

    // Adaptive layout: side-by-side at >=120 cols, stacked otherwise
    if inner.width >= 120 {
        render_side_by_side(frame, inner, diff, &t);
    } else {
        render_unified(frame, inner, diff, &t);
    }
}

fn render_unified(
    frame: &mut Frame,
    area: Rect,
    diff: &crate::types::DiffContent,
    t: &theme::ThemeColors,
) {
    let mut lines: Vec<Line<'_>> = Vec::new();

    // File header
    lines.push(Line::from(Span::styled(
        format!("--- {}", diff.file_path),
        Style::default().fg(t.diff_header),
    )));
    lines.push(Line::from(Span::styled(
        format!("+++ {}", diff.file_path),
        Style::default().fg(t.diff_header),
    )));
    lines.push(Line::raw(""));

    for diff_line in &diff.lines {
        let (prefix, style) = match diff_line.kind {
            DiffLineKind::Added => ("+ ", Style::default().fg(t.diff_added)),
            DiffLineKind::Removed => ("- ", Style::default().fg(t.diff_removed)),
            DiffLineKind::Context => ("  ", Style::default()),
            DiffLineKind::Header => ("@ ", Style::default().fg(t.diff_header)),
        };

        lines.push(Line::from(vec![
            Span::styled(prefix, style),
            Span::styled(&diff_line.content, style),
        ]));
    }

    // Action hints
    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled(" y ", Style::default().fg(t.zone_green)),
        Span::raw("accept  "),
        Span::styled(" n ", Style::default().fg(t.zone_red)),
        Span::raw("reject  "),
        Span::styled(" Esc ", theme::muted_style()),
        Span::raw("cancel"),
    ]));

    let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false });
    frame.render_widget(paragraph, area);
}

fn render_side_by_side(
    frame: &mut Frame,
    area: Rect,
    diff: &crate::types::DiffContent,
    t: &theme::ThemeColors,
) {
    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    let mut left_lines: Vec<Line<'_>> = Vec::new();
    let mut right_lines: Vec<Line<'_>> = Vec::new();

    left_lines.push(Line::from(Span::styled(
        format!("--- {}", diff.file_path),
        Style::default().fg(t.diff_header),
    )));
    right_lines.push(Line::from(Span::styled(
        format!("+++ {}", diff.file_path),
        Style::default().fg(t.diff_header),
    )));

    for diff_line in &diff.lines {
        match diff_line.kind {
            DiffLineKind::Removed => {
                left_lines.push(Line::from(Span::styled(
                    &diff_line.content,
                    Style::default().fg(t.diff_removed),
                )));
            }
            DiffLineKind::Added => {
                right_lines.push(Line::from(Span::styled(
                    &diff_line.content,
                    Style::default().fg(t.diff_added),
                )));
            }
            DiffLineKind::Context => {
                left_lines.push(Line::from(Span::raw(&diff_line.content)));
                right_lines.push(Line::from(Span::raw(&diff_line.content)));
            }
            DiffLineKind::Header => {
                let styled = Line::from(Span::styled(
                    &diff_line.content,
                    Style::default().fg(t.diff_header),
                ));
                left_lines.push(styled.clone());
                right_lines.push(styled);
            }
        }
    }

    frame.render_widget(
        Paragraph::new(left_lines).wrap(Wrap { trim: false }),
        cols[0],
    );
    frame.render_widget(
        Paragraph::new(right_lines).wrap(Wrap { trim: false }),
        cols[1],
    );
}

pub fn parse_unified_diff(diff_text: &str) -> Vec<crate::types::DiffLine> {
    diff_text
        .lines()
        .map(|line| {
            let kind = if line.starts_with('+') && !line.starts_with("+++") {
                DiffLineKind::Added
            } else if line.starts_with('-') && !line.starts_with("---") {
                DiffLineKind::Removed
            } else if line.starts_with("@@") {
                DiffLineKind::Header
            } else {
                DiffLineKind::Context
            };

            crate::types::DiffLine {
                kind,
                content: line.to_string(),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_unified_diff() {
        let diff = "--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,4 @@\n context\n-removed\n+added\n+new line\n";
        let lines = parse_unified_diff(diff);

        assert_eq!(lines.len(), 7);
        assert_eq!(lines[2].kind, DiffLineKind::Header);
        assert_eq!(lines[4].kind, DiffLineKind::Removed);
        assert_eq!(lines[5].kind, DiffLineKind::Added);
    }
}
