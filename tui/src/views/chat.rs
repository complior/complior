use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::{InputMode, MessageRole};

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
    let mut lines: Vec<Line<'_>> = Vec::new();

    for msg in &app.messages {
        let (prefix, style) = match msg.role {
            MessageRole::User => ("> ", Style::default().fg(theme::USER_MSG)),
            MessageRole::Assistant => ("AI: ", Style::default().fg(theme::ASSISTANT_MSG)),
            MessageRole::System => ("! ", Style::default().fg(theme::SYSTEM_MSG)),
        };

        lines.push(Line::from(vec![
            Span::styled(prefix, style),
            Span::raw(&msg.content),
        ]));
        lines.push(Line::raw(""));
    }

    // Streaming response
    if let Some(streaming) = &app.streaming_response {
        lines.push(Line::from(vec![
            Span::styled("AI: ", Style::default().fg(theme::ASSISTANT_MSG)),
            Span::raw(streaming.as_str()),
            Span::styled("_", Style::default().fg(theme::ACCENT)),
        ]));
    }

    // Auto-scroll to bottom
    let total_lines = lines.len();
    let visible = area.height as usize;
    let scroll = total_lines.saturating_sub(visible);

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));

    frame.render_widget(paragraph, area);
}

fn render_input(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let input_block = Block::default()
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let prefix = match app.input_mode {
        InputMode::Command => "/",
        _ => "> ",
    };

    let input = Paragraph::new(Line::from(vec![
        Span::styled(prefix, Style::default().fg(theme::ACCENT)),
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
        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.messages.push(ChatMessage {
            role: MessageRole::User,
            content: "scan my project".to_string(),
        });
        app.messages.push(ChatMessage {
            role: MessageRole::Assistant,
            content: "Scanning...".to_string(),
        });

        terminal
            .draw(|frame| render_chat(frame, frame.area(), &app, true))
            .expect("render");
    }
}
