use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::components::markdown;
use crate::theme;
use crate::types::{ChatBlock, InputMode, MessageRole};

/// Render chat as a panel within the dashboard (original layout).
/// T903: Input at top when chat is empty, at bottom when messages exist.
pub fn render_chat(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let has_messages = app.messages.len() > 1 || app.streaming_response.is_some();

    let block = Block::default()
        .title(" Chat ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if has_messages {
        // Messages exist: input at bottom (standard layout)
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Min(3), Constraint::Length(3)])
            .split(inner);

        render_messages(frame, chunks[0], app);
        render_input(frame, chunks[1], app, focused);
    } else {
        // Empty chat: input at top + tips below (T903)
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(3), Constraint::Min(3)])
            .split(inner);

        render_input(frame, chunks[0], app, focused);
        render_tips(frame, chunks[1]);
    }
}

/// Full-screen chat view (`ViewState::Chat`) — input placement depends on chat state.
pub fn render_chat_view(frame: &mut Frame, area: Rect, app: &App) {
    let focused = true; // Always focused when it's the main view
    let has_messages = app.messages.len() > 1 || app.streaming_response.is_some();

    let block = Block::default()
        .title(" Chat ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if has_messages {
        // Messages exist: input at bottom (standard layout)
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Min(3), Constraint::Length(3)])
            .split(inner);

        render_messages(frame, chunks[0], app);
        render_input(frame, chunks[1], app, focused);
    } else {
        // Empty chat: input at top + tips panel below
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(3), Constraint::Min(3)])
            .split(inner);

        render_input(frame, chunks[0], app, focused);
        render_tips(frame, chunks[1]);
    }
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
        } else if msg.role == MessageRole::User {
            // User messages: highlight @OBL-xxx tokens
            let mut msg_spans = vec![time_span, Span::styled(prefix, style)];
            msg_spans.extend(highlight_obl_tokens(&msg.content, &t));
            lines.push(Line::from(msg_spans));
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

    // Streaming response (cursor: | instead of _)
    if let Some(streaming) = &app.streaming_response {
        lines.push(Line::from(vec![
            Span::styled("AI: ", Style::default().fg(t.assistant_msg)),
            Span::raw(streaming.as_str()),
            Span::styled("|", Style::default().fg(t.accent)),
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
        #[allow(clippy::cast_possible_truncation)]
        let cursor_x = area.x + 1 + prefix.len() as u16 + app.input_cursor as u16;
        let cursor_y = area.y + 1;
        frame.set_cursor_position((cursor_x, cursor_y));
    }
}

/// Highlight @OBL-xxx tokens in accent color.
fn highlight_obl_tokens<'a>(
    text: &'a str,
    t: &theme::ThemeColors,
) -> Vec<Span<'a>> {
    let mut spans = Vec::new();
    let mut remaining = text;

    while let Some(start) = remaining.find("@OBL-") {
        // Text before the token
        if start > 0 {
            spans.push(Span::raw(&remaining[..start]));
        }

        // Find end of token (alphanumeric after @OBL-)
        let token_start = start;
        let after_prefix = &remaining[start + 5..];
        let token_len = 5 + after_prefix
            .chars()
            .take_while(|c| c.is_alphanumeric() || *c == '-')
            .count();
        let token_end = start + token_len;

        spans.push(Span::styled(
            &remaining[token_start..token_end],
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        ));

        remaining = &remaining[token_end..];
    }

    // Remaining text
    if !remaining.is_empty() {
        spans.push(Span::raw(remaining));
    }

    if spans.is_empty() {
        spans.push(Span::raw(text));
    }

    spans
}

/// Tips panel shown when chat is empty.
fn render_tips(frame: &mut Frame, area: Rect) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Quick Start ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            "  Tips",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  /scan      ", Style::default().fg(t.accent)),
            Span::styled("Run compliance scan on your project", Style::default().fg(t.fg)),
        ]),
        Line::from(vec![
            Span::styled("  /help      ", Style::default().fg(t.accent)),
            Span::styled("Show all available commands", Style::default().fg(t.fg)),
        ]),
        Line::from(vec![
            Span::styled("  @file      ", Style::default().fg(t.accent)),
            Span::styled("Reference a file in your message", Style::default().fg(t.fg)),
        ]),
        Line::from(vec![
            Span::styled("  !cmd       ", Style::default().fg(t.accent)),
            Span::styled("Run a shell command", Style::default().fg(t.fg)),
        ]),
        Line::raw(""),
        Line::from(Span::styled(
            "  Type a message or command to get started",
            Style::default().fg(t.muted),
        )),
    ];

    let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false });
    frame.render_widget(paragraph, inner);
}

