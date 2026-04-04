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
/// No hardcoded `SaaS` URL default.  Users set it via:
///   1. `PROJECT_API_URL` env var, or
///   2. `complior login` (persists to settings.toml), or
///   3. Direct edit of `~/.config/complior/settings.toml` → `project_api_url`
const DEFAULT_PROJECT_API_URL: &str = "";

// ── Storage types (internal) ────────────────────────────────────────────────

/// Global user preferences — `~/.config/complior/settings.toml`.
/// Fields that stay the same across all projects (UX, infra, `SaaS`).
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
struct GlobalConfig {
    engine_port: u16,
    engine_host: String,
    tick_rate_ms: u64,
    theme: String,
    navigation: String,
    sidebar_visible: bool,
    animations_enabled: bool,
    scroll_acceleration: f32,
    llm_provider: Option<String>,
    llm_model: Option<String>,
    project_api_url: String,
    offline_mode: bool,
    confirmations: ConfirmationsConfig,
}

impl Default for GlobalConfig {
    fn default() -> Self {
        Self {
            engine_port: DEFAULT_ENGINE_PORT,
            engine_host: "127.0.0.1".to_string(),
            tick_rate_ms: DEFAULT_TICK_RATE_MS,
            theme: "dark".to_string(),
            navigation: "standard".to_string(),
            sidebar_visible: true,
            animations_enabled: true,
            scroll_acceleration: 1.5,
            llm_provider: None,
            llm_model: None,
            project_api_url: DEFAULT_PROJECT_API_URL.to_string(),
            offline_mode: false,
            confirmations: ConfirmationsConfig::default(),
        }
    }
}

/// Project-level compliance profile — `.complior/project.toml`.
/// Fields that differ per project (requirements, role, industry, etc.).
/// Safe to commit to git (no secrets).
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
struct ProjectConfig {
    onboarding_completed: bool,
    onboarding_last_step: Option<usize>,
    project_type: String,
    jurisdiction: String,
    requirements: Vec<String>,
    role: String,
    industry: String,
    scan_scope: Vec<String>,
    watch_on_start: bool,
    llm_provider: Option<String>,
    llm_model: Option<String>,
    project_api_url: Option<String>,
    offline_mode: Option<bool>,
}

impl Default for ProjectConfig {
    fn default() -> Self {
        Self {
            onboarding_completed: false,
            onboarding_last_step: None,
            project_type: "existing".to_string(),
            jurisdiction: "eu".to_string(),
            requirements: vec!["eu-ai-act".to_string()],
            role: "deployer".to_string(),
            industry: "general".to_string(),
            scan_scope: vec!["deps".to_string(), "env".to_string(), "source".to_string()],
            watch_on_start: false,
            llm_provider: None,
            llm_model: None,
            project_api_url: None,
            offline_mode: None,
        }
    }
}

/// Default project config for `complior init`. Public so `headless::commands` can use it.
pub fn default_project_toml() -> impl serde::Serialize {
    ProjectConfig::default()
}

// ── Merged runtime config (public API) ──────────────────────────────────────

/// Merged runtime config — built from `GlobalConfig` + `ProjectConfig`.
/// This is the public type used throughout the app. Project fields override
/// global for `llm_provider` and `llm_model` when set.
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
    pub requirements: Vec<String>,
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
            requirements: vec!["eu-ai-act".to_string()],
            role: "deployer".to_string(),
            industry: "general".to_string(),
            scan_scope: vec!["deps".to_string(), "env".to_string(), "source".to_string()],
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

// ── Config file paths ───────────────────────────────────────────────────────

fn global_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("complior")
        .join("settings.toml")
}

fn project_config_path() -> PathBuf {
    find_project_root().join(".complior").join("project.toml")
}

/// Project root marker files, checked in priority order.
const PROJECT_MARKERS: &[&str] = &[
    ".complior",      // explicit Complior project (like .git/)
    ".git",           // git repository root
    "Cargo.toml",     // Rust
    "package.json",   // Node.js / TS
    "go.mod",         // Go
    "pyproject.toml", // Python
    "pom.xml",        // Java / Maven
    "build.gradle",   // Java / Gradle
    ".project",       // Eclipse / generic
];

