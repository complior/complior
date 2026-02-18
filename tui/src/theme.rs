use ratatui::style::{Color, Modifier, Style};

use crate::types::{Severity, Zone};

/// All colors used in TUI — switchable via `/theme` command.
#[derive(Debug, Clone)]
pub struct ThemeColors {
    pub bg: Color,
    pub fg: Color,
    pub border: Color,
    pub border_focused: Color,
    pub accent: Color,
    pub muted: Color,
    pub zone_green: Color,
    pub zone_yellow: Color,
    pub zone_red: Color,
    pub severity_critical: Color,
    pub severity_high: Color,
    pub severity_medium: Color,
    pub severity_low: Color,
    pub severity_info: Color,
    pub diff_added: Color,
    pub diff_removed: Color,
    pub diff_header: Color,
    pub user_msg: Color,
    pub assistant_msg: Color,
    pub system_msg: Color,
    pub selection_bg: Color,
    pub status_bar_bg: Color,
    pub status_bar_fg: Color,
    pub tool_call_border: Color,
    pub tool_result_ok: Color,
    pub tool_result_err: Color,
    pub thinking_fg: Color,
}

impl ThemeColors {
    pub fn dark() -> Self {
        Self {
            bg: Color::Reset,
            fg: Color::White,
            border: Color::DarkGray,
            border_focused: Color::Cyan,
            accent: Color::Cyan,
            muted: Color::DarkGray,
            zone_green: Color::Green,
            zone_yellow: Color::Yellow,
            zone_red: Color::Red,
            severity_critical: Color::Red,
            severity_high: Color::LightRed,
            severity_medium: Color::Yellow,
            severity_low: Color::Blue,
            severity_info: Color::Gray,
            diff_added: Color::Green,
            diff_removed: Color::Red,
            diff_header: Color::Cyan,
            user_msg: Color::Cyan,
            assistant_msg: Color::Green,
            system_msg: Color::Yellow,
            selection_bg: Color::Rgb(60, 60, 80),
            status_bar_bg: Color::Rgb(40, 40, 50),
            status_bar_fg: Color::White,
            tool_call_border: Color::Cyan,
            tool_result_ok: Color::Green,
            tool_result_err: Color::Red,
            thinking_fg: Color::DarkGray,
        }
    }

    pub fn light() -> Self {
        Self {
            bg: Color::Reset,
            fg: Color::Black,
            border: Color::Gray,
            border_focused: Color::Blue,
            accent: Color::Blue,
            muted: Color::Gray,
            zone_green: Color::Rgb(0, 140, 0),
            zone_yellow: Color::Rgb(180, 140, 0),
            zone_red: Color::Rgb(200, 0, 0),
            severity_critical: Color::Rgb(200, 0, 0),
            severity_high: Color::Rgb(220, 80, 0),
            severity_medium: Color::Rgb(180, 140, 0),
            severity_low: Color::Blue,
            severity_info: Color::Gray,
            diff_added: Color::Rgb(0, 140, 0),
            diff_removed: Color::Rgb(200, 0, 0),
            diff_header: Color::Blue,
            user_msg: Color::Blue,
            assistant_msg: Color::Rgb(0, 140, 0),
            system_msg: Color::Rgb(180, 140, 0),
            selection_bg: Color::Rgb(200, 220, 255),
            status_bar_bg: Color::Rgb(220, 220, 230),
            status_bar_fg: Color::Black,
            tool_call_border: Color::Blue,
            tool_result_ok: Color::Rgb(0, 140, 0),
            tool_result_err: Color::Rgb(200, 0, 0),
            thinking_fg: Color::Gray,
        }
    }

