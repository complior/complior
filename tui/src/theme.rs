use ratatui::style::{Color, Modifier, Style};

use crate::types::{Severity, Zone};

/// All colors used in TUI — switchable via Theme Picker or `/theme` command.
#[derive(Debug, Clone)]
pub struct ThemeColors {
    pub name: &'static str,
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
    pub header_bg: Color,
    pub header_fg: Color,
    pub scrollbar: Color,
    pub sparkline: Color,
}

impl ThemeColors {
    /// 8 palette colors for the preview bar in Theme Picker.
    pub fn palette_colors(&self) -> [Color; 8] {
        [
            self.bg, self.fg, self.accent, self.border,
            self.zone_green, self.zone_yellow, self.zone_red, self.muted,
        ]
    }

    pub fn complior_dark() -> Self {
        Self {
            name: "Complior Dark",
            bg: Color::Rgb(26, 27, 38),
            fg: Color::Rgb(192, 202, 245),
            border: Color::Rgb(60, 60, 80),
            border_focused: Color::Rgb(122, 162, 247),
            accent: Color::Rgb(122, 162, 247),
            muted: Color::Rgb(90, 90, 110),
            zone_green: Color::Rgb(158, 206, 106),
            zone_yellow: Color::Rgb(224, 175, 104),
            zone_red: Color::Rgb(247, 118, 142),
            severity_critical: Color::Rgb(247, 118, 142),
            severity_high: Color::Rgb(255, 158, 100),
            severity_medium: Color::Rgb(224, 175, 104),
            severity_low: Color::Rgb(122, 162, 247),
            severity_info: Color::Rgb(90, 90, 110),
            diff_added: Color::Rgb(158, 206, 106),
            diff_removed: Color::Rgb(247, 118, 142),
            diff_header: Color::Rgb(122, 162, 247),
            user_msg: Color::Rgb(122, 162, 247),
            assistant_msg: Color::Rgb(158, 206, 106),
            system_msg: Color::Rgb(224, 175, 104),
            selection_bg: Color::Rgb(55, 55, 85),
            status_bar_bg: Color::Rgb(36, 37, 52),
            status_bar_fg: Color::Rgb(192, 202, 245),
            tool_call_border: Color::Rgb(122, 162, 247),
            tool_result_ok: Color::Rgb(158, 206, 106),
            tool_result_err: Color::Rgb(247, 118, 142),
            thinking_fg: Color::Rgb(90, 90, 110),
            header_bg: Color::Rgb(36, 37, 52),
            header_fg: Color::Rgb(192, 202, 245),
            scrollbar: Color::Rgb(60, 60, 80),
            sparkline: Color::Rgb(122, 162, 247),
        }
    }

    pub fn complior_light() -> Self {
        Self {
            name: "Complior Light",
            bg: Color::Rgb(250, 250, 250),
            fg: Color::Rgb(56, 58, 66),
            border: Color::Rgb(200, 200, 210),
            border_focused: Color::Rgb(64, 120, 242),
            accent: Color::Rgb(64, 120, 242),
            muted: Color::Rgb(160, 160, 170),
            zone_green: Color::Rgb(0, 140, 0),
            zone_yellow: Color::Rgb(180, 140, 0),
            zone_red: Color::Rgb(200, 0, 0),
            severity_critical: Color::Rgb(200, 0, 0),
            severity_high: Color::Rgb(220, 80, 0),
            severity_medium: Color::Rgb(180, 140, 0),
            severity_low: Color::Rgb(64, 120, 242),
            severity_info: Color::Rgb(160, 160, 170),
            diff_added: Color::Rgb(0, 140, 0),
            diff_removed: Color::Rgb(200, 0, 0),
            diff_header: Color::Rgb(64, 120, 242),
            user_msg: Color::Rgb(64, 120, 242),
            assistant_msg: Color::Rgb(0, 140, 0),
            system_msg: Color::Rgb(180, 140, 0),
            selection_bg: Color::Rgb(200, 220, 255),
            status_bar_bg: Color::Rgb(230, 230, 240),
            status_bar_fg: Color::Rgb(56, 58, 66),
            tool_call_border: Color::Rgb(64, 120, 242),
            tool_result_ok: Color::Rgb(0, 140, 0),
            tool_result_err: Color::Rgb(200, 0, 0),
            thinking_fg: Color::Rgb(160, 160, 170),
            header_bg: Color::Rgb(230, 230, 240),
            header_fg: Color::Rgb(56, 58, 66),
            scrollbar: Color::Rgb(200, 200, 210),
            sparkline: Color::Rgb(64, 120, 242),
        }
    }

