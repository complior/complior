use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;
use crate::app::App;
use crate::theme;
use crate::types::Finding;
use crate::views::scan::{render_code_block, render_fix_diff, render_fix_text};
use super::apply::infer_doc_path;
use super::FixableItem;

/// Multi-file diff preview — shows ALL staged diffs in a scrollable view.
pub(super) fn render_diff_preview(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let Some(scan) = &app.last_scan else {
        return;
    };
    let fix = &app.fix_view;

    // Single-fix mode: show focused item's diff directly
    if fix.is_single_fix() {
        render_diff_preview_single(frame, area, app);
        return;
    }

    // Collect all staged items with their findings
    let staged_items: Vec<(&FixableItem, &Finding)> = fix
        .fixable_findings
        .iter()
        .filter(|item| item.selected)
        .filter_map(|item| {
            scan.findings
                .get(item.finding_index)
                .map(|f| (item, f))
        })
        .collect();

    // Summary header
    let total_impact: i32 = staged_items.iter().map(|(item, _)| item.predicted_impact).sum();
    let files_modified = staged_items.iter().filter(|(item, _)| item.file_path.is_some()).count();
    let files_created = staged_items.iter().filter(|(item, _)| item.file_path.is_none()).count();

    let block = Block::default()
        .title(format!(
            " Diff Preview — {} staged (+{total_impact} pts) ",
            staged_items.len()
        ))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);
    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // Summary line
    lines.push(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(
            format!("{files_modified} files modified"),
            Style::default().fg(t.fg),
        ),
        Span::styled("  ", Style::default()),
        Span::styled(
            format!("{files_created} files created"),
            Style::default().fg(t.diff_added),
        ),
        Span::styled(
            format!("  |  +{total_impact} predicted"),
            Style::default().fg(t.zone_green),
        ),
    ]));
    lines.push(Line::from(Span::styled(
        format!("  {}", "─".repeat(w)),
        Style::default().fg(t.border),
    )));

    if staged_items.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No items staged. Press Space to toggle.",
            Style::default().fg(t.muted),
        )));
    }

    // Show each staged item's diff
    for (item, finding) in &staged_items {
        let badge_color = theme::finding_type_color(item.finding_type);
        let file_path = item.file_path.as_deref().unwrap_or("(new file)");

        // File header
        lines.push(Line::from(vec![
            Span::styled(
                format!("  {} ", item.finding_type.badge()),
                Style::default().fg(badge_color).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                file_path.to_string(),
                Style::default().fg(t.diff_header).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!("  +{}", item.predicted_impact),
                Style::default().fg(t.zone_green),
            ),
        ]));

        // Code context (source with line numbers)
        if let Some(ctx) = &finding.code_context {
            render_code_block(&mut lines, ctx, &t);
        }

        // Structured fix diff (line-numbered red/green)
        if let Some(diff) = &finding.fix_diff {
            lines.push(Line::from(Span::styled(
                " -- Suggested Fix ──────────",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            )));
            render_fix_diff(&mut lines, diff, &t);
        } else if let Some(fix_text) = &finding.fix {
            render_fix_text(&mut lines, fix_text, finding.finding_type(), &t);
        }

        lines.push(Line::raw(""));
    }

    // If nothing is staged, show the currently selected item as fallback
    if staged_items.is_empty()
        && let Some(item) = fix.fixable_findings.get(fix.selected_index)
            && let Some(finding) = scan.findings.get(item.finding_index) {
                lines.push(Line::from(Span::styled(
                    format!("  {}", item.message),
                    Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
                )));
                lines.push(Line::raw(""));

                // Code context (source with line numbers)
                if let Some(ctx) = &finding.code_context {
                    render_code_block(&mut lines, ctx, &t);
                }

                // Structured fix diff (line-numbered red/green)
                if let Some(diff) = &finding.fix_diff {
                    lines.push(Line::from(Span::styled(
                        " -- Suggested Fix ──────────",
                        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                    )));
                    render_fix_diff(&mut lines, diff, &t);
                } else if let Some(fix_text) = &finding.fix {
                    render_fix_text(&mut lines, fix_text, finding.finding_type(), &t);
                }
            }

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Single-fix diff preview: type-aware rendering per finding classification.
///
/// - **Type A (Code Fix)**: "Current Code" + "Suggested Fix" sections
/// - **Type B (New Document)**: "CREATE" header + "Proposed Content"
/// - **Type C (Config Change)**: "MODIFY" header + "Proposed Changes"
pub(super) fn render_diff_preview_single(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let fix = &app.fix_view;

    let Some(scan) = &app.last_scan else { return };

    // Find the focused item and its finding
    let focused = fix.focus_check_id.as_ref().and_then(|cid| {
        fix.fixable_findings.iter().find(|f| &f.check_id == cid)
    });

    let Some(item) = focused else {
        let block = Block::default()
            .title(" Diff Preview ")
            .title_style(theme::title_style())
            .borders(Borders::ALL)
            .border_style(Style::default().fg(t.border));
        let inner = block.inner(area);
        frame.render_widget(block, area);
        frame.render_widget(
            Paragraph::new(vec![Line::from(Span::styled(
                "  No focused finding.",
                Style::default().fg(t.muted),
            ))]).wrap(Wrap { trim: false }),
            inner,
        );
        return;
    };

    let Some(finding) = scan.findings.get(item.finding_index) else {
        return;
    };

    let w = area.width.saturating_sub(4) as usize;

    match item.finding_type {
        crate::types::FindingType::A => {
            render_type_a(frame, area, item, finding, w, &t);
        }
        crate::types::FindingType::B => {
            render_type_b(frame, area, item, finding, w, &t);
        }
        crate::types::FindingType::C => {
            render_type_c(frame, area, item, finding, w, &t);
        }
    }
}

