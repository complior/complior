use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};

use crate::app::App;
use crate::theme;
use crate::types::Severity;

pub(super) fn render_filter_bar(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let active = app.scan_view.findings_filter;
    let filters = [
        ('a', super::FindingsFilter::All, "All"),
        ('c', super::FindingsFilter::Critical, "Critical"),
        ('h', super::FindingsFilter::High, "High"),
        ('m', super::FindingsFilter::Medium, "Medium"),
        ('l', super::FindingsFilter::Low, "Low"),
    ];

    let count = app.last_scan.as_ref().map_or(0, |s| s.findings.len());

    let mut spans = vec![Span::styled(
        format!(" Findings ({count})  "),
        Style::default().fg(t.fg),
    )];

    for (key, filter, label) in &filters {
        if *filter == active {
            spans.push(Span::styled(
                format!("[{label}]"),
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            ));
        } else {
            spans.push(Span::styled(
                format!(" {key}:{label} "),
                Style::default().fg(t.muted),
            ));
        }
    }

    // Action hints on the right
    spans.push(Span::styled(
        "  p:passed  f:fix  x:explain  </>:resize",
        Style::default().fg(t.muted),
    ));

    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

/// Build a map of `source_file` → `agent_name` from loaded passports.
/// Called once before rendering to avoid O(n²) lookups.
pub(super) fn build_file_agent_map(passports: &[serde_json::Value]) -> Vec<(String, String)> {
    let mut entries = Vec::new();
    for p in passports {
        let name = p
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if let Some(sf) = p.get("source_files").and_then(|v| v.as_array()) {
            for s in sf {
                if let Some(src) = s.as_str() {
                    entries.push((src.to_string(), name.clone()));
                }
            }
        }
    }
    entries
}

/// Determine agent name for a finding using pre-built file→agent map.
pub(super) fn resolve_agent_name<'a>(
    file: Option<&str>,
    file_agent_map: &'a [(String, String)],
) -> &'a str {
    if let Some(f) = file {
        for (src, name) in file_agent_map {
            if f == src || f.starts_with(&format!("{src}/")) {
                return name;
            }
        }
    }
    "Project"
}

