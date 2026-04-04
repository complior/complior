use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};

use crate::app::App;
use crate::theme;

/// Render the registry table widget in the passport detail panel.
pub(super) fn render_registry_panel(frame: &mut Frame, area: Rect, app: &App) {
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
        "  Agent Registry",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::raw(""));

    if let Some(data) = &pv.registry_data {
        if let Some(agents) = data.as_array() {
            if agents.is_empty() {
                lines.push(Line::from(Span::styled(
                    "  No agents registered.",
                    Style::default().fg(t.muted),
                )));
            } else {
                // Header row
                lines.push(Line::from(Span::styled(
                    format!(
                        "  {:<16} {:>5} {:>5} {:>5} {:>5}",
                        "NAME", "SCORE", "PASS%", "FRIA", "GRADE"
                    ),
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                )));
                lines.push(Line::from(Span::styled(
                    format!("  {}", "\u{2500}".repeat(w.min(50))),
                    Style::default().fg(t.border),
                )));

                for agent in agents {
                    let name = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                    let score = agent
                        .get("complianceScore")
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(0.0);
                    let passport_pct = agent
                        .get("passportCompleteness")
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(0.0);
                    let fria = agent
                        .get("friaStatus")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?");
                    let grade = agent.get("grade").and_then(|v| v.as_str()).unwrap_or("?");

                    let truncated_name = crate::views::truncate_str(name, 16);
                    let score_color = crate::views::score_zone_color(score, &t);
                    let grade_color = match grade {
                        "A" => t.zone_green,
                        "B" => t.zone_yellow,
                        "C" => t.severity_medium,
                        _ => t.zone_red,
                    };

                    let fria_short = match fria {
                        "complete" | "completed" => "\u{2713}",
                        _ => "\u{2717}",
                    };

                    lines.push(Line::from(vec![
                        Span::styled(format!("  {truncated_name:<16}"), Style::default().fg(t.fg)),
                        Span::styled(format!(" {score:>5.0}"), Style::default().fg(score_color)),
                        Span::styled(format!(" {passport_pct:>5.0}"), Style::default().fg(t.fg)),
                        Span::styled(format!("   {fria_short:>2}"), Style::default().fg(t.fg)),
                        Span::styled(
                            format!("     {grade}"),
                            Style::default()
                                .fg(grade_color)
                                .add_modifier(Modifier::BOLD),
                        ),
                    ]));

                    // Show issues below agent row
                    if let Some(issues) = agent.get("issues").and_then(|v| v.as_array()) {
                        for issue in issues.iter().take(2) {
                            if let Some(msg) = issue.as_str() {
                                let truncated_issue =
                                    crate::views::truncate_str(msg, w.saturating_sub(6));
                                lines.push(Line::from(Span::styled(
                                    format!("    \u{2192} {truncated_issue}"),
                                    Style::default().fg(t.zone_red),
                                )));
                            }
                        }
                    }
                }
            }
        }
    } else {
        lines.push(Line::from(Span::styled(
            "  Loading registry data...",
            Style::default().fg(t.muted),
        )));
        lines.push(Line::from(Span::styled(
            "  Press [g] to refresh",
            Style::default().fg(t.muted),
        )));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  [g] ", Style::default().fg(t.accent)),
        Span::styled("Refresh  ", Style::default().fg(t.fg)),
        Span::styled("[Esc] ", Style::default().fg(t.accent)),
        Span::styled("Back", Style::default().fg(t.fg)),
    ]));

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}
