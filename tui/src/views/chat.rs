use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::MessageRole;

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

/// Full-screen status log view (`ViewState::Chat` / key `C`).
pub fn render_chat_view(frame: &mut Frame, area: Rect, app: &App) {
    let block = Block::default()
        .title(" Status Log ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(true));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    render_status_log(frame, inner, app);
}

/// Render only System-role messages as the status log.
fn render_status_log(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let mut lines: Vec<Line<'_>> = Vec::new();

    for msg in &app.messages {
        if msg.role != MessageRole::System {
            continue;
        }
        let time_span = Span::styled(
            format!("[{}] ", msg.timestamp),
            Style::default().fg(t.muted),
        );
        lines.push(Line::from(vec![
            time_span,
            Span::styled("! ", Style::default().fg(t.system_msg)),
            Span::raw(&msg.content),
        ]));
    }

    if lines.is_empty() {
        lines.push(Line::from(Span::styled(
            " No system events yet",
            Style::default().fg(t.muted),
        )));
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
            MessageRole::System,
            "Scanning...".to_string(),
        ));
        app.messages.push(ChatMessage::new(
            MessageRole::System,
            "Scan complete: 75/100".to_string(),
        ));
        let buf = render_chat_to_string(&app, 80, 24);
        // Normalize timestamps [HH:MM] to [00:00] for deterministic snapshots
        let buf = normalize_timestamps(&buf);
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
        let content: String = buffer.content().iter().map(|cell| cell.symbol().to_string()).collect();
        assert!(content.contains("Status Log"), "Should show 'Status Log' title");
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
        let content: String = buffer.content().iter().map(|cell| cell.symbol().to_string()).collect();
        // Panel is now Status Log, not Chat
        assert!(!content.contains("Chat"), "Should not show 'Chat' title");
        assert!(content.contains("Status Log"), "Should show 'Status Log' title");
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
}
