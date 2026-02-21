use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Gauge, Paragraph, Wrap};
use ratatui::Frame;

use crate::theme;

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

/// The kind of interaction for an onboarding step.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StepKind {
    /// Step 1: theme picker with live preview
    ThemeSelect,
    /// Steps 2,4,5,6,7,8: single-select
    Radio,
    /// Step 3: API key input (masked)
    TextInput { masked: bool },
    /// Step 9: multi-select scan scope
    Checkbox,
    /// Step 10: config summary + action
    Summary,
}

/// A single option within a step.
#[derive(Debug, Clone)]
pub struct StepOption {
    pub label: String,
    pub hint: Option<String>,
    pub tag: Option<&'static str>,
}

impl StepOption {
    fn new(label: &str) -> Self {
        Self {
            label: label.to_string(),
            hint: None,
            tag: None,
        }
    }

    fn with_hint(mut self, hint: &str) -> Self {
        self.hint = Some(hint.to_string());
        self
    }

    fn with_tag(mut self, tag: &'static str) -> Self {
        self.tag = Some(tag);
        self
    }
}

/// A single onboarding step/question.
#[derive(Debug, Clone)]
pub struct OnboardingStep {
    pub id: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub kind: StepKind,
    pub options: Vec<StepOption>,
    pub selected: Vec<usize>,
    pub text_value: String,
    pub skippable: bool,
}

/// Full onboarding wizard state.
#[derive(Debug, Clone)]
pub struct OnboardingWizard {
    pub steps: Vec<OnboardingStep>,
    pub current_step: usize,
    pub cursor: usize,
    pub completed: bool,
    pub result_summary: Option<String>,

    /// Cursor position in text input.
    pub text_cursor: usize,
    /// For Step 3 (0=provider select, 1=key input, 2=validating, 3=result).
    pub provider_substep: u8,
    /// API key validation result message.
    pub validation_message: Option<String>,
    /// Set after Step 4, drives conditional skipping.
    pub project_type: Option<String>,
    /// Indices of visible steps (recalculated on project_type change).
    pub active_steps: Vec<usize>,
    /// For Step 1 live theme preview.
    pub theme_preview_idx: usize,
}

impl OnboardingWizard {
    pub fn new() -> Self {
        let steps = build_steps();
        let active_steps: Vec<usize> = (0..steps.len()).collect();
        Self {
            steps,
            current_step: 0,
            cursor: 0,
            completed: false,
            result_summary: None,
            text_cursor: 0,
            provider_substep: 0,
            validation_message: None,
            project_type: None,
            active_steps,
            theme_preview_idx: 0,
        }
    }

    /// Resume from a partially completed onboarding.
    pub fn resume(last_completed_step: usize) -> Self {
        let mut wiz = Self::new();
        let start = (last_completed_step + 1).min(wiz.steps.len().saturating_sub(1));
        wiz.current_step = start;
        wiz
    }

    /// Total number of *visible* steps.
    pub fn total_visible_steps(&self) -> usize {
        self.active_steps.len()
    }

    /// 1-based position among visible steps.
    pub fn visible_position(&self) -> usize {
        self.active_steps
            .iter()
            .position(|&i| i == self.current_step)
            .map(|p| p + 1)
            .unwrap_or(1)
    }

    pub fn progress_pct(&self) -> f64 {
        if self.completed {
            return 1.0;
        }
        let total = self.total_visible_steps();
        if total == 0 {
            return 0.0;
        }
        (self.visible_position() as f64 - 1.0) / total as f64
    }

    pub fn current(&self) -> Option<&OnboardingStep> {
        self.steps.get(self.current_step)
    }

    pub fn current_mut(&mut self) -> Option<&mut OnboardingStep> {
        self.steps.get_mut(self.current_step)
    }

    pub fn move_cursor_up(&mut self) {
        if self.cursor > 0 {
            self.cursor -= 1;
        }
    }

    pub fn move_cursor_down(&mut self) {
        if let Some(step) = self.current() {
            if self.cursor + 1 < step.options.len() {
                self.cursor += 1;
            }
        }
    }

