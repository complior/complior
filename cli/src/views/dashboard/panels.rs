use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

use super::utils::{
    current_epoch_days, deadline_label, derive_categories_from_findings, parse_epoch_days,
    score_zone_info,
};

/// Right-side info panel with project info, deadlines, quick actions, and sync status.
pub(super) fn render_info_panel(frame: &mut Frame, area: Rect, app: &App) {
    use ratatui::layout::{Constraint, Direction, Layout};

    let t = theme::theme();

    // Split into 5 sections: Score/Info | By Category | Deadlines | Quick Fix | Metrics
    let sections = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(6),   // Score + summary
            Constraint::Length(8),   // By Category breakdown
            Constraint::Length(7),   // Deadlines
            Constraint::Length(7),   // Quick Fix
            Constraint::Min(3),     // Metrics (Cost/Debt/Readiness)
        ])
        .split(area);

    // -- Section 1: Project Info + Score --
    {
        let block = Block::default()
            .title(" Info ")
            .title_style(theme::title_style())
            .borders(Borders::ALL)
            .border_style(Style::default().fg(t.border));
        let inner = block.inner(sections[0]);
        frame.render_widget(block, sections[0]);

        let (score, passed, failed, files) = if let Some(scan) = &app.last_scan {
            (
                scan.score.total_score,
                scan.score.passed_checks,
                scan.score.failed_checks,
                scan.files_scanned,
            )
        } else {
            (0.0, 0u32, 0u32, 0u32)
        };

        let lines = if app.last_scan.is_some() {
            let (color, zone_label) = score_zone_info(score, &t);
            vec![
                Line::from(vec![
                    Span::styled(
                        format!(" Score: {score:.0}/100 "),
                        Style::default().fg(color).add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(zone_label, Style::default().fg(color)),
                ]),
                Line::from(vec![
                    Span::styled(format!(" {passed}"), Style::default().fg(t.zone_green)),
                    Span::styled("\u{2713} ", Style::default().fg(t.zone_green)),
                    Span::styled(format!("{failed}"), Style::default().fg(t.zone_red)),
                    Span::styled("\u{2717} ", Style::default().fg(t.zone_red)),
                    Span::styled(format!("{files} files"), Style::default().fg(t.muted)),
                ]),
            ]
        } else {
            vec![
                Line::from(Span::styled(
                    " --/100",
                    Style::default().fg(t.muted),
                )),
                Line::from(Span::styled(
                    " Run /scan to check compliance",
                    Style::default().fg(t.muted),
                )),
            ]
        };
        frame.render_widget(Paragraph::new(lines), inner);
    }

    // -- Section 2: By Category --
    {
        let block = Block::default()
            .title(" By Category ")
            .title_style(theme::title_style())
            .borders(Borders::ALL)
            .border_style(Style::default().fg(t.border));
        let inner = block.inner(sections[1]);
        frame.render_widget(block, sections[1]);

        if let Some(scan) = &app.last_scan {
            // Use category_scores from engine if available
            if !scan.score.category_scores.is_empty() {
                let cat_lines: Vec<Line<'_>> = scan.score.category_scores.iter()
                    .take(inner.height as usize)
                    .map(|cat| {
                        let failed = cat.obligation_count.saturating_sub(cat.passed_count);
                        let (icon, icon_color) = if failed > 0 {
                            ("\u{2717}", t.zone_red)
                        } else {
                            ("\u{2713}", t.zone_green)
                        };
                        let w = inner.width.saturating_sub(4) as usize;
                        let name = if cat.category.len() > w.saturating_sub(10) {
                            format!("{:.w$}", cat.category, w = w.saturating_sub(10))
                        } else {
                            cat.category.clone()
                        };
                        Line::from(vec![
                            Span::styled(format!(" {icon} "), Style::default().fg(icon_color)),
                            Span::styled(
                                format!("{:<w$}", name, w = w.saturating_sub(6)),
                                Style::default().fg(t.fg),
                            ),
                            Span::styled(
                                format!("{failed:>2}"),
                                Style::default().fg(if failed > 0 { t.zone_red } else { t.muted }),
                            ),
                        ])
                    })
                    .collect();
                frame.render_widget(Paragraph::new(cat_lines), inner);
            } else {
                // Derive categories from findings
                let cats = derive_categories_from_findings(&scan.findings);
                let cat_lines: Vec<Line<'_>> = cats.iter()
                    .take(inner.height as usize)
                    .map(|(name, count)| {
                        let (icon, icon_color) = if *count > 0 {
                            ("\u{2717}", t.zone_red)
                        } else {
                            ("\u{2713}", t.zone_green)
                        };
                        Line::from(vec![
                            Span::styled(format!(" {icon} "), Style::default().fg(icon_color)),
                            Span::styled(
                                format!("{:<14}", name),
                                Style::default().fg(t.fg),
                            ),
                            Span::styled(
                                format!("{count:>2}"),
                                Style::default().fg(if *count > 0 { t.zone_red } else { t.muted }),
                            ),
                        ])
                    })
                    .collect();
                frame.render_widget(Paragraph::new(cat_lines), inner);
            }
        } else {
            frame.render_widget(
                Paragraph::new(Line::from(Span::styled(
                    " Run /scan to see categories",
                    Style::default().fg(t.muted),
                ))),
                inner,
            );
        }
    }

    // -- Section 3: Deadlines --
    render_deadline_countdown(frame, sections[2]);

    // -- Section 4: Quick Fix --
    {
        // Compute top 3 quick wins from fixable findings
        let (quick_wins, total_impact, fix_count) = if let Some(scan) = &app.last_scan {
            let mut fixable: Vec<_> = scan.findings.iter()
                .filter(|f| f.fix.is_some())
                .collect();
            fixable.sort_by(|a, b| b.predicted_impact().cmp(&a.predicted_impact()));
            let top3: Vec<_> = fixable.iter().take(3).collect();
            let total: i32 = top3.iter().map(|f| f.predicted_impact()).sum();
            (top3.iter().map(|f| (f.message.clone(), f.predicted_impact())).collect::<Vec<_>>(),
             total, fixable.len())
        } else {
            (Vec::new(), 0, 0)
        };

        let title = if total_impact > 0 {
            format!(" Quick Fix (+{total_impact} pts) ")
        } else {
            " Quick Fix ".to_string()
        };

        let block = Block::default()
            .title(title)
            .title_style(theme::title_style())
            .borders(Borders::ALL)
            .border_style(Style::default().fg(t.border));
        let inner = block.inner(sections[3]);
        frame.render_widget(block, sections[3]);

        let mut lines: Vec<Line<'_>> = Vec::new();

        if quick_wins.is_empty() {
            lines.push(Line::from(Span::styled(
                " Run /scan to find fixable items",
                Style::default().fg(t.muted),
            )));
        } else {
            let w = inner.width.saturating_sub(2) as usize;
            lines.push(Line::from(Span::styled(
                format!(" Top {} quick wins:", quick_wins.len().min(3)),
                Style::default().fg(t.fg),
            )));

            for (i, (msg, impact)) in quick_wins.iter().enumerate() {
                let short_msg = crate::views::truncate_str(msg, w.saturating_sub(12));
                lines.push(Line::from(vec![
                    Span::styled(
                        format!(" {}. ", i + 1),
                        Style::default().fg(t.accent),
                    ),
                    Span::styled(short_msg, Style::default().fg(t.fg)),
                    Span::styled(
                        format!(" +{impact}"),
                        Style::default().fg(t.zone_green),
                    ),
                ]));
            }

            lines.push(Line::raw(""));
            lines.push(Line::from(vec![
                Span::styled(" [F] ", Style::default().fg(t.accent).add_modifier(Modifier::BOLD)),
                Span::styled(
                    format!("Apply all ({fix_count} fixes)"),
                    Style::default().fg(t.fg),
                ),
            ]));
        }

        lines.push(Line::from(vec![
            Span::styled(" [S] ", Style::default().fg(t.accent).add_modifier(Modifier::BOLD)),
            Span::styled("Rescan project", Style::default().fg(t.fg)),
        ]));

        frame.render_widget(Paragraph::new(lines), inner);
    }

    // -- Section 5: Dashboard Metrics (Cost / Debt / Readiness) --
    render_metrics_panel(frame, sections[4], app);
}

