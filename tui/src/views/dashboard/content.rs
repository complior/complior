use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Panel;

use super::panels::{render_activity_log, render_info_panel, render_score_gauge};

/// Dashboard content area -- two-column layout.
///
/// ```text
/// +-- Status Log ----------------+-- Info --------------------+
/// | [20:01] S Scan: 67/100       | Score: 67/100              |
/// | [20:02] S 500 files, 45 chks | 32v 13x 500 files          |
/// | [20:03] W File changed       | EU AI Act Deadlines ------- |
/// |                              | Quick Actions ------------- |
/// +-- Score History -------------| Sync ---------------------- |
/// | ...                          |                            |
/// +------------------------------+----------------------------+
/// ```
pub(super) fn render_dashboard_content(frame: &mut Frame, area: Rect, app: &App) {
    use crate::components::zoom::ZoomedWidget;

    // T702: If a widget is zoomed, render it full-screen
    if let Some(zoomed) = app.zoom.zoomed {
        match zoomed {
            ZoomedWidget::ScoreGauge => render_score_gauge(frame, area, app),
            ZoomedWidget::DeadlineCountdown => {
                super::panels::render_deadline_countdown(frame, area);
            }
            ZoomedWidget::ActivityLog => render_activity_log(frame, area, app),
            ZoomedWidget::ScoreSparkline => render_score_history_line(frame, area, app),
            ZoomedWidget::FindingsList => render_activity_log(frame, area, app),
        }
        return;
    }

    // Top row: Compliance Score gauge bar (3 lines, full width)
    let top_split = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(8)])
        .split(area);

    render_score_gauge(frame, top_split[0], app);

    // Two-column: Left 60% | Right 40%
    let h_split = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(60), Constraint::Percentage(40)])
        .split(top_split[1]);

    // Left column: Status Log (top 70%) + Score History sparkline (bottom 30%)
    let left_col = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
        .split(h_split[0]);

    super::super::chat::render_chat(frame, left_col[0], app, app.active_panel == Panel::Chat);
    render_score_history_line(frame, left_col[1], app);

    // Right column: Info panel (stacked sections)
    render_info_panel(frame, h_split[1], app);
}

/// Original content panels layout (no scan data).
#[allow(dead_code)]
pub(super) fn render_content_panels(frame: &mut Frame, area: Rect, app: &App) {
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

    super::super::chat::render_chat(
        frame,
        left_chunks[0],
        app,
        app.active_panel == Panel::Chat,
    );

    if show_files && left_chunks.len() > 1 {
        if app.code_content.is_some() {
            super::super::code_viewer::render_code_viewer(
                frame,
                left_chunks[1],
                app,
                app.active_panel == Panel::CodeViewer,
            );
        } else {
            super::super::file_browser::render_file_browser(
                frame,
                left_chunks[1],
                app,
                app.active_panel == Panel::FileBrowser,
            );
        }
    }

    if show_term {
        let term_idx = if show_files { 2 } else { 1 };
        if term_idx < left_chunks.len() {
            super::super::terminal::render_terminal(
                frame,
                left_chunks[term_idx],
                app,
                app.active_panel == Panel::Terminal,
            );
        }
    }
}

/// Score history text sparkline.
pub(super) fn render_score_history_line(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Score History ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if app.score_history.is_empty() {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " No history yet \u{2014} run /scan",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    // Text sparkline using block characters
    let sparkline_chars = ['\u{2581}', '\u{2582}', '\u{2583}', '\u{2584}', '\u{2585}', '\u{2586}', '\u{2587}', '\u{2588}'];
    let sparkline: String = app
        .score_history
        .iter()
        .map(|&score| {
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            let idx = ((score / 100.0) * 7.0).clamp(0.0, 7.0) as usize;
            sparkline_chars[idx]
        })
        .collect();

    let last_score = app.score_history.last().copied().unwrap_or(0.0);
    let color = if last_score < 50.0 {
        t.zone_red
    } else if last_score < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };

    let lines = vec![
        Line::from(Span::styled(
            format!(" {sparkline}"),
            Style::default().fg(color),
        )),
        Line::from(Span::styled(
            format!(
                " Latest: {last_score:.0}/100  ({} scans)",
                app.score_history.len()
            ),
            Style::default().fg(t.muted),
        )),
    ];

    frame.render_widget(Paragraph::new(lines), inner);
}