    /// Toggle selection at cursor (Radio = single, Checkbox = multi).
    pub fn toggle_selection(&mut self) {
        let cursor = self.cursor;
        if let Some(step) = self.current_mut() {
            match step.kind {
                StepKind::Radio | StepKind::ThemeSelect => {
                    step.selected = vec![cursor];
                }
                StepKind::Checkbox => {
                    if let Some(pos) = step.selected.iter().position(|&i| i == cursor) {
                        step.selected.remove(pos);
                    } else {
                        step.selected.push(cursor);
                    }
                }
                _ => {}
            }
        }
    }

    /// Select all options (for Checkbox steps).
    pub fn select_all(&mut self) {
        if let Some(step) = self.current_mut() {
            if step.kind == StepKind::Checkbox {
                step.selected = (0..step.options.len()).collect();
            }
        }
    }

    /// Select minimum options (for Checkbox steps: first item only).
    pub fn select_minimum(&mut self) {
        if let Some(step) = self.current_mut() {
            if step.kind == StepKind::Checkbox {
                step.selected = vec![0];
            }
        }
    }

    /// Advance to next visible step. Returns true if wizard completed.
    pub fn next_step(&mut self) -> bool {
        let current_pos = self
            .active_steps
            .iter()
            .position(|&i| i == self.current_step);
        if let Some(pos) = current_pos {
            if pos + 1 < self.active_steps.len() {
                self.current_step = self.active_steps[pos + 1];
                self.cursor = 0;
                self.text_cursor = 0;
                // Reset provider substep when entering step 3
                if self.steps[self.current_step].id == "ai_provider" {
                    self.provider_substep = 0;
                }
                false
            } else {
                self.completed = true;
                self.build_summary();
                true
            }
        } else {
            false
        }
    }

    /// Go back to previous visible step.
    pub fn prev_step(&mut self) {
        let current_pos = self
            .active_steps
            .iter()
            .position(|&i| i == self.current_step);
        if let Some(pos) = current_pos {
            if pos > 0 {
                self.current_step = self.active_steps[pos - 1];
                self.cursor = 0;
                self.text_cursor = 0;
            }
        }
    }

    /// Recalculate active_steps based on project_type.
    pub fn recalculate_active_steps(&mut self) {
        let pt = self.project_type.as_deref().unwrap_or("existing");
        self.active_steps = self
            .steps
            .iter()
            .enumerate()
            .filter(|(_, step)| {
                match step.id {
                    // Skip workspace trust for demo
                    "workspace_trust" => pt != "demo",
                    // Skip scan scope for new and demo
                    "scan_scope" => pt == "existing",
                    _ => true,
                }
            })
            .map(|(i, _)| i)
            .collect();
    }

    /// Extract the selected value for a step by id.
    pub fn step_value(&self, id: &str) -> Option<String> {
        let step = self.steps.iter().find(|s| s.id == id)?;
        match step.kind {
            StepKind::TextInput { .. } => {
                if step.text_value.is_empty() {
                    None
                } else {
                    Some(step.text_value.clone())
                }
            }
            _ => {
                let values: Vec<String> = step
                    .selected
                    .iter()
                    .filter_map(|&i| step.options.get(i).map(|o| o.label.clone()))
                    .collect();
                if values.is_empty() {
                    None
                } else {
                    Some(values.join(", "))
                }
            }
        }
    }

    /// Collect all answers for serialization.
    pub fn answers(&self) -> Vec<(&'static str, Vec<String>)> {
        self.steps
            .iter()
            .map(|step| {
                let values: Vec<String> = match step.kind {
                    StepKind::TextInput { .. } => {
                        if step.text_value.is_empty() {
                            vec![]
                        } else {
                            vec![step.text_value.clone()]
                        }
                    }
                    _ => step
                        .selected
                        .iter()
                        .filter_map(|&i| step.options.get(i).map(|o| o.label.clone()))
                        .collect(),
                };
                (step.id, values)
            })
            .collect()
    }