    pub fn solarized_dark() -> Self {
        Self {
            name: "Solarized Dark",
            bg: Color::Rgb(0, 43, 54),
            fg: Color::Rgb(131, 148, 150),
            border: Color::Rgb(88, 110, 117),
            border_focused: Color::Rgb(38, 139, 210),
            accent: Color::Rgb(38, 139, 210),
            muted: Color::Rgb(88, 110, 117),
            zone_green: Color::Rgb(133, 153, 0),
            zone_yellow: Color::Rgb(181, 137, 0),
            zone_red: Color::Rgb(220, 50, 47),
            severity_critical: Color::Rgb(220, 50, 47),
            severity_high: Color::Rgb(203, 75, 22),
            severity_medium: Color::Rgb(181, 137, 0),
            severity_low: Color::Rgb(38, 139, 210),
            severity_info: Color::Rgb(88, 110, 117),
            diff_added: Color::Rgb(133, 153, 0),
            diff_removed: Color::Rgb(220, 50, 47),
            diff_header: Color::Rgb(38, 139, 210),
            user_msg: Color::Rgb(38, 139, 210),
            assistant_msg: Color::Rgb(133, 153, 0),
            system_msg: Color::Rgb(181, 137, 0),
            selection_bg: Color::Rgb(7, 54, 66),
            status_bar_bg: Color::Rgb(7, 54, 66),
            status_bar_fg: Color::Rgb(147, 161, 161),
            tool_call_border: Color::Rgb(38, 139, 210),
            tool_result_ok: Color::Rgb(133, 153, 0),
            tool_result_err: Color::Rgb(220, 50, 47),
            thinking_fg: Color::Rgb(88, 110, 117),
            header_bg: Color::Rgb(7, 54, 66),
            header_fg: Color::Rgb(147, 161, 161),
            scrollbar: Color::Rgb(88, 110, 117),
            sparkline: Color::Rgb(42, 161, 152),
        }
    }

    pub fn solarized_light() -> Self {
        Self {
            name: "Solarized Light",
            bg: Color::Rgb(253, 246, 227),
            fg: Color::Rgb(101, 123, 131),
            border: Color::Rgb(147, 161, 161),
            border_focused: Color::Rgb(38, 139, 210),
            accent: Color::Rgb(38, 139, 210),
            muted: Color::Rgb(147, 161, 161),
            zone_green: Color::Rgb(133, 153, 0),
            zone_yellow: Color::Rgb(181, 137, 0),
            zone_red: Color::Rgb(220, 50, 47),
            severity_critical: Color::Rgb(220, 50, 47),
            severity_high: Color::Rgb(203, 75, 22),
            severity_medium: Color::Rgb(181, 137, 0),
            severity_low: Color::Rgb(38, 139, 210),
            severity_info: Color::Rgb(147, 161, 161),
            diff_added: Color::Rgb(133, 153, 0),
            diff_removed: Color::Rgb(220, 50, 47),
            diff_header: Color::Rgb(38, 139, 210),
            user_msg: Color::Rgb(38, 139, 210),
            assistant_msg: Color::Rgb(133, 153, 0),
            system_msg: Color::Rgb(181, 137, 0),
            selection_bg: Color::Rgb(238, 232, 213),
            status_bar_bg: Color::Rgb(238, 232, 213),
            status_bar_fg: Color::Rgb(101, 123, 131),
            tool_call_border: Color::Rgb(38, 139, 210),
            tool_result_ok: Color::Rgb(133, 153, 0),
            tool_result_err: Color::Rgb(220, 50, 47),
            thinking_fg: Color::Rgb(147, 161, 161),
            header_bg: Color::Rgb(238, 232, 213),
            header_fg: Color::Rgb(101, 123, 131),
            scrollbar: Color::Rgb(147, 161, 161),
            sparkline: Color::Rgb(42, 161, 152),
        }
    }

