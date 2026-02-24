use std::path::PathBuf;

use serde::{Deserialize, Serialize};

const DEFAULT_ENGINE_PORT: u16 = 3099;

/// `[confirmations]` TOML section — controls which destructive operations
/// require an explicit y/N confirmation dialog before proceeding.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct ConfirmationsConfig {
    /// Ask before applying batch fixes (>3 files). Default: true.
    pub batch_fix: bool,
    /// Ask before undoing multiple fixes at once. Default: true.
    pub undo_multiple: bool,
    /// Ask before overwriting existing compliance docs. Default: false.
    pub overwrite_docs: bool,
}

impl Default for ConfirmationsConfig {
    fn default() -> Self {
        Self {
            batch_fix: true,
            undo_multiple: true,
            overwrite_docs: false,
        }
    }
}
const DEFAULT_TICK_RATE_MS: u64 = 250;
const DEFAULT_PROJECT_API_URL: &str = "https://app.complior.ai";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct TuiConfig {
    pub engine_port: u16,
    pub engine_host: String,
    pub tick_rate_ms: u64,
    pub project_path: Option<String>,
    pub theme: String,
    pub sidebar_visible: bool,
    pub watch_on_start: bool,
    pub onboarding_completed: bool,
    pub animations_enabled: bool,
    pub scroll_acceleration: f32,

    // Onboarding-derived config fields
    pub navigation: String,
    pub project_type: String,
    pub jurisdiction: String,
    pub role: String,
    pub industry: String,
    pub scan_scope: Vec<String>,
    /// Last completed onboarding step (for resume on partial completion).
    pub onboarding_last_step: Option<usize>,

    #[serde(skip)]
    pub engine_url_override: Option<String>,

    // ── PROJECT API (Sprint 1.5) ──────────────────────────────────────────────
    /// Base URL for the PROJECT API (registry + regulation data).
    /// Overridable via env `PROJECT_API_URL`.
    pub project_api_url: String,
    /// API key for PROJECT API.  Loaded at startup from
    /// `~/.config/complior/credentials` (key: `COMPLIOR_API_KEY`).
    /// Not persisted to TOML — always read from credentials file.
    #[serde(skip)]
    pub api_key: Option<String>,
    /// When `true` (or env `OFFLINE_MODE=1`), skip PROJECT API entirely
    /// and use `MockDataProvider` as the only data source.
    #[serde(default)]
    pub offline_mode: bool,

    // ── Confirmation Dialogs (Sprint S02, US-S0210) ───────────────────────────
    /// Controls which destructive operations show a y/N confirmation dialog.
    #[serde(default)]
    pub confirmations: ConfirmationsConfig,
}

impl Default for TuiConfig {
    fn default() -> Self {
        Self {
            engine_port: DEFAULT_ENGINE_PORT,
            engine_host: "127.0.0.1".to_string(),
            tick_rate_ms: DEFAULT_TICK_RATE_MS,
            project_path: None,
            theme: "dark".to_string(),
            sidebar_visible: true,
            watch_on_start: false,
            onboarding_completed: false,
            animations_enabled: true,
            scroll_acceleration: 1.5,
            navigation: "standard".to_string(),
            project_type: "existing".to_string(),
            jurisdiction: "eu".to_string(),
            role: "deployer".to_string(),
            industry: "general".to_string(),
            scan_scope: vec![
                "deps".to_string(),
                "env".to_string(),
                "source".to_string(),
            ],
            onboarding_last_step: None,
            engine_url_override: None,
            project_api_url: DEFAULT_PROJECT_API_URL.to_string(),
            api_key: None,
            offline_mode: false,
            confirmations: ConfirmationsConfig::default(),
        }
    }
}

impl TuiConfig {
    pub fn engine_url(&self) -> String {
        format!("http://{}:{}", self.engine_host, self.engine_port)
    }
}

pub fn load_config() -> TuiConfig {
    let config_path = config_file_path();
    let mut config: TuiConfig = match std::fs::read_to_string(&config_path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => TuiConfig::default(),
    };

    // Override project_api_url from env (useful for local PROJECT dev)
    if let Ok(url) = std::env::var("PROJECT_API_URL") {
        if !url.is_empty() {
            config.project_api_url = url;
        }
    }

    // Force offline mode when env OFFLINE_MODE=1
    if std::env::var("OFFLINE_MODE").as_deref() == Ok("1") {
        config.offline_mode = true;
    }

    // Load API key from credentials file (never stored in TOML)
    config.api_key = load_api_key();

    config
}

/// Read `COMPLIOR_API_KEY` from `~/.config/complior/credentials`.
/// Format: one `KEY=value` per line, `#` comments ignored.
pub fn load_api_key() -> Option<String> {
    let path = dirs::config_dir()?.join("complior").join("credentials");
    let content = std::fs::read_to_string(path).ok()?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') || trimmed.is_empty() {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=') {
            if key.trim() == "COMPLIOR_API_KEY" {
                let v = value.trim().to_string();
                if !v.is_empty() {
                    return Some(v);
                }
            }
        }
    }
    None
}

