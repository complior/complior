use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};

use crate::theme;

/// Parse a markdown-like string into styled ratatui Spans.
/// Supports: **bold**, `code`, # Headers, - lists, ```code blocks```.
pub fn parse_markdown(text: &str) -> Vec<Line<'static>> {
    let t = theme::theme();
    let mut lines = Vec::new();
    let mut in_code_block = false;

    for raw_line in text.lines() {
        if raw_line.starts_with("```") {
            in_code_block = !in_code_block;
            if in_code_block {
                lines.push(Line::from(Span::styled(
                    "─── code ───",
                    Style::default().fg(t.muted),
                )));
            } else {
                lines.push(Line::from(Span::styled(
                    "────────────",
                    Style::default().fg(t.muted),
                )));
            }
            continue;
        }

        if in_code_block {
            lines.push(Line::from(Span::styled(
                raw_line.to_string(),
                Style::default().fg(t.accent),
            )));
            continue;
        }

        // Headers
        if raw_line.starts_with("### ") {
            lines.push(Line::from(Span::styled(
                raw_line[4..].to_string(),
                Style::default()
                    .fg(t.accent)
                    .add_modifier(Modifier::BOLD),
            )));
            continue;
        }
        if raw_line.starts_with("## ") {
            lines.push(Line::from(Span::styled(
                raw_line[3..].to_string(),
                Style::default()
                    .fg(t.accent)
                    .add_modifier(Modifier::BOLD | Modifier::UNDERLINED),
            )));
            continue;
        }
        if raw_line.starts_with("# ") {
            lines.push(Line::from(Span::styled(
                raw_line[2..].to_string(),
                Style::default()
                    .fg(t.fg)
                    .add_modifier(Modifier::BOLD | Modifier::UNDERLINED),
            )));
            continue;
        }

        // List items
        if raw_line.starts_with("- ") || raw_line.starts_with("* ") {
            lines.push(Line::from(vec![
                Span::styled("• ", Style::default().fg(t.accent)),
                Span::raw(parse_inline_spans(&raw_line[2..], &t)),
            ]));
            continue;
        }

        // Inline formatting
        lines.push(parse_inline_line(raw_line, &t));
    }

    lines
}

fn parse_inline_line(text: &str, t: &theme::ThemeColors) -> Line<'static> {
    let mut spans: Vec<Span<'static>> = Vec::new();
    let mut remaining = text;

    while !remaining.is_empty() {
        // Bold: **text**
        if let Some(start) = remaining.find("**") {
            if start > 0 {
                spans.push(Span::raw(remaining[..start].to_string()));
            }
            let after = &remaining[start + 2..];
            if let Some(end) = after.find("**") {
                spans.push(Span::styled(
                    after[..end].to_string(),
                    Style::default().add_modifier(Modifier::BOLD),
                ));
                remaining = &after[end + 2..];
                continue;
            }
            spans.push(Span::raw(remaining[start..].to_string()));
            break;
        }

        // Inline code: `text`
        if let Some(start) = remaining.find('`') {
            if start > 0 {
                spans.push(Span::raw(remaining[..start].to_string()));
            }
            let after = &remaining[start + 1..];
            if let Some(end) = after.find('`') {
                spans.push(Span::styled(
                    after[..end].to_string(),
                    Style::default().fg(t.accent).bg(t.selection_bg),
                ));
                remaining = &after[end + 1..];
                continue;
            }
            spans.push(Span::raw(remaining[start..].to_string()));
            break;
        }

        spans.push(Span::raw(remaining.to_string()));
        break;
    }

    Line::from(spans)
}

/// Simple inline spans extraction (returns the text with formatting stripped for list items).
fn parse_inline_spans(text: &str, _t: &theme::ThemeColors) -> String {
    // For list items, just return plain text for now
    text.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_markdown_header() {
        crate::theme::init_theme("dark");
        let lines = parse_markdown("# Hello\nWorld");
        assert_eq!(lines.len(), 2);
    }

    #[test]
    fn test_parse_markdown_code_block() {
        crate::theme::init_theme("dark");
        let lines = parse_markdown("text\n```\ncode here\n```\nmore");
        assert_eq!(lines.len(), 5); // text, ─── code ───, code here, ────────────, more
    }
}