    pub fn dracula() -> Self {
        Self {
            name: "Dracula",
            bg: Color::Rgb(40, 42, 54),
            fg: Color::Rgb(248, 248, 242),
            border: Color::Rgb(68, 71, 90),
            border_focused: Color::Rgb(189, 147, 249),
            accent: Color::Rgb(189, 147, 249),
            muted: Color::Rgb(98, 114, 164),
            zone_green: Color::Rgb(80, 250, 123),
            zone_yellow: Color::Rgb(241, 250, 140),
            zone_red: Color::Rgb(255, 85, 85),
            severity_critical: Color::Rgb(255, 85, 85),
            severity_high: Color::Rgb(255, 121, 198),
            severity_medium: Color::Rgb(241, 250, 140),
            severity_low: Color::Rgb(139, 233, 253),
            severity_info: Color::Rgb(98, 114, 164),
            diff_added: Color::Rgb(80, 250, 123),
            diff_removed: Color::Rgb(255, 85, 85),
            diff_header: Color::Rgb(189, 147, 249),
            user_msg: Color::Rgb(139, 233, 253),
            assistant_msg: Color::Rgb(80, 250, 123),
            system_msg: Color::Rgb(241, 250, 140),
            selection_bg: Color::Rgb(68, 71, 90),
            status_bar_bg: Color::Rgb(33, 34, 44),
            status_bar_fg: Color::Rgb(248, 248, 242),
            tool_call_border: Color::Rgb(189, 147, 249),
            tool_result_ok: Color::Rgb(80, 250, 123),
            tool_result_err: Color::Rgb(255, 85, 85),
            thinking_fg: Color::Rgb(98, 114, 164),
            header_bg: Color::Rgb(33, 34, 44),
            header_fg: Color::Rgb(248, 248, 242),
            scrollbar: Color::Rgb(98, 114, 164),
            sparkline: Color::Rgb(189, 147, 249),
        }
    }

    pub fn nord() -> Self {
        Self {
            name: "Nord",
            bg: Color::Rgb(46, 52, 64),
            fg: Color::Rgb(216, 222, 233),
            border: Color::Rgb(67, 76, 94),
            border_focused: Color::Rgb(136, 192, 208),
            accent: Color::Rgb(136, 192, 208),
            muted: Color::Rgb(76, 86, 106),
            zone_green: Color::Rgb(163, 190, 140),
            zone_yellow: Color::Rgb(235, 203, 139),
            zone_red: Color::Rgb(191, 97, 106),
            severity_critical: Color::Rgb(191, 97, 106),
            severity_high: Color::Rgb(208, 135, 112),
            severity_medium: Color::Rgb(235, 203, 139),
            severity_low: Color::Rgb(129, 161, 193),
            severity_info: Color::Rgb(76, 86, 106),
            diff_added: Color::Rgb(163, 190, 140),
            diff_removed: Color::Rgb(191, 97, 106),
            diff_header: Color::Rgb(136, 192, 208),
            user_msg: Color::Rgb(136, 192, 208),
            assistant_msg: Color::Rgb(163, 190, 140),
            system_msg: Color::Rgb(235, 203, 139),
            selection_bg: Color::Rgb(59, 66, 82),
            status_bar_bg: Color::Rgb(59, 66, 82),
            status_bar_fg: Color::Rgb(216, 222, 233),
            tool_call_border: Color::Rgb(136, 192, 208),
            tool_result_ok: Color::Rgb(163, 190, 140),
            tool_result_err: Color::Rgb(191, 97, 106),
            thinking_fg: Color::Rgb(76, 86, 106),
            header_bg: Color::Rgb(59, 66, 82),
            header_fg: Color::Rgb(229, 233, 240),
            scrollbar: Color::Rgb(76, 86, 106),
            sparkline: Color::Rgb(136, 192, 208),
        }
    }

