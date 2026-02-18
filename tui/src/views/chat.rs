use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::components::markdown;
use crate::theme;
use crate::types::{ChatBlock, InputMode, MessageRole};

pub fn render_chat(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let block = Block::default()
        .title(" Chat ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Split: messages area + input area
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(3), Constraint::Length(3)])
        .split(inner);

    render_messages(frame, chunks[0], app);
    render_input(frame, chunks[1], app, focused);
}

fn render_messages(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let mut lines: Vec<Line<'_>> = Vec::new();

    for msg in &app.messages {
        let (prefix, style) = match msg.role {
            MessageRole::User => ("> ", Style::default().fg(t.user_msg)),
            MessageRole::Assistant => ("AI: ", Style::default().fg(t.assistant_msg)),
            MessageRole::System => ("! ", Style::default().fg(t.system_msg)),
        };

        // Timestamp
        let time_span = Span::styled(
            format!("[{}] ", msg.timestamp),
            Style::default().fg(t.muted),
        );

        // For assistant messages, try markdown rendering
        if msg.role == MessageRole::Assistant {
            lines.push(Line::from(vec![
                time_span,
                Span::styled(prefix, style),
            ]));
            let md_lines = markdown::parse_markdown(&msg.content);
            lines.extend(md_lines);
        } else {
            lines.push(Line::from(vec![
                time_span,
                Span::styled(prefix, style),
                Span::raw(&msg.content),
            ]));
        }

        // Render blocks for messages that have them
        for block in &msg.blocks {
            match block {
                ChatBlock::Thinking(text) => {
                    let preview: String = text.lines().take(3).collect::<Vec<_>>().join("\n");
                    lines.push(Line::from(vec![
                        Span::styled("  Thinking... ", Style::default().fg(t.thinking_fg)),
                        Span::styled(preview, Style::default().fg(t.thinking_fg)),
                    ]));
                }
                ChatBlock::ToolCall { tool_name, args } => {
                    let truncated_args = if args.len() > 80 {
                        format!("{}...", &args[..80])
                    } else {
                        args.clone()
                    };
                    lines.push(Line::from(Span::styled(
                        format!("  \u{1f527} {tool_name}({truncated_args})"),
                        Style::default().fg(t.tool_call_border),
                    )));
                }
                ChatBlock::ToolResult { tool_name, result, is_error } => {
                    let color = if *is_error { t.tool_result_err } else { t.tool_result_ok };
                    let status = if *is_error { "ERR" } else { "OK" };
                    let preview: String = result.lines().take(3).collect::<Vec<_>>().join(" | ");
                    lines.push(Line::from(Span::styled(
                        format!("  [{status}] {tool_name}: {preview}"),
                        Style::default().fg(color),
                    )));
                }
                ChatBlock::Text(_) => {
                    // Already rendered via msg.content markdown above
                }
            }
        }

        lines.push(Line::raw(""));
    }

    // Streaming thinking
    if let Some(thinking) = &app.streaming_thinking {
        let preview: String = thinking.lines().take(3).collect::<Vec<_>>().join(" ");
        lines.push(Line::from(vec![
            Span::styled(
                format!("{} Thinking... ", app.spinner.frame()),
                Style::default().fg(t.thinking_fg),
            ),
            Span::styled(preview, Style::default().fg(t.thinking_fg)),
        ]));
    }

    // Streaming response
    if let Some(streaming) = &app.streaming_response {
        lines.push(Line::from(vec![
            Span::styled("AI: ", Style::default().fg(t.assistant_msg)),
            Span::raw(streaming.as_str()),
            Span::styled("_", Style::default().fg(t.accent)),
        ]));
    }

    // Smart scroll: auto-scroll to bottom, or respect manual scroll position
    let total_lines = lines.len();
    let visible = area.height as usize;

    let scroll = if app.chat_auto_scroll {
        total_lines.saturating_sub(visible)
    } else {
        app.chat_scroll.min(total_lines.saturating_sub(visible))
    };

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));

    frame.render_widget(paragraph, area);
}

fn render_input(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let t = theme::theme();

    let input_block = Block::default()
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let prefix = match app.input_mode {
        InputMode::Command => "/",
        _ => "> ",
    };

    let input = Paragraph::new(Line::from(vec![
        Span::styled(prefix, Style::default().fg(t.accent)),
        Span::raw(&app.input),
    ]))
    .block(input_block);

    frame.render_widget(input, area);

    // Show cursor in insert/command mode
    if focused && matches!(app.input_mode, InputMode::Insert | InputMode::Command) {
        let cursor_x = area.x + 1 + prefix.len() as u16 + app.input_cursor as u16;
        let cursor_y = area.y + 1;
        frame.set_cursor_position((cursor_x, cursor_y));
    }
}

#[cfg(test)]
mod tests {
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::*;
    use crate::types::ChatMessage;

    #[test]
    fn test_chat_renders_messages() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.messages.push(ChatMessage::new(
            MessageRole::User,
            "scan my project".to_string(),
        ));
        app.messages.push(ChatMessage::new(
            MessageRole::Assistant,
            "Scanning...".to_string(),
        ));

        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");
    }
}