#[cfg(test)]
mod tests {
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::*;
    use crate::types::ChatMessage;

    /// Replace `[HH:MM]` timestamps with `[00:00]` for deterministic snapshots.
    fn normalize_timestamps(s: &str) -> String {
        let mut result = String::with_capacity(s.len());
        let bytes = s.as_bytes();
        let mut i = 0;
        while i < bytes.len() {
            if i + 7 <= bytes.len()
                && bytes[i] == b'['
                && bytes[i + 1].is_ascii_digit()
                && bytes[i + 2].is_ascii_digit()
                && bytes[i + 3] == b':'
                && bytes[i + 4].is_ascii_digit()
                && bytes[i + 5].is_ascii_digit()
                && bytes[i + 6] == b']'
            {
                result.push_str("[00:00]");
                i += 7;
            } else {
                result.push(bytes[i] as char);
                i += 1;
            }
        }
        result
    }

    fn render_chat_to_string(app: &App, width: u16, height: u16) -> String {
        let backend = TestBackend::new(width, height);
        let mut terminal = Terminal::new(backend).expect("terminal");
        terminal
            .draw(|frame| render_chat(frame, frame.area(), app, true))
            .expect("render");
        let buf = terminal.backend().buffer().clone();
        let mut output = String::new();
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                output.push_str(buf[(x, y)].symbol());
            }
            output.push('\n');
        }
        output
    }

    #[test]
    fn snapshot_chat_with_messages() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.messages.push(ChatMessage::new(
            MessageRole::User,
            "scan my project".to_string(),
        ));
        app.messages.push(ChatMessage::new(
            MessageRole::Assistant,
            "Scanning...".to_string(),
        ));
        let buf = render_chat_to_string(&app, 80, 24);
        // Normalize timestamps [HH:MM] to [00:00] for deterministic snapshots
        let buf = normalize_timestamps(&buf);
        insta::assert_snapshot!(buf);
    }

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

    #[test]
    fn test_streaming_cursor_present() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.streaming_response = Some("Hello world".to_string());

        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");

        // Verify the buffer contains the pipe cursor
        let buffer = terminal.backend().buffer().clone();
        let content: String = buffer.content().iter().map(|cell| cell.symbol().to_string()).collect();
        assert!(content.contains('|'), "Streaming cursor '|' should be present");
    }

    #[test]
    fn t903_empty_chat_input_top() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        // Only the default system welcome message
        let app = App::new(crate::config::TuiConfig::default());

        // Empty chat: has_messages = false (messages.len() <= 1)
        assert!(app.messages.len() <= 1);
        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");

        // Verify tips text is present (input-top layout shows tips)
        let buffer = terminal.backend().buffer().clone();
        let content: String = buffer.content().iter().map(|cell| cell.symbol().to_string()).collect();
        assert!(content.contains("Quick Start") || content.contains("Tips"),
            "Empty chat should show tips panel (input at top)");
    }

    #[test]
    fn t903_chat_with_messages_input_bottom() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Add user message + assistant response
        app.messages.push(ChatMessage::new(MessageRole::User, "hello".into()));
        app.messages.push(ChatMessage::new(MessageRole::Assistant, "world".into()));

        // has_messages = true (messages.len() > 1)
        assert!(app.messages.len() > 1);
        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");
    }

    #[test]
    fn test_chat_view_no_regression() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());

        // Empty chat should render tips
        terminal
            .draw(|frame| render_chat_view(frame, frame.area(), &app))
            .expect("render");

        // With messages should render standard layout
        let mut app2 = App::new(crate::config::TuiConfig::default());
        app2.messages.push(ChatMessage::new(
            MessageRole::User,
            "hello".to_string(),
        ));

        terminal
            .draw(|frame| render_chat_view(frame, frame.area(), &app2))
            .expect("render");
    }
}