    pub fn monokai() -> Self {
        Self {
            name: "Monokai",
            bg: Color::Rgb(39, 40, 34),
            fg: Color::Rgb(248, 248, 242),
            border: Color::Rgb(70, 71, 65),
            border_focused: Color::Rgb(249, 38, 114),
            accent: Color::Rgb(249, 38, 114),
            muted: Color::Rgb(117, 113, 94),
            zone_green: Color::Rgb(166, 226, 46),
            zone_yellow: Color::Rgb(230, 219, 116),
            zone_red: Color::Rgb(249, 38, 114),
            severity_critical: Color::Rgb(249, 38, 114),
            severity_high: Color::Rgb(253, 151, 31),
            severity_medium: Color::Rgb(230, 219, 116),
            severity_low: Color::Rgb(102, 217, 239),
            severity_info: Color::Rgb(117, 113, 94),
            diff_added: Color::Rgb(166, 226, 46),
            diff_removed: Color::Rgb(249, 38, 114),
            diff_header: Color::Rgb(102, 217, 239),
            user_msg: Color::Rgb(102, 217, 239),
            assistant_msg: Color::Rgb(166, 226, 46),
            system_msg: Color::Rgb(230, 219, 116),
            selection_bg: Color::Rgb(60, 60, 50),
            status_bar_bg: Color::Rgb(30, 31, 26),
            status_bar_fg: Color::Rgb(248, 248, 242),
            tool_call_border: Color::Rgb(174, 129, 255),
            tool_result_ok: Color::Rgb(166, 226, 46),
            tool_result_err: Color::Rgb(249, 38, 114),
            thinking_fg: Color::Rgb(117, 113, 94),
            header_bg: Color::Rgb(30, 31, 26),
            header_fg: Color::Rgb(248, 248, 242),
            scrollbar: Color::Rgb(117, 113, 94),
            sparkline: Color::Rgb(174, 129, 255),
        }
    }

    pub fn gruvbox() -> Self {
        Self {
            name: "Gruvbox",
            bg: Color::Rgb(40, 40, 40),
            fg: Color::Rgb(235, 219, 178),
            border: Color::Rgb(80, 73, 69),
            border_focused: Color::Rgb(254, 128, 25),
            accent: Color::Rgb(254, 128, 25),
            muted: Color::Rgb(146, 131, 116),
            zone_green: Color::Rgb(184, 187, 38),
            zone_yellow: Color::Rgb(250, 189, 47),
            zone_red: Color::Rgb(251, 73, 52),
            severity_critical: Color::Rgb(251, 73, 52),
            severity_high: Color::Rgb(254, 128, 25),
            severity_medium: Color::Rgb(250, 189, 47),
            severity_low: Color::Rgb(131, 165, 152),
            severity_info: Color::Rgb(146, 131, 116),
            diff_added: Color::Rgb(184, 187, 38),
            diff_removed: Color::Rgb(251, 73, 52),
            diff_header: Color::Rgb(131, 165, 152),
            user_msg: Color::Rgb(131, 165, 152),
            assistant_msg: Color::Rgb(184, 187, 38),
            system_msg: Color::Rgb(250, 189, 47),
            selection_bg: Color::Rgb(60, 56, 54),
            status_bar_bg: Color::Rgb(50, 48, 47),
            status_bar_fg: Color::Rgb(235, 219, 178),
            tool_call_border: Color::Rgb(211, 134, 155),
            tool_result_ok: Color::Rgb(184, 187, 38),
            tool_result_err: Color::Rgb(251, 73, 52),
            thinking_fg: Color::Rgb(146, 131, 116),
            header_bg: Color::Rgb(50, 48, 47),
            header_fg: Color::Rgb(235, 219, 178),
            scrollbar: Color::Rgb(146, 131, 116),
            sparkline: Color::Rgb(254, 128, 25),
        }
    }

    /// Backward-compatible aliases for existing presets.
    pub fn dark() -> Self { Self::complior_dark() }
    pub fn light() -> Self { Self::complior_light() }
    pub fn high_contrast() -> Self {
        let mut t = Self::complior_dark();
        t.name = "High Contrast";
        t.border = Color::White;
        t.border_focused = Color::LightCyan;
        t.accent = Color::LightCyan;
        t.fg = Color::White;
        t.zone_green = Color::LightGreen;
        t.zone_yellow = Color::LightYellow;
        t.zone_red = Color::LightRed;
        t.severity_critical = Color::LightRed;
        t.severity_high = Color::LightRed;
        t.severity_medium = Color::LightYellow;
        t.severity_low = Color::LightBlue;
        t.severity_info = Color::White;
        t.diff_added = Color::LightGreen;
        t.diff_removed = Color::LightRed;
        t.diff_header = Color::LightCyan;
        t.user_msg = Color::LightCyan;
        t.assistant_msg = Color::LightGreen;
        t.system_msg = Color::LightYellow;
        t.selection_bg = Color::Rgb(80, 80, 120);
        t.status_bar_bg = Color::Rgb(60, 60, 80);
        t.status_bar_fg = Color::White;
        t.tool_call_border = Color::LightCyan;
        t.tool_result_ok = Color::LightGreen;
        t.tool_result_err = Color::LightRed;
        t.thinking_fg = Color::Gray;
        t
    }