/// Dashboard metrics panel: Cost, Debt, and Readiness at a glance.
fn render_metrics_panel(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Metrics ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let has_any = app.cost_estimate.is_some()
        || app.debt_score.is_some()
        || app.readiness_score.is_some();

    if !has_any {
        let placeholder = if app.last_scan.is_some() {
            " Loading metrics..."
        } else {
            " Run /scan first"
        };
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                placeholder,
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    let mut lines: Vec<Line<'_>> = Vec::new();

    // Cost row
    if let Some(cost) = &app.cost_estimate {
        lines.push(Line::from(vec![
            Span::styled(" Cost: ", Style::default().fg(t.accent).add_modifier(Modifier::BOLD)),
            Span::styled(
                format!("\u{20ac}{:.0} remediation", cost.total_cost),
                Style::default().fg(t.fg),
            ),
        ]));
        lines.push(Line::from(vec![
            Span::styled("       ", Style::default()),
            Span::styled(
                format!("\u{20ac}{:.0} penalty risk", cost.potential_fine),
                Style::default().fg(t.muted),
            ),
            Span::styled(
                format!("  ROI {:.0}x", cost.roi),
                Style::default().fg(t.zone_green),
            ),
        ]));
    }

    // Debt row
    if let Some(debt) = &app.debt_score {
        let debt_color = debt_level_color(debt.total_debt, &t);
        let level_upper = debt.level.to_uppercase();
        lines.push(Line::from(vec![
            Span::styled(" Debt: ", Style::default().fg(t.accent).add_modifier(Modifier::BOLD)),
            Span::styled(
                format!("{:.1} pts", debt.total_debt),
                Style::default().fg(debt_color),
            ),
            Span::styled(
                format!(" \u{25cf} {level_upper}"),
                Style::default().fg(debt_color).add_modifier(Modifier::BOLD),
            ),
        ]));
    }

    // Readiness row
    if let Some(ready) = &app.readiness_score {
        let ready_color = readiness_level_color(ready.overall_score, &t);
        let level_display = ready.readiness_level.replace('_', " ");
        lines.push(Line::from(vec![
            Span::styled(" Ready: ", Style::default().fg(t.accent).add_modifier(Modifier::BOLD)),
            Span::styled(
                format!("{:.0}%", ready.overall_score),
                Style::default().fg(ready_color).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(" \u{25cf} {level_display}"),
                Style::default().fg(ready_color),
            ),
        ]));
        let gap_count = ready.gaps.len();
        if gap_count > 0 {
            lines.push(Line::from(vec![
                Span::styled("        ", Style::default()),
                Span::styled(
                    format!("{gap_count} gaps remaining"),
                    Style::default().fg(t.muted),
                ),
            ]));
        }
    }

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Color for debt level: green <20, yellow 20-50, red >50.
pub(super) fn debt_level_color(debt: f64, t: &theme::ThemeColors) -> ratatui::style::Color {
    if debt < 20.0 {
        t.zone_green
    } else if debt <= 50.0 {
        t.zone_yellow
    } else {
        t.zone_red
    }
}

/// Color for readiness level: green >=90, yellow >=40, red <40.
pub(super) fn readiness_level_color(score: f64, t: &theme::ThemeColors) -> ratatui::style::Color {
    if score >= 90.0 {
        t.zone_green
    } else if score >= 40.0 {
        t.zone_yellow
    } else {
        t.zone_red
    }
}

/// Score gauge widget -- colored by threshold, with zone label + animation support.
pub(super) fn render_score_gauge(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let real_score = app.last_scan.as_ref().map(|s| s.score.total_score);

    // T08: Use animated counter value if available
    let display_score = app
        .animation
        .counter_value()
        .map(|v| v as f64)
        .or(real_score)
        .unwrap_or(0.0);

    let gauge = if real_score.is_some() {
        let (color, zone_label) = score_zone_info(display_score, &t);
        let ratio = (display_score / 100.0).clamp(0.0, 1.0);
        ratatui::widgets::Gauge::default()
            .block(
                Block::default()
                    .title(" Compliance Score ")
                    .title_style(theme::title_style())
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(t.border)),
            )
            .gauge_style(Style::default().fg(color))
            .ratio(ratio)
            .label(format!("{display_score:.0}/100 \u{2014} {zone_label}"))
    } else {
        ratatui::widgets::Gauge::default()
            .block(
                Block::default()
                    .title(" Compliance Score ")
                    .title_style(theme::title_style())
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(t.border)),
            )
            .gauge_style(Style::default().fg(t.muted))
            .ratio(0.0)
            .label("No scan yet \u{2014} run /scan")
    };

    frame.render_widget(gauge, area);
}