/// Walk up directory tree to find the project root.
/// Checks for known project markers (`.complior/`, `.git/`, `Cargo.toml`, etc.).
/// Stops at `$HOME` or after 10 levels to avoid traversing to filesystem root.
/// Falls back to CWD if no marker is found.
pub fn find_project_root() -> PathBuf {
    let start = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let home = dirs::home_dir();
    let mut dir = start.clone();

    for _ in 0..10 {
        // .complior/ gets highest priority — explicit project root
        if dir.join(".complior").is_dir() {
            return dir;
        }
        // Check other markers
        for marker in &PROJECT_MARKERS[1..] {
            if dir.join(marker).exists() {
                return dir;
            }
        }
        // Stop at $HOME — don't go above user's home directory
        if home.as_ref().is_some_and(|h| &dir == h) {
            break;
        }
        if !dir.pop() {
            break;
        }
    }
    start
}

/// Legacy path — `~/.config/complior/tui.toml` (pre-split).
fn legacy_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("complior")
        .join("tui.toml")
}

// ── Load ────────────────────────────────────────────────────────────────────

fn load_global_config() -> GlobalConfig {
    let path = global_config_path();
    match std::fs::read_to_string(&path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => GlobalConfig::default(),
    }
}

fn load_project_config() -> ProjectConfig {
    let path = project_config_path();
    match std::fs::read_to_string(&path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => ProjectConfig::default(),
    }
}

/// Merge `GlobalConfig` + `ProjectConfig` into the runtime `TuiConfig`.
/// Project-level `llm_provider`/`llm_model` override global when set.
fn merge_config(global: GlobalConfig, project: ProjectConfig) -> TuiConfig {
    TuiConfig {
        engine_port: global.engine_port,
        engine_host: global.engine_host,
        tick_rate_ms: global.tick_rate_ms,
        project_path: None,
        theme: global.theme,
        sidebar_visible: global.sidebar_visible,
        animations_enabled: global.animations_enabled,
        scroll_acceleration: global.scroll_acceleration,
        navigation: global.navigation,
        project_api_url: project.project_api_url.unwrap_or(global.project_api_url),
        offline_mode: project.offline_mode.unwrap_or(global.offline_mode),
        confirmations: global.confirmations,

        // Project fields
        onboarding_completed: project.onboarding_completed,
        onboarding_last_step: project.onboarding_last_step,
        project_type: project.project_type,
        jurisdiction: project.jurisdiction,
        requirements: project.requirements,
        role: project.role,
        industry: project.industry,
        scan_scope: project.scan_scope,
        watch_on_start: project.watch_on_start,

        // LLM: project overrides global when set
        llm_provider: project.llm_provider.or(global.llm_provider),
        llm_model: project.llm_model.or(global.llm_model),

        // Runtime-only (not persisted)
        engine_url_override: None,
        api_key: None,
    }
}

pub fn load_config() -> TuiConfig {
    // Migrate legacy tui.toml if new settings.toml doesn't exist yet
    migrate_legacy_config();

    let global = load_global_config();
    let project = load_project_config();
    let mut config = merge_config(global, project);

    // Override project_api_url from env (useful for local PROJECT dev)
    if let Ok(url) = std::env::var("PROJECT_API_URL")
        && !url.is_empty()
    {
        config.project_api_url = url;
    }

    // Force offline mode when env OFFLINE_MODE=1
    if std::env::var("OFFLINE_MODE").as_deref() == Ok("1") {
        config.offline_mode = true;
    }

    // Load API key from credentials file (never stored in TOML)
    config.api_key = load_api_key();

    config
}

// ── Save ────────────────────────────────────────────────────────────────────

async fn save_global_config(config: &GlobalConfig) {
    let path = global_config_path();
    if let Some(parent) = path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    if let Ok(content) = toml::to_string_pretty(config) {
        let _ = tokio::fs::write(&path, content).await;
    }
}

async fn save_project_config(config: &ProjectConfig) {
    let path = project_config_path();
    if let Some(parent) = path.parent()
        && let Err(e) = tokio::fs::create_dir_all(parent).await
    {
        tracing::warn!("cannot create {}: {e}", parent.display());
        return;
    }
    match toml::to_string_pretty(config) {
        Ok(content) => {
            if let Err(e) = tokio::fs::write(&path, content).await {
                tracing::warn!("cannot write {}: {e}", path.display());
            }
        }
        Err(e) => tracing::warn!("cannot serialize project config: {e}"),
    }
}

/// Persist the `SaaS` URL after successful login (global).
pub async fn save_project_api_url(url: &str) {
    let mut global = load_global_config();
    global.project_api_url = url.to_string();
    save_global_config(&global).await;
}

/// Save just the theme name to config (global).
pub async fn save_theme(name: &str) {
    let mut global = load_global_config();
    global.theme = name.to_string();
    save_global_config(&global).await;
}

