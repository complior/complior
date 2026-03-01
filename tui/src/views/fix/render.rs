use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

use super::{FixItemStatus, FixableItem};

/// Render the fix checklist (left pane or full area).
pub(super) fn render_checklist(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let fix = &app.fix_view;

    if fix.is_single_fix() {
        render_checklist_single(frame, area, app);
        return;
    }

    let total = fix.fixable_findings.len();
    let current_score = app
        .last_scan
        .as_ref()
        .map_or(0.0, |s| s.score.total_score);

    #[allow(clippy::cast_precision_loss)]
    let predicted_score = (current_score + fix.total_predicted_impact() as f64).min(100.0);

    // Score color for predicted
    let pred_color = if predicted_score < 50.0 { t.zone_red }
        else if predicted_score < 80.0 { t.zone_yellow }
        else { t.zone_green };
    let curr_color = if current_score < 50.0 { t.zone_red }
        else if current_score < 80.0 { t.zone_yellow }
        else { t.zone_green };

    let block = Block::default()
        .title(format!(" Fix — {total} fixable items "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();

    // Score prediction header: Score: 32 → 47 (+15) | 5/9 selected
    let selected_count = fix.selected_count();
    let impact = fix.total_predicted_impact();
    lines.push(Line::from(vec![
        Span::styled("  Score: ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{current_score:.0}"),
            Style::default().fg(curr_color).add_modifier(Modifier::BOLD),
        ),
        Span::styled(" → ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{predicted_score:.0}"),
            Style::default().fg(pred_color).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("  (+{impact})"),
            Style::default().fg(t.zone_green),
        ),
        Span::styled(
            format!("  |  {selected_count}/{total} selected"),
            Style::default().fg(t.muted),
        ),
    ]));

    let w = inner.width.saturating_sub(2) as usize;

    // Split into staged (selected) and not staged
    let staged: Vec<(usize, &FixableItem)> = fix
        .fixable_findings
        .iter()
        .enumerate()
        .filter(|(_, item)| item.selected)
        .collect();
    let not_staged: Vec<(usize, &FixableItem)> = fix
        .fixable_findings
        .iter()
        .enumerate()
        .filter(|(_, item)| !item.selected)
        .collect();

    // === STAGED section ===
    if !staged.is_empty() {
        lines.push(Line::from(Span::styled(
            format!(" {}", "─".repeat(w)),
            Style::default().fg(t.border),
        )));
        lines.push(Line::from(vec![
            Span::styled(
                format!(" STAGED ({}) ", staged.len()),
                Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                "─".repeat(w.saturating_sub(staged.len().to_string().len() + 12)),
                Style::default().fg(t.zone_green),
            ),
        ]));

        for (i, item) in &staged {
            render_fix_item(&mut lines, *i, item, fix.selected_index, &t, false);
        }
    }

    // === NOT STAGED section ===
    if !not_staged.is_empty() {
        lines.push(Line::from(Span::styled(
            format!(" {}", "─".repeat(w)),
            Style::default().fg(t.border),
        )));
        lines.push(Line::from(vec![
            Span::styled(
                format!(" NOT STAGED ({}) ", not_staged.len()),
                Style::default().fg(t.muted).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                "─".repeat(w.saturating_sub(not_staged.len().to_string().len() + 16)),
                Style::default().fg(t.muted),
            ),
        ]));

        for (i, item) in &not_staged {
            render_fix_item(&mut lines, *i, item, fix.selected_index, &t, true);
        }
    }

    // Bottom hint bar
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        format!(" {}", "─".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  Space", Style::default().fg(t.accent)),
        Span::styled(":toggle ", Style::default().fg(t.muted)),
        Span::styled("a", Style::default().fg(t.accent)),
        Span::styled(":all ", Style::default().fg(t.muted)),
        Span::styled("n", Style::default().fg(t.accent)),
        Span::styled(":none ", Style::default().fg(t.muted)),
        Span::styled("d", Style::default().fg(t.accent)),
        Span::styled(":diff ", Style::default().fg(t.muted)),
        Span::styled("Enter", Style::default().fg(t.accent)),
        Span::styled(":apply", Style::default().fg(t.muted)),
    ]));

    let visible_height = inner.height as usize;
    // ~3 lines per item + headers
    let approx_line = fix.selected_index * 3 + 3;
    let scroll = approx_line.saturating_sub(visible_height / 2);

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, inner);
}