    /// Map a step's selected index to a config-friendly string value.
    pub fn selected_config_value(&self, step_id: &str) -> String {
        let step = match self.steps.iter().find(|s| s.id == step_id) {
            Some(s) => s,
            None => return String::new(),
        };
        let idx = step.selected.first().copied().unwrap_or(0);
        match step_id {
            "welcome_theme" => {
                let names = ["dark", "light", "solarized-dark", "solarized-light",
                             "dracula", "nord", "monokai", "gruvbox"];
                names.get(idx).unwrap_or(&"dark").to_string()
            }
            "navigation" => match idx {
                0 => "standard",
                1 => "vim",
                _ => "standard",
            }
            .to_string(),
            "ai_provider" => match idx {
                0 => "openrouter",
                1 => "anthropic",
                2 => "openai",
                3 => "offline",
                _ => "offline",
            }
            .to_string(),
            "project_type" => match idx {
                0 => "existing",
                1 => "new",
                2 => "demo",
                _ => "existing",
            }
            .to_string(),
            "workspace_trust" => match idx {
                0 => "yes",
                1 => "no",
                _ => "yes",
            }
            .to_string(),
            "jurisdiction" => match idx {
                0 => "eu",
                1 => "uk",
                2 => "eu+uk",
                3 => "us",
                4 => "global",
                5 => "eu", // "Not sure" → default EU
                _ => "eu",
            }
            .to_string(),
            "role" => match idx {
                0 => "deployer",
                1 => "provider",
                2 => "both",
                3 => "auto",
                _ => "deployer",
            }
            .to_string(),
            "industry" => match idx {
                0 => "general",
                1 => "hr",
                2 => "finance",
                3 => "healthcare",
                4 => "education",
                5 => "legal",
                6 => "security",
                7 => "marketing",
                8 => "customer-service",
                9 => "auto",
                _ => "general",
            }
            .to_string(),
            "scan_scope" => {
                let labels = ["deps", "env", "source", "infra", "docs"];
                step.selected
                    .iter()
                    .filter_map(|&i| labels.get(i).map(|s| s.to_string()))
                    .collect::<Vec<_>>()
                    .join(",")
            }
            _ => String::new(),
        }
    }