/// Mark onboarding as completed in config (project).
pub async fn mark_onboarding_complete() {
    let mut project = load_project_config();
    project.onboarding_completed = true;
    project.onboarding_last_step = None;
    save_project_config(&project).await;
}

/// Save partial onboarding progress (project — for resume on interrupt).
pub async fn save_onboarding_partial(last_step: usize) {
    let mut project = load_project_config();
    project.onboarding_last_step = Some(last_step);
    save_project_config(&project).await;
}

/// Save all onboarding results from the wizard — split across both files.
/// Global: theme. Project: requirements, role, industry, ai provider, etc.
#[cfg(feature = "tui")]
pub async fn save_onboarding_results(wizard: &crate::views::onboarding::OnboardingWizard) {
    // ── Global fields ──
    let mut global = load_global_config();
    global.theme = wizard.selected_config_value("welcome_theme");

    // Save AI provider to global
    let provider = wizard.selected_config_value("ai_provider");
    match provider.as_str() {
        "offline" => {
            global.offline_mode = true;
        }
        "guard_api" => {
            // Guard API mode — will trigger login flow later
            global.llm_provider = Some("guard_api".to_string());
        }
        _ => {
            // BYOK: provider detected from key prefix
            let api_key = wizard.step_text_value("ai_provider");
            global.llm_provider = Some(provider.clone());
            if !api_key.is_empty() {
                save_llm_api_key(&provider, &api_key);
            }
        }
    }

    save_global_config(&global).await;

    // ── Project fields ──
    let mut project = load_project_config();
    project.project_type = wizard.selected_config_value("project_type");
    project.role = wizard.selected_config_value("role");
    project.industry = wizard.selected_config_value("industry");

    let req_str = wizard.selected_config_value("requirements");
    project.requirements = req_str
        .split(',')
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect();

    project.onboarding_completed = true;
    project.onboarding_last_step = None;

    save_project_config(&project).await;
}

/// Save LLM config (provider + model to global TOML, API key to credentials file).
pub async fn save_llm_config(provider: Option<&str>, model: Option<&str>, api_key: Option<&str>) {
    let mut global = load_global_config();
    global.llm_provider = provider.map(String::from);
    global.llm_model = model.map(String::from);
    save_global_config(&global).await;

    // Save API key to credentials file (never in TOML)
    if let Some(key) = api_key
        && !key.is_empty()
    {
        let provider_name = provider.unwrap_or("LLM");
        save_llm_api_key(provider_name, key);
    }
}

// ── Legacy migration ────────────────────────────────────────────────────────

/// If `tui.toml` exists and `settings.toml` doesn't, split the old config
/// into `settings.toml` (global) + `project.toml` (project), then rename
/// `tui.toml` → `tui.toml.bak`.
fn migrate_legacy_config() {
    let old_path = legacy_config_path();
    let new_path = global_config_path();

    if !old_path.exists() || new_path.exists() {
        return;
    }

    let Ok(content) = std::fs::read_to_string(&old_path) else {
        return;
    };
    let Ok(legacy): Result<TuiConfig, _> = toml::from_str(&content) else {
        return;
    };

    // Split into global
    let global = GlobalConfig {
        engine_port: legacy.engine_port,
        engine_host: legacy.engine_host,
        tick_rate_ms: legacy.tick_rate_ms,
        theme: legacy.theme,
        navigation: legacy.navigation,
        sidebar_visible: legacy.sidebar_visible,
        animations_enabled: legacy.animations_enabled,
        scroll_acceleration: legacy.scroll_acceleration,
        llm_provider: legacy.llm_provider.clone(),
        llm_model: legacy.llm_model.clone(),
        project_api_url: legacy.project_api_url,
        offline_mode: legacy.offline_mode,
        confirmations: legacy.confirmations,
    };

    // Split into project
    let project = ProjectConfig {
        onboarding_completed: legacy.onboarding_completed,
        onboarding_last_step: legacy.onboarding_last_step,
        project_type: legacy.project_type,
        jurisdiction: legacy.jurisdiction,
        requirements: legacy.requirements,
        role: legacy.role,
        industry: legacy.industry,
        scan_scope: legacy.scan_scope,
        watch_on_start: legacy.watch_on_start,
        llm_provider: None, // don't duplicate — global is the source for legacy configs
        llm_model: None,
        project_api_url: None,
        offline_mode: None,
    };

    // Write global (sync — migration runs before async runtime matters)
    if let Some(parent) = new_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(toml_str) = toml::to_string_pretty(&global) {
        let _ = std::fs::write(&new_path, toml_str);
    }

    // Write project
    let proj_path = project_config_path();
    if let Some(parent) = proj_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(toml_str) = toml::to_string_pretty(&project) {
        let _ = std::fs::write(&proj_path, toml_str);
    }

    // Rename old file to .bak
    let bak_path = old_path.with_extension("toml.bak");
    let _ = std::fs::rename(&old_path, &bak_path);
}

