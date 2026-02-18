use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::{Overlay, Panel};

use super::chat::render_chat;
use super::file_browser::render_file_browser;
use super::sidebar::render_sidebar;
use super::terminal::render_terminal;

pub fn render_dashboard(frame: &mut Frame, app: &App) {
    let area = frame.area();

    // Reserve 2 lines at bottom for status bar
    let body_area = Rect {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height.saturating_sub(2),
    };

    // Main horizontal split: content | sidebar (if visible)
    if app.sidebar_visible {
        let main_layout = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Min(40), Constraint::Length(28)])
            .split(body_area);

        render_content(frame, main_layout[0], app);
        render_sidebar(frame, main_layout[1], app);
    } else {
        render_content(frame, body_area, app);
    }

    // 2-line status bar at bottom
    render_status_bar(frame, app);

    // Overlay on top of everything
    render_overlay(frame, app);
}

fn render_content(frame: &mut Frame, area: Rect, app: &App) {
    let show_files = app.files_panel_visible;
    let show_term = app.terminal_visible;

    let left_chunks = match (show_files, show_term) {
        (true, true) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(40),
                Constraint::Percentage(35),
                Constraint::Percentage(25),
            ])
            .split(area),
        (true, false) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
            .split(area),
        (false, true) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
            .split(area),
        (false, false) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(100)])
            .split(area),
    };

    // Chat panel (always visible, takes first chunk)
    render_chat(frame, left_chunks[0], app, app.active_panel == Panel::Chat);

    // Files/Code panel (second chunk, if visible)
    if show_files && left_chunks.len() > 1 {
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
    }

    // Terminal panel
    if show_term {
        let term_idx = if show_files { 2 } else { 1 };
        if term_idx < left_chunks.len() {
            render_terminal(
                frame,
                left_chunks[term_idx],
                app,
                app.active_panel == Panel::Terminal,
            );
        }
    }
}

fn render_status_bar(frame: &mut Frame, app: &App) {
    let t = theme::theme();
    let area = frame.area();

    // Line 1: mode + panel + engine status + elapsed
    let line1_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(2),
        width: area.width,
        height: 1,
    };

    let mode_str = match app.input_mode {
        crate::types::InputMode::Normal => " NORMAL ",
        crate::types::InputMode::Insert => " INSERT ",
        crate::types::InputMode::Command => " CMD ",
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

    let engine_indicator = match app.engine_status {
        crate::types::EngineConnectionStatus::Connected => {
            Span::styled(" ● ", Style::default().fg(t.zone_green))
        }
        crate::types::EngineConnectionStatus::Connecting => {
            Span::styled(" ○ ", Style::default().fg(t.zone_yellow))
        }
        _ => Span::styled(" ✗ ", Style::default().fg(t.zone_red)),
    };

    let mut spans = vec![
        Span::styled(mode_str, theme::status_bar_style()),
        Span::raw(" "),
        Span::styled(panel_str, Style::default().fg(t.accent)),
        Span::raw("  "),
        engine_indicator,
    ];

    // Show elapsed time if operation in progress
    if let Some(secs) = app.elapsed_secs() {
        spans.push(Span::styled(
            format!(" {secs}s "),
            Style::default().fg(t.muted),
        ));
        spans.push(Span::styled(
            app.spinner.frame(),
            Style::default().fg(t.accent),
        ));
    }

    // Active model indicator
    if crate::providers::is_configured(&app.provider_config) {
        let model_name = crate::providers::display_model_name(&app.provider_config.active_model);
        spans.push(Span::styled(
            format!(" [{model_name}] "),
            Style::default().fg(t.accent),
        ));
    }

    // Token usage
    if let Some((prompt, completion)) = app.last_token_usage {
        spans.push(Span::styled(
            format!(" [{} tok]", prompt + completion),
            Style::default().fg(t.muted),
        ));
    }

    frame.render_widget(Paragraph::new(Line::from(spans)), line1_area);

    // Line 2: hints
    let line2_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(1),
        width: area.width,
        height: 1,
    };

    let hints = Line::from(vec![
        Span::styled(" Tab", Style::default().fg(t.accent)),
        Span::styled(":panel ", Style::default().fg(t.muted)),
        Span::styled("i", Style::default().fg(t.accent)),
        Span::styled(":ins ", Style::default().fg(t.muted)),
        Span::styled("/", Style::default().fg(t.accent)),
        Span::styled(":cmd ", Style::default().fg(t.muted)),
        Span::styled("^P", Style::default().fg(t.accent)),
        Span::styled(":palette ", Style::default().fg(t.muted)),
        Span::styled("^B", Style::default().fg(t.accent)),
        Span::styled(":sidebar ", Style::default().fg(t.muted)),
        Span::styled("^F", Style::default().fg(t.accent)),
        Span::styled(":files ", Style::default().fg(t.muted)),
        Span::styled("^T", Style::default().fg(t.accent)),
        Span::styled(":term ", Style::default().fg(t.muted)),
        Span::styled("^M", Style::default().fg(t.accent)),
        Span::styled(":model ", Style::default().fg(t.muted)),
        Span::styled("?", Style::default().fg(t.accent)),
        Span::styled(":help", Style::default().fg(t.muted)),
    ]);

    frame.render_widget(Paragraph::new(hints), line2_area);
}

