//! LLM Settings overlay — provider/API key/model configuration.

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph};
use ratatui::Frame;

use crate::theme;
use crate::types::LlmSessionConfig;

/// LLM provider definitions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Provider {
    Anthropic,
    OpenAI,
    OpenRouter,
}

pub const PROVIDERS: [Provider; 3] = [Provider::Anthropic, Provider::OpenAI, Provider::OpenRouter];

impl Provider {
    pub const fn name(self) -> &'static str {
        match self {
            Self::Anthropic => "anthropic",
            Self::OpenAI => "openai",
            Self::OpenRouter => "openrouter",
        }
    }

    pub const fn display(self) -> &'static str {
        match self {
            Self::Anthropic => "Anthropic",
            Self::OpenAI => "OpenAI",
            Self::OpenRouter => "OpenRouter",
        }
    }

    pub const fn env_var(self) -> &'static str {
        match self {
            Self::Anthropic => "ANTHROPIC_API_KEY",
            Self::OpenAI => "OPENAI_API_KEY",
            Self::OpenRouter => "OPENROUTER_API_KEY",
        }
    }
}

/// Focused field in the LLM settings overlay.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LlmSettingsField {
    Provider,
    ApiKey,
    Model,
    TestConnection,
}

/// State for the LLM Settings overlay.
pub struct LlmSettingsState {
    pub focused_field: LlmSettingsField,
    pub selected_provider: usize,
    pub api_key_input: String,
    pub model_input: String,
    pub editing: bool,
    pub test_status: Option<Result<String, String>>,
    pub env_keys: Vec<(Provider, bool)>,
}

impl LlmSettingsState {
    pub fn new(config: &LlmSessionConfig) -> Self {
        let selected_provider = config
            .provider
            .as_deref()
            .and_then(|p| PROVIDERS.iter().position(|pr| pr.name() == p))
            .unwrap_or(0);

        let env_keys: Vec<(Provider, bool)> = PROVIDERS
            .iter()
            .map(|p| (*p, std::env::var(p.env_var()).is_ok()))
            .collect();

        Self {
            focused_field: LlmSettingsField::Provider,
            selected_provider,
            api_key_input: config.api_key.clone().unwrap_or_default(),
            model_input: config.model.clone().unwrap_or_default(),
            editing: false,
            test_status: None,
            env_keys,
        }
    }
}

/// Render the LLM Settings as a centered modal overlay.
pub fn render_llm_settings(frame: &mut Frame, state: &LlmSettingsState) {
    let t = theme::theme();
    let area = centered_rect(60, 18, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" LLM Settings ")
        .title_style(Style::default().fg(t.accent).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Provider
            Constraint::Length(3), // API Key
            Constraint::Length(3), // Model
            Constraint::Length(2), // Test Connection
            Constraint::Min(1),   // Footer
        ])
        .split(inner);

    // --- Provider ---
    render_provider_field(frame, chunks[0], state, &t);

    // --- API Key ---
    render_api_key_field(frame, chunks[1], state, &t);

    // --- Model ---
    render_model_field(frame, chunks[2], state, &t);

    // --- Test Connection ---
    render_test_button(frame, chunks[3], state, &t);

    // --- Footer ---
    let footer = Line::from(vec![
        Span::styled("j/k", Style::default().fg(t.accent)),
        Span::styled(":navigate ", Style::default().fg(t.muted)),
        Span::styled("Enter", Style::default().fg(t.accent)),
        Span::styled(":edit ", Style::default().fg(t.muted)),
        Span::styled("Space", Style::default().fg(t.accent)),
        Span::styled(":select ", Style::default().fg(t.muted)),
        Span::styled("Esc", Style::default().fg(t.accent)),
        Span::styled(":save & close", Style::default().fg(t.muted)),
    ]);
    frame.render_widget(Paragraph::new(footer), chunks[4]);
}

fn render_provider_field(
    frame: &mut Frame,
    area: Rect,
    state: &LlmSettingsState,
    t: &theme::ThemeColors,
) {
    let focused = state.focused_field == LlmSettingsField::Provider;
    let border_color = if focused { t.accent } else { t.muted };

    let mut spans: Vec<Span<'_>> = vec![Span::styled(
        " Provider: ",
        Style::default().fg(t.fg),
    )];

    for (i, provider) in PROVIDERS.iter().enumerate() {
        let is_selected = i == state.selected_provider;
        let marker = if is_selected { "(x) " } else { "( ) " };
        let style = if is_selected {
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };
        spans.push(Span::styled(marker, style));
        spans.push(Span::styled(provider.display(), style));
        spans.push(Span::raw("  "));
    }

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(border_color));

    frame.render_widget(
        Paragraph::new(Line::from(spans)).block(block),
        area,
    );
}