    pub fn from_name(name: &str) -> Self {
        match name {
            "Complior Dark" | "dark" | "complior-dark" => Self::complior_dark(),
            "Complior Light" | "light" | "complior-light" => Self::complior_light(),
            "Solarized Dark" | "solarized-dark" => Self::solarized_dark(),
            "Solarized Light" | "solarized-light" => Self::solarized_light(),
            "Dracula" | "dracula" => Self::dracula(),
            "Nord" | "nord" => Self::nord(),
            "Monokai" | "monokai" => Self::monokai(),
            "Gruvbox" | "gruvbox" => Self::gruvbox(),
            "High Contrast" | "high-contrast" | "high_contrast" => Self::high_contrast(),
            _ => Self::complior_dark(),
        }
    }
}

/// All 8 built-in themes in display order.
pub fn list_themes() -> Vec<ThemeColors> {
    vec![
        ThemeColors::complior_dark(),
        ThemeColors::complior_light(),
        ThemeColors::solarized_dark(),
        ThemeColors::solarized_light(),
        ThemeColors::dracula(),
        ThemeColors::nord(),
        ThemeColors::monokai(),
        ThemeColors::gruvbox(),
    ]
}

/// Syntect theme name for each TUI theme (for code highlighting).
pub fn syntect_theme_for(name: &str) -> &'static str {
    match name {
        "Complior Dark" | "dark" => "base16-ocean.dark",
        "Complior Light" | "light" => "base16-ocean.light",
        "Solarized Dark" | "solarized-dark" => "Solarized (dark)",
        "Solarized Light" | "solarized-light" => "Solarized (light)",
        "Dracula" | "dracula" => "base16-ocean.dark",
        "Nord" | "nord" => "base16-ocean.dark",
        "Monokai" | "monokai" => "base16-mocha.dark",
        "Gruvbox" | "gruvbox" => "base16-ocean.dark",
        _ => "base16-ocean.dark",
    }
}

/// Global theme accessor — initialized once, switchable at runtime.
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

pub fn current_theme_name() -> String {
    theme().name.to_string()
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
        let t = theme();
        assert_eq!(zone_color(Zone::Green), t.zone_green);
        assert_eq!(zone_color(Zone::Yellow), t.zone_yellow);
        assert_eq!(zone_color(Zone::Red), t.zone_red);
    }

    #[test]
    fn test_severity_color_mapping() {
        init_theme("dark");
        let t = theme();
        assert_eq!(severity_color(Severity::Critical), t.severity_critical);
        assert_eq!(severity_color(Severity::Info), t.severity_info);
    }

    #[test]
    fn test_8_theme_presets() {
        let themes = list_themes();
        assert_eq!(themes.len(), 8);
        assert_eq!(themes[0].name, "Complior Dark");
        assert_eq!(themes[1].name, "Complior Light");
        assert_eq!(themes[2].name, "Solarized Dark");
        assert_eq!(themes[3].name, "Solarized Light");
        assert_eq!(themes[4].name, "Dracula");
        assert_eq!(themes[5].name, "Nord");
        assert_eq!(themes[6].name, "Monokai");
        assert_eq!(themes[7].name, "Gruvbox");
    }

    #[test]
    fn test_theme_palette_completeness() {
        for t in list_themes() {
            let palette = t.palette_colors();
            assert_eq!(palette.len(), 8, "Theme {} missing palette colors", t.name);
        }
    }

    #[test]
    fn test_from_name_all_variants() {
        assert_eq!(ThemeColors::from_name("dark").name, "Complior Dark");
        assert_eq!(ThemeColors::from_name("Dracula").name, "Dracula");
        assert_eq!(ThemeColors::from_name("nord").name, "Nord");
        assert_eq!(ThemeColors::from_name("unknown").name, "Complior Dark");
    }

    #[test]
    fn test_syntect_theme_mapping() {
        assert_eq!(syntect_theme_for("dark"), "base16-ocean.dark");
        assert_eq!(syntect_theme_for("Solarized Dark"), "Solarized (dark)");
        assert_eq!(syntect_theme_for("light"), "base16-ocean.light");
    }
}
