use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Gauge, Paragraph, Wrap};
use ratatui::Frame;

use crate::theme;

/// Question type for onboarding steps.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QuestionType {
    Radio,
    Checkbox,
}

/// A single onboarding step/question.
#[derive(Debug, Clone)]
pub struct OnboardingStep {
    pub id: String,
    pub title: String,
    pub description: String,
    pub question_type: QuestionType,
    pub options: Vec<String>,
    pub selected: Vec<usize>,
}

/// Full onboarding wizard state.
#[derive(Debug, Clone)]
pub struct OnboardingWizard {
    pub steps: Vec<OnboardingStep>,
    pub current_step: usize,
    pub cursor: usize,
    pub completed: bool,
    pub result_summary: Option<String>,
}

impl OnboardingWizard {
    /// Create wizard with default 6-step questions (hardcoded fallback).
    pub fn new() -> Self {
        Self {
            steps: default_steps(),
            current_step: 0,
            cursor: 0,
            completed: false,
            result_summary: None,
        }
    }

    pub fn total_steps(&self) -> usize {
        self.steps.len()
    }

    pub fn progress_pct(&self) -> f64 {
        if self.completed {
            return 1.0;
        }
        self.current_step as f64 / self.total_steps() as f64
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
            match step.question_type {
                QuestionType::Radio => {
                    step.selected = vec![cursor];
                }
                QuestionType::Checkbox => {
                    if let Some(pos) = step.selected.iter().position(|&i| i == cursor) {
                        step.selected.remove(pos);
                    } else {
                        step.selected.push(cursor);
                    }
                }
            }
        }
    }

    /// Advance to next step. Returns true if wizard completed.
    pub fn next_step(&mut self) -> bool {
        if self.current_step + 1 < self.total_steps() {
            self.current_step += 1;
            self.cursor = 0;
            false
        } else {
            self.completed = true;
            self.build_summary();
            true
        }
    }

    /// Go back to previous step.
    pub fn prev_step(&mut self) {
        if self.current_step > 0 {
            self.current_step -= 1;
            self.cursor = 0;
        }
    }

    /// Collect answers as HashMap-like structure.
    pub fn answers(&self) -> Vec<(String, Vec<String>)> {
        self.steps
            .iter()
            .map(|step| {
                let values: Vec<String> = step
                    .selected
                    .iter()
                    .filter_map(|&i| step.options.get(i).cloned())
                    .collect();
                (step.id.clone(), values)
            })
            .collect()
    }

    fn build_summary(&mut self) {
        let answers = self.answers();
        let mut parts = Vec::new();
        for (id, values) in &answers {
            if !values.is_empty() {
                parts.push(format!("{}: {}", id, values.join(", ")));
            }
        }
        self.result_summary = Some(parts.join(" | "));
    }
}

fn default_steps() -> Vec<OnboardingStep> {
    vec![
        OnboardingStep {
            id: "industry".to_string(),
            title: "Industry".to_string(),
            description: "What industry does your company operate in?".to_string(),
            question_type: QuestionType::Radio,
            options: vec![
                "Healthcare".into(), "Finance".into(), "Retail / E-commerce".into(),
                "Education".into(), "Technology / SaaS".into(), "Other".into(),
            ],
            selected: vec![],
        },
        OnboardingStep {
            id: "company_size".to_string(),
            title: "Company Size".to_string(),
            description: "How many employees does your company have?".to_string(),
            question_type: QuestionType::Radio,
            options: vec![
                "1-49 employees (micro/small)".into(),
                "50-249 employees (medium)".into(),
                "250+ employees (large)".into(),
            ],
            selected: vec![],
        },
        OnboardingStep {
            id: "ai_use_cases".to_string(),
            title: "AI Use Cases".to_string(),
            description: "Which AI use cases does your product involve? (select all that apply)".to_string(),
            question_type: QuestionType::Checkbox,
            options: vec![
                "Chatbot / Conversational AI".into(),
                "Content Generation".into(),
                "Decision Support / Recommendation".into(),
                "HR Screening / Recruitment".into(),
                "Image / Video Analysis".into(),
                "Other".into(),
            ],
            selected: vec![],
        },
        OnboardingStep {
            id: "risk_level".to_string(),
            title: "Perceived Risk Level".to_string(),
            description: "What do you think is the risk level of your AI system?".to_string(),
            question_type: QuestionType::Radio,
            options: vec![
                "Minimal risk".into(),
                "Limited risk".into(),
                "High risk".into(),
                "Unacceptable risk".into(),
                "Unsure — help me determine".into(),
            ],
            selected: vec![],
        },
        OnboardingStep {
            id: "deployment".to_string(),
            title: "Deployment Model".to_string(),
            description: "How is your AI system deployed?".to_string(),
            question_type: QuestionType::Radio,
            options: vec![
                "Cloud SaaS".into(),
                "On-premise".into(),
                "Hybrid (cloud + on-prem)".into(),
                "Edge / Embedded".into(),
            ],
            selected: vec![],
        },
        OnboardingStep {
            id: "timeline".to_string(),
            title: "Compliance Timeline".to_string(),
            description: "When do you need to be compliant?".to_string(),
            question_type: QuestionType::Radio,
            options: vec![
                "Immediately".into(),
                "Within 3 months".into(),
                "Within 6 months".into(),
                "12+ months".into(),
            ],
            selected: vec![],
        },
    ]
}

