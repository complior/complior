mod fields;

#[cfg(test)]
mod tests;

pub use fields::PassportField;

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use ratatui::style::Color;

use crate::app::App;
use crate::theme;
use fields::default_passport_fields;

/// Detail panel mode in passport view.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PassportDetailMode {
    /// Show field details (default).
    FieldDetail,
    /// Show obligation checklist from completeness data.
    ObligationChecklist,
}

/// Top-level passport view mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PassportViewMode {
    /// Multi-agent list with summary table.
    AgentList,
    /// Single-agent field editor (drill-down).
    FieldEditor,
}

/// State for the Passport View.
#[derive(Debug, Clone)]
pub struct PassportViewState {
    pub fields: Vec<PassportField>,
    pub selected_index: usize,
    pub scroll_offset: usize,
    /// Loaded passport data from engine (raw JSON values).
    pub loaded_passports: Vec<serde_json::Value>,
    /// Current detail panel mode.
    pub detail_mode: PassportDetailMode,
    /// Completeness data loaded from engine.
    pub completeness_data: Option<serde_json::Value>,
    /// Scroll offset for obligation checklist.
    pub obligation_scroll: usize,
    /// Top-level view mode: agent list vs field editor.
    pub view_mode: PassportViewMode,
    /// Selected row in the agent list.
    pub selected_passport: usize,
    /// Whether passport data is currently being loaded from engine.
    pub passport_loading: bool,
    /// Error message from last passport load attempt.
    pub passport_error: Option<String>,
}