pub(super) fn render_findings_list(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .borders(Borders::TOP)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(scan) = &app.last_scan else {
        return;
    };

    let mut filtered: Vec<_> = scan
        .findings
        .iter()
        .filter(|f| app.scan_view.findings_filter.matches(f.severity))
        .collect();

    // Pre-compute file→agent map once (empty if no passports)
    let file_agent_map = build_file_agent_map(&app.passport_view.loaded_passports);
    let has_passports = !file_agent_map.is_empty();

    super::sort_findings_for_display(&mut filtered, &file_agent_map);

    if filtered.is_empty() {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " No findings match filter.",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    // Global severity counts for summary line
    let crit_count = filtered
        .iter()
        .filter(|f| matches!(f.severity, Severity::Critical))
        .count();
    let high_count = filtered
        .iter()
        .filter(|f| matches!(f.severity, Severity::High))
        .count();
    let med_count = filtered
        .iter()
        .filter(|f| matches!(f.severity, Severity::Medium))
        .count();
    let low_count = filtered
        .iter()
        .filter(|f| f.severity == Severity::Low || f.severity == Severity::Info)
        .count();

    // Summary line
    let mut lines: Vec<Line<'_>> = Vec::new();
    let mut summary_spans = vec![Span::styled("  ", Style::default())];
    if crit_count > 0 {
        summary_spans.push(Span::styled(
            format!("{crit_count} critical"),
            Style::default()
                .fg(theme::severity_color(Severity::Critical))
                .add_modifier(Modifier::BOLD),
        ));
        summary_spans.push(Span::styled("  ", Style::default()));
    }
    if high_count > 0 {
        summary_spans.push(Span::styled(
            format!("{high_count} high"),
            Style::default().fg(theme::severity_color(Severity::High)),
        ));
        summary_spans.push(Span::styled("  ", Style::default()));
    }
    if med_count > 0 {
        summary_spans.push(Span::styled(
            format!("{med_count} medium"),
            Style::default().fg(theme::severity_color(Severity::Medium)),
        ));
        summary_spans.push(Span::styled("  ", Style::default()));
    }
    if low_count > 0 {
        summary_spans.push(Span::styled(
            format!("{low_count} low/info"),
            Style::default().fg(theme::severity_color(Severity::Low)),
        ));
    }
    lines.push(Line::from(summary_spans));

    // Pre-compute per-agent counts: total + per-severity (O(n))
    let mut agent_counts: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    let mut agent_sev_counts: std::collections::HashMap<(&str, u8), usize> =
        std::collections::HashMap::new();
    if has_passports {
        for f in &filtered {
            let agent = resolve_agent_name(f.file.as_deref(), &file_agent_map);
            *agent_counts.entry(agent).or_insert(0) += 1;
            *agent_sev_counts
                .entry((agent, f.severity.sort_key()))
                .or_insert(0) += 1;
        }
    }

    // Build findings list with group headers
    let selected = app.scan_view.selected_finding.unwrap_or(0);
    let mut current_severity: Option<u8> = None;
    let mut current_agent: Option<String> = None;
    let w = inner.width as usize;

    for (i, f) in filtered.iter().enumerate() {
        let sev_ord = f.severity.sort_key();

        // Agent group header (only when passports loaded)
        if has_passports {
            let agent = resolve_agent_name(f.file.as_deref(), &file_agent_map);
            if current_agent.as_deref() != Some(agent) {
                let agent_count = agent_counts.get(agent).copied().unwrap_or(0);
                current_agent = Some(agent.to_string());
                current_severity = None; // reset severity tracking for new agent group
                lines.push(Line::raw(""));
                let header_text = format!(" {agent} ({agent_count} findings) ");
                let dash_len = w.saturating_sub(header_text.len() + 4);
                lines.push(Line::from(vec![
                    Span::styled("\u{2500}\u{2500} ", Style::default().fg(t.accent)),
                    Span::styled(
                        header_text,
                        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                    ),
                    Span::styled("\u{2500}".repeat(dash_len), Style::default().fg(t.accent)),
                ]));
            }
        }

        // Insert severity group header when severity changes
        if current_severity != Some(sev_ord) {
            current_severity = Some(sev_ord);
            let (group_label, sev_color) = match f.severity {
                Severity::Critical => ("CRITICAL", theme::severity_color(Severity::Critical)),
                Severity::High => ("HIGH", theme::severity_color(Severity::High)),
                Severity::Medium => ("MEDIUM", theme::severity_color(Severity::Medium)),
                Severity::Low => ("LOW", theme::severity_color(Severity::Low)),
                Severity::Info => ("INFO", theme::severity_color(Severity::Info)),
            };
            // Use per-agent severity count when grouped, global count otherwise
            let group_count = if has_passports {
                let agent = current_agent.as_deref().unwrap_or("Project");
                agent_sev_counts
                    .get(&(agent, sev_ord))
                    .copied()
                    .unwrap_or(0)
            } else {
                match f.severity {
                    Severity::Critical => crit_count,
                    Severity::High => high_count,
                    Severity::Medium => med_count,
                    Severity::Low | Severity::Info => low_count,
                }
            };
            if !has_passports {
                lines.push(Line::raw(""));
            }
            let header_text = format!(" {group_label} ({group_count}) ");
            let dash_len = w.saturating_sub(header_text.len() + 2);
            lines.push(Line::from(vec![
                Span::styled(
                    header_text,
                    Style::default().fg(sev_color).add_modifier(Modifier::BOLD),
                ),
                Span::styled("\u{2500}".repeat(dash_len), Style::default().fg(sev_color)),
            ]));
        }

        let sev_color = theme::severity_color(f.severity);
        let is_selected = i == selected;
        let obl = f.obligation_id.as_deref().unwrap_or("\u{2014}");
        let art = f.article_reference.as_deref().unwrap_or("");
        let prefix = if is_selected { ">" } else { " " };

        let sel_style = if is_selected {
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        let sev_label = match f.severity {
            Severity::Critical => "CRIT",
            Severity::High => "HIGH",
            Severity::Medium => " MED",
            Severity::Low => " LOW",
            Severity::Info => "INFO",
        };

        let ft = f.finding_type();
        let badge_color = theme::finding_type_color(ft);
        let file_label = f.file_line_label().unwrap_or_default();

        // Line 1: > [A] CRIT OBL-015    message -- file:line
        let mut line1 = vec![
            Span::styled(prefix, Style::default().fg(t.accent)),
            Span::styled(
                format!(" {} ", ft.badge()),
                Style::default()
                    .fg(badge_color)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!("{sev_label} "),
                Style::default().fg(sev_color).add_modifier(Modifier::BOLD),
            ),
            Span::styled(format!("{obl:<10} "), sel_style),
            Span::styled(f.message.clone(), sel_style),
        ];
        if !file_label.is_empty() {
            line1.push(Span::styled(
                format!(" \u{2014} {file_label}"),
                Style::default().fg(t.muted),
            ));
        }
        lines.push(Line::from(line1));

        // Line 2 (indented): article + impact + fixable badge
        let mut detail_spans = vec![Span::styled("              ", Style::default())];
        if !art.is_empty() {
            detail_spans.push(Span::styled(
                format!("{art}  "),
                Style::default().fg(t.muted),
            ));
        }
        if f.fix.is_some() {
            detail_spans.push(Span::styled(
                format!("Impact: +{}  ", f.predicted_impact()),
                Style::default().fg(t.zone_green),
            ));
            detail_spans.push(Span::styled("[fixable]", Style::default().fg(t.zone_green)));
        }
        if !detail_spans.is_empty() {
            lines.push(Line::from(detail_spans));
        }
    }

    let visible_height = inner.height as usize;
    // Estimate ~2.5 lines per finding + 2 per group header
    let approx_line = (selected as f64 * 2.5) as usize + 1;
    let scroll = approx_line.saturating_sub(visible_height / 2);

    let paragraph = Paragraph::new(lines).scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, inner);
}
