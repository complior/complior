use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Panel;

use super::panels::{render_activity_log, render_focused_framework_gauge, render_framework_cards, render_info_panel, render_score_gauge};

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
        }
        return;
    }

    // Top row: Compliance Score gauge bar (3 lines, full width)
    // If agents loaded, add 3-line agent strip between score gauge and content
    let has_agents = !app.passport_view.loaded_passports.is_empty();
    let top_split = if has_agents {
        Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(3), Constraint::Length(3), Constraint::Min(8)])
            .split(area)
    } else {
        Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(3), Constraint::Min(8)])
            .split(area)
    };

    if let Some(ref fs) = app.framework_scores {
        if fs.frameworks.len() > 1 {
            if let Some(idx) = app.focused_framework {
                if let Some(fw) = fs.frameworks.get(idx) {
                    render_focused_framework_gauge(frame, top_split[0], fw);
                } else {
                    render_framework_cards(frame, top_split[0], app);
                }
            } else {
                render_framework_cards(frame, top_split[0], app);
            }
        } else {
            render_score_gauge(frame, top_split[0], app);
        }
    } else {
        render_score_gauge(frame, top_split[0], app);
    }

    if has_agents {
        render_agent_strip(frame, top_split[1], app);
    }

    // Two-column: Left 60% | Right 40%
    let content_area = if has_agents { top_split[2] } else { top_split[1] };
    let h_split = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(60), Constraint::Percentage(40)])
        .split(content_area);

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

/// Agent strip widget — shows all discovered agents with their autonomy level and score.
fn render_agent_strip(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let count = app.passport_view.loaded_passports.len();

    let block = Block::default()
        .title(format!(" Agents ({count}) "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut spans: Vec<Span> = Vec::new();
    for (i, passport) in app.passport_view.loaded_passports.iter().enumerate() {
        let name = passport.get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let autonomy = passport.get("autonomy_level")
            .and_then(|v| v.as_str())
            .unwrap_or("?");
        let score = passport.get("compliance")
            .and_then(|c| c.get("complior_score"))
            .and_then(|s| s.as_f64())
            .unwrap_or(0.0);

        let score_color = crate::views::score_zone_color(score, &t);

        if i > 0 {
            spans.push(Span::styled("  \u{2022}  ", Style::default().fg(t.muted)));
        }
        spans.push(Span::styled(
            format!("{name} {autonomy} "),
            Style::default().fg(t.fg),
        ));
        spans.push(Span::styled(
            format!("{score:.0}"),
            Style::default().fg(score_color),
        ));
    }

    frame.render_widget(Paragraph::new(Line::from(spans)), inner);
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
    let color = crate::views::score_zone_color(last_score, &t);

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
