use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::Frame;

use crate::app::App;
use crate::types::Panel;

use super::chat::render_chat;
use super::file_browser::render_file_browser;
use super::score::render_score;
use super::terminal::render_terminal;

pub fn render_dashboard(frame: &mut Frame, app: &App) {
    let area = frame.area();

    // Main horizontal split: content (70%) | sidebar (30%)
    let main_layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
        .split(area);

    let left_area = main_layout[0];
    let right_area = main_layout[1];

    // Left: vertical split based on what's visible
    let left_chunks = if app.terminal_visible {
        Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(50),
                Constraint::Percentage(25),
                Constraint::Percentage(25),
            ])
            .split(left_area)
    } else {
        Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(65), Constraint::Percentage(35)])
            .split(left_area)
    };

    // Chat panel (top left)
    render_chat(frame, left_chunks[0], app, app.active_panel == Panel::Chat);

    // File browser or code viewer (bottom left)
    if app.code_content.is_some() {
        super::code_viewer::render_code_viewer(
            frame,
            left_chunks[1],
            app,
            app.active_panel == Panel::CodeViewer,
        );
    } else {
        render_file_browser(
            frame,
            left_chunks[1],
            app,
            app.active_panel == Panel::FileBrowser,
        );
    }

    // Terminal panel (if visible)
    if app.terminal_visible && left_chunks.len() > 2 {
        render_terminal(
            frame,
            left_chunks[2],
            app,
            app.active_panel == Panel::Terminal,
        );
    }

    // Right sidebar: score panel
    render_score(frame, right_area, app, app.active_panel == Panel::Score);

    // Status bar
    render_status_bar(frame, app);
}

fn render_status_bar(frame: &mut Frame, app: &App) {
    use ratatui::text::{Line, Span};
    use ratatui::widgets::Paragraph;

    let area = frame.area();
    let status_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(1),
        width: area.width,
        height: 1,
    };

    let mode_str = match app.input_mode {
        crate::types::InputMode::Normal => " NORMAL ",
        crate::types::InputMode::Insert => " INSERT ",
        crate::types::InputMode::Command => " COMMAND ",
        crate::types::InputMode::Visual => " VISUAL ",
    };

    let panel_str = match app.active_panel {
        Panel::Chat => "Chat",
        Panel::Score => "Score",
        Panel::FileBrowser => "Files",
        Panel::CodeViewer => "Code",
        Panel::Terminal => "Terminal",
        Panel::DiffPreview => "Diff",
    };

    let hints = " Tab: switch | i: insert | /: command | q: quit";

    let line = Line::from(vec![
        Span::styled(mode_str, crate::theme::status_bar_style()),
        Span::raw(" "),
        Span::styled(panel_str, ratatui::style::Style::default().fg(crate::theme::ACCENT)),
        Span::styled(hints, crate::theme::muted_style()),
    ]);

    frame.render_widget(Paragraph::new(line), status_area);
}

#[cfg(test)]
mod tests {
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::*;

    #[test]
    fn test_dashboard_renders_without_panic() {
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("render");
    }
}
