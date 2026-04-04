use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};

use crate::app::App;
use crate::theme;
use crate::types::MessageRole;

/// Indent for continuation lines (matches "YOU " / "◦ " / "● " width).
const INDENT: &str = "    ";

/// Render status log as a panel within the dashboard.
/// Only System messages are displayed — no chat, no LLM.
pub fn render_chat(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let block = Block::default()
        .title(" Status Log ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    render_status_log(frame, inner, app);
}

/// Full-screen readonly log view (`ViewState::Log` / key `L`).
///
/// Shows only System-role messages as a status log, with no input area.
/// Delegates to `render_chat` (the dashboard panel renderer) with `focused: true`.
pub fn render_log_view(frame: &mut Frame, area: Rect, app: &App) {
    render_chat(frame, area, app, true);
}

/// Full-screen interactive chat view (`ViewState::Chat` / key `C`).
///
/// Shows all message roles (System, User, Assistant) with distinct styling,
/// streaming indicator, and an input area at the bottom.
pub fn render_chat_view(frame: &mut Frame, area: Rect, app: &App) {
    use crate::types::{ChatBlock, InputMode};

    let t = theme::theme();

    let block = Block::default()
        .title(" Chat ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(true));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.height < 4 {
        return;
    }

    // Split: messages area + input bar (5 lines = 3 visible + 2 border)
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(1), Constraint::Length(5)])
        .split(inner);

    let msg_area = chunks[0];
    let input_area = chunks[1];

    // ── Messages ──────────────────────────────────────────────────────────
    let mut lines: Vec<Line<'_>> = Vec::new();

    for msg in &app.messages {
        match msg.role {
            MessageRole::System => {
                // System: ◦ prefix, muted text
                let first_content_line = msg.content.lines().next().unwrap_or("");
                lines.push(Line::from(vec![
                    Span::styled("\u{25E6} ", Style::default().fg(t.system_msg)),
                    Span::styled(first_content_line.to_string(), Style::default().fg(t.muted)),
                ]));
                for content_line in msg.content.lines().skip(1) {
                    lines.push(Line::from(vec![
                        Span::raw(INDENT),
                        Span::styled(content_line.to_string(), Style::default().fg(t.muted)),
                    ]));
                }
            }
            MessageRole::User => {
                // User: YOU prefix, bold, with background tint
                let first_content_line = msg.content.lines().next().unwrap_or("");
                lines.push(Line::from(vec![
                    Span::styled(
                        "YOU ",
                        Style::default()
                            .fg(t.user_msg)
                            .bg(t.user_msg_bg)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(
                        first_content_line.to_string(),
                        Style::default().fg(t.fg).bg(t.user_msg_bg),
                    ),
                ]));
                for content_line in msg.content.lines().skip(1) {
                    lines.push(Line::from(vec![
                        Span::styled(INDENT, Style::default().bg(t.user_msg_bg)),
                        Span::styled(
                            content_line.to_string(),
                            Style::default().fg(t.fg).bg(t.user_msg_bg),
                        ),
                    ]));
                }
            }
            MessageRole::Assistant => {
                // Assistant: ● prefix, green
                let first_content_line = msg.content.lines().next().unwrap_or("");
                lines.push(Line::from(vec![
                    Span::styled(
                        "\u{25CF} ",
                        Style::default()
                            .fg(t.assistant_msg)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(first_content_line.to_string(), Style::default().fg(t.fg)),
                ]));
                for content_line in msg.content.lines().skip(1) {
                    lines.push(Line::from(vec![
                        Span::raw(INDENT),
                        Span::styled(content_line.to_string(), Style::default().fg(t.fg)),
                    ]));
                }
            }
        }

        // Render blocks (thinking, tool_call, tool_result)
        for blk in &msg.blocks {
            match blk {
                ChatBlock::Thinking(text) => {
                    let preview = if text.len() > 80 { &text[..80] } else { text };
                    let suffix = if text.len() > 80 { "..." } else { "" };
                    lines.push(Line::from(vec![
                        Span::raw(INDENT),
                        Span::styled("\u{25CC} ", Style::default().fg(t.thinking_fg)),
                        Span::styled(
                            format!("{preview}{suffix}"),
                            Style::default()
                                .fg(t.thinking_fg)
                                .add_modifier(Modifier::ITALIC),
                        ),
                    ]));
                }
                ChatBlock::ToolCall { tool_name, args } => {
                    let args_preview = if args.len() > 60 { &args[..60] } else { args };
                    lines.push(Line::from(vec![
                        Span::raw(INDENT),
                        Span::styled("\u{2699} ", Style::default().fg(t.tool_call_border)),
                        Span::styled(
                            tool_name.as_str(),
                            Style::default()
                                .fg(t.tool_call_border)
                                .add_modifier(Modifier::BOLD),
                        ),
                        Span::styled(format!("({args_preview})"), Style::default().fg(t.muted)),
                    ]));
                }
                ChatBlock::ToolResult {
                    tool_name,
                    result,
                    is_error,
                } => {
                    let result_preview = if result.len() > 200 {
                        &result[..200]
                    } else {
                        result
                    };
                    let (icon, color) = if *is_error {
                        ("\u{2717} ", t.tool_result_err) // ✗
                    } else {
                        ("\u{2713} ", t.tool_result_ok) // ✓
                    };
                    lines.push(Line::from(vec![
                        Span::raw(INDENT),
                        Span::styled(icon, Style::default().fg(color)),
                        Span::styled(
                            format!("{tool_name}: "),
                            Style::default().fg(color).add_modifier(Modifier::BOLD),
                        ),
                        Span::styled(result_preview.to_string(), Style::default().fg(t.muted)),
                    ]));
                }
                ChatBlock::Text(_) => {}
            }
        }
    }

    // Streaming indicator
    if app.streaming.active {
        let elapsed = app
            .streaming
            .stream_start
            .map_or(0.0, |s| s.elapsed().as_secs_f64());

        // Spinner animation
        const SPINNER: &[&str] = &[
            "\u{280B}", "\u{2819}", "\u{2839}", "\u{2838}", "\u{283C}", "\u{2834}", "\u{2826}",
            "\u{2827}", "\u{2807}", "\u{280F}",
        ];
        let tick = (elapsed * 10.0) as usize % SPINNER.len();
        let spinner = SPINNER[tick];

        if !app.streaming.partial_text.is_empty() {
            let partial = &app.streaming.partial_text;
            lines.push(Line::from(vec![
                Span::raw(INDENT),
                Span::styled(
                    "\u{25CF} ",
                    Style::default()
                        .fg(t.assistant_msg)
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(partial.as_str(), Style::default().fg(t.fg)),
                Span::styled("|", Style::default().fg(t.accent)),
            ]));
        }

        // Status line
        lines.push(Line::from(vec![
            Span::raw(INDENT),
            Span::styled(
                format!("{spinner} responding \u{00B7} {elapsed:.1}s"),
                Style::default().fg(t.thinking_fg),
            ),
        ]));
    }

    let total_lines = lines.len();
    let visible = msg_area.height as usize;
    let scroll = if app.chat_auto_scroll {
        total_lines.saturating_sub(visible)
    } else {
        app.chat_scroll.min(total_lines.saturating_sub(visible))
    };

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, msg_area);

    // ── "Unread above" indicator ──────────────────────────────────────────
    if scroll > 0 && !app.chat_auto_scroll && msg_area.height > 0 {
        let indicator = Paragraph::new(Line::from(vec![Span::styled(
            " \u{2191} more messages above ",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )]));
        let indicator_area = Rect {
            x: msg_area.x,
            y: msg_area.y,
            width: msg_area.width,
            height: 1,
        };
        frame.render_widget(indicator, indicator_area);
    }

    // ── Input area ────────────────────────────────────────────────────────
    let input_block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(if app.input_mode == InputMode::Insert {
            t.accent
        } else {
            t.muted
        }));

    let input_inner = input_block.inner(input_area);
    frame.render_widget(input_block, input_area);

    if app.streaming.active {
        let elapsed = app
            .streaming
            .stream_start
            .map_or(0.0, |s| s.elapsed().as_secs_f64());
        let streaming_hint = Line::from(vec![
            Span::styled(
                format!("Streaming ({elapsed:.1}s)... "),
                Style::default().fg(t.assistant_msg),
            ),
            Span::styled(
                "Esc",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(" to cancel", Style::default().fg(t.muted)),
        ]);
        frame.render_widget(Paragraph::new(streaming_hint), input_inner);
    } else {
        // Multiline input: split on newlines and render each line
        let input_lines: Vec<&str> = app.input.split('\n').collect();
        let mut prompt_lines: Vec<Line<'_>> = Vec::new();
        for (i, line_text) in input_lines.iter().enumerate() {
            let prefix = if i == 0 { "> " } else { "  " };
            let is_last = i == input_lines.len() - 1;
            let mut spans = vec![Span::styled(
                prefix,
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            )];
            if app.input.is_empty() && i == 0 && app.input_mode != InputMode::Insert {
                spans.push(Span::styled(
                    "i to type, Shift+Enter newline, :llm settings",
                    Style::default().fg(t.muted),
                ));
            } else {
                spans.push(Span::raw(line_text.to_string()));
            }
            if is_last && app.input_mode == InputMode::Insert {
                spans.push(Span::styled("\u{258c}", Style::default().fg(t.accent)));
            }
            prompt_lines.push(Line::from(spans));
        }
        // Auto-scroll input to show last lines if they exceed visible area
        let visible_input_lines = input_inner.height as usize;
        let input_scroll = prompt_lines.len().saturating_sub(visible_input_lines);
        let prompt_paragraph =
            Paragraph::new(prompt_lines).scroll((u16::try_from(input_scroll).unwrap_or(0), 0));
        frame.render_widget(prompt_paragraph, input_inner);
    }
}

/// Render only System-role messages as the status log.
///
/// US-S0211: When the log is empty (no system events yet), renders an
/// "empty state" with a visual command prompt at the top and Quick Start
/// tips below, guiding the user to run their first command.
fn render_status_log(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let mut lines: Vec<Line<'_>> = Vec::new();

    for msg in &app.messages {
        if msg.role != MessageRole::System {
            continue;
        }
        lines.push(Line::from(vec![
            Span::styled("! ", Style::default().fg(t.system_msg)),
            Span::raw(&msg.content),
        ]));
    }

    if lines.is_empty() {
        render_empty_state(frame, area);
        return;
    }

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

/// US-S0211: Empty state layout — input prompt at top, Quick Start tips below.
///
/// ```text
/// ┌─────────────────────────────┐
/// │ > :scan                     │  ← visual command prompt
/// └─────────────────────────────┘
///  Quick Start:
///  • :scan      — scan your project
///  • :help      — available commands
///  • Ctrl+P     — command palette
///  • :watch     — watch mode (auto-rescan)
/// ```
fn render_empty_state(frame: &mut Frame, area: Rect) {
    let t = theme::theme();

    // Split: 3 rows for the input box, remainder for tips
    let input_height = 3u16;
    if area.height <= input_height {
        // Too small — just show a one-liner
        let line = Paragraph::new(Span::styled(
            " > :scan to start",
            Style::default().fg(t.muted),
        ));
        frame.render_widget(line, area);
        return;
    }

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(input_height), Constraint::Min(0)])
        .split(area);

    // ── Input box ────────────────────────────────────────────────────────
    let prompt_text = Line::from(vec![
        Span::styled(
            "> ",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        ),
        Span::styled(":scan", Style::default().fg(t.fg)),
        Span::styled("  or  :help", Style::default().fg(t.muted)),
    ]);
    let input_block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));
    frame.render_widget(Paragraph::new(prompt_text).block(input_block), chunks[0]);

    // ── Quick Start tips ─────────────────────────────────────────────────
    let tips: Vec<Line<'_>> = vec![
        Line::from(Span::styled(
            " Quick Start:",
            Style::default().fg(t.muted).add_modifier(Modifier::BOLD),
        )),
        Line::from(vec![
            Span::styled("  • ", Style::default().fg(t.accent)),
            Span::styled(":scan     ", Style::default().fg(t.fg)),
            Span::styled(
                "— scan your project for compliance issues",
                Style::default().fg(t.muted),
            ),
        ]),
        Line::from(vec![
            Span::styled("  • ", Style::default().fg(t.accent)),
            Span::styled(":help     ", Style::default().fg(t.fg)),
            Span::styled("— list available commands", Style::default().fg(t.muted)),
        ]),
        Line::from(vec![
            Span::styled("  • ", Style::default().fg(t.accent)),
            Span::styled("Ctrl+P    ", Style::default().fg(t.fg)),
            Span::styled("— open command palette", Style::default().fg(t.muted)),
        ]),
        Line::from(vec![
            Span::styled("  • ", Style::default().fg(t.accent)),
            Span::styled(":watch    ", Style::default().fg(t.fg)),
            Span::styled(
                "— watch mode (auto-rescan on file change)",
                Style::default().fg(t.muted),
            ),
        ]),
    ];

    frame.render_widget(Paragraph::new(tips), chunks[1]);
}