/// Type A: Code Fix preview.
fn render_type_a(
    frame: &mut Frame,
    area: Rect,
    item: &FixableItem,
    finding: &Finding,
    w: usize,
    t: &theme::ThemeColors,
) {
    let file_path = item.file_path.as_deref().unwrap_or("unknown");
    let block = Block::default()
        .title(format!(" Code Fix \u{2014} {file_path} "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();

    // Section 1: Current Code (or file reference fallback)
    if let Some(ctx) = &finding.code_context {
        let line_ref = ctx.highlight_line.map_or(String::new(), |l| format!(" :{l}"));
        lines.push(Line::from(vec![
            Span::styled(
                format!(" \u{2500}\u{2500} Current Code \u{2500}\u{2500}{line_ref} "),
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                "\u{2500}".repeat(w.saturating_sub(20 + line_ref.len())),
                Style::default().fg(t.accent),
            ),
        ]));
        render_code_block(&mut lines, ctx, t);
    } else {
        // No code_context — show file:line reference
        let loc = finding.file_line_label().unwrap_or_else(|| file_path.to_string());
        lines.push(Line::from(vec![
            Span::styled(
                " \u{2500}\u{2500} Source \u{2500}\u{2500} ",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                loc,
                Style::default().fg(t.diff_header).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(" {}", "\u{2500}".repeat(w.saturating_sub(20 + file_path.len()))),
                Style::default().fg(t.accent),
            ),
        ]));
        lines.push(Line::from(Span::styled(
            "  (no code preview available)",
            Style::default().fg(t.muted),
        )));
        lines.push(Line::raw(""));
    }

    // Section 2: Suggested Fix or Recommendation
    if let Some(diff) = &finding.fix_diff {
        lines.push(Line::from(vec![
            Span::styled(
                " \u{2500}\u{2500} Suggested Fix ",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                "\u{2500}".repeat(w.saturating_sub(19)),
                Style::default().fg(t.accent),
            ),
        ]));
        render_fix_diff(&mut lines, diff, t);

        // Import addition (if needed)
        if let Some(import) = &diff.import_line {
            lines.push(Line::raw(""));
            lines.push(Line::from(vec![
                Span::styled(
                    " \u{2500}\u{2500} Add Import ",
                    Style::default().fg(t.diff_added).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    "\u{2500}".repeat(w.saturating_sub(16)),
                    Style::default().fg(t.diff_added),
                ),
            ]));
            lines.push(Line::from(vec![
                Span::styled("  + ", Style::default().fg(t.diff_added)),
                Span::styled(
                    import.clone(),
                    Style::default().fg(t.diff_added),
                ),
            ]));
        }
    } else if let Some(fix_text) = &finding.fix {
        let has_diff_lines = fix_text.lines().any(|l| l.starts_with('+') || l.starts_with('-'));
        if has_diff_lines {
            // Diff-like fix text -> "Suggested Fix"
            lines.push(Line::from(vec![
                Span::styled(
                    " \u{2500}\u{2500} Suggested Fix ",
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    "\u{2500}".repeat(w.saturating_sub(19)),
                    Style::default().fg(t.accent),
                ),
            ]));
            render_fix_text(&mut lines, fix_text, finding.finding_type(), t);
        } else {
            // Plain recommendation text -> "Recommendation"
            lines.push(Line::from(vec![
                Span::styled(
                    " \u{2500}\u{2500} Recommendation ",
                    Style::default().fg(t.zone_yellow).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    "\u{2500}".repeat(w.saturating_sub(20)),
                    Style::default().fg(t.zone_yellow),
                ),
            ]));
            for line in fix_text.lines() {
                lines.push(Line::from(Span::styled(
                    format!("  {line}"),
                    Style::default().fg(t.fg),
                )));
            }
        }
    }

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Type B: New Document preview.
fn render_type_b(
    frame: &mut Frame,
    area: Rect,
    item: &FixableItem,
    finding: &Finding,
    w: usize,
    t: &theme::ThemeColors,
) {
    let block = Block::default()
        .title(" New Document ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();

    // Infer target file name from obligation/check
    let inferred_path = infer_doc_path(&item.check_id);
    lines.push(Line::from(vec![
        Span::styled(
            " \u{2500}\u{2500} CREATE \u{2500}\u{2500} ",
            Style::default().fg(t.diff_added).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            inferred_path.clone(),
            Style::default().fg(t.diff_header).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!(" {}", "\u{2500}".repeat(w.saturating_sub(16 + inferred_path.len()))),
            Style::default().fg(t.diff_added),
        ),
    ]));
    lines.push(Line::from(Span::styled(
        "  (file does not exist yet)",
        Style::default().fg(t.muted),
    )));
    lines.push(Line::raw(""));

    // Section 2: Proposed Content
    if let Some(fix_text) = &finding.fix {
        lines.push(Line::from(vec![
            Span::styled(
                " \u{2500}\u{2500} Proposed Content ",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                "\u{2500}".repeat(w.saturating_sub(22)),
                Style::default().fg(t.accent),
            ),
        ]));
        render_fix_text(&mut lines, fix_text, finding.finding_type(), t);
    }

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Type C: Config Change preview.
fn render_type_c(
    frame: &mut Frame,
    area: Rect,
    item: &FixableItem,
    finding: &Finding,
    w: usize,
    t: &theme::ThemeColors,
) {
    let file_path = item.file_path.as_deref().unwrap_or("config");
    let block = Block::default()
        .title(format!(" Config Change \u{2014} {file_path} "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();

    // Section 1: MODIFY header
    lines.push(Line::from(vec![
        Span::styled(
            " \u{2500}\u{2500} MODIFY \u{2500}\u{2500} ",
            Style::default().fg(t.zone_yellow).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            file_path.to_string(),
            Style::default().fg(t.diff_header).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!(" {}", "\u{2500}".repeat(w.saturating_sub(16 + file_path.len()))),
            Style::default().fg(t.zone_yellow),
        ),
    ]));
    lines.push(Line::raw(""));

    // Section 2: Proposed Changes or Recommendation
    if let Some(diff) = &finding.fix_diff {
        lines.push(Line::from(vec![
            Span::styled(
                " \u{2500}\u{2500} Proposed Changes ",
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                "\u{2500}".repeat(w.saturating_sub(22)),
                Style::default().fg(t.accent),
            ),
        ]));
        render_fix_diff(&mut lines, diff, t);
    } else if let Some(fix_text) = &finding.fix {
        let has_diff_lines = fix_text.lines().any(|l| l.starts_with('+') || l.starts_with('-'));
        if has_diff_lines {
            lines.push(Line::from(vec![
                Span::styled(
                    " \u{2500}\u{2500} Proposed Changes ",
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    "\u{2500}".repeat(w.saturating_sub(22)),
                    Style::default().fg(t.accent),
                ),
            ]));
            render_fix_text(&mut lines, fix_text, finding.finding_type(), t);
        } else {
            lines.push(Line::from(vec![
                Span::styled(
                    " \u{2500}\u{2500} Recommendation ",
                    Style::default().fg(t.zone_yellow).add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    "\u{2500}".repeat(w.saturating_sub(20)),
                    Style::default().fg(t.zone_yellow),
                ),
            ]));
            for line in fix_text.lines() {
                lines.push(Line::from(Span::styled(
                    format!("  {line}"),
                    Style::default().fg(t.fg),
                )));
            }
        }
    }

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}
