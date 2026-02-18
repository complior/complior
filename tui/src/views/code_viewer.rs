use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::InputMode;

pub fn render_code_viewer(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let title = app
        .open_file_path
        .as_deref()
        .unwrap_or("Code Viewer");

    let block = Block::default()
        .title(format!(" {title} "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(content) = &app.code_content else {
        let msg = Paragraph::new("No file open. Use /edit <path> or Enter on a file.")
            .style(theme::muted_style());
        frame.render_widget(msg, inner);
        return;
    };

    let code_lines: Vec<&str> = content.lines().collect();
    let total_lines = code_lines.len();
    let visible_height = inner.height as usize;

    // Clamp scroll
    let scroll = app.code_scroll.min(total_lines.saturating_sub(visible_height));

    let mut lines: Vec<Line<'_>> = Vec::new();
    let end = (scroll + visible_height).min(total_lines);

    for (i, &code_line) in code_lines.iter().enumerate().skip(scroll).take(end - scroll) {
        let line_num = i + 1;
        let is_selected = app.input_mode == InputMode::Visual
            && app.selection.as_ref().is_some_and(|sel| {
                i >= sel.start_line && i <= sel.end_line
            });

        let num_style = if is_selected {
            Style::default()
                .fg(theme::ACCENT)
                .add_modifier(Modifier::BOLD)
        } else {
            theme::muted_style()
        };

        let code_style = if is_selected {
            Style::default().bg(theme::SELECTION_BG)
        } else {
            Style::default()
        };

        // Check for compliance annotations
        let annotation = app.last_scan.as_ref().and_then(|scan| {
            scan.findings.iter().find(|f| {
                f.r#type == "fail"
                    && f.message.contains(&format!("line {line_num}"))
            })
        });

        let mut spans = vec![
            Span::styled(format!("{line_num:4} | "), num_style),
            Span::styled(code_line, code_style),
        ];

        if let Some(finding) = annotation {
            spans.push(Span::styled(
                format!("  ! {}", finding.message),
                Style::default().fg(theme::severity_color(finding.severity)),
            ));
        }

        lines.push(Line::from(spans));
    }

    let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false });
    frame.render_widget(paragraph, inner);
}

/// Highlight code using syntect (returns styled lines for ratatui).
/// Falls back to plain text if language not recognized.
pub fn highlight_code(content: &str, file_ext: &str) -> Vec<Vec<(Style, String)>> {
    use syntect::highlighting::ThemeSet;
    use syntect::parsing::SyntaxSet;

    let ss = SyntaxSet::load_defaults_newlines();
    let ts = ThemeSet::load_defaults();
    let theme = &ts.themes["base16-ocean.dark"];

    let syntax = ss
        .find_syntax_by_extension(file_ext)
        .unwrap_or_else(|| ss.find_syntax_plain_text());

    let mut highlighter = syntect::easy::HighlightLines::new(syntax, theme);
    let mut result = Vec::new();

    for line in syntect::util::LinesWithEndings::from(content) {
        let Ok(ranges) = highlighter.highlight_line(line, &ss) else {
            result.push(vec![(Style::default(), line.to_string())]);
            continue;
        };

        let styled: Vec<(Style, String)> = ranges
            .iter()
            .map(|(style, text)| {
                let fg = ratatui::style::Color::Rgb(
                    style.foreground.r,
                    style.foreground.g,
                    style.foreground.b,
                );
                (Style::default().fg(fg), (*text).to_string())
            })
            .collect();

        result.push(styled);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_highlight_code_returns_lines() {
        let code = "fn main() {\n    println!(\"hello\");\n}\n";
        let lines = highlight_code(code, "rs");
        assert_eq!(lines.len(), 3);
    }
}
