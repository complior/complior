use std::path::PathBuf;

use serde::{Deserialize, Serialize};

const DEFAULT_ENGINE_PORT: u16 = 3099;
const DEFAULT_TICK_RATE_MS: u64 = 250;

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
    #[serde(skip)]
    pub engine_url_override: Option<String>,
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
            engine_url_override: None,
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
    match std::fs::read_to_string(&config_path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => TuiConfig::default(),
    }
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
}
