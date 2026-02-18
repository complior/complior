use ratatui::layout::Rect;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

pub fn render_terminal(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let block = Block::default()
        .title(" Terminal ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if app.terminal_output.is_empty() {
        let msg = Paragraph::new("No command output yet.").style(theme::muted_style());
        frame.render_widget(msg, inner);
        return;
    }

    let lines: Vec<Line<'_>> = app
        .terminal_output
        .iter()
        .map(|line| {
            // Basic ANSI color stripping — render as plain text
            let clean = strip_ansi(line);
            Line::from(Span::raw(clean))
        })
        .collect();

    // Auto-scroll to bottom
    let total = lines.len();
    let visible = inner.height as usize;
    let scroll = total.saturating_sub(visible);

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));

    frame.render_widget(paragraph, inner);
}

fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut in_escape = false;

    for c in s.chars() {
        if in_escape {
            if c.is_ascii_alphabetic() {
                in_escape = false;
            }
        } else if c == '\x1b' {
            in_escape = true;
        } else {
            result.push(c);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_ansi() {
        assert_eq!(strip_ansi("\x1b[32mgreen\x1b[0m"), "green");
        assert_eq!(strip_ansi("plain text"), "plain text");
        assert_eq!(strip_ansi("\x1b[1;31merror\x1b[0m"), "error");
    }
}
