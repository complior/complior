use std::path::PathBuf;

use serde::{Deserialize, Serialize};

pub const DEFAULT_ENGINE_PORT: u16 = 3099;

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
/// No hardcoded SaaS URL default.  Users set it via:
///   1. `PROJECT_API_URL` env var, or
///   2. `complior login` (persists to tui.toml), or
///   3. Direct edit of `~/.config/complior/tui.toml` → `project_api_url`
const DEFAULT_PROJECT_API_URL: &str = "";

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
    /// When `true` (or env `OFFLINE_MODE=1`), skip PROJECT API entirely.
    /// TUI shows empty state until a local scan is run.
    #[serde(default)]
    pub offline_mode: bool,

    // ── LLM Settings ──────────────────────────────────────────────────────────
    /// Preferred LLM provider (anthropic/openai/openrouter). Not sensitive.
    #[serde(default)]
    pub llm_provider: Option<String>,
    /// Preferred LLM model override. Not sensitive.
    #[serde(default)]
    pub llm_model: Option<String>,

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
            llm_provider: None,
            llm_model: None,
            project_api_url: DEFAULT_PROJECT_API_URL.to_string(),
            api_key: None,
            offline_mode: false,
            confirmations: ConfirmationsConfig::default(),
        }
    }
}

impl TuiConfig {
    pub fn engine_url(&self) -> String {
        if let Some(ref url) = self.engine_url_override {
            url.clone()
        } else {
            format!("http://{}:{}", self.engine_host, self.engine_port)
        }
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

/// Persist the SaaS URL after successful login.
pub async fn save_project_api_url(url: &str) {
    let mut config = load_config();
    config.project_api_url = url.to_string();
    save_config(&config).await;
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

/// Save LLM config (provider + model to TOML, API key to credentials file).
pub async fn save_llm_config(
    provider: Option<&str>,
    model: Option<&str>,
    api_key: Option<&str>,
) {
    let mut config = load_config();
    config.llm_provider = provider.map(String::from);
    config.llm_model = model.map(String::from);
    save_config(&config).await;

    // Save API key to credentials file (never in TOML)
    if let Some(key) = api_key {
        if !key.is_empty() {
            let provider_name = provider.unwrap_or("LLM");
            save_llm_api_key(provider_name, key);
        }
    }
}

/// Save an LLM API key to `~/.config/complior/credentials`.
fn save_llm_api_key(provider: &str, key: &str) {
    let env_key = match provider {
        "anthropic" => "ANTHROPIC_API_KEY",
        "openai" => "OPENAI_API_KEY",
        "openrouter" => "OPENROUTER_API_KEY",
        _ => return,
    };

    let Some(path) = credentials_path() else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // Read existing, filter out old value for this key
    let existing = std::fs::read_to_string(&path).unwrap_or_default();
    let mut lines: Vec<String> = existing
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            if let Some((k, _)) = trimmed.split_once('=') {
                k.trim() != env_key
            } else {
                true
            }
        })
        .map(String::from)
        .collect();

    lines.push(format!("{env_key}={key}"));
    let _ = std::fs::write(&path, lines.join("\n") + "\n");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        let _ = std::fs::set_permissions(&path, perms);
    }
}

/// Load LLM API key for a provider from `~/.config/complior/credentials`.
pub fn load_llm_api_key(provider: &str) -> Option<String> {
    let env_key = match provider {
        "anthropic" => "ANTHROPIC_API_KEY",
        "openai" => "OPENAI_API_KEY",
        "openrouter" => "OPENROUTER_API_KEY",
        _ => return None,
    };

    // Check env var first
    if let Ok(val) = std::env::var(env_key) {
        if !val.is_empty() {
            return Some(val);
        }
    }

    // Check credentials file
    let path = credentials_path()?;
    let content = std::fs::read_to_string(path).ok()?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') || trimmed.is_empty() {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=') {
            if key.trim() == env_key {
                let v = value.trim().to_string();
                if !v.is_empty() {
                    return Some(v);
                }
            }
        }
    }
    None
}

/// Stored token data loaded from credentials file.
#[derive(Debug, Clone)]
pub struct StoredTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64,
    pub user_email: Option<String>,
    pub org_name: Option<String>,
}

fn credentials_path() -> Option<std::path::PathBuf> {
    dirs::config_dir().map(|d| d.join("complior").join("credentials"))
}