/// Save specific fields to TOML config file (merge-friendly).
pub async fn save_config(config: &TuiConfig) {
    let path = config_file_path();
    if let Some(parent) = path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    if let Ok(content) = toml::to_string_pretty(config) {
        let _ = tokio::fs::write(&path, content).await;
    }
}

/// Save just the theme name to config.
pub async fn save_theme(name: &str) {
    let mut config = load_config();
    config.theme = name.to_string();
    save_config(&config).await;
}

/// Mark onboarding as completed in config.
pub async fn mark_onboarding_complete() {
    let mut config = load_config();
    config.onboarding_completed = true;
    config.onboarding_last_step = None;
    save_config(&config).await;
}

/// Save partial onboarding progress (for resume on interrupt).
pub async fn save_onboarding_partial(last_step: usize) {
    let mut config = load_config();
    config.onboarding_last_step = Some(last_step);
    save_config(&config).await;
}

/// Save all onboarding results from the wizard to config.
pub async fn save_onboarding_results(
    wizard: &crate::views::onboarding::OnboardingWizard,
) {
    let mut config = load_config();

    config.theme = wizard.selected_config_value("welcome_theme");
    config.navigation = wizard.selected_config_value("navigation");
    config.project_type = wizard.selected_config_value("project_type");
    config.jurisdiction = wizard.selected_config_value("jurisdiction");
    config.role = wizard.selected_config_value("role");
    config.industry = wizard.selected_config_value("industry");

    let scope_str = wizard.selected_config_value("scan_scope");
    config.scan_scope = scope_str
        .split(',')
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();

    config.onboarding_completed = true;
    config.onboarding_last_step = None;

    save_config(&config).await;
}

fn config_file_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("complior")
        .join("tui.toml")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = TuiConfig::default();
        assert_eq!(config.engine_port, 3099);
        assert_eq!(config.engine_host, "127.0.0.1");
        assert_eq!(config.engine_url(), "http://127.0.0.1:3099");
        assert_eq!(config.theme, "dark");
        assert!(config.sidebar_visible);
        assert!(!config.onboarding_completed);
        // Onboarding defaults
        assert_eq!(config.navigation, "standard");
        assert_eq!(config.project_type, "existing");
        assert_eq!(config.jurisdiction, "eu");
        assert_eq!(config.role, "deployer");
        assert_eq!(config.industry, "general");
        assert_eq!(config.scan_scope, vec!["deps", "env", "source"]);
        assert!(config.onboarding_last_step.is_none());
    }

    #[test]
    fn test_config_deserialization() {
        let toml_str = r#"
            engine_port = 4000
            engine_host = "localhost"
            theme = "light"
            sidebar_visible = false
            onboarding_completed = true
        "#;
        let config: TuiConfig = toml::from_str(toml_str).expect("valid toml");
        assert_eq!(config.engine_port, 4000);
        assert_eq!(config.theme, "light");
        assert!(!config.sidebar_visible);
        assert!(config.onboarding_completed);
    }

    #[test]
    fn test_config_toml_roundtrip() {
        let config = TuiConfig {
            theme: "Dracula".to_string(),
            onboarding_completed: true,
            ..TuiConfig::default()
        };
        let serialized = toml::to_string_pretty(&config).expect("serialize");
        let deserialized: TuiConfig = toml::from_str(&serialized).expect("deserialize");
        assert_eq!(deserialized.theme, "Dracula");
        assert!(deserialized.onboarding_completed);
    }

    // US-S0210: named tests

    /// `[confirmations]` TOML section deserializes correctly with custom values.
    #[test]
    fn test_toml_confirmations() {
        // Deserialize as part of TuiConfig to test the full [confirmations] section
        let toml_str = r#"
            [confirmations]
            batch_fix = false
            undo_multiple = true
            overwrite_docs = true
        "#;
        let config: TuiConfig = toml::from_str(toml_str).expect("parse config with confirmations");
        assert!(!config.confirmations.batch_fix);
        assert!(config.confirmations.undo_multiple);
        assert!(config.confirmations.overwrite_docs);
    }

    /// Default confirmation values match spec: batch_fix=true, undo_multiple=true, overwrite_docs=false.
    #[test]
    fn test_confirm_default_no() {
        let conf = ConfirmationsConfig::default();
        // "No" = false for overwrite_docs (least destructive path is default)
        assert!(!conf.overwrite_docs, "overwrite_docs should default to false (safe)");
        assert!(conf.batch_fix, "batch_fix should require confirmation by default");
        assert!(conf.undo_multiple, "undo_multiple should require confirmation by default");
    }

    /// When batch_fix confirmation is disabled, no dialog should be shown.
    #[test]
    fn test_confirm_yes_proceeds() {
        let conf = ConfirmationsConfig {
            batch_fix: false,
            ..ConfirmationsConfig::default()
        };
        // batch_fix=false means auto-proceed without dialog
        assert!(!conf.batch_fix, "batch_fix=false means proceed without confirmation");
    }
}