    fn build_summary(&mut self) {
        let answers = self.answers();
        let mut parts = Vec::new();
        for (id, values) in &answers {
            if !values.is_empty() {
                parts.push(format!("{id}: {}", values.join(", ")));
            }
        }
        self.result_summary = Some(parts.join(" | "));
    }
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

fn build_steps() -> Vec<OnboardingStep> {
    vec![
        // Step 1: Welcome + Theme
        OnboardingStep {
            id: "welcome_theme",
            title: "Welcome + Theme",
            description: "Choose the text style that looks best with your terminal.\nTo change this later, run /theme",
            kind: StepKind::ThemeSelect,
            options: vec![
                StepOption::new("Complior Dark"),
                StepOption::new("Complior Light"),
                StepOption::new("Solarized Dark"),
                StepOption::new("Solarized Light"),
                StepOption::new("Dracula"),
                StepOption::new("Nord"),
                StepOption::new("Monokai"),
                StepOption::new("Gruvbox"),
            ],
            selected: vec![0],
            text_value: String::new(),
            skippable: false,
        },
        // Step 2: Navigation
        OnboardingStep {
            id: "navigation",
            title: "Navigation Mode",
            description: "How do you want to navigate?",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("Standard")
                    .with_hint("Arrow keys, Enter, Esc. Tab to cycle, Space to toggle."),
                StepOption::new("Vim-style")
                    .with_hint("j/k to move, Enter to confirm. h/l for tabs, / to search."),
            ],
            selected: vec![0],
            text_value: String::new(),
            skippable: false,
        },
        // Step 3: AI Provider
        OnboardingStep {
            id: "ai_provider",
            title: "AI Connection",
            description: "Select how Complior connects to AI.\nAI enables: doc generation, deeper analysis, model compliance testing.",
            kind: StepKind::TextInput { masked: true },
            options: vec![
                StepOption::new("OpenRouter API key")
                    .with_hint("400+ models (Claude, GPT, Gemini, Mistral, Llama)")
                    .with_tag("RECOMMENDED"),
                StepOption::new("Anthropic API key")
                    .with_hint("Claude models only"),
                StepOption::new("OpenAI API key")
                    .with_hint("GPT models only"),
                StepOption::new("Offline mode")
                    .with_hint("Static scan, hardcoded rules. No doc generation."),
            ],
            selected: vec![],
            text_value: String::new(),
            skippable: false,
        },
        // Step 4: Project Type
        OnboardingStep {
            id: "project_type",
            title: "Project Type",
            description: "Is this a new project or an existing one?",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("Existing project")
                    .with_hint("Complior will scan and find AI tools now."),
                StepOption::new("New project")
                    .with_hint("Set up compliance from the start."),
                StepOption::new("Just exploring")
                    .with_hint("Quick demo with sample data."),
            ],
            selected: vec![0],
            text_value: String::new(),
            skippable: false,
        },
        // Step 5: Workspace Trust
        OnboardingStep {
            id: "workspace_trust",
            title: "Workspace Trust",
            description: "Complior will scan files, detect AI tools, and generate reports.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("Yes, I trust this folder"),
                StepOption::new("No, exit"),
            ],
            selected: vec![0],
            text_value: String::new(),
            skippable: true,
        },
        // Step 6: Jurisdiction
        OnboardingStep {
            id: "jurisdiction",
            title: "Jurisdiction",
            description: "Where does your company operate?\nThis determines which regulations apply.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("EU / EEA").with_hint("EU AI Act applies in full"),
                StepOption::new("UK").with_hint("UK AI framework").with_tag("coming soon"),
                StepOption::new("EU + UK").with_hint("Both frameworks").with_tag("coming soon"),
                StepOption::new("US").with_hint("State-level rules").with_tag("coming soon"),
                StepOption::new("Global").with_hint("All applicable frameworks").with_tag("coming soon"),
                StepOption::new("Not sure").with_hint("Default: EU AI Act"),
            ],
            selected: vec![0],
            text_value: String::new(),
            skippable: false,
        },
        // Step 7: Role
        OnboardingStep {
            id: "role",
            title: "Role in AI Value Chain",
            description: "What is your company's role?\nEU AI Act assigns different obligations to each role.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("We USE AI tools (Deployer)")
                    .with_hint("~10 obligations. Most companies are here."),
                StepOption::new("We BUILD AI systems (Provider)")
                    .with_hint("~30 obligations. Train/fine-tune/ship AI."),
                StepOption::new("Both (Provider + Deployer)")
                    .with_hint("Build your own AI AND use third-party AI."),
                StepOption::new("Not sure")
                    .with_hint("We'll detect from your codebase."),
            ],
            selected: vec![0],
            text_value: String::new(),
            skippable: false,
        },
        // Step 8: Industry
        OnboardingStep {
            id: "industry",
            title: "Industry / Domain",
            description: "What industry does this project serve?\nSome industries trigger HIGH RISK under the EU AI Act.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("General SaaS / Web app"),
                StepOption::new("HR / Recruitment / People").with_tag("HIGH RISK"),
                StepOption::new("Finance / Credit / Insurance").with_tag("HIGH RISK"),
                StepOption::new("Healthcare / Medical").with_tag("HIGH RISK"),
                StepOption::new("Education / EdTech").with_tag("HIGH RISK"),
                StepOption::new("Legal / Justice").with_tag("HIGH RISK"),
                StepOption::new("Security / Biometrics").with_tag("HIGH RISK"),
                StepOption::new("Marketing / Advertising"),
                StepOption::new("Customer Service"),
                StepOption::new("Other / Not sure"),
            ],
            selected: vec![0],
            text_value: String::new(),
            skippable: false,
        },
        // Step 9: Scan Scope
        OnboardingStep {
            id: "scan_scope",
            title: "Scan Scope",
            description: "What should Complior scan?\nUse Space to toggle, Enter to confirm.",
            kind: StepKind::Checkbox,
            options: vec![
                StepOption::new("Dependencies")
                    .with_hint("package.json, requirements.txt, go.mod"),
                StepOption::new("Environment vars")
                    .with_hint(".env, docker-compose.yml, CI/CD configs"),
                StepOption::new("Source code")
                    .with_hint("imports, API calls, SDK patterns"),
                StepOption::new("Infrastructure")
                    .with_hint("Dockerfile, K8s manifests, Terraform"),
                StepOption::new("Documentation")
                    .with_hint("Check if compliance docs exist"),
            ],
            selected: vec![0, 1, 2], // first 3 on by default
            text_value: String::new(),
            skippable: true,
        },
        // Step 10: Summary
        OnboardingStep {
            id: "summary",
            title: "Setup Complete",
            description: "Review your configuration and start Complior.",
            kind: StepKind::Summary,
            options: vec![],
            selected: vec![],
            text_value: String::new(),
            skippable: false,
        },
    ]
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

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
        StepKind::TextInput { .. } => render_text_input(frame, inner, wizard, &t),
        StepKind::Checkbox => render_checkbox(frame, inner, wizard, &t),
        StepKind::Summary => render_summary(frame, inner, wizard, &t),
    }
}

