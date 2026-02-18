use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph};
use ratatui::Frame;

use crate::app::{App, AppCommand};
use crate::input::Action;
use crate::providers;
use crate::theme;
use crate::types::Overlay;

/// A flat list entry for the model selector UI, combining provider group headers
/// and model items into one navigable list.
enum SelectorEntry {
    Header(String),
    Model {
        id: String,
        display_name: String,
        provider: String,
    },
}

/// Build the flat list of selector entries from configured providers.
fn build_selector_list(app: &App) -> Vec<SelectorEntry> {
    let mut entries = Vec::new();
    let configured_providers: Vec<&String> = app.provider_config.providers.keys().collect();

    for provider_id in &["anthropic", "openai", "openrouter"] {
        let provider_str = (*provider_id).to_string();
        if !configured_providers.contains(&&provider_str) {
            continue;
        }

        let models = providers::models_for_provider(provider_id);
        if models.is_empty() {
            continue;
        }

        let label = match *provider_id {
            "anthropic" => "Anthropic",
            "openai" => "OpenAI",
            "openrouter" => "OpenRouter",
            other => other,
        };
        entries.push(SelectorEntry::Header(label.to_string()));

        for model in models {
            entries.push(SelectorEntry::Model {
                id: model.id.to_string(),
                display_name: model.display_name.to_string(),
                provider: model.provider.to_string(),
            });
        }
    }

    entries
}

/// Count the number of selectable (model) entries.
fn model_count(entries: &[SelectorEntry]) -> usize {
    entries
        .iter()
        .filter(|e| matches!(e, SelectorEntry::Model { .. }))
        .count()
}

/// Get the Nth selectable model entry (skipping headers).
fn nth_model(entries: &[SelectorEntry], n: usize) -> Option<(&str, &str, &str)> {
    entries
        .iter()
        .filter_map(|e| match e {
            SelectorEntry::Model {
                id,
                display_name,
                provider,
            } => Some((id.as_str(), display_name.as_str(), provider.as_str())),
            SelectorEntry::Header(_) => None,
        })
        .nth(n)
}

pub fn render_model_selector(frame: &mut Frame, app: &App) {
    let t = theme::theme();
    let area = centered_rect(50, 60, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Select Model ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let entries = build_selector_list(app);

    let mut lines = vec![Line::raw("")];
    let mut model_idx: usize = 0;

    for entry in &entries {
        match entry {
            SelectorEntry::Header(name) => {
                lines.push(Line::from(Span::styled(
                    format!("  {name}"),
                    Style::default()
                        .fg(t.accent)
                        .add_modifier(Modifier::BOLD),
                )));
            }
            SelectorEntry::Model {
                id,
                display_name,
                provider: _,
            } => {
                let is_selected = model_idx == app.model_selector_index;
                let is_current = *id == app.provider_config.active_model;

                let indicator = if is_current {
                    "●"
                } else if is_selected {
                    "▸"
                } else {
                    " "
                };

                let style = if is_selected {
                    Style::default()
                        .fg(t.accent)
                        .add_modifier(Modifier::BOLD)
                } else if is_current {
                    Style::default().fg(t.zone_green)
                } else {
                    Style::default().fg(t.fg)
                };

                lines.push(Line::from(Span::styled(
                    format!("    {indicator} {display_name}"),
                    style,
                )));

                model_idx += 1;
            }
        }
    }

    if entries.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No providers configured.",
            Style::default().fg(t.muted),
        )));
        lines.push(Line::from(Span::styled(
            "  Press Esc to close.",
            Style::default().fg(t.muted),
        )));
    } else {
        lines.push(Line::raw(""));
        lines.push(Line::from(Span::styled(
            "  j/k navigate  Enter select  Esc cancel",
            Style::default().fg(t.muted),
        )));
    }

    frame.render_widget(Paragraph::new(lines), inner);
}

pub fn handle_model_selector_action(app: &mut App, action: Action) -> Option<AppCommand> {
    let entries = build_selector_list(app);
    let count = model_count(&entries);

    match action {
        Action::ScrollDown | Action::InsertChar('j') => {
            if count > 0 && app.model_selector_index + 1 < count {
                app.model_selector_index += 1;
            }
            None
        }
        Action::ScrollUp | Action::InsertChar('k') => {
            app.model_selector_index = app.model_selector_index.saturating_sub(1);
            None
        }
        Action::SubmitInput => {
            if let Some((id, _name, provider)) = nth_model(&entries, app.model_selector_index) {
                app.provider_config.active_model = id.to_string();
                app.provider_config.active_provider = provider.to_string();

                if let Err(e) = providers::save_provider_config(&app.provider_config) {
                    tracing::warn!("Failed to save provider config: {e}");
                }

                app.messages.push(crate::types::ChatMessage::new(
                    crate::types::MessageRole::System,
                    format!(
                        "Model switched to: {}",
                        providers::display_model_name(id)
                    ),
                ));
            }
            app.overlay = Overlay::None;
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