    pub fn high_contrast() -> Self {
        Self {
            bg: Color::Reset,
            fg: Color::White,
            border: Color::White,
            border_focused: Color::LightCyan,
            accent: Color::LightCyan,
            muted: Color::Gray,
            zone_green: Color::LightGreen,
            zone_yellow: Color::LightYellow,
            zone_red: Color::LightRed,
            severity_critical: Color::LightRed,
            severity_high: Color::LightRed,
            severity_medium: Color::LightYellow,
            severity_low: Color::LightBlue,
            severity_info: Color::White,
            diff_added: Color::LightGreen,
            diff_removed: Color::LightRed,
            diff_header: Color::LightCyan,
            user_msg: Color::LightCyan,
            assistant_msg: Color::LightGreen,
            system_msg: Color::LightYellow,
            selection_bg: Color::Rgb(80, 80, 120),
            status_bar_bg: Color::Rgb(60, 60, 80),
            status_bar_fg: Color::White,
            tool_call_border: Color::LightCyan,
            tool_result_ok: Color::LightGreen,
            tool_result_err: Color::LightRed,
            thinking_fg: Color::Gray,
        }
    }

    pub fn from_name(name: &str) -> Self {
        match name {
            "light" => Self::light(),
            "high-contrast" | "high_contrast" => Self::high_contrast(),
            _ => Self::dark(),
        }
    }
}

/// Global theme accessor — initialized once, switchable at runtime.
/// Using a simple static for now; views call `theme()` to get colors.
static THEME: std::sync::OnceLock<std::sync::Mutex<ThemeColors>> = std::sync::OnceLock::new();

pub fn init_theme(name: &str) {
    let colors = ThemeColors::from_name(name);
    if let Some(mutex) = THEME.get() {
        *mutex.lock().expect("theme lock") = colors;
    } else {
        let _ = THEME.set(std::sync::Mutex::new(colors));
    }
}

pub fn theme() -> ThemeColors {
    THEME
        .get()
        .map(|m| m.lock().expect("theme lock").clone())
        .unwrap_or_else(ThemeColors::dark)
}

// --- Convenience style helpers ---

pub fn zone_color(zone: Zone) -> Color {
    let t = theme();
    match zone {
        Zone::Green => t.zone_green,
        Zone::Yellow => t.zone_yellow,
        Zone::Red => t.zone_red,
    }
}

pub fn severity_color(severity: Severity) -> Color {
    let t = theme();
    match severity {
        Severity::Critical => t.severity_critical,
        Severity::High => t.severity_high,
        Severity::Medium => t.severity_medium,
        Severity::Low => t.severity_low,
        Severity::Info => t.severity_info,
    }
}

pub fn border_style(focused: bool) -> Style {
    let t = theme();
    if focused {
        Style::default().fg(t.border_focused)
    } else {
        Style::default().fg(t.border)
    }
}

pub fn title_style() -> Style {
    let t = theme();
    Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
}

pub fn muted_style() -> Style {
    Style::default().fg(theme().muted)
}

pub fn status_bar_style() -> Style {
    let t = theme();
    Style::default().bg(t.status_bar_bg).fg(t.status_bar_fg)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zone_color_mapping() {
        init_theme("dark");
        assert_eq!(zone_color(Zone::Green), Color::Green);
        assert_eq!(zone_color(Zone::Yellow), Color::Yellow);
        assert_eq!(zone_color(Zone::Red), Color::Red);
    }

    #[test]
    fn test_severity_color_mapping() {
        init_theme("dark");
        assert_eq!(severity_color(Severity::Critical), Color::Red);
        assert_eq!(severity_color(Severity::Info), Color::Gray);
    }

    #[test]
    fn test_theme_presets() {
        let dark = ThemeColors::dark();
        assert_eq!(dark.fg, Color::White);

        let light = ThemeColors::light();
        assert_eq!(light.fg, Color::Black);

        let hc = ThemeColors::high_contrast();
        assert_eq!(hc.border, Color::White);
    }

    #[test]
    fn test_from_name() {
        let t = ThemeColors::from_name("light");
        assert_eq!(t.fg, Color::Black);

        let t = ThemeColors::from_name("unknown");
        assert_eq!(t.fg, Color::White); // defaults to dark
    }
}
