mod fields;

#[cfg(test)]
mod tests;

pub use fields::PassportField;

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use fields::default_passport_fields;

/// State for the Passport View.
#[derive(Debug, Clone)]
pub struct PassportViewState {
    pub fields: Vec<PassportField>,
    pub selected_index: usize,
    pub scroll_offset: usize,
    /// Loaded passport data from engine (raw JSON values).
    pub loaded_passports: Vec<serde_json::Value>,
}

impl Default for PassportViewState {
    fn default() -> Self {
        Self {
            fields: default_passport_fields(),
            selected_index: 0,
            scroll_offset: 0,
            loaded_passports: Vec::new(),
        }
    }
}

impl PassportViewState {
    /// Number of fields that have a value.
    pub fn filled_count(&self) -> usize {
        self.fields.iter().filter(|f| !f.value.is_empty()).count()
    }

    /// Completeness percentage (0-100).
    pub fn completeness(&self) -> u8 {
        if self.fields.is_empty() {
            return 0;
        }
        #[allow(clippy::cast_possible_truncation)]
        let pct = (self.filled_count() as f64 / self.fields.len() as f64 * 100.0) as u8;
        pct
    }

    /// Populate fields from loaded passport data (engine response).
    pub fn load_from_passports(&mut self) {
        // Use first loaded passport if available
        let Some(passport) = self.loaded_passports.first() else {
            return;
        };

        for field in &mut self.fields {
            let value = match field.name {
                "name" => passport.get("name").and_then(|v| v.as_str()).map(String::from),
                "version" => passport.get("version").and_then(|v| v.as_str()).map(String::from),
                "description" => passport.get("description").and_then(|v| v.as_str()).map(String::from),
                "provider" => passport
                    .get("model")
                    .and_then(|m| m.get("provider"))
                    .and_then(|v| v.as_str())
                    .map(String::from),
                "deployer" => passport
                    .get("owner")
                    .and_then(|o| o.get("team"))
                    .and_then(|v| v.as_str())
                    .map(String::from),
                "country" => passport
                    .get("model")
                    .and_then(|m| m.get("data_residency"))
                    .and_then(|v| v.as_str())
                    .map(String::from),
                "riskClass" => passport
                    .get("compliance")
                    .and_then(|c| c.get("eu_ai_act"))
                    .and_then(|e| e.get("risk_class"))
                    .and_then(|v| v.as_str())
                    .map(String::from),
                "autonomy" => passport
                    .get("autonomy_level")
                    .and_then(|v| v.as_str())
                    .map(String::from),
                "constraints" => passport
                    .get("constraints")
                    .and_then(|c| c.get("human_approval_required"))
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    }),
                "assignedPerson" => passport
                    .get("owner")
                    .and_then(|o| o.get("responsible_person"))
                    .and_then(|v| v.as_str())
                    .map(String::from),
                "role" => passport
                    .get("owner")
                    .and_then(|o| o.get("contact"))
                    .and_then(|v| v.as_str())
                    .map(String::from),
                "overrideProcedure" => None, // Manual field
                "dataAccess" => passport
                    .get("permissions")
                    .and_then(|p| p.get("data_access"))
                    .map(|da| {
                        let read = da.get("read").and_then(|v| v.as_array())
                            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "))
                            .unwrap_or_default();
                        let write = da.get("write").and_then(|v| v.as_array())
                            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "))
                            .unwrap_or_default();
                        format!("read: {read}; write: {write}")
                    }),
                "permissions" => passport
                    .get("permissions")
                    .and_then(|p| p.get("tools"))
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    }),
                "dataRetention" => passport
                    .get("logging")
                    .and_then(|l| l.get("retention_days"))
                    .and_then(|v| v.as_u64())
                    .map(|d| format!("{d} days")),
                "workerNotification" => None, // Manual field
                "aiLiteracy" => None,         // Manual field
                "impactAssessment" => None,   // Manual field
                _ => None,
            };

            if let Some(v) = value {
                if !v.is_empty() {
                    field.value = v;
                }
            }
        }
    }
}

/// Render the Passport view — guided editing with field list + detail panel.
pub fn render_passport_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let pv = &app.passport_view;
    let filled = pv.filled_count();
    let total = pv.fields.len();
    let pct = pv.completeness();

    // Build completeness bar
    let bar_w = 10usize;
    let bar_filled = (pct as usize * bar_w / 100).min(bar_w);
    let bar_empty = bar_w.saturating_sub(bar_filled);
    let completeness_bar = format!(
        "{}{}",
        "\u{2588}".repeat(bar_filled),
        "\u{2591}".repeat(bar_empty),
    );

    let title = format!(" Agent Passport \u{2014} {filled}/{total} fields  {completeness_bar} {pct}% ");

    let block = Block::default()
        .title(title)
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.width < 40 || inner.height < 8 {
        // Too small for two-column layout
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " Resize terminal for passport editor",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    // Two-column: field list (50%) | detail panel (50%)
    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(inner);

    render_field_list(frame, cols[0], app);
    render_field_detail(frame, cols[1], app);
}

