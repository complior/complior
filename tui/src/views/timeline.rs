use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

/// A milestone on the EU AI Act timeline.
#[derive(Debug, Clone)]
pub struct Milestone {
    pub date: (u16, u8, u8),
    pub title: &'static str,
    pub description: &'static str,
    pub articles: &'static str,
}

pub const MILESTONES: &[Milestone] = &[
    Milestone {
        date: (2024, 8, 1),
        title: "AI Act enters into force",
        description: "Regulation (EU) 2024/1689 officially enters into force.",
        articles: "All",
    },
    Milestone {
        date: (2025, 2, 2),
        title: "Prohibited AI practices ban",
        description: "Ban on unacceptable-risk AI: social scoring, real-time biometric ID, manipulation.",
        articles: "Art. 5",
    },
    Milestone {
        date: (2025, 8, 2),
        title: "GPAI provider obligations + Governance",
        description: "General-purpose AI model providers must comply. AI Office established.",
        articles: "Art. 51-53, Art. 64-68",
    },
    Milestone {
        date: (2026, 8, 2),
        title: "High-risk AI system obligations",
        description: "Full compliance for high-risk AI: risk management, data governance, transparency, human oversight.",
        articles: "Art. 6-49",
    },
    Milestone {
        date: (2027, 8, 2),
        title: "Existing high-risk AI systems",
        description: "AI systems placed on market before Aug 2025 must comply if significantly modified.",
        articles: "Art. 111",
    },
    Milestone {
        date: (2030, 8, 2),
        title: "Full enforcement for all AI systems",
        description: "All AI systems in scope must be fully compliant. No transitional periods remain.",
        articles: "Art. 113",
    },
];

/// State for the Timeline View.
#[derive(Debug, Clone)]
pub struct TimelineViewState {
    pub scroll_offset: u16,
}

impl Default for TimelineViewState {
    fn default() -> Self {
        Self { scroll_offset: 0 }
    }
}

/// Check if a milestone date is in the past.
pub fn is_past(date: (u16, u8, u8)) -> bool {
    days_until(date) < 0
}

/// Days until a milestone (negative if past).
pub fn days_until(date: (u16, u8, u8)) -> i64 {
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    #[allow(clippy::cast_possible_wrap)]
    let now_days = (now_secs / 86400) as i64;
    let target_days = days_from_date(date);
    target_days - now_days
}

/// Approximate days since Unix epoch for a date.
fn days_from_date(date: (u16, u8, u8)) -> i64 {
    let (y, m, d) = (i64::from(date.0), i64::from(date.1), i64::from(date.2));
    let mut days = (y - 1970) * 365 + (y - 1969) / 4;
    // Century/400-year leap year correction
    days += (y - 1) / 400 - (y - 1) / 100 + 1970_i64 / 100 - 1970_i64 / 400;
    const MONTH_DAYS: [i64; 13] = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    days += MONTH_DAYS[m as usize] + d - 1;
    // Leap year adjustment for months after February
    if m > 2 && (y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) {
        days += 1;
    }
    days
}

fn format_date(date: (u16, u8, u8)) -> String {
    const MONTHS: [&str; 13] = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let m = date.1 as usize;
    let month = if m < MONTHS.len() { MONTHS[m] } else { "???" };
    format!("{month} {}, {}", date.2, date.0)
}

/// Render the Timeline View.
pub fn render_timeline_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Timeline — EU AI Act Compliance Deadlines ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();
    lines.push(Line::raw(""));

    let mut you_are_here_placed = false;

    for (i, milestone) in MILESTONES.iter().enumerate() {
        let past = is_past(milestone.date);
        let countdown = days_until(milestone.date);
        let is_next = !past && !you_are_here_placed;

        // Year header (show if different from previous milestone)
        if i == 0 || milestone.date.0 != MILESTONES[i - 1].date.0 {
            lines.push(Line::from(Span::styled(
                format!("  {}", milestone.date.0),
                Style::default()
                    .fg(if past { t.muted } else { t.fg })
                    .add_modifier(Modifier::BOLD),
            )));
            lines.push(Line::from(Span::styled(
                "  |",
                Style::default().fg(t.muted),
            )));
        }

        // "YOU ARE HERE" marker before the first future milestone
        if is_next {
            you_are_here_placed = true;
            lines.push(Line::from(Span::styled(
                "  *=== YOU ARE HERE ===*",
                Style::default()
                    .fg(t.accent)
                    .add_modifier(Modifier::BOLD),
            )));
            lines.push(Line::from(vec![
                Span::styled("  |    ", Style::default().fg(t.muted)),
                Span::styled(
                    format!("Next deadline in: {countdown} days"),
                    Style::default().fg(t.accent),
                ),
            ]));
            lines.push(Line::from(Span::styled(
                "  |",
                Style::default().fg(t.muted),
            )));
        }

        // Milestone rendering
        let date_str = format_date(milestone.date);
        let (title_color, desc_color) = if past {
            (t.muted, t.muted)
        } else if is_next {
            (t.accent, t.fg)
        } else {
            (t.fg, t.muted)
        };

        lines.push(Line::from(vec![
            Span::styled(
                "  o--- ",
                Style::default().fg(if past { t.muted } else { t.accent }),
            ),
            Span::styled(format!("{date_str} — "), Style::default().fg(title_color)),
            Span::styled(
                milestone.title.to_string(),
                Style::default()
                    .fg(title_color)
                    .add_modifier(Modifier::BOLD),
            ),
        ]));

        // Status or countdown
        if past {
            lines.push(Line::from(vec![
                Span::styled("  |    ", Style::default().fg(t.muted)),
                Span::styled("Status: PASSED", Style::default().fg(t.muted)),
            ]));
        } else {
            lines.push(Line::from(vec![
                Span::styled("  |    ", Style::default().fg(t.muted)),
                Span::styled(
                    format!("Countdown: {countdown} days"),
                    Style::default().fg(desc_color),
                ),
            ]));
        }

        // Articles
        lines.push(Line::from(vec![
            Span::styled("  |    ", Style::default().fg(t.muted)),
            Span::styled(
                format!("Articles: {}", milestone.articles),
                Style::default().fg(t.muted),
            ),
        ]));

        lines.push(Line::from(Span::styled(
            "  |",
            Style::default().fg(t.muted),
        )));
    }

    // If all milestones are past
    if !you_are_here_placed {
        lines.push(Line::from(Span::styled(
            "  *=== YOU ARE HERE (all deadlines passed) ===*",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )));
    }

    // Scroll hints
    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  Scroll: ", Style::default().fg(t.muted)),
        Span::styled("j/k", Style::default().fg(t.accent)),
        Span::styled("  ", Style::default()),
        Span::styled("[2] ", Style::default().fg(t.accent)),
        Span::styled("Scan View  ", Style::default().fg(t.muted)),
        Span::styled("[3] ", Style::default().fg(t.accent)),
        Span::styled("Fix View", Style::default().fg(t.muted)),
    ]));

    let scroll = app.timeline_view.scroll_offset;
    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((scroll, 0));
    frame.render_widget(paragraph, inner);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_milestones_count() {
        assert_eq!(MILESTONES.len(), 6);
    }

    #[test]
    fn test_days_until_future() {
        let days = days_until((2030, 8, 2));
        assert!(days > 0, "2030 milestone should be in the future, got {days}");
    }

    #[test]
    fn test_is_past_for_2024() {
        assert!(is_past((2024, 8, 1)), "Aug 2024 should be in the past");
    }
}
