use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::input::Action;
use crate::theme;

const PROVIDERS: &[(&str, &str)] = &[
    ("anthropic", "Anthropic"),
    ("openai", "OpenAI"),
    ("openrouter", "OpenRouter"),
];

/// Result of handling a provider setup action. Applied by `app.rs`.
pub enum ProviderSetupResult {
    /// Navigate provider list: new selected index.
    NavigateProvider(usize),
    /// Advance to API key input step.
    AdvanceToKeyInput,
    /// Append char to key input buffer.
    KeyChar(char),
    /// Delete last char from key input buffer.
    KeyBackspace,
    /// Submit API key: (provider_id, api_key). Also sets as active if first provider.
    SubmitKey {
        provider_id: String,
        api_key: String,
        first_model_id: Option<String>,
    },
    /// Go back to provider selection step.
    BackToSelect,
    /// Retry after error — go back to key input.
    Retry,
    /// Success confirmed — close overlay.
    ConfirmSuccess,
    /// Close the overlay.
    Close,
    /// No state change.
    Noop,
}

pub fn render_provider_setup(frame: &mut Frame, app: &App) {
    let t = theme::theme();
    let area = centered_rect(50, 50, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Configure Provider ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    match app.provider_setup_step {
        0 => render_step_select_provider(frame, inner, app, &t),
        1 => render_step_api_key(frame, inner, app, &t),
        2 => render_step_verifying(frame, inner, app, &t),
        3 => render_step_result(frame, inner, app, &t),
        _ => {}
    }
}

fn render_step_select_provider(
    frame: &mut Frame,
    area: Rect,
    app: &App,
    t: &theme::ThemeColors,
) {
    let mut lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            "  Select a provider:",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
    ];

    for (i, (_id, name)) in PROVIDERS.iter().enumerate() {
        let indicator = if i == app.provider_setup_selected {
            " ▸ "
        } else {
            "   "
        };
        let style = if i == app.provider_setup_selected {
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };
        lines.push(Line::from(Span::styled(
            format!("{indicator}{name}"),
            style,
        )));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        "  j/k navigate  Enter select  Esc cancel",
        Style::default().fg(t.muted),
    )));

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_step_api_key(frame: &mut Frame, area: Rect, app: &App, t: &theme::ThemeColors) {
    let provider_name = PROVIDERS
        .get(app.provider_setup_selected)
        .map_or("Provider", |p| p.1);

    let masked: String = "*".repeat(app.provider_setup_key_input.len());

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            format!("  Enter API key for {provider_name}:"),
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  > ", Style::default().fg(t.accent)),
            Span::raw(&masked),
            Span::styled("▌", Style::default().fg(t.accent)),
        ]),
        Line::raw(""),
        Line::from(Span::styled(
            "  Enter submit  Esc back",
            Style::default().fg(t.muted),
        )),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_step_verifying(frame: &mut Frame, area: Rect, app: &App, t: &theme::ThemeColors) {
    let lines = vec![
        Line::raw(""),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  ", Style::default()),
            Span::styled(app.spinner.frame(), Style::default().fg(t.accent)),
            Span::styled(" Verifying...", Style::default().fg(t.fg)),
        ]),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_step_result(frame: &mut Frame, area: Rect, app: &App, t: &theme::ThemeColors) {
    let lines = if let Some(err) = &app.provider_setup_error {
        vec![
            Line::raw(""),
            Line::from(Span::styled(
                format!("  Error: {err}"),
                Style::default().fg(t.zone_red),
            )),
            Line::raw(""),
            Line::from(Span::styled(
                "  r retry  Esc cancel",
                Style::default().fg(t.muted),
            )),
        ]
    } else {
        vec![
            Line::raw(""),
            Line::from(Span::styled(
                "  Provider configured successfully!",
                Style::default()
                    .fg(t.zone_green)
                    .add_modifier(Modifier::BOLD),
            )),
            Line::raw(""),
            Line::from(Span::styled(
                "  Press Enter to continue",
                Style::default().fg(t.muted),
            )),
        ]
    };

    frame.render_widget(Paragraph::new(lines), area);
}

pub fn handle_provider_setup_action(app: &App, action: Action) -> ProviderSetupResult {
    match app.provider_setup_step {
        0 => handle_step_select(app, action),
        1 => handle_step_key_input(app, action),
        2 => ProviderSetupResult::Noop, // Waiting for verification, ignore input
        3 => handle_step_result_input(app, action),
        _ => ProviderSetupResult::Noop,
    }
}

fn handle_step_select(app: &App, action: Action) -> ProviderSetupResult {
    match action {
        Action::ScrollDown | Action::InsertChar('j') => {
            if app.provider_setup_selected + 1 < PROVIDERS.len() {
                ProviderSetupResult::NavigateProvider(app.provider_setup_selected + 1)
            } else {
                ProviderSetupResult::Noop
            }
        }
        Action::ScrollUp | Action::InsertChar('k') => {
            ProviderSetupResult::NavigateProvider(app.provider_setup_selected.saturating_sub(1))
        }
        Action::SubmitInput => ProviderSetupResult::AdvanceToKeyInput,
        Action::EnterNormalMode | Action::Quit => ProviderSetupResult::Close,
        _ => ProviderSetupResult::Noop,
    }
}

fn handle_step_key_input(app: &App, action: Action) -> ProviderSetupResult {
    match action {
        Action::InsertChar(c) => ProviderSetupResult::KeyChar(c),
        Action::DeleteChar => ProviderSetupResult::KeyBackspace,
        Action::SubmitInput => {
            if app.provider_setup_key_input.is_empty() {
                return ProviderSetupResult::Noop;
            }
            let provider_id = PROVIDERS
                .get(app.provider_setup_selected)
                .map_or("unknown", |p| p.0);
            let key = app.provider_setup_key_input.clone();

            // Determine first model if this is the first provider
            let first_model_id = if app.provider_config.active_provider.is_empty() {
                let models = crate::providers::models_for_provider(provider_id);
                models.first().map(|m| m.id.to_string())
            } else {
                None
            };

            ProviderSetupResult::SubmitKey {
                provider_id: provider_id.to_string(),
                api_key: key,
                first_model_id,
            }
        }
        Action::EnterNormalMode => ProviderSetupResult::BackToSelect,
        Action::Quit => ProviderSetupResult::Close,
        _ => ProviderSetupResult::Noop,
    }
}

fn handle_step_result_input(app: &App, action: Action) -> ProviderSetupResult {
    match action {
        Action::SubmitInput => {
            if app.provider_setup_error.is_none() {
                ProviderSetupResult::ConfirmSuccess
            } else {
                ProviderSetupResult::Noop
            }
        }
        Action::InsertChar('r') if app.provider_setup_error.is_some() => {
            ProviderSetupResult::Retry
        }
        Action::EnterNormalMode | Action::Quit => ProviderSetupResult::Close,
        _ => ProviderSetupResult::Noop,
    }
}

fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
    let v = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(area);
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(v[1])[1]
}