impl Default for PassportViewState {
    fn default() -> Self {
        Self {
            fields: default_passport_fields(),
            selected_index: 0,
            scroll_offset: 0,
            loaded_passports: Vec::new(),
            detail_mode: PassportDetailMode::FieldDetail,
            completeness_data: None,
            obligation_scroll: 0,
            view_mode: PassportViewMode::AgentList,
            selected_passport: 0,
            passport_loading: false,
            passport_error: None,
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

    /// Populate fields from the selected passport (by index).
    pub fn load_from_passports(&mut self) {
        let Some(passport) = self.loaded_passports.get(self.selected_passport) else {
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

/// Color for completeness percentage: green (100), yellow (80-99), amber (50-79), red (<50).
fn completeness_color(pct: u8, t: &theme::ThemeColors) -> Color {
    match pct {
        100 => t.zone_green,
        80..=99 => t.zone_yellow,
        50..=79 => t.severity_medium,
        _ => t.zone_red,
    }
}

/// Render the Passport view — agent list or field editor based on view mode.
pub fn render_passport_view(frame: &mut Frame, area: Rect, app: &App) {
    match app.passport_view.view_mode {
        PassportViewMode::AgentList => render_agent_list_view(frame, area, app),
        PassportViewMode::FieldEditor => render_field_editor_view(frame, area, app),
    }
}

/// Render the multi-agent list view with summary table + detail sidebar.
fn render_agent_list_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let pv = &app.passport_view;
    let count = pv.loaded_passports.len();

    let title = Line::from(vec![
        Span::styled(
            format!(" Agent Passport \u{2014} {count} agent(s) "),
            theme::title_style(),
        ),
    ]);

    let block = Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if pv.passport_loading {
        frame.render_widget(
            Paragraph::new(vec![
                Line::raw(""),
                Line::from(Span::styled(
                    " Loading passports...",
                    Style::default().fg(t.accent),
                )),
            ]),
            inner,
        );
        return;
    }

    if let Some(ref err) = pv.passport_error {
        frame.render_widget(
            Paragraph::new(vec![
                Line::raw(""),
                Line::from(Span::styled(
                    format!(" Error: {err}"),
                    Style::default().fg(t.zone_red),
                )),
                Line::from(Span::styled(
                    " Press r to retry",
                    Style::default().fg(t.muted),
                )),
            ]),
            inner,
        );
        return;
    }

    if pv.loaded_passports.is_empty() {
        frame.render_widget(
            Paragraph::new(vec![
                Line::raw(""),
                Line::from(Span::styled(
                    " No passports loaded.",
                    Style::default().fg(t.muted),
                )),
                Line::from(Span::styled(
                    " Run: complior agent init",
                    Style::default().fg(t.muted),
                )),
            ]),
            inner,
        );
        return;
    }

    if inner.width < 50 || inner.height < 6 {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " Resize terminal",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    // Two-column: agent table (55%) | detail (45%)
    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
        .split(inner);

    render_agent_table(frame, cols[0], app);
    render_agent_detail(frame, cols[1], app);
}

/// Render the agent summary table (left panel).
fn render_agent_table(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let pv = &app.passport_view;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // Header
    lines.push(Line::from(vec![
        Span::styled(
            format!("  {:<20} {:>3} {:>5} {:>5}", "Name", "L", "Score", "Compl"),
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        ),
    ]));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(area.width.saturating_sub(4) as usize)),
        Style::default().fg(t.border),
    )));

    for (i, passport) in pv.loaded_passports.iter().enumerate() {
        let is_selected = i == pv.selected_passport;
        let prefix = if is_selected { ">" } else { " " };

        let name = passport
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let autonomy = passport
            .get("autonomy_level")
            .and_then(|v| v.as_str())
            .unwrap_or("?");
        let score = passport
            .get("compliance")
            .and_then(|c| c.get("complior_score"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let completeness = extract_completeness(passport);

        // Truncate name
        let name_w = 20usize;
        let truncated_name = crate::views::truncate_str(&name, name_w);

        // Status icon based on completeness
        let status_icon = match completeness {
            91..=100 => "\u{2713}",
            50..=90 => "\u{25cb}",
            _ => "\u{2717}",
        };
        let status_color = completeness_color(completeness, &t);

        let row_style = if is_selected {
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        lines.push(Line::from(vec![
            Span::styled(
                format!("{prefix} "),
                Style::default().fg(if is_selected { t.accent } else { t.fg }),
            ),
            Span::styled(format!("{status_icon} "), Style::default().fg(status_color)),
            Span::styled(format!("{truncated_name:<20}"), row_style),
            Span::styled(format!(" {autonomy:>2}"), Style::default().fg(t.accent)),
            Span::styled(
                format!("  {score:>3.0}"),
                Style::default().fg(crate::views::score_zone_color(score, &t)),
            ),
            Span::styled(
                format!("  {completeness:>3}%"),
                Style::default().fg(completeness_color(completeness, &t)),
            ),
        ]));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  Enter", Style::default().fg(t.accent)),
        Span::styled(":detail  ", Style::default().fg(t.fg)),
        Span::styled("j/k", Style::default().fg(t.accent)),
        Span::styled(":nav  ", Style::default().fg(t.fg)),
        Span::styled("o", Style::default().fg(t.accent)),
        Span::styled(":obligations", Style::default().fg(t.fg)),
    ]));

    let scroll = pv.scroll_offset;
    let paragraph =
        Paragraph::new(lines).scroll((u16::try_from(scroll).unwrap_or(0), 0));
    frame.render_widget(paragraph, area);
}

/// Render the detail sidebar for the selected agent.
fn render_agent_detail(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let pv = &app.passport_view;

    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(passport) = pv.loaded_passports.get(pv.selected_passport) else {
        return;
    };

    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    let name = passport.get("name").and_then(|v| v.as_str()).unwrap_or("unknown");
    let autonomy = passport.get("autonomy_level").and_then(|v| v.as_str()).unwrap_or("?");
    let framework = passport.get("framework").and_then(|v| v.as_str()).unwrap_or("?");
    let provider = passport.get("model").and_then(|m| m.get("provider")).and_then(|v| v.as_str()).unwrap_or("?");
    let model_id = passport.get("model").and_then(|m| m.get("model_id")).and_then(|v| v.as_str()).unwrap_or("?");
    let risk_class = passport.get("compliance").and_then(|c| c.get("eu_ai_act")).and_then(|e| e.get("risk_class")).and_then(|v| v.as_str()).unwrap_or("?");
    let score = passport.get("compliance").and_then(|c| c.get("complior_score")).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let agent_type = passport.get("type").and_then(|v| v.as_str()).unwrap_or("?");
    let completeness = extract_completeness(passport);

    // Header
    lines.push(Line::from(Span::styled(
        format!("  {name}"),
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::raw(""));

    let detail_line = |label: &'static str, val: &str, lines: &mut Vec<Line<'_>>| {
        lines.push(Line::from(vec![
            Span::styled(format!("  {label}: "), Style::default().fg(t.muted)),
            Span::styled(val.to_string(), Style::default().fg(t.fg)),
        ]));
    };

    detail_line("Autonomy", autonomy, &mut lines);
    detail_line("Framework", framework, &mut lines);
    detail_line("Provider", provider, &mut lines);
    detail_line("Model", model_id, &mut lines);
    detail_line("Type", agent_type, &mut lines);

    // Risk class with color
    let risk_color = match risk_class {
        "high" | "prohibited" => t.zone_red,
        "limited" => t.zone_yellow,
        _ => t.zone_green,
    };
    lines.push(Line::from(vec![
        Span::styled("  Risk: ", Style::default().fg(t.muted)),
        Span::styled(risk_class.to_uppercase(), Style::default().fg(risk_color).add_modifier(Modifier::BOLD)),
    ]));

    // Score with color
    lines.push(Line::from(vec![
        Span::styled("  Score: ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{score:.0}"),
            Style::default().fg(crate::views::score_zone_color(score, &t)).add_modifier(Modifier::BOLD),
        ),
    ]));

    // Completeness bar
    let bar_w = 10usize;
    let bar_filled = (completeness as usize * bar_w / 100).min(bar_w);
    let bar_empty = bar_w.saturating_sub(bar_filled);
    let compl_bar = format!(
        "{}{}",
        "\u{2588}".repeat(bar_filled),
        "\u{2591}".repeat(bar_empty),
    );
    lines.push(Line::from(vec![
        Span::styled("  Compl: ", Style::default().fg(t.muted)),
        Span::styled(compl_bar, Style::default().fg(completeness_color(completeness, &t))),
        Span::styled(
            format!(" {completeness}%"),
            Style::default().fg(completeness_color(completeness, &t)).add_modifier(Modifier::BOLD),
        ),
    ]));

    lines.push(Line::raw(""));

    // Action hints
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  [c] ", Style::default().fg(t.accent)),
        Span::styled("Validate  ", Style::default().fg(t.fg)),
        Span::styled("[f] ", Style::default().fg(t.accent)),
        Span::styled("FRIA  ", Style::default().fg(t.fg)),
        Span::styled("[x] ", Style::default().fg(t.accent)),
        Span::styled("Export", Style::default().fg(t.fg)),
    ]));

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Extract completeness percentage from passport JSON (clamped to 0–100).
fn extract_completeness(passport: &serde_json::Value) -> u8 {
    // Count non-empty top-level fields as a heuristic
    let required_fields = [
        "name", "version", "description", "autonomy_level", "framework", "type",
    ];
    let mut filled = 0u64;
    for field in &required_fields {
        if passport.get(*field).and_then(|v| v.as_str()).is_some_and(|s| !s.is_empty()) {
            filled += 1;
        }
    }
    // Also check nested fields
    if passport.get("model").and_then(|m| m.get("provider")).and_then(|v| v.as_str()).is_some() {
        filled += 1;
    }
    if passport.get("owner").and_then(|o| o.get("team")).and_then(|v| v.as_str()).is_some_and(|s| !s.is_empty()) {
        filled += 1;
    }
    if passport.get("compliance").and_then(|c| c.get("eu_ai_act")).and_then(|e| e.get("risk_class")).is_some() {
        filled += 1;
    }
    let total = 9u64;
    ((filled * 100) / total).min(100) as u8
}

/// Render the field editor view (single-agent drill-down).
fn render_field_editor_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let pv = &app.passport_view;
    let filled = pv.filled_count();
    let total = pv.fields.len();
    let pct = pv.completeness();

