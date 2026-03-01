use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Severity;

use super::explain::{
    deadline_for_article, explain_check, penalty_for_article, severity_order, wrap_text,
};
use super::shared::{render_code_block, render_fix_diff, render_fix_text};

/// Render finding detail -- two-column layout: code (left) + legal context (right).
pub(super) fn render_finding_detail(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let Some(scan) = &app.last_scan else {
        return;
    };

    let mut filtered: Vec<_> = scan
        .findings
        .iter()
        .filter(|f| app.scan_view.findings_filter.matches(f.severity))
        .collect();
    filtered.sort_by_key(|f| severity_order(f.severity));

    let idx = app.scan_view.selected_finding.unwrap_or(0);
    let Some(finding) = filtered.get(idx) else {
        return;
    };

    let ft = finding.finding_type();
    let badge_color = theme::finding_type_color(ft);
    let sev_color = theme::severity_color(finding.severity);
    let obl = finding.obligation_id.as_deref().unwrap_or("N/A");
    let art = finding.article_reference.as_deref().unwrap_or("N/A");
    let finding_num = idx + 1;
    let total = filtered.len();

    let block = Block::default()
        .title(format!(
            " {} Detail \u{2014} {obl} ({finding_num}/{total}) ",
            ft.badge()
        ))
        .title_style(Style::default().fg(badge_color).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(sev_color));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    // --- Header: finding message + article ---
    let header_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(2), // Header: message + article
            Constraint::Min(5),   // Two-column content
            Constraint::Length(2), // Action bar
        ])
        .split(inner);

    // Header
    let mut header_lines: Vec<Line<'_>> = Vec::new();
    header_lines.push(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(
            finding.message.clone(),
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
        ),
    ]));
    if let Some(fl) = finding.file_line_label() {
        header_lines.push(Line::from(vec![
            Span::styled("  ", Style::default()),
            Span::styled(format!("{art}  "), Style::default().fg(t.muted)),
            Span::styled(fl, Style::default().fg(t.accent)),
        ]));
    } else {
        header_lines.push(Line::from(vec![
            Span::styled("  ", Style::default()),
            Span::styled(art.to_string(), Style::default().fg(t.muted)),
        ]));
    }
    frame.render_widget(Paragraph::new(header_lines), header_layout[0]);

    // --- Two-column content: code (left) + legal context (right) ---
    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(55),
            Constraint::Percentage(45),
        ])
        .split(header_layout[1]);

    // LEFT COLUMN: Code diff / file content
    render_detail_code_column(frame, cols[0], finding, &t);

    // RIGHT COLUMN: Legal context
    render_detail_legal_column(frame, cols[1], finding, &t, app);

    // --- Action bar ---
    let impact = finding.predicted_impact();
    let action_line = Line::from(vec![
        Span::styled(" [f] ", Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD)),
        Span::styled(
            format!("Fix (+{impact})  "),
            Style::default().fg(t.fg),
        ),
        Span::styled("[d] ", Style::default().fg(t.zone_yellow)),
        Span::styled("Dismiss  ", Style::default().fg(t.fg)),
        Span::styled("[x] ", Style::default().fg(t.accent)),
        Span::styled("Explain  ", Style::default().fg(t.fg)),
        Span::styled("[n] ", Style::default().fg(t.accent)),
        Span::styled("Next  ", Style::default().fg(t.fg)),
        Span::styled("[Esc] ", Style::default().fg(t.muted)),
        Span::styled("Back", Style::default().fg(t.muted)),
    ]);
    frame.render_widget(Paragraph::new(vec![Line::raw(""), action_line]), header_layout[2]);
}

