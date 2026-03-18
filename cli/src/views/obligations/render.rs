use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

/// Render the Obligations view — two-column list + detail panel.
pub fn render_obligations_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let ov = &app.obligations_view;

    let filtered = ov.filtered_obligations();
    let total = ov.obligations.len();
    let covered = ov.covered_count();
    let coverage_pct = if total > 0 {
        (covered * 100) / total
    } else {
        0
    };

    let critical = ov.critical_path_count();
    let mut title_spans = vec![
        Span::styled(
            " Obligations \u{2014} ",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("{covered}/{total} covered ({coverage_pct}%)  "),
            Style::default().fg(t.fg),
        ),
    ];
    if critical > 0 {
        title_spans.push(Span::styled(
            format!("{critical} critical  "),
            Style::default()
                .fg(t.zone_red)
                .add_modifier(Modifier::BOLD),
        ));
    }
    title_spans.push(Span::styled(
        format!("[{}]", ov.filter.label()),
        Style::default().fg(t.accent),
    ));
    let title = Line::from(title_spans);

    let block = Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.width < 40 || inner.height < 6 {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " Resize terminal for obligations view",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    if filtered.is_empty() {
        let msg = if ov.obligations.is_empty() {
            " No obligations loaded. Press [l] to load."
        } else {
            " No obligations match current filter. Press [f] to change filter."
        };
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                msg,
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    // Two-column: obligation list (55%) | detail panel (45%)
    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
        .split(inner);

    render_obligation_list(frame, cols[0], app, &filtered);
    render_obligation_detail(frame, cols[1], app, &filtered);
}

/// Render the left column — obligation list.
fn render_obligation_list(
    frame: &mut Frame,
    area: Rect,
    app: &App,
    filtered: &[&super::ObligationItem],
) {
    let t = theme::theme();
    let ov = &app.obligations_view;
    let mut lines: Vec<Line<'_>> = Vec::new();

    for (i, obl) in filtered.iter().enumerate() {
        let is_selected = i == ov.selected_index;
        let prefix = if is_selected { ">" } else { " " };

        let (icon, icon_color) = if obl.covered {
            ("\u{2713}", t.zone_green)
        } else {
            ("\u{2717}", t.zone_red)
        };

        let severity_color = match obl.severity.as_str() {
            "critical" => t.zone_red,
            "medium" => t.zone_yellow,
            _ => t.muted,
        };

        let is_critical = obl.is_critical_path();
        let name_style = if is_critical {
            Style::default()
                .fg(t.zone_red)
                .add_modifier(Modifier::BOLD)
        } else if is_selected {
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        // Deadline indicator
        let deadline_indicator = if let Some(ref dl) = obl.deadline {
            if !obl.covered {
                format!(" [{dl}]")
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        let title_w = area.width.saturating_sub(22) as usize;
        let truncated_title = crate::views::truncate_str(&obl.title, title_w);

        lines.push(Line::from(vec![
            Span::styled(
                format!("{prefix} "),
                Style::default().fg(if is_selected { t.accent } else { t.fg }),
            ),
            Span::styled(format!("{icon} "), Style::default().fg(icon_color)),
            Span::styled(
                format!("{:<8} ", obl.id),
                Style::default().fg(severity_color),
            ),
            Span::styled(truncated_title, name_style),
            Span::styled(deadline_indicator, Style::default().fg(t.zone_red)),
        ]));
    }

    let scroll = ov.scroll_offset;
    let paragraph =
        Paragraph::new(lines).scroll((u16::try_from(scroll).unwrap_or(0), 0));
    frame.render_widget(paragraph, area);
}

/// Render the right column — detail panel for selected obligation.
fn render_obligation_detail(
    frame: &mut Frame,
    area: Rect,
    app: &App,
    filtered: &[&super::ObligationItem],
) {
    let t = theme::theme();
    let ov = &app.obligations_view;

    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(obl) = filtered.get(ov.selected_index) else {
        return;
    };

    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // Header
    lines.push(Line::from(Span::styled(
        format!("  {} — {}", obl.id, obl.article),
        Style::default()
            .fg(t.accent)
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::raw(""));

    // Title
    lines.push(Line::from(Span::styled(
        format!("  {}", obl.title),
        Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::raw(""));

    // Status
    let (status_icon, status_color, status_text) = if obl.covered {
        ("\u{2713}", t.zone_green, "Covered")
    } else {
        ("\u{2717}", t.zone_red, "Not covered")
    };
    lines.push(Line::from(vec![
        Span::styled("  Status: ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{status_icon} {status_text}"),
            Style::default().fg(status_color),
        ),
    ]));

    // Severity
    let sev_color = match obl.severity.as_str() {
        "critical" => t.zone_red,
        "medium" => t.zone_yellow,
        _ => t.muted,
    };
    lines.push(Line::from(vec![
        Span::styled("  Severity: ", Style::default().fg(t.muted)),
        Span::styled(&obl.severity, Style::default().fg(sev_color)),
    ]));

    // Role
    lines.push(Line::from(vec![
        Span::styled("  Applies to: ", Style::default().fg(t.muted)),
        Span::styled(&obl.role, Style::default().fg(t.fg)),
    ]));

    // Type
    if !obl.obligation_type.is_empty() {
        lines.push(Line::from(vec![
            Span::styled("  Type: ", Style::default().fg(t.muted)),
            Span::styled(&obl.obligation_type, Style::default().fg(t.fg)),
        ]));
    }

    // Deadline
    if let Some(ref dl) = obl.deadline {
        let dl_color = if obl.covered { t.muted } else { t.zone_red };
        lines.push(Line::from(vec![
            Span::styled("  Deadline: ", Style::default().fg(t.muted)),
            Span::styled(dl.as_str(), Style::default().fg(dl_color)),
        ]));
    }

    // Linked checks / features
    if !obl.linked_checks.is_empty() {
        lines.push(Line::raw(""));
        lines.push(Line::from(Span::styled(
            "  Linked Features:",
            Style::default().fg(t.muted),
        )));
        for check_id in &obl.linked_checks {
            let display = format_check_name(check_id);
            lines.push(Line::from(vec![
                Span::styled("    \u{2022} ", Style::default().fg(t.accent)),
                Span::styled(display, Style::default().fg(t.fg)),
            ]));
        }
    }

    lines.push(Line::raw(""));

    // Description
    if !obl.description.is_empty() {
        lines.push(Line::from(Span::styled(
            "  Description:",
            Style::default().fg(t.muted),
        )));
        let desc_w = w.saturating_sub(2);
        for wrapped in crate::views::wrap_text_lines(&obl.description, desc_w) {
            lines.push(Line::from(Span::styled(
                format!("  {wrapped}"),
                Style::default().fg(t.fg),
            )));
        }
    }

    lines.push(Line::raw(""));

    // Action hints
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  [f] ", Style::default().fg(t.accent)),
        Span::styled("Filter  ", Style::default().fg(t.fg)),
        Span::styled("[l] ", Style::default().fg(t.accent)),
        Span::styled("Reload  ", Style::default().fg(t.fg)),
        Span::styled("j/k ", Style::default().fg(t.accent)),
        Span::styled("Navigate", Style::default().fg(t.fg)),
    ]));

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Format a scanner checkId into a human-readable name.
fn format_check_name(check_id: &str) -> String {
    let (tag, name) = crate::types::strip_layer_prefix(check_id);
    let layer = if tag.is_empty() { "L1" } else { tag };
    format!("{}: {}", layer.to_uppercase(), crate::types::humanize_kebab(name))
}
