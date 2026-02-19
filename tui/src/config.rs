use std::path::PathBuf;

use serde::Deserialize;

const DEFAULT_ENGINE_PORT: u16 = 3099;
const DEFAULT_TICK_RATE_MS: u64 = 250;

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct TuiConfig {
    pub engine_port: u16,
    pub engine_host: String,
    pub tick_rate_ms: u64,
    pub project_path: Option<String>,
    pub theme: String,
    pub sidebar_visible: bool,
    pub watch_on_start: bool,
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
    }

    #[test]
    fn test_config_deserialization() {
        let toml_str = r#"
            engine_port = 4000
            engine_host = "localhost"
            theme = "light"
            sidebar_visible = false
        "#;
        let config: TuiConfig = toml::from_str(toml_str).expect("valid toml");
        assert_eq!(config.engine_port, 4000);
        assert_eq!(config.theme, "light");
        assert!(!config.sidebar_visible);
    }
}