/// Deadline countdown widget -- computes days from now, colors by urgency.
pub(super) fn render_deadline_countdown(frame: &mut Frame, area: Rect) {
    let t = theme::theme();

    let block = Block::default()
        .title(" EU AI Act Deadlines ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let deadlines = [
        ("2025-02-02", "Art. 5 \u{2014} Prohibited AI practices"),
        ("2025-08-02", "Art. 50 \u{2014} Transparency obligations"),
        ("2026-08-02", "Art. 6 \u{2014} High-risk AI classification"),
    ];

    let now = current_epoch_days();

    let lines: Vec<Line<'_>> = deadlines
        .iter()
        .map(|(date_str, desc)| {
            let deadline_days = parse_epoch_days(date_str);
            let diff = deadline_days - now;
            let (label, color) = deadline_label(diff, &t);
            Line::from(vec![
                Span::styled(format!(" {label:<14}"), Style::default().fg(color)),
                Span::styled(*desc, Style::default().fg(t.fg)),
            ])
        })
        .collect();

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Activity log widget -- last 10 items.
pub(super) fn render_activity_log(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Activity Log ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if app.activity_log.is_empty() {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " No activity yet",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    let lines: Vec<Line<'_>> = app
        .activity_log
        .iter()
        .rev()
        .take(inner.height as usize)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|entry| {
            let icon_color = match entry.kind {
                crate::types::ActivityKind::Scan => t.zone_green,
                crate::types::ActivityKind::Fix => t.zone_yellow,
                crate::types::ActivityKind::Watch => t.zone_yellow,
            };
            Line::from(vec![
                Span::styled(
                    format!(" [{}] ", entry.timestamp),
                    Style::default().fg(t.muted),
                ),
                Span::styled(
                    format!("{} ", entry.kind.icon()),
                    Style::default().fg(icon_color).add_modifier(Modifier::BOLD),
                ),
                Span::styled(&*entry.detail, Style::default().fg(t.fg)),
            ])
        })
        .collect();

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Computed gauge data for a single framework — shared between card and focused renderers.
struct FrameworkGaugeData {
    grade_color: ratatui::style::Color,
    ratio: f64,
    label: String,
}

/// Compute gauge display data from a framework score result.
fn framework_gauge_data(
    fw: &crate::types::FrameworkScoreResult,
    t: &crate::theme::ThemeColors,
) -> FrameworkGaugeData {
    let grade_color = match fw.grade.as_str() {
        "A" | "Level 4" => t.zone_green,
        "B" | "Level 3" => t.zone_yellow,
        _ => t.zone_red,
    };

    let deadline_text = fw.deadline.as_deref().map_or_else(String::new, |d| {
        let now = current_epoch_days();
        let dl = parse_epoch_days(d);
        let diff = dl - now;
        if diff > 0 { format!(" ({diff}d)") } else { " (overdue)".to_string() }
    });

    let gaps_text = if fw.gaps > 0 {
        format!(" ({} gaps)", fw.gaps)
    } else {
        String::new()
    };

    FrameworkGaugeData {
        grade_color,
        ratio: (fw.score / 100.0).clamp(0.0, 1.0),
        label: format!("{:.0}/100 {}{gaps_text}{deadline_text}", fw.score, fw.grade),
    }
}

/// Multi-framework score cards — one card per selected framework, side by side.
pub(super) fn render_framework_cards(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let frameworks = match &app.framework_scores {
        Some(fs) => &fs.frameworks,
        None => return render_score_gauge(frame, area, app),
    };

    if frameworks.is_empty() {
        return render_score_gauge(frame, area, app);
    }

    let count = frameworks.len() as u16;
    let constraints: Vec<ratatui::layout::Constraint> = (0..count)
        .map(|_| ratatui::layout::Constraint::Ratio(1, count.into()))
        .collect();

    let cards = ratatui::layout::Layout::default()
        .direction(ratatui::layout::Direction::Horizontal)
        .constraints(constraints)
        .split(area);

    for (i, fw) in frameworks.iter().enumerate() {
        let gd = framework_gauge_data(fw, &t);

        let block = Block::default()
            .title(format!(" {} ", fw.framework_name))
            .title_style(theme::title_style())
            .borders(Borders::ALL)
            .border_style(Style::default().fg(t.border));
        let inner = block.inner(cards[i]);
        frame.render_widget(block, cards[i]);

        let gauge = ratatui::widgets::Gauge::default()
            .gauge_style(Style::default().fg(gd.grade_color))
            .ratio(gd.ratio)
            .label(gd.label);

        frame.render_widget(gauge, inner);
    }
}

/// Focused single-framework gauge — full-width gauge for one framework (press 'f' to cycle).
pub(super) fn render_focused_framework_gauge(
    frame: &mut Frame, area: Rect,
    fw: &crate::types::FrameworkScoreResult,
) {
    let t = theme::theme();
    let gd = framework_gauge_data(fw, &t);

    let gauge = ratatui::widgets::Gauge::default()
        .block(
            Block::default()
                .title(format!(" {} ", fw.framework_name))
                .title_style(theme::title_style())
                .borders(Borders::ALL)
                .border_style(Style::default().fg(t.border)),
        )
        .gauge_style(Style::default().fg(gd.grade_color))
        .ratio(gd.ratio)
        .label(gd.label);

    frame.render_widget(gauge, area);
}

/// Detail panel for Large breakpoint (rightmost column).
pub(super) fn render_detail_panel(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Detail ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = if let Some(scan) = &app.last_scan {
        let mut l = vec![
            Line::from(Span::styled(
                format!(" Checks: {}/{}", scan.score.passed_checks, scan.score.total_checks),
                Style::default().fg(t.fg),
            )),
            Line::from(Span::styled(
                format!(" Failed: {}", scan.score.failed_checks),
                Style::default().fg(t.zone_red),
            )),
            Line::from(Span::styled(
                format!(" Categories: {}", scan.score.category_scores.len()),
                Style::default().fg(t.fg),
            )),
        ];
        if scan.score.critical_cap_applied {
            l.push(Line::from(Span::styled(
                " Critical cap applied",
                Style::default().fg(t.zone_red),
            )));
        }
        l
    } else {
        vec![Line::from(Span::styled(
            " Run a scan to see details",
            Style::default().fg(t.muted),
        ))]
    };
    frame.render_widget(Paragraph::new(lines), inner);
}