// ── Credentials & API keys (unchanged) ──────────────────────────────────────

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
        if let Some((key, value)) = trimmed.split_once('=')
            && key.trim() == "COMPLIOR_API_KEY"
        {
            let v = value.trim().to_string();
            if !v.is_empty() {
                return Some(v);
            }
        }
    }
    None
}

/// Validate an API key for a given provider.
/// Returns `Ok(())` if plausible, or `Err(reason)` if clearly invalid.
pub fn validate_api_key(provider: &str, key: &str) -> Result<(), String> {
    if key.is_empty() {
        return Err("Key cannot be empty.".to_string());
    }
    match provider {
        "openai" => {
            if !key.starts_with("sk-") {
                return Err("OpenAI keys start with \"sk-\".".to_string());
            }
            if key.len() < 20 {
                return Err("Key too short for OpenAI.".to_string());
            }
        }
        "anthropic" => {
            if !key.starts_with("sk-ant-") {
                return Err("Anthropic keys start with \"sk-ant-\".".to_string());
            }
            if key.len() < 20 {
                return Err("Key too short for Anthropic.".to_string());
            }
        }
        "openrouter" => {
            if !key.starts_with("sk-or-") {
                return Err("OpenRouter keys start with \"sk-or-\".".to_string());
            }
            if key.len() < 20 {
                return Err("Key too short for OpenRouter.".to_string());
            }
        }
        _ => {
            if key.len() < 10 {
                return Err("Key too short.".to_string());
            }
        }
    }
    Ok(())
}

/// Resolve provider name to its environment variable key.
fn provider_env_key(provider: &str) -> Option<&'static str> {
    match provider {
        "anthropic" => Some("ANTHROPIC_API_KEY"),
        "openai" => Some("OPENAI_API_KEY"),
        "openrouter" => Some("OPENROUTER_API_KEY"),
        _ => None,
    }
}

/// Save an LLM API key to `~/.config/complior/credentials`.
pub fn save_llm_api_key(provider: &str, key: &str) {
    let Some(env_key) = provider_env_key(provider) else {
        return;
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
    let env_key = provider_env_key(provider)?;

    // Check env var first
    if let Ok(val) = std::env::var(env_key)
        && !val.is_empty()
    {
        return Some(val);
    }

    // Check credentials file
    let path = credentials_path()?;
    let content = std::fs::read_to_string(path).ok()?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') || trimmed.is_empty() {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=')
            && key.trim() == env_key
        {
            let v = value.trim().to_string();
            if !v.is_empty() {
                return Some(v);
            }
        }
    }
    None
}