fn render_api_key_field(
    frame: &mut Frame,
    area: Rect,
    state: &LlmSettingsState,
    t: &theme::ThemeColors,
) {
    let focused = state.focused_field == LlmSettingsField::ApiKey;
    let editing = focused && state.editing;
    let border_color = if editing {
        t.zone_green
    } else if focused {
        t.accent
    } else {
        t.muted
    };

    let provider = PROVIDERS[state.selected_provider];
    let env_configured = state
        .env_keys
        .iter()
        .any(|(p, has)| *p == provider && *has);

    let value_display = if editing {
        format!("{}\u{258c}", state.api_key_input) // cursor
    } else if !state.api_key_input.is_empty() {
        mask_api_key(&state.api_key_input)
    } else if env_configured {
        format!("(env: {} configured)", provider.env_var())
    } else {
        "(not set)".to_string()
    };

    let style = if env_configured && state.api_key_input.is_empty() {
        Style::default().fg(t.zone_green)
    } else if state.api_key_input.is_empty() {
        Style::default().fg(t.muted)
    } else {
        Style::default().fg(t.fg)
    };

    let line = Line::from(vec![
        Span::styled(" API Key: ", Style::default().fg(t.fg)),
        Span::styled(value_display, style),
    ]);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(border_color));

    frame.render_widget(Paragraph::new(line).block(block), area);
}

fn render_model_field(
    frame: &mut Frame,
    area: Rect,
    state: &LlmSettingsState,
    t: &theme::ThemeColors,
) {
    let focused = state.focused_field == LlmSettingsField::Model;
    let editing = focused && state.editing;
    let border_color = if editing {
        t.zone_green
    } else if focused {
        t.accent
    } else {
        t.muted
    };

    let value_display = if editing {
        format!("{}\u{258c}", state.model_input)
    } else if state.model_input.is_empty() {
        "(default)".to_string()
    } else {
        state.model_input.clone()
    };

    let style = if state.model_input.is_empty() {
        Style::default().fg(t.muted)
    } else {
        Style::default().fg(t.fg)
    };

    let line = Line::from(vec![
        Span::styled(" Model:   ", Style::default().fg(t.fg)),
        Span::styled(value_display, style),
    ]);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(border_color));

    frame.render_widget(Paragraph::new(line).block(block), area);
}

fn render_test_button(
    frame: &mut Frame,
    area: Rect,
    state: &LlmSettingsState,
    t: &theme::ThemeColors,
) {
    let focused = state.focused_field == LlmSettingsField::TestConnection;
    let (status_icon, status_color) = match &state.test_status {
        None => ("", t.muted),
        Some(Ok(_)) => (" \u{2713} Connected", t.zone_green),
        Some(Err(_)) => (" \u{2717} Failed", t.zone_red),
    };

    let btn_style = if focused {
        Style::default()
            .fg(t.accent)
            .add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(t.fg)
    };

    let line = Line::from(vec![
        Span::styled(
            if focused {
                " [ Test Connection ] "
            } else {
                "   Test Connection   "
            },
            btn_style,
        ),
        Span::styled(status_icon, Style::default().fg(status_color)),
    ]);

    frame.render_widget(Paragraph::new(line), area);
}

/// Mask an API key: show last 4 chars only.
fn mask_api_key(key: &str) -> String {
    if key.len() <= 4 {
        "****".to_string()
    } else {
        format!("****{}", &key[key.len() - 4..])
    }
}

fn centered_rect(width: u16, height: u16, area: Rect) -> Rect {
    let x = area.x + area.width.saturating_sub(width) / 2;
    let y = area.y + area.height.saturating_sub(height) / 2;
    Rect::new(x, y, width.min(area.width), height.min(area.height))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_name() {
        assert_eq!(Provider::Anthropic.name(), "anthropic");
        assert_eq!(Provider::OpenAI.name(), "openai");
        assert_eq!(Provider::OpenRouter.name(), "openrouter");
    }

    #[test]
    fn test_mask_api_key() {
        assert_eq!(mask_api_key("sk-1234567890abcdef"), "****cdef");
        assert_eq!(mask_api_key("ab"), "****");
    }

    #[test]
    fn test_llm_settings_state_default() {
        let config = LlmSessionConfig::default();
        let state = LlmSettingsState::new(&config);
        assert_eq!(state.selected_provider, 0);
        assert!(state.api_key_input.is_empty());
        assert!(state.model_input.is_empty());
        assert!(!state.editing);
        assert!(state.test_status.is_none());
    }

    #[test]
    fn test_llm_settings_state_with_config() {
        let config = LlmSessionConfig {
            provider: Some("openai".to_string()),
            model: Some("gpt-4o".to_string()),
            api_key: Some("sk-test123".to_string()),
        };
        let state = LlmSettingsState::new(&config);
        assert_eq!(state.selected_provider, 1);
        assert_eq!(state.api_key_input, "sk-test123");
        assert_eq!(state.model_input, "gpt-4o");
    }
}
