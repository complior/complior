use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::theme;

#[derive(Debug, Clone)]
pub struct WhatIfResult {
    pub scenario: String,
    pub current_score: f64,
    pub projected_score: f64,
    pub new_obligations: Vec<String>,
    pub effort_days: Option<u32>,
}

impl WhatIfResult {
    pub fn score_delta(&self) -> f64 {
        self.projected_score - self.current_score
    }
}

#[derive(Debug, Clone)]
pub struct WhatIfState {
    pub result: Option<WhatIfResult>,
    pub pending: bool,
}

impl WhatIfState {
    pub const fn new() -> Self {
        Self {
            result: None,
            pending: false,
        }
    }

}

/// Render what-if result as a chat message block.
pub fn format_whatif_message(result: &WhatIfResult) -> String {
    let delta = result.score_delta();
    let sign = if delta >= 0.0 { "+" } else { "" };

    let mut out = format!(
        "What-If Analysis: {}\n\
         Current score:   {:.0}/100\n\
         Projected score: {:.0}/100 ({sign}{delta:.0})\n",
        result.scenario, result.current_score, result.projected_score
    );

    if !result.new_obligations.is_empty() {
        out.push_str(&format!(
            "\nNew obligations: +{}\n",
            result.new_obligations.len()
        ));
        for obl in &result.new_obligations {
            out.push_str(&format!("  - {obl}\n"));
        }
    }

    if let Some(days) = result.effort_days {
        out.push_str(&format!("\nEffort estimate: ~{days} days\n"));
    }

    out
}

#[allow(dead_code)] // TODO(T10): wire into dashboard overlay dispatch
pub fn render_whatif_overlay(frame: &mut Frame, area: Rect, result: &WhatIfResult) {
    let t = theme::theme();

    let block = Block::default()
        .title(" What-If Analysis ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let delta = result.score_delta();
    let delta_color = if delta >= 0.0 {
        t.zone_green
    } else {
        t.zone_red
    };

    let mut lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            format!("  Scenario: {}", result.scenario),
            Style::default()
                .fg(t.fg)
                .add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  Current score:   ", Style::default().fg(t.muted)),
            Span::styled(
                format!("{:.0}/100", result.current_score),
                Style::default().fg(t.fg),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Projected score: ", Style::default().fg(t.muted)),
            Span::styled(
                format!("{:.0}/100 ({delta:+.0})", result.projected_score),
                Style::default().fg(delta_color).add_modifier(Modifier::BOLD),
            ),
        ]),
    ];

    if !result.new_obligations.is_empty() {
        lines.push(Line::raw(""));
        lines.push(Line::from(Span::styled(
            format!("  New obligations: +{}", result.new_obligations.len()),
            Style::default().fg(t.fg),
        )));
        for obl in &result.new_obligations {
            lines.push(Line::from(vec![
                Span::styled("    - ", Style::default().fg(t.accent)),
                Span::styled(obl.clone(), Style::default().fg(t.fg)),
            ]));
        }
    }

    if let Some(days) = result.effort_days {
        lines.push(Line::raw(""));
        lines.push(Line::from(vec![
            Span::styled("  Effort: ", Style::default().fg(t.muted)),
            Span::styled(
                format!("~{days} days"),
                Style::default().fg(t.zone_yellow),
            ),
        ]));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        "  [Esc] Dismiss",
        Style::default().fg(t.muted),
    )));

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn t905_whatif_result_delta() {
        let result = WhatIfResult {
            scenario: "test".into(),
            current_score: 72.0,
            projected_score: 58.0,
            new_obligations: vec![],
            effort_days: None,
        };
        assert_eq!(result.score_delta(), -14.0);
    }

    #[test]
    fn t905_whatif_format_message() {
        let result = WhatIfResult {
            scenario: "add ElevenLabs".into(),
            current_score: 72.0,
            projected_score: 65.0,
            new_obligations: vec![
                "Content marking required (C2PA)".into(),
                "AI-generated content disclosure".into(),
            ],
            effort_days: Some(2),
        };
        let msg = format_whatif_message(&result);
        assert!(msg.contains("What-If Analysis: add ElevenLabs"));
        assert!(msg.contains("Current score:"));
        assert!(msg.contains("Projected score:"));
        assert!(msg.contains("New obligations:"));
    }

    #[test]
    fn t905_whatif_positive_delta() {
        let result = WhatIfResult {
            scenario: "add disclosure".into(),
            current_score: 60.0,
            projected_score: 75.0,
            new_obligations: vec![],
            effort_days: None,
        };
        assert_eq!(result.score_delta(), 15.0);
    }
}
