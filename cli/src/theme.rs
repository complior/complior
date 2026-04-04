use ratatui::style::{Color, Modifier, Style};

use crate::types::{FindingType, Severity, Zone};

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
    pub user_msg_bg: Color,
}

// --- Theme data loading (compile-time embedded JSON) ---

/// Raw JSON theme data embedded at compile time from `cli/data/themes.json`.
const THEMES_JSON: &str = include_str!("../data/themes.json");

/// Parsed theme entry from JSON.
#[derive(serde::Deserialize)]
#[allow(dead_code)]
struct ThemeEntry {
    name: String,
    aliases: Vec<String>,
    syntect: String,
    bg: [u8; 3],
    fg: [u8; 3],
    border: [u8; 3],
    border_focused: [u8; 3],
    accent: [u8; 3],
    muted: [u8; 3],
    zone_green: [u8; 3],
    zone_yellow: [u8; 3],
    zone_red: [u8; 3],
    severity_critical: [u8; 3],
    severity_high: [u8; 3],
    severity_medium: [u8; 3],
    severity_low: [u8; 3],
    severity_info: [u8; 3],
    diff_added: [u8; 3],
    diff_removed: [u8; 3],
    diff_header: [u8; 3],
    user_msg: [u8; 3],
    assistant_msg: [u8; 3],
    system_msg: [u8; 3],
    selection_bg: [u8; 3],
    status_bar_bg: [u8; 3],
    status_bar_fg: [u8; 3],
    tool_call_border: [u8; 3],
    tool_result_ok: [u8; 3],
    tool_result_err: [u8; 3],
    thinking_fg: [u8; 3],
    #[serde(default = "default_user_msg_bg")]
    user_msg_bg: [u8; 3],
}

const fn default_user_msg_bg() -> [u8; 3] {
    [40, 42, 54]
}

const fn rgb(c: [u8; 3]) -> Color {
    Color::Rgb(c[0], c[1], c[2])
}

/// All theme entries parsed from embedded JSON. Lazily initialized.
fn load_theme_entries() -> Vec<ThemeEntry> {
    serde_json::from_str(THEMES_JSON).expect("themes.json should be valid")
}

impl ThemeColors {
    /// 8 palette colors for the preview bar in Theme Picker.
    pub const fn palette_colors(&self) -> [Color; 8] {
        [
            self.bg,
            self.fg,
            self.accent,
            self.border,
            self.zone_green,
            self.zone_yellow,
            self.zone_red,
            self.muted,
        ]
    }

    fn from_entry(entry: &ThemeEntry) -> Self {
        Self {
            // Leak the name string to get a &'static str — themes are loaded once
            name: Box::leak(entry.name.clone().into_boxed_str()),
            bg: rgb(entry.bg),
            fg: rgb(entry.fg),
            border: rgb(entry.border),
            border_focused: rgb(entry.border_focused),
            accent: rgb(entry.accent),
            muted: rgb(entry.muted),
            zone_green: rgb(entry.zone_green),
            zone_yellow: rgb(entry.zone_yellow),
            zone_red: rgb(entry.zone_red),
            severity_critical: rgb(entry.severity_critical),
            severity_high: rgb(entry.severity_high),
            severity_medium: rgb(entry.severity_medium),
            severity_low: rgb(entry.severity_low),
            severity_info: rgb(entry.severity_info),
            diff_added: rgb(entry.diff_added),
            diff_removed: rgb(entry.diff_removed),
            diff_header: rgb(entry.diff_header),
            user_msg: rgb(entry.user_msg),
            assistant_msg: rgb(entry.assistant_msg),
            system_msg: rgb(entry.system_msg),
            selection_bg: rgb(entry.selection_bg),
            status_bar_bg: rgb(entry.status_bar_bg),
            status_bar_fg: rgb(entry.status_bar_fg),
            tool_call_border: rgb(entry.tool_call_border),
            tool_result_ok: rgb(entry.tool_result_ok),
            tool_result_err: rgb(entry.tool_result_err),
            thinking_fg: rgb(entry.thinking_fg),
            user_msg_bg: rgb(entry.user_msg_bg),
        }
    }

    /// Backward-compatible alias for default dark theme.
    pub fn dark() -> Self {
        Self::from_name("dark")
    }

    pub fn high_contrast() -> Self {
        let mut t = Self::from_name("dark");
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
        t.user_msg_bg = Color::Rgb(40, 40, 60);
        t
    }

    pub fn from_name(name: &str) -> Self {
        let lower = name.to_lowercase();

        // Check High Contrast first (not in JSON)
        if lower == "high contrast" || lower == "high-contrast" || lower == "high_contrast" {
            return Self::high_contrast();
        }

        let entries = load_theme_entries();
        for entry in &entries {
            if entry.name.to_lowercase() == lower {
                return Self::from_entry(entry);
            }
            for alias in &entry.aliases {
                if alias.to_lowercase() == lower {
                    return Self::from_entry(entry);
                }
            }
        }

        // Default: first theme
        Self::from_entry(&entries[0])
    }
}

/// All 8 built-in themes in display order.
pub fn list_themes() -> Vec<ThemeColors> {
    load_theme_entries()
        .iter()
        .map(ThemeColors::from_entry)
        .collect()
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
        .map_or_else(ThemeColors::dark, |m| m.lock().expect("theme lock").clone())
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

pub fn finding_type_color(ft: FindingType) -> Color {
    let t = theme();
    match ft {
        FindingType::A => t.accent,      // blue — code fix
        FindingType::B => t.zone_green,  // green — missing file
        FindingType::C => t.zone_yellow, // yellow — config change
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
}
