use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Gauge, Paragraph, Wrap};
use ratatui::Frame;

use crate::theme;

use super::{OnboardingWizard, StepKind};

/// Render the Onboarding Wizard as a full-screen centered overlay.
pub fn render_onboarding(frame: &mut Frame, wizard: &OnboardingWizard) {
    let t = theme::theme();
    let area = centered_rect(70, 34, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Complior Setup ")
        .title_style(Style::default().fg(t.accent).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border_focused))
        .style(Style::default().bg(t.bg));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if wizard.completed {
        render_summary_complete(frame, inner, wizard, &t);
        return;
    }

    let step = match wizard.current() {
        Some(s) => s,
        None => return,
    };

    match step.kind {
        StepKind::ThemeSelect => render_theme_select(frame, inner, wizard, &t),
        StepKind::Radio => render_radio(frame, inner, wizard, &t),
        StepKind::Checkbox => render_checkbox(frame, inner, wizard, &t),
        StepKind::TextInput { .. } => render_text_input(frame, inner, wizard, &t),
        StepKind::Summary => render_summary(frame, inner, wizard, &t),
    }
}

/// Common header + progress bar + description layout. Returns the remaining area for content.
pub(super) fn render_header(
    frame: &mut Frame,
    area: Rect,
    wizard: &OnboardingWizard,
    t: &theme::ThemeColors,
) -> Rect {
    let step = wizard.current().expect("current step valid");
    let step_num = wizard.visible_position();
    let total = wizard.total_visible_steps();

    let chunks = Layout::vertical([
        Constraint::Length(2), // header
        Constraint::Length(1), // progress gauge
        Constraint::Length(1), // spacer
        Constraint::Length(3), // description
        Constraint::Min(1),   // remaining content
    ])
    .split(area);

    // Header
    let header = Paragraph::new(vec![
        Line::from(Span::styled(
            "Welcome to Complior!",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("Step {} of {}: {}", step_num, total, step.title),
            Style::default().fg(t.fg),
        )),
    ]);
    frame.render_widget(header, chunks[0]);

    // Progress bar
    let pct = (step_num as f64 / total as f64 * 100.0) as u16;
    let gauge = Gauge::default()
        .gauge_style(Style::default().fg(t.accent).bg(t.muted))
        .percent(pct)
        .label(format!("{pct}%"));
    frame.render_widget(gauge, chunks[1]);

    // Description
    let desc = Paragraph::new(Span::styled(step.description, Style::default().fg(t.fg)))
        .wrap(Wrap { trim: true });
    frame.render_widget(desc, chunks[3]);

    chunks[4] // remaining area for content
}