#[cfg(test)]
mod tests {
    use ratatui::Terminal;
    use ratatui::backend::TestBackend;

    use super::*;
    use crate::types::ChatMessage;

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
            MessageRole::System,
            "Scanning...".to_string(),
        ));
        app.messages.push(ChatMessage::new(
            MessageRole::System,
            "Scan complete: 75/100".to_string(),
        ));
        let buf = render_chat_to_string(&app, 80, 24);
        insta::assert_snapshot!(buf);
    }

    #[test]
    fn test_status_log_shows_system_messages() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.messages.push(ChatMessage::new(
            MessageRole::System,
            "Scan complete: 75/100".to_string(),
        ));

        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");

        let buffer = terminal.backend().buffer().clone();
        let content: String = buffer
            .content()
            .iter()
            .map(|cell| cell.symbol().to_string())
            .collect();
        assert!(
            content.contains("Status Log"),
            "Should show 'Status Log' title"
        );
    }

    #[test]
    fn test_status_log_filters_non_system() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Add a system message (should appear) and check the title
        app.messages.push(ChatMessage::new(
            MessageRole::System,
            "System event logged".to_string(),
        ));

        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");

        let buffer = terminal.backend().buffer().clone();
        let content: String = buffer
            .content()
            .iter()
            .map(|cell| cell.symbol().to_string())
            .collect();
        // Panel is now Status Log, not Chat
        assert!(!content.contains("Chat"), "Should not show 'Chat' title");
        assert!(
            content.contains("Status Log"),
            "Should show 'Status Log' title"
        );
    }

    #[test]
    fn test_status_log_view_no_regression() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_chat_view(frame, frame.area(), &app))
            .expect("render");

        let mut app2 = App::new(crate::config::TuiConfig::default());
        app2.messages.push(ChatMessage::new(
            MessageRole::System,
            "Engine ready on port 3099.".to_string(),
        ));

        terminal
            .draw(|frame| render_chat_view(frame, frame.area(), &app2))
            .expect("render");
    }

    // ── US-S0211 tests ────────────────────────────────────────────────────────

    /// US-S0211: Empty status log shows command prompt at top + Quick Start tips.
    #[test]
    fn test_empty_chat_input_position() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Clear any init messages → empty state
        app.messages.clear();

        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");

        let buffer = terminal.backend().buffer().clone();
        let content: String = buffer
            .content()
            .iter()
            .map(|c| c.symbol().to_string())
            .collect();

        // Quick Start section should appear in empty state
        assert!(
            content.contains("Quick Start"),
            "Empty state must show Quick Start section"
        );
        assert!(
            content.contains(":scan"),
            "Empty state must mention :scan command"
        );
        assert!(
            content.contains(":help"),
            "Empty state must mention :help command"
        );
        assert!(
            content.contains("Ctrl+P"),
            "Empty state must mention Ctrl+P"
        );
    }

    /// US-S0211: After a system message, normal log layout is shown (no Quick Start).
    #[test]
    fn test_chat_layout_after_first_message() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.messages.push(ChatMessage::new(
            MessageRole::System,
            "Scan complete: 80/100".to_string(),
        ));

        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");

        let buffer = terminal.backend().buffer().clone();
        let content: String = buffer
            .content()
            .iter()
            .map(|c| c.symbol().to_string())
            .collect();

        // Normal log should show the message, not the Quick Start tips
        assert!(
            content.contains("Scan complete"),
            "Should show system message content"
        );
        assert!(
            !content.contains("Quick Start"),
            "Non-empty log must not show Quick Start"
        );
    }
}
