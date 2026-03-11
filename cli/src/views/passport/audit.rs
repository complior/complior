use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

/// Map an event type prefix to a single-char icon for the timeline.
fn event_icon(event_type: &str) -> &'static str {
    if event_type.starts_with("passport") {
        "\u{25a0}" // filled square
    } else if event_type.starts_with("scan") {
        "\u{25cb}" // circle
    } else if event_type.starts_with("fix") {
        "\u{25b6}" // right-pointing triangle
    } else if event_type.starts_with("fria") {
        "\u{25a1}" // white square
    } else if event_type.starts_with("evidence") {
        "\u{2261}" // triple bar (chain-like)
    } else if event_type.starts_with("worker") {
        "\u{25c6}" // diamond
    } else if event_type.starts_with("adversarial") {
        "\u{26a0}" // warning
    } else {
        "\u{2022}" // bullet
    }
}

/// Render the audit trail timeline in the passport detail panel.
pub(super) fn render_audit_panel(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let pv = &app.passport_view;

    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    lines.push(Line::from(Span::styled(
        "  Audit Trail",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::raw(""));

    if let Some(entries) = &pv.audit_entries {
        if entries.is_empty() {
            lines.push(Line::from(Span::styled(
                "  No audit events recorded.",
                Style::default().fg(t.muted),
            )));
        } else {
            lines.push(Line::from(Span::styled(
                format!("  {} recent events", entries.len()),
                Style::default().fg(t.muted),
            )));
            lines.push(Line::raw(""));

            let max_rows = inner.height.saturating_sub(10) as usize;
            for entry in entries.iter().rev().take(max_rows) {
                let event_type = entry
                    .get("eventType")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let timestamp = entry
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let agent_name = entry
                    .get("agentName")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                // Format timestamp to short form
                let time_display = if timestamp.len() >= 16 {
                    &timestamp[..16]
                } else {
                    timestamp
                };

                let icon = event_icon(event_type);

                // Format event type for display
                let event_display = event_type.replace('.', " ").replace('_', " ");
                let truncated =
                    crate::views::truncate_str(&event_display, w.saturating_sub(22));

                let mut spans = vec![
                    Span::styled(
                        format!("  {icon} "),
                        Style::default().fg(t.fg),
                    ),
                    Span::styled(
                        format!("{time_display} "),
                        Style::default().fg(t.muted),
                    ),
                    Span::styled(truncated, Style::default().fg(t.fg)),
                ];

                if !agent_name.is_empty() {
                    spans.push(Span::styled(
                        format!(" ({agent_name})"),
                        Style::default().fg(t.accent),
                    ));
                }

                lines.push(Line::from(spans));
            }
        }
    } else {
        lines.push(Line::from(Span::styled(
            "  Loading audit trail...",
            Style::default().fg(t.muted),
        )));
        lines.push(Line::from(Span::styled(
            "  Press [a] to refresh",
            Style::default().fg(t.muted),
        )));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  [a] ", Style::default().fg(t.accent)),
        Span::styled("Refresh  ", Style::default().fg(t.fg)),
        Span::styled("[Esc] ", Style::default().fg(t.accent)),
        Span::styled("Back", Style::default().fg(t.fg)),
    ]));

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}