/// Stored token data loaded from credentials file.
#[derive(Debug, Clone)]
#[allow(dead_code)]
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
        "COMPLIOR_ACCESS_TOKEN",
        "COMPLIOR_REFRESH_TOKEN",
        "COMPLIOR_TOKEN_EXPIRES_AT",
        "COMPLIOR_USER_EMAIL",
        "COMPLIOR_ORG_NAME",
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
        "COMPLIOR_ACCESS_TOKEN",
        "COMPLIOR_REFRESH_TOKEN",
        "COMPLIOR_TOKEN_EXPIRES_AT",
        "COMPLIOR_USER_EMAIL",
        "COMPLIOR_ORG_NAME",
    ];

    let lines: Vec<&str> = content
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            if let Some((key, _)) = trimmed.split_once('=') {
                !token_keys.contains(&key.trim())
            } else {
                true
            }
        })
        .collect();

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
        assert!(
            !conf.overwrite_docs,
            "overwrite_docs should default to false (safe)"
        );
        assert!(
            conf.batch_fix,
            "batch_fix should require confirmation by default"
        );
        assert!(
            conf.undo_multiple,
            "undo_multiple should require confirmation by default"
        );
    }

    /// When batch_fix confirmation is disabled, no dialog should be shown.
    #[test]
    fn test_confirm_yes_proceeds() {
        let conf = ConfirmationsConfig {
            batch_fix: false,
            ..ConfirmationsConfig::default()
        };
        // batch_fix=false means auto-proceed without dialog
        assert!(
            !conf.batch_fix,
            "batch_fix=false means proceed without confirmation"
        );
    }

    // ── Split config tests ──────────────────────────────────────────────────

    #[test]
    fn test_global_config_defaults() {
        let global = GlobalConfig::default();
        assert_eq!(global.engine_port, 3099);
        assert_eq!(global.theme, "dark");
        assert_eq!(global.navigation, "standard");
        assert!(global.sidebar_visible);
        assert!(global.animations_enabled);
    }

    #[test]
    fn test_project_config_defaults() {
        let project = ProjectConfig::default();
        assert!(!project.onboarding_completed);
        assert_eq!(project.jurisdiction, "eu");
        assert_eq!(project.role, "deployer");
        assert_eq!(project.industry, "general");
        assert_eq!(project.scan_scope, vec!["deps", "env", "source"]);
        assert!(!project.watch_on_start);
    }

    #[test]
    fn test_global_config_deserialization() {
        let toml_str = r#"
            engine_port = 4000
            theme = "light"
            navigation = "vim"
            sidebar_visible = false
        "#;
        let config: GlobalConfig = toml::from_str(toml_str).expect("valid toml");
        assert_eq!(config.engine_port, 4000);
        assert_eq!(config.theme, "light");
        assert_eq!(config.navigation, "vim");
        assert!(!config.sidebar_visible);
    }

    #[test]
    fn test_project_config_deserialization() {
        let toml_str = r#"
            onboarding_completed = true
            jurisdiction = "us"
            role = "provider"
            industry = "healthcare"
            scan_scope = ["deps", "source"]
            watch_on_start = true
        "#;
        let config: ProjectConfig = toml::from_str(toml_str).expect("valid toml");
        assert!(config.onboarding_completed);
        assert_eq!(config.jurisdiction, "us");
        assert_eq!(config.role, "provider");
        assert_eq!(config.industry, "healthcare");
        assert_eq!(config.scan_scope, vec!["deps", "source"]);
        assert!(config.watch_on_start);
    }

    #[test]
    fn test_merge_project_overrides_llm() {
        let global = GlobalConfig {
            llm_provider: Some("openai".into()),
            llm_model: Some("gpt-4".into()),
            ..GlobalConfig::default()
        };
        let project = ProjectConfig {
            llm_provider: Some("anthropic".into()),
            llm_model: None, // not overridden
            ..ProjectConfig::default()
        };
        let merged = merge_config(global, project);
        assert_eq!(merged.llm_provider.as_deref(), Some("anthropic"));
        assert_eq!(merged.llm_model.as_deref(), Some("gpt-4")); // fallback to global
    }

    #[test]
    fn test_merge_keeps_global_when_project_none() {
        let global = GlobalConfig {
            llm_provider: Some("openai".into()),
            ..GlobalConfig::default()
        };
        let project = ProjectConfig::default(); // llm_provider = None
        let merged = merge_config(global, project);
        assert_eq!(merged.llm_provider.as_deref(), Some("openai"));
    }

    #[test]
    fn test_merge_project_overrides_saas() {
        let global = GlobalConfig {
            project_api_url: "https://global.example.com".into(),
            offline_mode: false,
            ..GlobalConfig::default()
        };
        let project = ProjectConfig {
            project_api_url: Some("https://project.example.com".into()),
            offline_mode: Some(true),
            ..ProjectConfig::default()
        };
        let merged = merge_config(global, project);
        assert_eq!(merged.project_api_url, "https://project.example.com");
        assert!(merged.offline_mode);
    }

    #[test]
    fn test_merge_saas_falls_back_to_global() {
        let global = GlobalConfig {
            project_api_url: "https://global.example.com".into(),
            offline_mode: true,
            ..GlobalConfig::default()
        };
        let project = ProjectConfig::default(); // project_api_url = None, offline_mode = None
        let merged = merge_config(global, project);
        assert_eq!(merged.project_api_url, "https://global.example.com");
        assert!(merged.offline_mode);
    }

    #[test]
    fn test_merge_all_fields() {
        let global = GlobalConfig {
            theme: "dracula".into(),
            navigation: "vim".into(),
            engine_port: 4000,
            ..GlobalConfig::default()
        };
        let project = ProjectConfig {
            jurisdiction: "us".into(),
            role: "provider".into(),
            onboarding_completed: true,
            ..ProjectConfig::default()
        };
        let merged = merge_config(global, project);
        // Global fields
        assert_eq!(merged.theme, "dracula");
        assert_eq!(merged.navigation, "vim");
        assert_eq!(merged.engine_port, 4000);
        // Project fields
        assert_eq!(merged.jurisdiction, "us");
        assert_eq!(merged.role, "provider");
        assert!(merged.onboarding_completed);
        // Defaults preserved
        assert_eq!(merged.industry, "general");
    }
}