// --- Step 1: Theme Select ---
pub(super) fn render_theme_select(
    frame: &mut Frame,
    area: Rect,
    wizard: &OnboardingWizard,
    t: &theme::ThemeColors,
) {
    let content_area = render_header(frame, area, wizard, t);

    let chunks = Layout::vertical([
        Constraint::Min(10),   // theme options (8 themes)
        Constraint::Length(6), // preview
        Constraint::Length(1), // footer
    ])
    .split(content_area);

    // Theme options with palette bars — all 8 built-in themes
    let themes = theme::list_themes();
    let step = wizard.current().expect("step valid");
    let mut lines: Vec<Line> = Vec::new();
    for (i, theme_colors) in themes.iter().enumerate() {
        let is_cursor = i == wizard.cursor;
        let is_selected = step.selected.contains(&i);

        let marker = if is_selected { "(*) " } else { "( ) " };
        let style = if is_cursor {
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        let label = theme_colors.name;
        let mut spans = vec![Span::styled(format!("  {marker}{label:<22}"), style)];

        // Add palette color bar
        let palette = theme_colors.palette_colors();
        for color in &palette {
            spans.push(Span::styled("██", Style::default().fg(*color)));
        }

        lines.push(Line::from(spans));
    }
    frame.render_widget(Paragraph::new(lines), chunks[0]);

    // Preview area — show a mini preview of the selected theme
    let preview_idx = step.selected.first().copied().unwrap_or(0);
    if let Some(preview_theme) = themes.get(preview_idx) {
        let preview_block = Block::default()
            .title(" Preview ")
            .borders(Borders::ALL)
            .border_style(Style::default().fg(preview_theme.border_focused))
            .style(Style::default().bg(preview_theme.bg));

        let preview_inner = preview_block.inner(chunks[1]);
        frame.render_widget(preview_block, chunks[1]);

        let preview_lines = vec![
            Line::from(vec![
                Span::styled(" 1  ", Style::default().fg(preview_theme.muted)),
                Span::styled("function ", Style::default().fg(preview_theme.fg)),
                Span::styled("greet", Style::default().fg(preview_theme.accent)),
                Span::styled("() {", Style::default().fg(preview_theme.fg)),
            ]),
            Line::from(vec![
                Span::styled(" 2 ", Style::default().fg(preview_theme.muted)),
                Span::styled("-", Style::default().fg(preview_theme.diff_removed)),
                Span::styled(
                    "  console.log(\"Hello, World!\");",
                    Style::default().fg(preview_theme.diff_removed),
                ),
            ]),
            Line::from(vec![
                Span::styled(" 2 ", Style::default().fg(preview_theme.muted)),
                Span::styled("+", Style::default().fg(preview_theme.diff_added)),
                Span::styled(
                    "  console.log(\"Hello, Complior!\");",
                    Style::default().fg(preview_theme.diff_added),
                ),
            ]),
            Line::from(vec![
                Span::styled(" 3  ", Style::default().fg(preview_theme.muted)),
                Span::styled("}", Style::default().fg(preview_theme.fg)),
            ]),
        ];

        frame.render_widget(
            Paragraph::new(preview_lines).style(Style::default().bg(preview_theme.bg)),
            preview_inner,
        );
    }

    // Footer
    let footer = Paragraph::new(Span::styled(
        "j/k: navigate  Space: select  Enter: next",
        Style::default().fg(t.muted),
    ));
    frame.render_widget(footer, chunks[2]);
}

// --- Radio step ---
pub(super) fn render_radio(
    frame: &mut Frame,
    area: Rect,
    wizard: &OnboardingWizard,
    t: &theme::ThemeColors,
) {
    let content_area = render_header(frame, area, wizard, t);

    let chunks = Layout::vertical([
        Constraint::Min(1),    // options
        Constraint::Length(1), // footer
    ])
    .split(content_area);

    let step = wizard.current().expect("step valid");
    let mut lines: Vec<Line> = Vec::new();
    for (i, opt) in step.options.iter().enumerate() {
        let is_cursor = i == wizard.cursor;
        let is_selected = step.selected.contains(&i);

        let marker = if is_selected { "(*) " } else { "( ) " };
        let style = if is_cursor {
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        let mut spans = vec![Span::styled(format!("  {marker}"), style)];
        spans.push(Span::styled(&opt.label, style));

        // Tag badge
        if let Some(tag) = opt.tag {
            let tag_color = if tag == "HIGH RISK" {
                t.zone_red
            } else {
                t.muted
            };
            spans.push(Span::styled(
                format!("  [{tag}]"),
                Style::default().fg(tag_color).add_modifier(Modifier::BOLD),
            ));
        }

        lines.push(Line::from(spans));

        // Hint below label
        if let Some(hint) = &opt.hint {
            let hint_style = if is_cursor {
                Style::default().fg(t.muted)
            } else {
                Style::default().fg(t.muted)
            };
            lines.push(Line::from(Span::styled(
                format!("        {hint}"),
                hint_style,
            )));
        }
    }
    frame.render_widget(Paragraph::new(lines), chunks[0]);

    let footer = Paragraph::new(Span::styled(
        "j/k: navigate  Space: select  Enter: next  Backspace: back  Esc: skip",
        Style::default().fg(t.muted),
    ));
    frame.render_widget(footer, chunks[1]);
}

// --- Checkbox step ---
pub(super) fn render_checkbox(
    frame: &mut Frame,
    area: Rect,
    wizard: &OnboardingWizard,
    t: &theme::ThemeColors,
) {
    let content_area = render_header(frame, area, wizard, t);

    let chunks = Layout::vertical([
        Constraint::Min(1),    // options
        Constraint::Length(1), // footer
    ])
    .split(content_area);

    let step = wizard.current().expect("step valid");
    let mut lines: Vec<Line> = Vec::new();
    for (i, opt) in step.options.iter().enumerate() {
        let is_cursor = i == wizard.cursor;
        let is_selected = step.selected.contains(&i);

        let marker = if is_selected { "[x] " } else { "[ ] " };
        let style = if is_cursor {
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        lines.push(Line::from(Span::styled(
            format!("  {marker}{}", opt.label),
            style,
        )));

        if let Some(hint) = &opt.hint {
            lines.push(Line::from(Span::styled(
                format!("        {hint}"),
                Style::default().fg(t.muted),
            )));
        }
    }
    frame.render_widget(Paragraph::new(lines), chunks[0]);

    let footer = Paragraph::new(Span::styled(
        "j/k: navigate  Space: toggle  a: all  n: minimum  Enter: next  Backspace: back",
        Style::default().fg(t.muted),
    ));
    frame.render_widget(footer, chunks[1]);
}

// --- TextInput step (AI Provider) ---
pub(super) fn render_text_input(
    frame: &mut Frame,
    area: Rect,
    wizard: &OnboardingWizard,
    t: &theme::ThemeColors,
) {
    let content_area = render_header(frame, area, wizard, t);

    let chunks = Layout::vertical([
        Constraint::Min(1),    // content
        Constraint::Length(1), // footer
    ])
    .split(content_area);

    let step = wizard.current().expect("step valid");
    let mut lines: Vec<Line> = Vec::new();

    match wizard.provider_substep {
        0 => {
            // Substep 0: Provider selection (radio-style)
            for (i, opt) in step.options.iter().enumerate() {
                let is_cursor = i == wizard.cursor;
                let is_selected = step.selected.contains(&i);

                let marker = if is_cursor { "> " } else { "  " };
                let radio = if is_selected { "(*) " } else { "( ) " };
                let style = if is_cursor {
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
                } else {
                    Style::default().fg(t.fg)
                };

                let mut spans = vec![
                    Span::styled(format!("{marker}{radio}"), style),
                    Span::styled(&opt.label, style),
                ];

                if let Some(tag) = opt.tag {
                    let tag_color = if tag == "RECOMMENDED" {
                        t.zone_green
                    } else {
                        t.muted
                    };
                    spans.push(Span::styled(
                        format!("  [{tag}]"),
                        Style::default().fg(tag_color).add_modifier(Modifier::BOLD),
                    ));
                }

                lines.push(Line::from(spans));

                if let Some(hint) = &opt.hint {
                    lines.push(Line::from(Span::styled(
                        format!("        {hint}"),
                        Style::default().fg(t.muted),
                    )));
                }
            }
        }
        1 => {
            // Substep 1: API key input (masked)
            let provider_label = match step.selected.first().copied().unwrap_or(0) {
                0 => "OpenRouter",
                1 => "Anthropic",
                2 => "OpenAI",
                _ => "API",
            };
            lines.push(Line::from(Span::styled(
                format!("  Paste your {provider_label} API key:"),
                Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
            )));
            lines.push(Line::default());

            // Masked display: first 4 chars visible, rest as blocks
            let key = &step.text_value;
            let display: String = if key.is_empty() {
                String::new()
            } else if key.len() <= 4 {
                key.clone()
            } else {
                let visible = &key[..4];
                let masked = "\u{2588}".repeat(key.len() - 4);
                format!("{visible}{masked}")
            };

            lines.push(Line::from(vec![
                Span::styled("  > ", Style::default().fg(t.accent).add_modifier(Modifier::BOLD)),
                Span::styled(display, Style::default().fg(t.fg)),
                Span::styled("_", Style::default().fg(t.accent)),
            ]));

            lines.push(Line::default());
            lines.push(Line::from(Span::styled(
                "  Keys stored locally in ~/.config/complior/credentials",
                Style::default().fg(t.muted),
            )));
        }
        2 => {
            // Substep 2: Validating
            lines.push(Line::default());
            lines.push(Line::from(Span::styled(
                "  Validating...",
                Style::default().fg(t.accent).add_modifier(Modifier::ITALIC),
            )));
        }
        3 => {
            // Substep 3: Validation result
            lines.push(Line::default());
            if let Some(ref msg) = wizard.validation_message {
                let is_valid = !msg.starts_with("Invalid");
                let (icon, color) = if is_valid {
                    ("\u{2713} ", t.zone_green) // ✓
                } else {
                    ("\u{2717} ", t.zone_red) // ✗
                };
                lines.push(Line::from(vec![
                    Span::styled(format!("  {icon}"), Style::default().fg(color).add_modifier(Modifier::BOLD)),
                    Span::styled(msg.as_str(), Style::default().fg(color)),
                ]));
                lines.push(Line::default());
                if is_valid {
                    lines.push(Line::from(Span::styled(
                        "  Press Enter to continue.",
                        Style::default().fg(t.muted),
                    )));
                } else {
                    lines.push(Line::from(Span::styled(
                        "  Press Enter to retry, or Backspace to go back.",
                        Style::default().fg(t.muted),
                    )));
                }
            }
        }
        _ => {}
    }

    frame.render_widget(Paragraph::new(lines), chunks[0]);

    // Footer hints
    let hint = match wizard.provider_substep {
        0 => "j/k: navigate  Enter: select  Backspace: back",
        1 => "Type key  Enter: submit  Backspace: delete  Esc: cancel",
        _ => "Enter: continue  Backspace: back",
    };
    let footer = Paragraph::new(Span::styled(hint, Style::default().fg(t.muted)));
    frame.render_widget(footer, chunks[1]);
}

// --- Summary step ---
pub(super) fn render_summary(
    frame: &mut Frame,
    area: Rect,
    wizard: &OnboardingWizard,
    t: &theme::ThemeColors,
) {
    let content_area = render_header(frame, area, wizard, t);

    let chunks = Layout::vertical([
        Constraint::Min(1),    // summary content
        Constraint::Length(1), // footer
    ])
    .split(content_area);

    let mut lines: Vec<Line> = Vec::new();

    lines.push(Line::from(Span::styled(
        "  Your configuration:",
        Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::default());

    let items = [
        ("Frameworks", wizard.selected_config_value("requirements")),
        ("Role", wizard.selected_config_value("role")),
        ("Industry", wizard.selected_config_value("industry")),
        ("AI Provider", wizard.selected_config_value("ai_provider")),
    ];

    for (label, value) in &items {
        if !value.is_empty() {
            lines.push(Line::from(vec![
                Span::styled(format!("  {label:<16}"), Style::default().fg(t.muted)),
                Span::styled(value.as_str(), Style::default().fg(t.fg)),
            ]));
        }
    }

    let pt = wizard.project_type.as_deref().unwrap_or("existing");
    lines.push(Line::default());
    lines.push(Line::from(Span::styled(
        match pt {
            "existing" => "  Press Enter to run first scan...",
            "demo" => "  Press Enter to load demo data...",
            _ => "  Press Enter to start Complior...",
        },
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));

    frame.render_widget(Paragraph::new(lines), chunks[0]);

    let footer = Paragraph::new(Span::styled(
        "Enter: start  Backspace: back",
        Style::default().fg(t.muted),
    ));
    frame.render_widget(footer, chunks[1]);
}

/// Render completion screen (after wizard.completed = true).
pub(super) fn render_summary_complete(
    frame: &mut Frame,
    area: Rect,
    wizard: &OnboardingWizard,
    t: &theme::ThemeColors,
) {
    let chunks = Layout::vertical([
        Constraint::Length(3),
        Constraint::Min(4),
        Constraint::Length(1),
    ])
    .split(area);

    let header = Paragraph::new(vec![
        Line::from(Span::styled(
            "Setup Complete!",
            Style::default()
                .fg(t.zone_green)
                .add_modifier(Modifier::BOLD),
        )),
        Line::default(),
        Line::from(Span::styled(
            "Your compliance profile:",
            Style::default().fg(t.fg),
        )),
    ]);
    frame.render_widget(header, chunks[0]);

    let summary = wizard
        .result_summary
        .as_deref()
        .unwrap_or("Default profile applied.");
    let body = Paragraph::new(Span::styled(summary, Style::default().fg(t.fg)))
        .wrap(Wrap { trim: true });
    frame.render_widget(body, chunks[1]);

    let footer = Paragraph::new(Span::styled(
        "[Enter] Start Complior",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    ));
    frame.render_widget(footer, chunks[2]);
}

pub(super) fn centered_rect(width: u16, height: u16, area: Rect) -> Rect {
    let x = area.x + area.width.saturating_sub(width) / 2;
    let y = area.y + area.height.saturating_sub(height) / 2;
    Rect::new(x, y, width.min(area.width), height.min(area.height))
}
