use ratatui::style::{Color, Modifier, Style};

use crate::types::{Severity, Zone};

// Base colors
pub const BG: Color = Color::Reset;
pub const FG: Color = Color::White;
pub const BORDER: Color = Color::DarkGray;
pub const BORDER_FOCUSED: Color = Color::Cyan;
pub const ACCENT: Color = Color::Cyan;
pub const MUTED: Color = Color::DarkGray;

// Score zone colors
pub const ZONE_GREEN: Color = Color::Green;
pub const ZONE_YELLOW: Color = Color::Yellow;
pub const ZONE_RED: Color = Color::Red;

// Severity colors
pub const SEVERITY_CRITICAL: Color = Color::Red;
pub const SEVERITY_HIGH: Color = Color::LightRed;
pub const SEVERITY_MEDIUM: Color = Color::Yellow;
pub const SEVERITY_LOW: Color = Color::Blue;
pub const SEVERITY_INFO: Color = Color::Gray;

// Diff colors
pub const DIFF_ADDED: Color = Color::Green;
pub const DIFF_REMOVED: Color = Color::Red;
pub const DIFF_HEADER: Color = Color::Cyan;

// Chat colors
pub const USER_MSG: Color = Color::Cyan;
pub const ASSISTANT_MSG: Color = Color::Green;
pub const SYSTEM_MSG: Color = Color::Yellow;

// Selection
pub const SELECTION_BG: Color = Color::DarkGray;

pub fn zone_color(zone: Zone) -> Color {
    match zone {
        Zone::Green => ZONE_GREEN,
        Zone::Yellow => ZONE_YELLOW,
        Zone::Red => ZONE_RED,
    }
}

pub fn severity_color(severity: Severity) -> Color {
    match severity {
        Severity::Critical => SEVERITY_CRITICAL,
        Severity::High => SEVERITY_HIGH,
        Severity::Medium => SEVERITY_MEDIUM,
        Severity::Low => SEVERITY_LOW,
        Severity::Info => SEVERITY_INFO,
    }
}

pub fn border_style(focused: bool) -> Style {
    if focused {
        Style::default().fg(BORDER_FOCUSED)
    } else {
        Style::default().fg(BORDER)
    }
}

pub fn title_style() -> Style {
    Style::default().fg(ACCENT).add_modifier(Modifier::BOLD)
}

pub fn muted_style() -> Style {
    Style::default().fg(MUTED)
}

pub fn status_bar_style() -> Style {
    Style::default().bg(Color::DarkGray).fg(Color::White)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zone_color_mapping() {
        assert_eq!(zone_color(Zone::Green), ZONE_GREEN);
        assert_eq!(zone_color(Zone::Yellow), ZONE_YELLOW);
        assert_eq!(zone_color(Zone::Red), ZONE_RED);
    }

    #[test]
    fn test_severity_color_mapping() {
        assert_eq!(severity_color(Severity::Critical), Color::Red);
        assert_eq!(severity_color(Severity::High), Color::LightRed);
        assert_eq!(severity_color(Severity::Medium), Color::Yellow);
        assert_eq!(severity_color(Severity::Low), Color::Blue);
        assert_eq!(severity_color(Severity::Info), Color::Gray);
    }
}