/// Render the Onboarding Wizard as a full-screen overlay.
pub fn render_onboarding(frame: &mut Frame, wizard: &OnboardingWizard) {
    let t = theme::theme();
    let area = centered_rect(60, 24, frame.area());

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
        render_completion(frame, inner, wizard, &t);
        return;
    }

    let chunks = Layout::vertical([
        Constraint::Length(2),   // welcome + step label
        Constraint::Length(1),   // progress gauge
        Constraint::Length(1),   // spacer
        Constraint::Length(2),   // question description
        Constraint::Min(8),      // options
        Constraint::Length(1),   // footer hints
    ])
    .split(inner);

    // --- Step header ---
    let step_num = wizard.current_step + 1;
    let total = wizard.total_steps();
    let step = wizard.current().expect("current step always valid while rendering");

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

    // --- Progress bar ---
    let pct = (step_num as f64 / total as f64 * 100.0) as u16;
    let gauge = Gauge::default()
        .gauge_style(Style::default().fg(t.accent).bg(t.muted))
        .percent(pct)
        .label(format!("{}%", pct));
    frame.render_widget(gauge, chunks[1]);

    // --- Question description ---
    let desc = Paragraph::new(Line::from(Span::styled(
        &step.description,
        Style::default().fg(t.fg),
    )))
    .wrap(Wrap { trim: true });
    frame.render_widget(desc, chunks[3]);

    // --- Options (radio or checkbox) ---
    let is_checkbox = step.question_type == QuestionType::Checkbox;
    let mut option_lines: Vec<Line> = Vec::new();

    for (i, opt) in step.options.iter().enumerate() {
        let is_cursor = i == wizard.cursor;
        let is_selected = step.selected.contains(&i);

        let marker = if is_checkbox {
            if is_selected { "[x] " } else { "[ ] " }
        } else if is_selected {
            "(*) "
        } else {
            "( ) "
        };

        let style = if is_cursor {
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(t.fg)
        };

        option_lines.push(Line::from(Span::styled(format!("  {marker}{opt}"), style)));
    }

    let options = Paragraph::new(option_lines);
    frame.render_widget(options, chunks[4]);

    // --- Footer hints ---
    let hint = if is_checkbox {
        "j/k: navigate  Space: toggle  Enter: next  Backspace: back  Esc: skip"
    } else {
        "j/k: navigate  Space: select  Enter: next  Backspace: back  Esc: skip"
    };
    let footer = Paragraph::new(Span::styled(hint, Style::default().fg(t.muted)));
    frame.render_widget(footer, chunks[5]);
}

fn render_completion(frame: &mut Frame, area: Rect, wizard: &OnboardingWizard, t: &theme::ThemeColors) {
    let chunks = Layout::vertical([
        Constraint::Length(3),
        Constraint::Min(4),
        Constraint::Length(1),
    ])
    .split(area);

    let header = Paragraph::new(vec![
        Line::from(Span::styled(
            "Setup Complete!",
            Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD),
        )),
        Line::default(),
        Line::from(Span::styled("Your compliance profile:", Style::default().fg(t.fg))),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_onboarding_default_6_steps() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.total_steps(), 6);
        assert_eq!(wiz.current_step, 0);
        assert!(!wiz.completed);
    }

    #[test]
    fn test_onboarding_radio_selection() {
        let mut wiz = OnboardingWizard::new();
        // Step 0: industry (radio)
        wiz.cursor = 2;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[0].selected, vec![2]);
        // Radio: re-select replaces
        wiz.cursor = 0;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[0].selected, vec![0]);
    }

    #[test]
    fn test_onboarding_checkbox_selection() {
        let mut wiz = OnboardingWizard::new();
        wiz.current_step = 2; // AI use cases (checkbox)
        wiz.cursor = 0;
        wiz.toggle_selection();
        wiz.cursor = 2;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[2].selected, vec![0, 2]);
        // Toggle off
        wiz.cursor = 0;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[2].selected, vec![2]);
    }

    #[test]
    fn test_onboarding_step_navigation() {
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
    fn test_onboarding_completion() {
        let mut wiz = OnboardingWizard::new();
        for _ in 0..5 {
            wiz.next_step();
        }
        assert!(!wiz.completed);
        let done = wiz.next_step();
        assert!(done);
        assert!(wiz.completed);
        assert!(wiz.result_summary.is_some());
    }

    #[test]
    fn test_onboarding_progress() {
        let mut wiz = OnboardingWizard::new();
        assert!((wiz.progress_pct() - 0.0).abs() < f64::EPSILON);
        wiz.next_step();
        let expected = 1.0 / 6.0;
        assert!((wiz.progress_pct() - expected).abs() < 0.01);
    }
}