/// Render the left column — categorized field list.
fn render_field_list(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let pv = &app.passport_view;
    let mut lines: Vec<Line<'_>> = Vec::new();

    let mut current_category = "";

    for (i, field) in pv.fields.iter().enumerate() {
        // Category header
        if field.category != current_category {
            if !current_category.is_empty() {
                lines.push(Line::raw(""));
            }
            lines.push(Line::from(Span::styled(
                format!(" {}", field.category),
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
            )));
            lines.push(Line::from(Span::styled(
                format!(" {}", "\u{2500}".repeat(area.width.saturating_sub(3) as usize)),
                Style::default().fg(t.border),
            )));
            current_category = field.category;
        }

        let is_selected = i == pv.selected_index;
        let has_value = !field.value.is_empty();

        let (status_icon, status_color) = if has_value {
            ("\u{2713}", t.zone_green)
        } else {
            ("\u{2717}", t.zone_red)
        };

        let prefix = if is_selected { ">" } else { " " };
        let name_style = if is_selected {
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        let value_preview = if has_value {
            let w = area.width.saturating_sub(25) as usize;
            if field.value.len() > w {
                format!("{}...", &field.value[..w.saturating_sub(3)])
            } else {
                field.value.clone()
            }
        } else {
            "[empty]".to_string()
        };

        lines.push(Line::from(vec![
            Span::styled(
                format!("{prefix} "),
                Style::default().fg(if is_selected { t.accent } else { t.fg }),
            ),
            Span::styled(format!("{status_icon} "), Style::default().fg(status_color)),
            Span::styled(
                format!("{:<16}", field.name),
                name_style,
            ),
            Span::styled(
                value_preview,
                Style::default().fg(if has_value { t.muted } else { t.zone_red }),
            ),
        ]));
    }

    // Apply scroll offset
    let scroll = pv.scroll_offset;

    let paragraph = Paragraph::new(lines)
        .scroll((u16::try_from(scroll).unwrap_or(0), 0));
    frame.render_widget(paragraph, area);
}

/// Render the right column — detail panel for selected field.
fn render_field_detail(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let pv = &app.passport_view;

    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(field) = pv.fields.get(pv.selected_index) else {
        return;
    };

    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // Field name header
    lines.push(Line::from(Span::styled(
        format!("  Field: {}", field.name),
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::raw(""));

    // Current value
    lines.push(Line::from(Span::styled(
        "  Current value:",
        Style::default().fg(t.muted),
    )));
    if field.value.is_empty() {
        lines.push(Line::from(Span::styled(
            "  (empty)",
            Style::default().fg(t.zone_red),
        )));
    } else {
        // Wrap long values
        let val_lines = wrap_text(&field.value, w.saturating_sub(2));
        for vl in val_lines {
            lines.push(Line::from(Span::styled(
                format!("  {vl}"),
                Style::default().fg(t.fg),
            )));
        }
    }
    lines.push(Line::raw(""));

    // What to write
    lines.push(Line::from(Span::styled(
        "  What to write:",
        Style::default().fg(t.muted),
    )));
    let desc_lines = wrap_text(field.description, w.saturating_sub(2));
    for dl in desc_lines {
        lines.push(Line::from(Span::styled(
            format!("  {dl}"),
            Style::default().fg(t.fg),
        )));
    }
    lines.push(Line::raw(""));

    // Example
    lines.push(Line::from(Span::styled(
        "  Example:",
        Style::default().fg(t.muted),
    )));
    lines.push(Line::from(Span::styled(
        format!("  \"{}\"", field.example),
        Style::default().fg(t.zone_green),
    )));
    lines.push(Line::raw(""));

    // Article reference
    lines.push(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(
            format!("{} requires:", field.article),
            Style::default().fg(t.accent),
        ),
    ]));
    lines.push(Line::from(Span::styled(
        format!("  \"information about the {} of the AI system\"", field.name),
        Style::default().fg(t.muted),
    )));
    lines.push(Line::raw(""));

    // Action hints
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  [e] ", Style::default().fg(t.accent)),
        Span::styled("Edit  ", Style::default().fg(t.fg)),
        Span::styled("[Tab] ", Style::default().fg(t.accent)),
        Span::styled("Next empty field", Style::default().fg(t.fg)),
    ]));

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Simple text wrapping helper.
fn wrap_text(text: &str, width: usize) -> Vec<String> {
    if width == 0 {
        return vec![text.to_string()];
    }
    let mut lines = Vec::new();
    let mut current = String::new();
    for word in text.split_whitespace() {
        if current.is_empty() {
            current = word.to_string();
        } else if current.len() + 1 + word.len() <= width {
            current.push(' ');
            current.push_str(word);
        } else {
            lines.push(current);
            current = word.to_string();
        }
    }
    if !current.is_empty() {
        lines.push(current);
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}