/// Common header + progress bar + description layout. Returns the remaining area for content.
fn render_header(
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
        .label(format!("{}%", pct));
    frame.render_widget(gauge, chunks[1]);

    // Description
    let desc = Paragraph::new(Span::styled(step.description, Style::default().fg(t.fg)))
        .wrap(Wrap { trim: true });
    frame.render_widget(desc, chunks[3]);

    chunks[4] // remaining area for content
}

// --- Step 1: Theme Select ---
fn render_theme_select(
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
fn render_radio(
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

// --- Text Input step (Step 3: AI Provider) ---
fn render_text_input(
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

    match wizard.provider_substep {
        0 => {
            // Substep 0: Provider select (radio-style)
            let mut lines: Vec<Line> = Vec::new();
            for (i, opt) in step.options.iter().enumerate() {
                let is_cursor = i == wizard.cursor;
                let style = if is_cursor {
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
                } else {
                    Style::default().fg(t.fg)
                };

                let marker = if is_cursor { "> " } else { "  " };
                let mut spans = vec![Span::styled(format!("  {marker}"), style)];
                spans.push(Span::styled(&opt.label, style));

                if let Some(tag) = opt.tag {
                    spans.push(Span::styled(
                        format!("  [{tag}]"),
                        Style::default()
                            .fg(t.zone_green)
                            .add_modifier(Modifier::BOLD),
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
            lines.push(Line::default());
            lines.push(Line::from(Span::styled(
                "  Keys stored locally in ~/.config/complior/credentials",
                Style::default().fg(t.muted),
            )));
            frame.render_widget(Paragraph::new(lines), chunks[0]);
        }
        1 => {
            // Substep 1: Key input (masked)
            let provider_label = match wizard.cursor {
                0 => "OpenRouter",
                1 => "Anthropic",
                2 => "OpenAI",
                _ => "Provider",
            };

            let masked: String = if step.text_value.is_empty() {
                String::new()
            } else {
                let len = step.text_value.len();
                if len <= 8 {
                    "\u{2588}".repeat(len)
                } else {
                    let prefix = &step.text_value[..4];
                    let suffix = "\u{2588}".repeat(len - 4);
                    format!("{prefix}{suffix}")
                }
            };

            let lines = vec![
                Line::from(Span::styled(
                    format!("  Enter your {provider_label} API key:"),
                    Style::default().fg(t.fg),
                )),
                Line::default(),
                Line::from(vec![
                    Span::styled("  > ", Style::default().fg(t.accent)),
                    Span::styled(
                        &masked,
                        Style::default()
                            .fg(t.fg)
                            .add_modifier(Modifier::DIM),
                    ),
                    Span::styled("_", Style::default().fg(t.accent)),
                ]),
                Line::default(),
                Line::from(Span::styled(
                    "  Paste your API key. It will be stored locally.",
                    Style::default().fg(t.muted),
                )),
            ];
            frame.render_widget(Paragraph::new(lines), chunks[0]);
        }
        2 => {
            // Substep 2: Validating
            let lines = vec![
                Line::default(),
                Line::from(Span::styled(
                    "  Validating...",
                    Style::default().fg(t.accent),
                )),
            ];
            frame.render_widget(Paragraph::new(lines), chunks[0]);
        }
        3 => {
            // Substep 3: Result
            let msg = wizard
                .validation_message
                .as_deref()
                .unwrap_or("Key accepted.");
            let is_valid = !msg.starts_with("Invalid");
            let color = if is_valid { t.zone_green } else { t.zone_red };
            let icon = if is_valid { "\u{2713}" } else { "\u{2717}" };

            let mut lines = vec![
                Line::default(),
                Line::from(Span::styled(
                    format!("  {icon} {msg}"),
                    Style::default().fg(color).add_modifier(Modifier::BOLD),
                )),
            ];

            if !is_valid {
                lines.push(Line::default());
                lines.push(Line::from(Span::styled(
                    "  Press Enter to retry, Backspace to go back.",
                    Style::default().fg(t.muted),
                )));
            } else {
                lines.push(Line::default());
                lines.push(Line::from(Span::styled(
                    "  Press Enter to continue.",
                    Style::default().fg(t.muted),
                )));
            }
            frame.render_widget(Paragraph::new(lines), chunks[0]);
        }
        _ => {}
    }

    let footer_text = match wizard.provider_substep {
        0 => "j/k: navigate  Enter: select  Backspace: back",
        1 => "Type key  Enter: submit  Backspace: delete  Esc: cancel",
        _ => "Enter: continue  Backspace: back",
    };
    let footer = Paragraph::new(Span::styled(footer_text, Style::default().fg(t.muted)));
    frame.render_widget(footer, chunks[1]);
}

// --- Checkbox step ---
fn render_checkbox(
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

// --- Summary step ---
fn render_summary(
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
        ("Jurisdiction", wizard.selected_config_value("jurisdiction")),
        ("Role", wizard.selected_config_value("role")),
        ("Industry", wizard.selected_config_value("industry")),
        ("AI Provider", wizard.selected_config_value("ai_provider")),
        ("Navigation", wizard.selected_config_value("navigation")),
        ("Scan Scope", wizard.selected_config_value("scan_scope")),
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
            "new" => "  Press Enter to create compliance files...",
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
fn render_summary_complete(
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

fn centered_rect(width: u16, height: u16, area: Rect) -> Rect {
    let x = area.x + area.width.saturating_sub(width) / 2;
    let y = area.y + area.height.saturating_sub(height) / 2;
    Rect::new(x, y, width.min(area.width), height.min(area.height))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_onboarding_10_steps() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.steps.len(), 10);
        assert_eq!(wiz.current_step, 0);
        assert!(!wiz.completed);
        assert_eq!(wiz.total_visible_steps(), 10);
    }

    #[test]
    fn test_step_kinds() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.steps[0].kind, StepKind::ThemeSelect);
        assert_eq!(wiz.steps[1].kind, StepKind::Radio);
        assert!(matches!(wiz.steps[2].kind, StepKind::TextInput { masked: true }));
        assert_eq!(wiz.steps[3].kind, StepKind::Radio);
        assert_eq!(wiz.steps[8].kind, StepKind::Checkbox);
        assert_eq!(wiz.steps[9].kind, StepKind::Summary);
    }

    #[test]
    fn test_radio_selection() {
        let mut wiz = OnboardingWizard::new();
        // Step 0: theme (ThemeSelect acts like Radio for selection)
        wiz.cursor = 2;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[0].selected, vec![2]);
        // Re-select replaces
        wiz.cursor = 0;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[0].selected, vec![0]);
    }

    #[test]
    fn test_checkbox_selection() {
        let mut wiz = OnboardingWizard::new();
        wiz.current_step = 8; // scan_scope (checkbox)
        assert_eq!(wiz.steps[8].selected, vec![0, 1, 2]); // defaults
        wiz.cursor = 3;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[8].selected, vec![0, 1, 2, 3]);
        // Toggle off
        wiz.cursor = 1;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[8].selected, vec![0, 2, 3]);
    }

    #[test]
    fn test_select_all_and_minimum() {
        let mut wiz = OnboardingWizard::new();
        wiz.current_step = 8;
        wiz.select_all();
        assert_eq!(wiz.steps[8].selected, vec![0, 1, 2, 3, 4]);
        wiz.select_minimum();
        assert_eq!(wiz.steps[8].selected, vec![0]);
    }

    #[test]
    fn test_step_navigation() {
        let mut wiz = OnboardingWizard::new();
        assert_eq!(wiz.current_step, 0);
        assert!(!wiz.next_step());
        assert_eq!(wiz.current_step, 1);
        wiz.prev_step();
        assert_eq!(wiz.current_step, 0);
        wiz.prev_step(); // clamp
        assert_eq!(wiz.current_step, 0);
    }

    #[test]
    fn test_completion() {
        let mut wiz = OnboardingWizard::new();
        for _ in 0..9 {
            assert!(!wiz.next_step());
        }
        assert!(!wiz.completed);
        let done = wiz.next_step();
        assert!(done);
        assert!(wiz.completed);
        assert!(wiz.result_summary.is_some());
    }

    #[test]
    fn test_progress_pct() {
        let wiz = OnboardingWizard::new();
        assert!((wiz.progress_pct() - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_conditional_skip_demo() {
        let mut wiz = OnboardingWizard::new();
        wiz.project_type = Some("demo".to_string());
        wiz.recalculate_active_steps();
        // Should skip workspace_trust (idx 4) and scan_scope (idx 8)
        assert!(!wiz.active_steps.contains(&4));
        assert!(!wiz.active_steps.contains(&8));
        assert_eq!(wiz.total_visible_steps(), 8);
    }

    #[test]
    fn test_conditional_skip_new() {
        let mut wiz = OnboardingWizard::new();
        wiz.project_type = Some("new".to_string());
        wiz.recalculate_active_steps();
        // Should skip scan_scope (idx 8) but keep workspace_trust (idx 4)
        assert!(wiz.active_steps.contains(&4));
        assert!(!wiz.active_steps.contains(&8));
        assert_eq!(wiz.total_visible_steps(), 9);
    }

    #[test]
    fn test_conditional_skip_existing() {
        let mut wiz = OnboardingWizard::new();
        wiz.project_type = Some("existing".to_string());
        wiz.recalculate_active_steps();
        // Should keep all steps
        assert_eq!(wiz.total_visible_steps(), 10);
    }

    #[test]
    fn test_selected_config_value() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.selected_config_value("welcome_theme"), "dark"); // idx 0 = Complior Dark
        assert_eq!(wiz.selected_config_value("navigation"), "standard");
        assert_eq!(wiz.selected_config_value("jurisdiction"), "eu");
        assert_eq!(wiz.selected_config_value("role"), "deployer");
        assert_eq!(wiz.selected_config_value("industry"), "general");
        assert_eq!(wiz.selected_config_value("scan_scope"), "deps,env,source");
    }

    #[test]
    fn test_visible_position() {
        let mut wiz = OnboardingWizard::new();
        assert_eq!(wiz.visible_position(), 1);
        wiz.next_step();
        assert_eq!(wiz.visible_position(), 2);
    }

    #[test]
    fn test_resume() {
        let wiz = OnboardingWizard::resume(3);
        assert_eq!(wiz.current_step, 4);
        assert!(!wiz.completed);
    }

    #[test]
    fn test_step_ids_unique() {
        let wiz = OnboardingWizard::new();
        let ids: Vec<&str> = wiz.steps.iter().map(|s| s.id).collect();
        let mut unique = ids.clone();
        unique.sort();
        unique.dedup();
        assert_eq!(ids.len(), unique.len(), "Step IDs must be unique");
    }

    #[test]
    fn test_options_with_hints_and_tags() {
        let wiz = OnboardingWizard::new();
        // Industry step should have HIGH RISK tags
        let industry = &wiz.steps[7];
        assert_eq!(industry.id, "industry");
        let high_risk_count = industry
            .options
            .iter()
            .filter(|o| o.tag == Some("HIGH RISK"))
            .count();
        assert_eq!(high_risk_count, 6);
    }
}
