use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};

use crate::theme;

/// Render source code block with line numbers and highlighted line.
pub fn render_code_block(
    lines: &mut Vec<Line<'_>>,
    ctx: &crate::types::CodeContext,
    t: &theme::ThemeColors,
) {
    for cl in &ctx.lines {
        let is_highlight = ctx.highlight_line == Some(cl.num);
        let line_num = format!("{:>4}", cl.num);
        let marker = if is_highlight { " X " } else { "   " };

        if is_highlight {
            lines.push(Line::from(vec![
                Span::styled(
                    line_num,
                    Style::default().fg(t.zone_red).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    marker.to_string(),
                    Style::default().fg(t.zone_red).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    cl.content.clone(),
                    Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
                ),
            ]));
        } else {
            lines.push(Line::from(vec![
                Span::styled(line_num, Style::default().fg(t.muted)),
                Span::styled(marker.to_string(), Style::default().fg(t.muted)),
                Span::styled(cl.content.clone(), Style::default().fg(t.fg)),
            ]));
        }
    }
}

/// Render before/after fix diff with red removed / green added lines.
pub fn render_fix_diff(
    lines: &mut Vec<Line<'_>>,
    diff: &crate::types::FixDiff,
    t: &theme::ThemeColors,
) {
    for (i, before_line) in diff.before.iter().enumerate() {
        let line_num = diff.start_line + i as u32;
        lines.push(Line::from(vec![
            Span::styled(
                format!("{line_num:>4}"),
                Style::default().fg(t.diff_removed),
            ),
            Span::styled(" - ", Style::default().fg(t.diff_removed)),
            Span::styled(
                before_line.clone(),
                Style::default().fg(t.diff_removed),
            ),
        ]));
    }
    for (i, after_line) in diff.after.iter().enumerate() {
        let line_num = diff.start_line + i as u32;
        lines.push(Line::from(vec![
            Span::styled(
                format!("{line_num:>4}"),
                Style::default().fg(t.diff_added),
            ),
            Span::styled(" + ", Style::default().fg(t.diff_added)),
            Span::styled(
                after_line.clone(),
                Style::default().fg(t.diff_added),
            ),
        ]));
    }
}

/// Render fix text as diff lines (fallback when no structured fixDiff).
pub fn render_fix_text<'a>(
    lines: &mut Vec<Line<'a>>,
    fix_text: &'a str,
    ft: crate::types::FindingType,
    t: &theme::ThemeColors,
) {
    match ft {
        crate::types::FindingType::A | crate::types::FindingType::C => {
            for line in fix_text.lines() {
                let (prefix, color) = if line.starts_with('+') {
                    ("  + ", t.diff_added)
                } else if line.starts_with('-') {
                    ("  - ", t.diff_removed)
                } else {
                    ("    ", t.fg)
                };
                lines.push(Line::from(vec![
                    Span::styled(prefix, Style::default().fg(color)),
                    Span::styled(
                        line.trim_start_matches(['+', '-']),
                        Style::default().fg(color),
                    ),
                ]));
            }
        }
        crate::types::FindingType::B => {
            for line in fix_text.lines() {
                lines.push(Line::from(Span::styled(
                    format!("  {line}"),
                    Style::default().fg(t.diff_added),
                )));
            }
        }
    }
}