/// Single-fix mode checklist: shows only the focused finding with details.
pub(super) fn render_checklist_single(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let fix = &app.fix_view;

    let focused_item = fix.focus_check_id.as_ref().and_then(|cid| {
        fix.fixable_findings.iter().find(|f| &f.check_id == cid)
    });

    let Some(item) = focused_item else {
        super::render_no_fix_data(frame, area, "Focused finding not found.");
        return;
    };

    let obl = item.obligation_id.as_deref().unwrap_or("—");
    let art = item.article_reference.as_deref().unwrap_or("");
    let current_score = app
        .last_scan
        .as_ref()
        .map_or(0.0, |s| s.score.total_score);
    let impact = item.predicted_impact;

    #[allow(clippy::cast_precision_loss)]
    let predicted_score = (current_score + impact as f64).min(100.0);

    let pred_color = if predicted_score < 50.0 { t.zone_red }
        else if predicted_score < 80.0 { t.zone_yellow }
        else { t.zone_green };
    let curr_color = if current_score < 50.0 { t.zone_red }
        else if current_score < 80.0 { t.zone_yellow }
        else { t.zone_green };

    // Position indicator: "1/3 fixable"
    let total_fixable = fix.fixable_findings.len();
    let fix_pos = fix.fixable_findings.iter()
        .position(|f| f.check_id == item.check_id)
        .map_or(1, |p| p + 1);

    let block = Block::default()
        .title(format!(" Fix — {obl} "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let w = inner.width.saturating_sub(2) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // Score prediction header
    lines.push(Line::from(vec![
        Span::styled("  Score: ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{current_score:.0}"),
            Style::default().fg(curr_color).add_modifier(Modifier::BOLD),
        ),
        Span::styled(" → ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{predicted_score:.0}"),
            Style::default().fg(pred_color).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("  (+{impact})"),
            Style::default().fg(t.zone_green),
        ),
        Span::styled(
            format!("  |  {fix_pos}/{total_fixable}"),
            Style::default().fg(t.muted),
        ),
    ]));

    // Separator
    lines.push(Line::from(Span::styled(
        format!(" {}", "─".repeat(w)),
        Style::default().fg(t.border),
    )));

    // Finding details
    let badge_color = theme::finding_type_color(item.finding_type);
    lines.push(Line::from(vec![
        Span::styled(
            format!("  {} ", item.finding_type.badge()),
            Style::default().fg(badge_color).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            item.check_id.clone(),
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
        ),
    ]));

    // Message
    lines.push(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(
            item.message.clone(),
            Style::default().fg(t.fg),
        ),
    ]));

    // Article reference + file path
    if !art.is_empty() {
        lines.push(Line::from(vec![
            Span::styled("  ", Style::default()),
            Span::styled(art.to_string(), Style::default().fg(t.muted)),
        ]));
    }
    if let Some(ref fp) = item.file_path {
        lines.push(Line::from(vec![
            Span::styled("  File: ", Style::default().fg(t.muted)),
            Span::styled(fp.clone(), Style::default().fg(t.diff_header)),
        ]));
    }

    // Impact
    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  Impact: ", Style::default().fg(t.muted)),
        Span::styled(
            format!("+{impact} points"),
            Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD),
        ),
    ]));

    // Bottom hint bar
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        format!(" {}", "─".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  Esc", Style::default().fg(t.accent)),
        Span::styled(":back ", Style::default().fg(t.muted)),
        Span::styled("j/k", Style::default().fg(t.accent)),
        Span::styled(":next/prev ", Style::default().fg(t.muted)),
        Span::styled("d", Style::default().fg(t.accent)),
        Span::styled(":diff ", Style::default().fg(t.muted)),
        Span::styled("Enter", Style::default().fg(t.accent)),
        Span::styled(":apply", Style::default().fg(t.muted)),
    ]));

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Render a single fix item line (used by both staged and not-staged sections).
pub(super) fn render_fix_item<'a>(
    lines: &mut Vec<Line<'a>>,
    idx: usize,
    item: &'a FixableItem,
    cursor_idx: usize,
    t: &theme::ThemeColors,
    muted: bool,
) {
    let is_cursor = idx == cursor_idx;
    let obl = item.obligation_id.as_deref().unwrap_or("—");
    let art = item.article_reference.as_deref().unwrap_or("");

    // Checkbox with color
    let (checkbox, cb_color) = match (&item.status, item.selected) {
        (FixItemStatus::Applied, _) => ("[✓]", t.zone_green),
        (FixItemStatus::Failed, _) => ("[✗]", t.zone_red),
        (FixItemStatus::Applying, _) => ("[~]", t.zone_yellow),
        (_, true) => ("[x]", t.zone_green),
        (_, false) => ("[ ]", t.muted),
    };

    let prefix = if is_cursor { ">" } else { " " };

    // Status indicator
    let status_text = match item.status {
        FixItemStatus::Pending => "",
        FixItemStatus::Applying => " APPLYING...",
        FixItemStatus::Applied => " DONE",
        FixItemStatus::Failed => " FAILED",
    };
    let status_color = match item.status {
        FixItemStatus::Pending => t.fg,
        FixItemStatus::Applying => t.zone_yellow,
        FixItemStatus::Applied => t.zone_green,
        FixItemStatus::Failed => t.zone_red,
    };

    let text_color = if muted { t.muted } else { t.fg };
    let sel_style = if is_cursor {
        Style::default().fg(text_color).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(text_color)
    };

    let badge_color = theme::finding_type_color(item.finding_type);

    // Line 1: badge + checkbox + OBL + impact + status
    let mut spans = vec![
        Span::styled(prefix, Style::default().fg(t.accent)),
        Span::styled(
            format!(" {} ", item.finding_type.badge()),
            Style::default().fg(badge_color).add_modifier(Modifier::BOLD),
        ),
        Span::styled(format!("{checkbox} "), Style::default().fg(cb_color)),
        Span::styled(format!("{obl:<10} "), sel_style),
        Span::styled(
            format!("+{:<3}", item.predicted_impact),
            Style::default().fg(if muted { t.muted } else { t.zone_green }),
        ),
    ];
    if !status_text.is_empty() {
        spans.push(Span::styled(status_text, Style::default().fg(status_color)));
    }
    lines.push(Line::from(spans));

    // Line 2: message + file path
    let mut detail_spans = vec![
        Span::styled("          ", Style::default()),
        Span::styled(item.message.clone(), sel_style),
    ];
    if let Some(ref fp) = item.file_path {
        detail_spans.push(Span::styled(
            format!(" — {fp}"),
            Style::default().fg(t.muted),
        ));
    }
    lines.push(Line::from(detail_spans));

    // Line 3: article reference + not-staged reason
    let mut line3_spans = vec![Span::styled("          ", Style::default())];
    if !art.is_empty() {
        line3_spans.push(Span::styled(
            format!("{art}  "),
            Style::default().fg(t.muted),
        ));
    }
    if muted && !item.selected {
        line3_spans.push(Span::styled(
            not_staged_reason(item),
            Style::default().fg(t.zone_yellow),
        ));
    }
    if line3_spans.len() > 1 {
        lines.push(Line::from(line3_spans));
    }
}

/// Reason why a fix item is in the not-staged section.
pub(super) fn not_staged_reason(item: &FixableItem) -> String {
    match item.finding_type {
        crate::types::FindingType::A if item.predicted_impact >= 8 => {
            "Requires manual review".to_string()
        }
        crate::types::FindingType::B => "New file — review before creating".to_string(),
        _ => "Press Space to stage".to_string(),
    }
}

