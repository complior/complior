use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph};
use ratatui::Frame;

use crate::app::{App, AppCommand};
use crate::input::Action;
use crate::theme;
use crate::types::Overlay;

const PROVIDERS: &[(&str, &str)] = &[
    ("anthropic", "Anthropic"),
    ("openai", "OpenAI"),
    ("openrouter", "OpenRouter"),
];

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

pub fn handle_provider_setup_action(app: &mut App, action: Action) -> Option<AppCommand> {
    match app.provider_setup_step {
        0 => handle_step_select(app, action),
        1 => handle_step_key_input(app, action),
        2 => None, // Waiting for verification, ignore input
        3 => handle_step_result_input(app, action),
        _ => None,
    }
}

fn handle_step_select(app: &mut App, action: Action) -> Option<AppCommand> {
    match action {
        Action::ScrollDown | Action::InsertChar('j') => {
            if app.provider_setup_selected + 1 < PROVIDERS.len() {
                app.provider_setup_selected += 1;
            }
            None
        }
        Action::ScrollUp | Action::InsertChar('k') => {
            app.provider_setup_selected = app.provider_setup_selected.saturating_sub(1);
            None
        }
        Action::SubmitInput => {
            app.provider_setup_step = 1;
            app.provider_setup_key_input.clear();
            None
        }
        Action::EnterNormalMode | Action::Quit => {
            app.overlay = Overlay::None;
            None
        }
        _ => None,
    }
}

fn handle_step_key_input(app: &mut App, action: Action) -> Option<AppCommand> {
    match action {
        Action::InsertChar(c) => {
            app.provider_setup_key_input.push(c);
            None
        }
        Action::DeleteChar => {
            app.provider_setup_key_input.pop();
            None
        }
        Action::SubmitInput => {
            if app.provider_setup_key_input.is_empty() {
                return None;
            }
            // Save the provider config immediately (skip verification for now,
            // Task #9 will wire up async engine verification)
            let provider_id = PROVIDERS
                .get(app.provider_setup_selected)
                .map_or("unknown", |p| p.0);
            let key = app.provider_setup_key_input.clone();

            app.provider_config.providers.insert(
                provider_id.to_string(),
                crate::providers::ProviderEntry { api_key: key },
            );

            // Set as active provider if first one
            if app.provider_config.active_provider.is_empty() {
                app.provider_config.active_provider = provider_id.to_string();
                // Pick first model for this provider
                let models = crate::providers::models_for_provider(provider_id);
                if let Some(first) = models.first() {
                    app.provider_config.active_model = first.id.to_string();
                }
            }

            if let Err(e) = crate::providers::save_provider_config(&app.provider_config) {
                app.provider_setup_error = Some(format!("Save failed: {e}"));
                app.provider_setup_step = 3;
                return None;
            }

            // Success
            app.provider_setup_error = None;
            app.provider_setup_step = 3;
            None
        }
        Action::EnterNormalMode => {
            // Go back to provider selection
            app.provider_setup_step = 0;
            None
        }
        Action::Quit => {
            app.overlay = Overlay::None;
            None
        }
        _ => None,
    }
}

fn handle_step_result_input(app: &mut App, action: Action) -> Option<AppCommand> {
    match action {
        Action::SubmitInput => {
            if app.provider_setup_error.is_none() {
                // Success — close overlay
                app.overlay = Overlay::None;
            }
            None
        }
        Action::InsertChar('r') if app.provider_setup_error.is_some() => {
            // Retry — go back to API key input
            app.provider_setup_step = 1;
            app.provider_setup_key_input.clear();
            app.provider_setup_error = None;
            None
        }
        Action::EnterNormalMode | Action::Quit => {
            app.overlay = Overlay::None;
            None
        }
        _ => None,
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
