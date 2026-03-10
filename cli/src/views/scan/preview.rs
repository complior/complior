use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

use super::explain::{explain_check, wrap_text};
use super::render::build_file_agent_map;
use super::shared::{render_code_block, render_fix_diff, render_fix_text};

/// Preview panel -- content based on the selected finding's type.
pub(super) fn render_scan_preview(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let Some(scan) = &app.last_scan else {
        return;
    };

    let mut filtered: Vec<&crate::types::Finding> = scan
        .findings
        .iter()
        .filter(|f| app.scan_view.findings_filter.matches(f.severity))
        .collect();
    let file_agent_map = build_file_agent_map(&app.passport_view.loaded_passports);
    super::sort_findings_for_display(&mut filtered, &file_agent_map);

    let idx = app.scan_view.selected_finding.unwrap_or(0);
    let Some(finding) = filtered.get(idx).copied() else {
        // No finding selected -- show placeholder
        let block = Block::default()
            .title(" Preview ")
            .title_style(theme::title_style())
            .borders(Borders::ALL)
            .border_style(Style::default().fg(t.border));
        let inner = block.inner(area);
        frame.render_widget(block, area);
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                "  Select a finding to preview.",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    };

    let ft = finding.finding_type();
    let badge_color = theme::finding_type_color(ft);
    let sev_color = theme::severity_color(finding.severity);
    let obl = finding.obligation_id.as_deref().unwrap_or("\u{2014}");

    let block = Block::default()
        .title(format!(" {} {} \u{2014} {obl} ", ft.badge(), ft.label()))
        .title_style(Style::default().fg(badge_color).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // --- File header ---
    if let Some(fl) = finding.file_line_label() {
        lines.push(Line::from(vec![
            Span::styled(" ", Style::default()),
            Span::styled(fl, Style::default().fg(t.accent).add_modifier(Modifier::BOLD)),
        ]));
        lines.push(Line::from(Span::styled(
            format!(" {}", "\u{2500}".repeat(w)),
            Style::default().fg(t.border),
        )));
    }

    // --- Code context (actual source code) ---
    if let Some(ctx) = &finding.code_context {
        render_code_block(&mut lines, ctx, &t);
        lines.push(Line::raw(""));
    }

    // --- Suggested Fix ---
    if let Some(diff) = &finding.fix_diff {
        lines.push(Line::from(Span::styled(
            " -- Suggested Fix \u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        render_fix_diff(&mut lines, diff, &t);
    } else if let Some(fix_text) = &finding.fix {
        // Fallback: text-based fix display
        if finding.code_context.is_some() {
            lines.push(Line::from(Span::styled(
                " -- Suggested Fix \u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}\u{2500}",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            )));
        } else {
            // No code context -- show section header based on type
            let header = match ft {
                crate::types::FindingType::A => "  Code Change:",
                crate::types::FindingType::B => "  Create New File:",
                crate::types::FindingType::C => "  Config Change:",
            };
            let header_color = match ft {
                crate::types::FindingType::A => t.accent,
                crate::types::FindingType::B => t.zone_green,
                crate::types::FindingType::C => t.zone_yellow,
            };
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
            // Finding message as context when no code_context
            lines.push(Line::from(vec![
                Span::styled("  ", Style::default()),
                Span::styled(
                    finding.message.clone(),
                    Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
                ),
            ]));
            // Article + severity
            let art = finding.article_reference.as_deref().unwrap_or("");
            let sev_label = format!("{:?}", finding.severity).to_uppercase();
            if !art.is_empty() {
                lines.push(Line::from(vec![
                    Span::styled("  ", Style::default()),
                    Span::styled(art.to_string(), Style::default().fg(t.muted)),
                    Span::styled(
                        format!("  |  {sev_label}"),
                        Style::default().fg(sev_color),
                    ),
                ]));
            }
            lines.push(Line::from(Span::styled(
                format!("  {}", "\u{2500}".repeat(w)),
                Style::default().fg(t.border),
            )));
        }
        lines.push(Line::raw(""));
        render_fix_text(&mut lines, fix_text, ft, &t);
    } else {
        // No fix available -- show explanation
        if finding.code_context.is_none() {
            // Finding message as header
            lines.push(Line::from(vec![
                Span::styled("  ", Style::default()),
                Span::styled(
                    finding.message.clone(),
                    Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
                ),
            ]));
            let art = finding.article_reference.as_deref().unwrap_or("");
            let sev_label = format!("{:?}", finding.severity).to_uppercase();
            if !art.is_empty() {
                lines.push(Line::from(vec![
                    Span::styled("  ", Style::default()),
                    Span::styled(art.to_string(), Style::default().fg(t.muted)),
                    Span::styled(
                        format!("  |  {sev_label}"),
                        Style::default().fg(sev_color),
                    ),
                ]));
            }
            lines.push(Line::from(Span::styled(
                format!("  {}", "\u{2500}".repeat(w)),
                Style::default().fg(t.border),
            )));
        }
        let (desc, action, file_hint) = explain_check(&finding.check_id);
        lines.push(Line::from(Span::styled(
            "  What This Means:",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        for chunk in wrap_text(desc, w.saturating_sub(2)) {
            lines.push(Line::from(Span::styled(
                format!("  {chunk}"),
                Style::default().fg(t.fg),
            )));
        }
        lines.push(Line::raw(""));
        lines.push(Line::from(Span::styled(
            "  What To Do:",
            Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD),
        )));
        for chunk in wrap_text(action, w.saturating_sub(2)) {
            lines.push(Line::from(Span::styled(
                format!("  {chunk}"),
                Style::default().fg(t.fg),
            )));
        }
        lines.push(Line::from(vec![
            Span::styled("  File: ", Style::default().fg(t.muted)),
            Span::styled(file_hint, Style::default().fg(t.accent)),
        ]));
    }

    // Impact line
    if finding.fix.is_some() || finding.fix_diff.is_some() {
        lines.push(Line::raw(""));
        lines.push(Line::from(vec![
            Span::styled(
                format!("  Impact: +{} points", finding.predicted_impact()),
                Style::default().fg(t.zone_green),
            ),
        ]));
    }

    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));

    // Action hints
    let fix_label = match ft {
        crate::types::FindingType::B => "Create",
        _ => "Fix",
    };
    lines.push(Line::from(vec![
        Span::styled("  [Enter] ", Style::default().fg(t.accent)),
        Span::styled("Detail  ", Style::default().fg(t.fg)),
        Span::styled("[f] ", Style::default().fg(t.zone_green)),
        Span::styled(format!("{fix_label}  "), Style::default().fg(t.fg)),
        Span::styled("[x] ", Style::default().fg(t.accent)),
        Span::styled("Explain  ", Style::default().fg(t.fg)),
        Span::styled("[d] ", Style::default().fg(t.zone_yellow)),
        Span::styled("Dismiss", Style::default().fg(t.fg)),
    ]));

    let scroll = app.scan_view.preview_scroll;
    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, inner);
}