/// Left column of detail view: code diff or file content.
fn render_detail_code_column(
    frame: &mut Frame,
    area: Rect,
    finding: &crate::types::Finding,
    t: &theme::ThemeColors,
) {
    let ft = finding.finding_type();
    let w = area.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // Current Code section (from codeContext)
    if let Some(ctx) = &finding.code_context {
        lines.push(Line::from(Span::styled(
            "  Current Code",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            format!("  {}", "\u{2500}".repeat(w)),
            Style::default().fg(t.border),
        )));
        render_code_block(&mut lines, ctx, t);
        lines.push(Line::raw(""));
    }

    // Suggested Fix section
    if let Some(diff) = &finding.fix_diff {
        lines.push(Line::from(Span::styled(
            "  Suggested Fix",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            format!("  {}", "\u{2500}".repeat(w)),
            Style::default().fg(t.border),
        )));
        render_fix_diff(&mut lines, diff, t);
    } else if let Some(fix) = &finding.fix {
        let header = match ft {
            crate::types::FindingType::A => "  Code Change",
            crate::types::FindingType::B => "  Create New File",
            crate::types::FindingType::C => "  Config Change",
        };
        let header_color = match ft {
            crate::types::FindingType::A => t.accent,
            crate::types::FindingType::B => t.zone_green,
            crate::types::FindingType::C => t.zone_yellow,
        };

        // Only show this header if we didn't already show codeContext above
        if finding.code_context.is_none() {
            lines.push(Line::from(Span::styled(
                header,
                Style::default().fg(header_color).add_modifier(Modifier::BOLD),
            )));
            if ft == crate::types::FindingType::B {
                let (_, _, file_hint) = explain_check(&finding.check_id);
                lines.push(Line::from(vec![
                    Span::styled("  Path: ", Style::default().fg(t.muted)),
                    Span::styled(file_hint, Style::default().fg(t.accent)),
                ]));
            }
            lines.push(Line::from(Span::styled(
                format!("  {}", "\u{2500}".repeat(w)),
                Style::default().fg(t.border),
            )));
        } else {
            lines.push(Line::from(Span::styled(
                "  Suggested Fix",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            )));
            lines.push(Line::from(Span::styled(
                format!("  {}", "\u{2500}".repeat(w)),
                Style::default().fg(t.border),
            )));
        }

        render_fix_text(&mut lines, fix, ft, t);
    } else {
        let (desc, action, _) = explain_check(&finding.check_id);
        lines.push(Line::from(Span::styled(
            "  What To Do:",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            format!("  {}", "\u{2500}".repeat(w)),
            Style::default().fg(t.border),
        )));
        for chunk in wrap_text(action, w.saturating_sub(2)) {
            lines.push(Line::from(Span::styled(
                format!("  {chunk}"),
                Style::default().fg(t.fg),
            )));
        }
        lines.push(Line::raw(""));
        for chunk in wrap_text(desc, w.saturating_sub(2)) {
            lines.push(Line::from(Span::styled(
                format!("  {chunk}"),
                Style::default().fg(t.muted),
            )));
        }
    }

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}

/// Right column of detail view: legal context, penalty, impact.
fn render_detail_legal_column(
    frame: &mut Frame,
    area: Rect,
    finding: &crate::types::Finding,
    t: &theme::ThemeColors,
    app: &App,
) {
    let sev_color = theme::severity_color(finding.severity);
    let obl = finding.obligation_id.as_deref().unwrap_or("N/A");
    let art = finding.article_reference.as_deref().unwrap_or("N/A");
    let sev_label = format!("{:?}", finding.severity).to_uppercase();
    let w = area.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    lines.push(Line::from(Span::styled(
        "  Legal Context",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));

    // Metadata
    lines.push(Line::from(vec![
        Span::styled("  Obligation: ", Style::default().fg(t.muted)),
        Span::styled(obl.to_string(), Style::default().fg(t.fg)),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Article:    ", Style::default().fg(t.muted)),
        Span::styled(art.to_string(), Style::default().fg(t.fg)),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Severity:   ", Style::default().fg(t.muted)),
        Span::styled(
            sev_label,
            Style::default().fg(sev_color).add_modifier(Modifier::BOLD),
        ),
    ]));

    // Deadline + penalty
    if let Some(ref art_ref) = finding.article_reference {
        lines.push(Line::from(vec![
            Span::styled("  Deadline:   ", Style::default().fg(t.muted)),
            Span::styled(
                deadline_for_article(art_ref),
                Style::default().fg(t.zone_yellow),
            ),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  Penalty:    ", Style::default().fg(t.muted)),
            Span::styled(
                penalty_for_article(art_ref),
                Style::default().fg(t.zone_red),
            ),
        ]));
    }

    // Score impact
    let impact = finding.predicted_impact();
    let current_score = app.last_scan.as_ref().map_or(0.0, |s| s.score.total_score);
    #[allow(clippy::cast_precision_loss)]
    let projected = (current_score + impact as f64).min(100.0);
    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  Impact:     ", Style::default().fg(t.muted)),
        Span::styled(
            format!("+{impact} points"),
            Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD),
        ),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Score:      ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{current_score:.0} -> {projected:.0}"),
            Style::default().fg(t.fg),
        ),
    ]));

    // Why This Matters
    let (desc, _, file_hint) = explain_check(&finding.check_id);
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        "  Why This Matters",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    for chunk in wrap_text(desc, w.saturating_sub(2)) {
        lines.push(Line::from(Span::styled(
            format!("  {chunk}"),
            Style::default().fg(t.fg),
        )));
    }
    if matches!(finding.severity, Severity::Critical | Severity::High) {
        lines.push(Line::from(Span::styled(
            "  Non-compliance may result in penalties.",
            Style::default().fg(t.zone_red),
        )));
    }

    // File reference
    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  File: ", Style::default().fg(t.muted)),
        Span::styled(file_hint, Style::default().fg(t.accent)),
    ]));

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}
