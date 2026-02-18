use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Gauge, List, ListItem, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Zone;

pub fn render_score(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let block = Block::default()
        .title(" Compliance ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    match &app.last_scan {
        Some(scan) => render_score_details(frame, inner, scan, &app.score_history),
        None => render_no_scan(frame, inner, &app.engine_status),
    }
}

fn render_score_details(
    frame: &mut Frame,
    area: Rect,
    scan: &crate::types::ScanResult,
    history: &[f64],
) {
    let t = theme::theme();

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Score gauge
            Constraint::Length(2), // Stats line
            Constraint::Min(5),   // Category breakdown
            Constraint::Length(3), // Sparkline history
        ])
        .split(area);

    // Score gauge
    let score = scan.score.total_score;
    let zone_color = theme::zone_color(scan.score.zone);
    let zone_icon = match scan.score.zone {
        Zone::Green => "  ",
        Zone::Yellow => "  ",
        Zone::Red => "  ",
    };

    let label = format!("Score: {:.0}/100 {zone_icon}", score);
    let gauge = Gauge::default()
        .gauge_style(Style::default().fg(zone_color))
        .ratio(score / 100.0)
        .label(label);
    frame.render_widget(gauge, chunks[0]);

    // Stats
    let stats = Line::from(vec![
        Span::styled(
            format!("{} passed", scan.score.passed_checks),
            Style::default().fg(t.zone_green),
        ),
        Span::raw(" | "),
        Span::styled(
            format!("{} failed", scan.score.failed_checks),
            Style::default().fg(t.zone_red),
        ),
        Span::raw(" | "),
        Span::styled(
            format!("{} skip", scan.score.skipped_checks),
            theme::muted_style(),
        ),
    ]);
    frame.render_widget(Paragraph::new(stats), chunks[1]);

    // Category breakdown
    let items: Vec<ListItem<'_>> = scan
        .score
        .category_scores
        .iter()
        .map(|cat| {
            let icon = if cat.failed == 0 { "+" } else { "x" };
            let style = if cat.failed == 0 {
                Style::default().fg(t.zone_green)
            } else {
                Style::default().fg(t.zone_red)
            };
            ListItem::new(Line::from(vec![
                Span::styled(format!(" {icon} "), style),
                Span::raw(format!("{}: ", cat.category_name)),
                Span::styled(format!("{:.0}%", cat.score), style),
            ]))
        })
        .collect();

    let categories = List::new(items).block(
        Block::default()
            .title(" Categories ")
            .title_style(theme::muted_style())
            .borders(Borders::TOP),
    );
    frame.render_widget(categories, chunks[2]);

    // Score history sparkline
    if !history.is_empty() {
        let spark_text = history
            .iter()
            .map(|&s| {
                match s as u32 {
                    0..=12 => '_',
                    13..=25 => '.',
                    26..=37 => '-',
                    38..=50 => '~',
                    51..=62 => '=',
                    63..=75 => '#',
                    76..=87 => '%',
                    _ => '@',
                }
            })
            .collect::<String>();

        let spark_line = Line::from(vec![
            Span::styled("History: ", theme::muted_style()),
            Span::styled(
                spark_text,
                Style::default()
                    .fg(t.accent)
                    .add_modifier(Modifier::BOLD),
            ),
        ]);
        frame.render_widget(Paragraph::new(spark_line), chunks[3]);
    }
}

fn render_no_scan(
    frame: &mut Frame,
    area: Rect,
    status: &crate::types::EngineConnectionStatus,
) {
    let msg = match status {
        crate::types::EngineConnectionStatus::Connecting => "Connecting to engine...",
        crate::types::EngineConnectionStatus::Connected => "No scan yet. Type: /scan",
        crate::types::EngineConnectionStatus::Disconnected => "Engine disconnected",
        crate::types::EngineConnectionStatus::Error => "Engine error",
    };

    let paragraph = Paragraph::new(msg).style(theme::muted_style());
    frame.render_widget(paragraph, area);
}

#[cfg(test)]
mod tests {
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::*;

    #[test]
    fn test_score_panel_no_scan() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(40, 20);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_score(frame, frame.area(), &app, false))
            .expect("render");
    }
}
