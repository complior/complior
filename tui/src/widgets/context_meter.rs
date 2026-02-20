use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

use crate::theme;

/// Thresholds for context usage coloring.
const GREEN_MAX: u8 = 59;
const YELLOW_MAX: u8 = 79;

/// Compute context usage percentage from message count and max.
pub fn context_pct(message_count: usize, max_context: usize) -> u8 {
    if max_context == 0 {
        return 0;
    }
    let pct = (message_count * 100) / max_context;
    pct.min(100) as u8
}

/// Get the color for a given context percentage.
pub fn context_color(pct: u8) -> ratatui::style::Color {
    let t = theme::theme();
    if pct <= GREEN_MAX {
        t.zone_green
    } else if pct <= YELLOW_MAX {
        t.zone_yellow
    } else {
        t.zone_red
    }
}

/// Render context meter as a single line: `Ctx: [========--] 78%`
pub fn render_context_meter(frame: &mut Frame, area: Rect, pct: u8) {
    let t = theme::theme();
    let color = context_color(pct);

    let bar_width = 10usize;
    let filled = (pct as usize * bar_width) / 100;
    let empty = bar_width.saturating_sub(filled);

    let bar = format!(
        "[{}{}]",
        "=".repeat(filled),
        "-".repeat(empty),
    );

    let line = Line::from(vec![
        Span::styled(" Ctx: ", Style::default().fg(t.muted)),
        Span::styled(bar, Style::default().fg(color).add_modifier(Modifier::BOLD)),
        Span::styled(format!(" {pct}%"), Style::default().fg(color)),
    ]);

    frame.render_widget(Paragraph::new(line), area);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_context_pct_calculation() {
        assert_eq!(context_pct(0, 32), 0);
        assert_eq!(context_pct(16, 32), 50);
        assert_eq!(context_pct(32, 32), 100);
        assert_eq!(context_pct(0, 0), 0);
    }

    #[test]
    fn test_context_color_thresholds() {
        crate::theme::init_theme("dark");
        let t = crate::theme::theme();

        assert_eq!(context_color(0), t.zone_green);
        assert_eq!(context_color(59), t.zone_green);
        assert_eq!(context_color(60), t.zone_yellow);
        assert_eq!(context_color(79), t.zone_yellow);
        assert_eq!(context_color(80), t.zone_red);
        assert_eq!(context_color(100), t.zone_red);
    }

    #[test]
    fn test_context_pct_clamped() {
        // More than max → clamped to 100
        assert_eq!(context_pct(50, 32), 100);
    }
}
