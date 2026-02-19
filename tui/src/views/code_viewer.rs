use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::InputMode;

pub fn render_code_viewer(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let t = theme::theme();

    let file_name = app.open_file_path.as_deref().unwrap_or("Code Viewer");
    let ext = file_name.rsplit('.').next().unwrap_or("");

    let title = if let Some(content) = &app.code_content {
        let total = content.lines().count();
        let lang = language_name(ext);
        let line_info = format!("Line {}/{}", app.code_scroll + 1, total);
        format!(" {file_name} [{lang}] {line_info} ")
    } else {
        format!(" {file_name} ")
    };

    let block = Block::default()
        .title(title)
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

    let highlighted = highlight_code(content, ext);
    let code_lines_count = highlighted.len();
    let visible_height = inner.height as usize;

    let scroll = app
        .code_scroll
        .min(code_lines_count.saturating_sub(visible_height));

    let mut lines: Vec<Line<'_>> = Vec::new();
    let end = (scroll + visible_height).min(code_lines_count);

    for (i, styled_spans) in highlighted.iter().enumerate().skip(scroll).take(end - scroll) {
        let line_num = i + 1;
        let is_selected = app.input_mode == InputMode::Visual
            && app
                .selection
                .as_ref()
                .is_some_and(|sel| i >= sel.start_line && i <= sel.end_line);

        // Check for compliance violation on this line
        let violation = app.last_scan.as_ref().and_then(|scan| {
            scan.findings.iter().find(|f| {
                f.r#type == "fail" && f.message.contains(&format!("line {line_num}"))
            })
        });

        let has_violation = violation.is_some();

        let num_style = if is_selected {
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD)
        } else if has_violation {
            Style::default().fg(t.zone_red)
        } else {
            theme::muted_style()
        };

        // Line number + violation marker
        let marker = if has_violation { "!" } else { " " };
        let mut spans = vec![Span::styled(
            format!("{marker}{line_num:4} | "),
            num_style,
        )];

        // Syntax-highlighted code spans
        for (style, text) in styled_spans {
            let merged = if is_selected {
                style.bg(t.selection_bg)
            } else {
                *style
            };
            spans.push(Span::styled(text.clone(), merged));
        }

        // Search match highlight
        if let Some(query) = &app.code_search_query {
            if !query.is_empty() {
                if let Some(raw_line) = content.lines().nth(i) {
                    if raw_line.to_lowercase().contains(&query.to_lowercase()) {
                        spans.push(Span::styled(
                            " ●",
                            Style::default().fg(t.zone_yellow),
                        ));
                    }
                }
            }
        }

        // Compliance annotation
        if let Some(finding) = violation {
            spans.push(Span::styled(
                format!("  ! {}", finding.message),
                Style::default().fg(theme::severity_color(finding.severity)),
            ));
        }

        lines.push(Line::from(spans));
    }

    // Footer line within code viewer
    if visible_height > 1 && code_lines_count > 0 {
        let mut footer_spans = vec![
            Span::styled(
                format!(" Line {}/{}", scroll + 1, code_lines_count),
                Style::default().fg(t.muted),
            ),
            Span::styled(
                format!("  {}", language_name(ext)),
                Style::default().fg(t.accent),
            ),
        ];

        if app.input_mode == InputMode::Visual {
            if let Some(sel) = &app.selection {
                let count = sel.end_line.saturating_sub(sel.start_line) + 1;
                footer_spans.push(Span::styled(
                    format!("  VISUAL Lines {}-{} ({count} selected)  Ctrl+K: Ask AI",
                            sel.start_line + 1, sel.end_line + 1),
                    Style::default()
                        .fg(t.accent)
                        .add_modifier(Modifier::BOLD),
                ));
            }
        }

        if let Some(query) = &app.code_search_query {
            if !query.is_empty() {
                let match_count = app.code_search_matches.len();
                footer_spans.push(Span::styled(
                    format!("  /{query} ({match_count} matches)"),
                    Style::default().fg(t.zone_yellow),
                ));
            }
        }

        // Pad lines to fill visible height, then add footer
        while lines.len() + 1 < visible_height {
            lines.push(Line::from(Span::styled("~", theme::muted_style())));
        }
        lines.push(Line::from(footer_spans));
    }

    let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false });
    frame.render_widget(paragraph, inner);
}

/// Highlight code using syntect with theme-aware colors.
pub fn highlight_code(content: &str, file_ext: &str) -> Vec<Vec<(Style, String)>> {
    use syntect::highlighting::ThemeSet;
    use syntect::parsing::SyntaxSet;

    let ss = SyntaxSet::load_defaults_newlines();
    let ts = ThemeSet::load_defaults();

    let theme_name = theme::syntect_theme_for(&theme::current_theme_name());
    let syn_theme = ts.themes.get(theme_name)
        .unwrap_or_else(|| &ts.themes["base16-ocean.dark"]);

    let syntax = ss
        .find_syntax_by_extension(file_ext)
        .unwrap_or_else(|| ss.find_syntax_plain_text());

    let mut highlighter = syntect::easy::HighlightLines::new(syntax, syn_theme);
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

/// Find all line indices matching a search query.
pub fn find_search_matches(content: &str, query: &str) -> Vec<usize> {
    if query.is_empty() {
        return Vec::new();
    }
    let lower_query = query.to_lowercase();
    content
        .lines()
        .enumerate()
        .filter(|(_, line)| line.to_lowercase().contains(&lower_query))
        .map(|(i, _)| i)
        .collect()
}

fn language_name(ext: &str) -> &'static str {
    match ext {
        "rs" => "Rust",
        "ts" | "tsx" => "TypeScript",
        "js" | "jsx" => "JavaScript",
        "py" => "Python",
        "yml" | "yaml" => "YAML",
        "json" => "JSON",
        "toml" => "TOML",
        "md" => "Markdown",
        "html" => "HTML",
        "css" => "CSS",
        "sh" | "bash" => "Shell",
        "sql" => "SQL",
        _ => "Text",
    }
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

    #[test]
    fn test_language_name() {
        assert_eq!(language_name("rs"), "Rust");
        assert_eq!(language_name("ts"), "TypeScript");
        assert_eq!(language_name("xyz"), "Text");
    }

    #[test]
    fn test_find_search_matches() {
        let content = "hello world\nfoo bar\nhello again";
        let matches = find_search_matches(content, "hello");
        assert_eq!(matches, vec![0, 2]);
    }

    #[test]
    fn test_find_search_matches_empty() {
        let matches = find_search_matches("hello", "");
        assert!(matches.is_empty());
    }

    #[test]
    fn test_find_search_case_insensitive() {
        let content = "Hello World\nhello world";
        let matches = find_search_matches(content, "HELLO");
        assert_eq!(matches.len(), 2);
    }
}