fn render_overlay(frame: &mut Frame, app: &App) {
    match &app.overlay {
        Overlay::None => {}
        Overlay::CommandPalette => {
            crate::components::command_palette::render_command_palette(
                frame,
                &app.overlay_filter,
            );
        }
        Overlay::FilePicker => {
            crate::components::file_picker::render_file_picker(
                frame,
                &app.overlay_filter,
                &app.file_tree,
            );
        }
        Overlay::Help => render_help_overlay(frame),
        Overlay::GettingStarted => render_getting_started_overlay(frame),
        Overlay::ProviderSetup => {
            crate::components::provider_setup::render_provider_setup(frame, app);
        }
        Overlay::ModelSelector => {
            crate::components::model_selector::render_model_selector(frame, app);
        }
    }
}

fn render_help_overlay(frame: &mut Frame) {
    use ratatui::widgets::{Block, Borders, Clear};

    let t = theme::theme();
    let area = centered_rect(60, 70, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Keyboard Shortcuts ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::from(Span::styled(
            " General",
            Style::default()
                .fg(t.accent)
                .add_modifier(ratatui::style::Modifier::BOLD),
        )),
        shortcut_line("  Ctrl+C", "Quit", &t),
        shortcut_line("  Tab", "Next panel", &t),
        shortcut_line("  Alt+1..5", "Jump to panel", &t),
        shortcut_line("  i", "Insert mode", &t),
        shortcut_line("  Esc", "Normal mode", &t),
        shortcut_line("  /", "Command mode", &t),
        Line::raw(""),
        Line::from(Span::styled(
            " Navigation",
            Style::default()
                .fg(t.accent)
                .add_modifier(ratatui::style::Modifier::BOLD),
        )),
        shortcut_line("  j/k", "Scroll up/down", &t),
        shortcut_line("  Ctrl+D/U", "Half-page down/up", &t),
        shortcut_line("  g/G", "Top/bottom", &t),
        shortcut_line("  Up/Down", "History (insert mode)", &t),
        Line::raw(""),
        Line::from(Span::styled(
            " Features",
            Style::default()
                .fg(t.accent)
                .add_modifier(ratatui::style::Modifier::BOLD),
        )),
        shortcut_line("  Ctrl+P", "Command palette", &t),
        shortcut_line("  Ctrl+B", "Toggle sidebar", &t),
        shortcut_line("  Ctrl+T", "Toggle terminal", &t),
        shortcut_line("  @", "File picker", &t),
        shortcut_line("  !cmd", "Run shell command", &t),
        shortcut_line("  V", "Visual select", &t),
        shortcut_line("  Ctrl+K", "Send selection to AI", &t),
        shortcut_line("  Ctrl+M", "Switch model", &t),
        Line::raw(""),
        Line::from(Span::styled(
            " Press Esc to close",
            Style::default().fg(t.muted),
        )),
    ];

    let paragraph = Paragraph::new(lines);
    frame.render_widget(paragraph, inner);
}

fn render_getting_started_overlay(frame: &mut Frame) {
    use ratatui::widgets::{Block, Borders, Clear};

    let t = theme::theme();
    let area = centered_rect(50, 50, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Welcome to Complior ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            "  Getting Started",
            Style::default()
                .fg(t.accent)
                .add_modifier(ratatui::style::Modifier::BOLD),
        )),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  1. ", Style::default().fg(t.accent)),
            Span::raw("Type /scan to scan your project"),
        ]),
        Line::from(vec![
            Span::styled("  2. ", Style::default().fg(t.accent)),
            Span::raw("Ask AI about compliance issues"),
        ]),
        Line::from(vec![
            Span::styled("  3. ", Style::default().fg(t.accent)),
            Span::raw("Use Tab to switch panels"),
        ]),
        Line::from(vec![
            Span::styled("  4. ", Style::default().fg(t.accent)),
            Span::raw("Press ? for all keyboard shortcuts"),
        ]),
        Line::raw(""),
        Line::from(Span::styled(
            "  Press any key to start",
            Style::default().fg(t.muted),
        )),
    ];

    let paragraph = Paragraph::new(lines);
    frame.render_widget(paragraph, inner);
}

fn shortcut_line<'a>(key: &'a str, desc: &'a str, t: &theme::ThemeColors) -> Line<'a> {
    Line::from(vec![
        Span::styled(
            format!("{key:<16}"),
            Style::default().fg(t.accent),
        ),
        Span::styled(desc, Style::default().fg(t.fg)),
    ])
}

fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
    let v = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(area);
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(v[1])[1]
}

#[cfg(test)]
mod tests {
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::*;

    #[test]
    fn test_dashboard_renders_without_panic() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("render");
    }
}
