use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Zone;

pub fn render_sidebar(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Info ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Divide sidebar into sections
    let has_scan = app.last_scan.is_some();
    let constraints = if has_scan {
        vec![
            Constraint::Length(5),  // Project
            Constraint::Length(6),  // Scan Summary
            Constraint::Min(3),    // Quick Actions
        ]
    } else {
        vec![
            Constraint::Length(5), // Project
            Constraint::Min(3),   // Quick Actions
        ]
    };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints(constraints)
        .split(inner);

    // --- Project section ---
    render_project_section(frame, chunks[0], app, &t);

    if has_scan {
        render_scan_summary(frame, chunks[1], app, &t);
        render_quick_actions(frame, chunks[2], &t);
    } else {
        render_quick_actions(frame, chunks[1], &t);
    }
}

fn render_project_section(frame: &mut Frame, area: Rect, app: &App, t: &theme::ThemeColors) {
    let project_name = app
        .project_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "project".to_string());

    let mut lines = vec![
        Line::from(Span::styled(
            format!(" {project_name}/"),
            Style::default()
                .fg(t.fg)
                .add_modifier(Modifier::BOLD),
        )),
    ];

    // Show score if available
    if let Some(scan) = &app.last_scan {
        let zone_emoji = match scan.score.zone {
            Zone::Green => "🟢",
            Zone::Yellow => "🟡",
            Zone::Red => "🔴",
        };
        lines.push(Line::from(vec![
            Span::raw(" Score: "),
            Span::styled(
                format!("{:.0}/100", scan.score.total_score),
                Style::default().fg(theme::zone_color(scan.score.zone)),
            ),
            Span::raw(format!(" {zone_emoji}")),
        ]));
        lines.push(Line::from(vec![
            Span::styled(
                format!(" {}✓", scan.score.passed_checks),
                Style::default().fg(t.zone_green),
            ),
            Span::raw(" "),
            Span::styled(
                format!("{}✗", scan.score.failed_checks),
                Style::default().fg(t.zone_red),
            ),
            Span::raw(format!(
                " {} files",
                scan.files_scanned
            )),
        ]));
    } else {
        lines.push(Line::from(Span::styled(
            " No scan yet",
            Style::default().fg(t.muted),
        )));
    }

    let p = Paragraph::new(lines);
    frame.render_widget(p, area);
}

fn render_scan_summary(frame: &mut Frame, area: Rect, app: &App, t: &theme::ThemeColors) {
    let Some(scan) = &app.last_scan else {
        return;
    };

    let items: Vec<ListItem<'_>> = scan
        .score
        .category_scores
        .iter()
        .take(area.height as usize)
        .map(|cat| {
            let (icon, color) = if cat.failed == 0 {
                ("✓", t.zone_green)
            } else {
                ("✗", t.zone_red)
            };
            ListItem::new(Line::from(vec![
                Span::styled(format!(" {icon} "), Style::default().fg(color)),
                Span::raw(&cat.category_name),
            ]))
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .title(" Checks ")
            .title_style(Style::default().fg(t.muted))
            .borders(Borders::TOP)
            .border_style(Style::default().fg(t.border)),
    );
    frame.render_widget(list, area);
}

fn render_quick_actions(frame: &mut Frame, area: Rect, t: &theme::ThemeColors) {
    let lines = vec![
        Line::from(vec![
            Span::styled(" /scan  ", Style::default().fg(t.accent)),
            Span::styled("rescan project", Style::default().fg(t.muted)),
        ]),
        Line::from(vec![
            Span::styled(" /help  ", Style::default().fg(t.accent)),
            Span::styled("all commands", Style::default().fg(t.muted)),
        ]),
        Line::from(vec![
            Span::styled(" Ctrl+P ", Style::default().fg(t.accent)),
            Span::styled("command palette", Style::default().fg(t.muted)),
        ]),
    ];

    let p = Paragraph::new(lines).block(
        Block::default()
            .title(" Actions ")
            .title_style(Style::default().fg(t.muted))
            .borders(Borders::TOP)
            .border_style(Style::default().fg(t.border)),
    );
    frame.render_widget(p, area);
}

#[cfg(test)]
mod tests {
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::*;

    #[test]
    fn test_sidebar_renders_without_scan() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(30, 20);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_sidebar(frame, frame.area(), &app))
            .expect("render");
    }
}