    // Build completeness bar with color coding
    let bar_w = 10usize;
    let bar_filled = (pct as usize * bar_w / 100).min(bar_w);
    let bar_empty = bar_w.saturating_sub(bar_filled);
    let completeness_bar = format!(
        "{}{}",
        "\u{2588}".repeat(bar_filled),
        "\u{2591}".repeat(bar_empty),
    );

    let pct_color = completeness_color(pct, &t);
    let title = Line::from(vec![
        Span::styled(" Agent Passport \u{2014} ", theme::title_style()),
        Span::styled(format!("{filled}/{total} fields  "), theme::title_style()),
        Span::styled(completeness_bar, Style::default().fg(pct_color)),
        Span::styled(format!(" {pct}% "), Style::default().fg(pct_color).add_modifier(Modifier::BOLD)),
    ]);

    let block = Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.width < 40 || inner.height < 8 {
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
    match pv.detail_mode {
        PassportDetailMode::FieldDetail => render_field_detail(frame, cols[1], app),
        PassportDetailMode::ObligationChecklist => render_obligation_checklist(frame, cols[1], app),
    }
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
            crate::views::truncate_str(&field.value, w)
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
        Span::styled("[o] ", Style::default().fg(t.accent)),
        Span::styled("Obligations  ", Style::default().fg(t.fg)),
        Span::styled("[x] ", Style::default().fg(t.accent)),
        Span::styled("Export", Style::default().fg(t.fg)),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  [c] ", Style::default().fg(t.accent)),
        Span::styled("Validate  ", Style::default().fg(t.fg)),
        Span::styled("[f] ", Style::default().fg(t.accent)),
        Span::styled("FRIA", Style::default().fg(t.fg)),
    ]));

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// Render the right column — obligation checklist from completeness data.
fn render_obligation_checklist(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let pv = &app.passport_view;

    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    lines.push(Line::from(Span::styled(
        "  Obligation Checklist",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::raw(""));

    if let Some(data) = &pv.completeness_data {
        let score = data.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
        let total = data.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
        let filled = data.get("filled").and_then(|v| v.as_u64()).unwrap_or(0);

        lines.push(Line::from(vec![
            Span::styled("  Completeness: ", Style::default().fg(t.muted)),
            Span::styled(
                format!("{score}% ({filled}/{total} fields)"),
                Style::default()
                    .fg(completeness_color(score.min(100) as u8, &t))
                    .add_modifier(Modifier::BOLD),
            ),
        ]));
        lines.push(Line::raw(""));

        if let Some(obligations) = data.get("obligations").and_then(|v| v.as_array()) {
            for obl in obligations {
                let id = obl.get("id").and_then(|v| v.as_str()).unwrap_or("???");
                let title = obl.get("title").and_then(|v| v.as_str()).unwrap_or("Unknown");
                let covered = obl.get("covered").and_then(|v| v.as_bool()).unwrap_or(false);

                let (icon, color) = if covered {
                    ("\u{2713}", t.zone_green)
                } else {
                    ("\u{2717}", t.zone_red)
                };

                lines.push(Line::from(vec![
                    Span::styled(format!("  {icon} "), Style::default().fg(color)),
                    Span::styled(format!("{id}: "), Style::default().fg(t.accent)),
                    Span::styled(title.to_string(), Style::default().fg(t.fg)),
                ]));
            }
        }

        if let Some(missing) = data.get("missingFields").and_then(|v| v.as_array()) {
            if !missing.is_empty() {
                lines.push(Line::raw(""));
                lines.push(Line::from(Span::styled(
                    "  Missing fields:",
                    Style::default().fg(t.zone_red).add_modifier(Modifier::BOLD),
                )));
                for field in missing {
                    if let Some(name) = field.as_str() {
                        lines.push(Line::from(Span::styled(
                            format!("    \u{2022} {name}"),
                            Style::default().fg(t.zone_red),
                        )));
                    }
                }
            }
        }
    } else {
        lines.push(Line::from(Span::styled(
            "  Loading completeness data...",
            Style::default().fg(t.muted),
        )));
        lines.push(Line::from(Span::styled(
            "  Press [o] to refresh",
            Style::default().fg(t.muted),
        )));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  [o] ", Style::default().fg(t.accent)),
        Span::styled("Back to fields  ", Style::default().fg(t.fg)),
        Span::styled("[x] ", Style::default().fg(t.accent)),
        Span::styled("Export", Style::default().fg(t.fg)),
    ]));

    let scroll = pv.obligation_scroll;
    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(0), 0));
    frame.render_widget(paragraph, inner);
}

/// Simple text wrapping helper — delegates to shared utility.
fn wrap_text(text: &str, width: usize) -> Vec<String> {
    super::wrap_text_lines(text, width)
}