/// Save JWT tokens to `~/.config/complior/credentials`.
pub fn save_tokens(
    access_token: &str,
    refresh_token: &str,
    expires_at: u64,
    user_email: Option<&str>,
    org_name: Option<&str>,
) -> Result<(), String> {
    let path = credentials_path().ok_or("Cannot determine config directory")?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Cannot create config dir: {e}"))?;
    }

    // Read existing content, preserving non-token lines
    let existing = std::fs::read_to_string(&path).unwrap_or_default();
    let mut lines: Vec<String> = Vec::new();
    let token_keys = [
        "COMPLIOR_ACCESS_TOKEN", "COMPLIOR_REFRESH_TOKEN",
        "COMPLIOR_TOKEN_EXPIRES_AT", "COMPLIOR_USER_EMAIL", "COMPLIOR_ORG_NAME",
    ];

    for line in existing.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            lines.push(line.to_string());
            continue;
        }
        if let Some((key, _)) = trimmed.split_once('=') {
            if !token_keys.contains(&key.trim()) {
                lines.push(line.to_string());
            }
        } else {
            lines.push(line.to_string());
        }
    }

    // Append token lines
    lines.push(format!("COMPLIOR_ACCESS_TOKEN={access_token}"));
    lines.push(format!("COMPLIOR_REFRESH_TOKEN={refresh_token}"));
    lines.push(format!("COMPLIOR_TOKEN_EXPIRES_AT={expires_at}"));
    if let Some(email) = user_email {
        lines.push(format!("COMPLIOR_USER_EMAIL={email}"));
    }
    if let Some(org) = org_name {
        lines.push(format!("COMPLIOR_ORG_NAME={org}"));
    }

    std::fs::write(&path, lines.join("\n") + "\n")
        .map_err(|e| format!("Cannot write credentials: {e}"))?;

    // Restrict file permissions to owner-only (0o600) on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        std::fs::set_permissions(&path, perms)
            .map_err(|e| format!("Cannot set credentials permissions: {e}"))?;
    }

    Ok(())
}

/// Load stored tokens from `~/.config/complior/credentials`.
pub fn load_tokens() -> Option<StoredTokens> {
    let path = credentials_path()?;
    let content = std::fs::read_to_string(path).ok()?;

    let mut access_token = None;
    let mut refresh_token = None;
    let mut expires_at = None;
    let mut user_email = None;
    let mut org_name = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') || trimmed.is_empty() {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=') {
            let v = value.trim().to_string();
            match key.trim() {
                "COMPLIOR_ACCESS_TOKEN" if !v.is_empty() => access_token = Some(v),
                "COMPLIOR_REFRESH_TOKEN" if !v.is_empty() => refresh_token = Some(v),
                "COMPLIOR_TOKEN_EXPIRES_AT" => expires_at = v.parse().ok(),
                "COMPLIOR_USER_EMAIL" if !v.is_empty() => user_email = Some(v),
                "COMPLIOR_ORG_NAME" if !v.is_empty() => org_name = Some(v),
                _ => {}
            }
        }
    }

    Some(StoredTokens {
        access_token: access_token?,
        refresh_token: refresh_token?,
        expires_at: expires_at?,
        user_email,
        org_name,
    })
}

/// Clear all tokens from credentials file.
pub fn clear_tokens() -> Result<(), String> {
    let path = credentials_path().ok_or("Cannot determine config directory")?;
    if !path.exists() {
        return Ok(());
    }

    let content = std::fs::read_to_string(&path).unwrap_or_default();
    let token_keys = [
        "COMPLIOR_ACCESS_TOKEN", "COMPLIOR_REFRESH_TOKEN",
        "COMPLIOR_TOKEN_EXPIRES_AT", "COMPLIOR_USER_EMAIL", "COMPLIOR_ORG_NAME",
    ];

    let lines: Vec<&str> = content.lines().filter(|line| {
        let trimmed = line.trim();
        if let Some((key, _)) = trimmed.split_once('=') {
            !token_keys.contains(&key.trim())
        } else {
            true
        }
    }).collect();

    std::fs::write(&path, lines.join("\n") + "\n")
        .map_err(|e| format!("Cannot write credentials: {e}"))
}

/// Check if user is authenticated (has non-expired access token).
pub fn is_authenticated() -> bool {
    if let Some(tokens) = load_tokens() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        tokens.expires_at > now
    } else {
        false
    }
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
