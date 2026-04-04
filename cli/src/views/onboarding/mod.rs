mod render;
mod steps;
#[cfg(test)]
mod tests;

// Re-export the public render entry point.
pub use render::render_onboarding;

use steps::build_steps;

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

/// The kind of interaction for an onboarding step.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StepKind {
    /// Step 1: theme picker with live preview
    ThemeSelect,
    /// Single-select options
    Radio,
    /// Multi-select scan scope
    Checkbox,
    /// Text input with optional masking (e.g. API key entry)
    TextInput { masked: bool },
    /// Config summary + action
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
    pub(super) fn new(label: &str) -> Self {
        Self {
            label: label.to_string(),
            hint: None,
            tag: None,
        }
    }

    pub(super) fn with_hint(mut self, hint: &str) -> Self {
        self.hint = Some(hint.to_string());
        self
    }

    pub(super) const fn with_tag(mut self, tag: &'static str) -> Self {
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
}

/// Full onboarding wizard state.
#[derive(Debug, Clone)]
pub struct OnboardingWizard {
    pub steps: Vec<OnboardingStep>,
    pub current_step: usize,
    pub cursor: usize,
    pub completed: bool,
    pub result_summary: Option<String>,

    /// Set after `project_type` step, drives conditional skipping.
    pub project_type: Option<String>,
    /// Indices of visible steps (recalculated on `project_type` change).
    pub active_steps: Vec<usize>,

    /// AI provider substep: 0=select, 1=key input, 2=validating, 3=result
    pub provider_substep: usize,
    /// Cursor position within text input field.
    pub text_cursor: usize,
    /// Validation result message (after key submission).
    pub validation_message: Option<String>,
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
            project_type: None,
            active_steps,
            provider_substep: 0,
            text_cursor: 0,
            validation_message: None,
        }
    }

    /// Resume from a partially completed onboarding.
    ///
    /// If the saved step index is out of range (e.g. after steps were removed),
    /// the wizard restarts from the beginning.
    pub fn resume(last_completed_step: usize) -> Self {
        let mut wiz = Self::new();
        let start = last_completed_step.saturating_add(1);
        wiz.current_step = if start < wiz.steps.len() { start } else { 0 };
        wiz
    }

    /// Total number of *visible* steps.
    pub const fn total_visible_steps(&self) -> usize {
        self.active_steps.len()
    }

    /// 1-based position among visible steps.
    pub fn visible_position(&self) -> usize {
        self.active_steps
            .iter()
            .position(|&i| i == self.current_step)
            .map_or(1, |p| p + 1)
    }

    pub fn current(&self) -> Option<&OnboardingStep> {
        self.steps.get(self.current_step)
    }

    pub fn current_mut(&mut self) -> Option<&mut OnboardingStep> {
        self.steps.get_mut(self.current_step)
    }

    pub const fn move_cursor_up(&mut self) {
        if self.cursor > 0 {
            self.cursor -= 1;
        }
    }

    pub fn move_cursor_down(&mut self) {
        if let Some(step) = self.current()
            && self.cursor + 1 < step.options.len()
        {
            self.cursor += 1;
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
                // TextInput provider substep 0 uses toggle_selection for radio-like behavior
                StepKind::TextInput { .. } => {
                    step.selected = vec![cursor];
                }
                StepKind::Summary => {}
            }
        }
    }

    /// Select all options (for Checkbox steps).
    pub fn select_all(&mut self) {
        if let Some(step) = self.current_mut()
            && step.kind == StepKind::Checkbox
        {
            step.selected = (0..step.options.len()).collect();
        }
    }

    /// Select minimum options (for Checkbox steps: first item only).
    pub fn select_minimum(&mut self) {
        if let Some(step) = self.current_mut()
            && step.kind == StepKind::Checkbox
        {
            step.selected = vec![0];
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
                self.provider_substep = 0;
                self.text_cursor = 0;
                self.validation_message = None;
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
        if let Some(pos) = current_pos
            && pos > 0
        {
            self.current_step = self.active_steps[pos - 1];
            self.cursor = 0;
        }
    }

    /// Insert a character at the current text cursor position.
    pub fn insert_char(&mut self, c: char) {
        if let Some(step) = self.steps.get_mut(self.current_step)
            && self.text_cursor <= step.text_value.len()
        {
            step.text_value.insert(self.text_cursor, c);
            self.text_cursor += c.len_utf8();
        }
    }

    /// Delete the character before the text cursor (backspace).
    pub fn delete_char_before(&mut self) {
        if self.text_cursor == 0 {
            return;
        }
        if let Some(step) = self.steps.get_mut(self.current_step)
            && self.text_cursor <= step.text_value.len()
        {
            // Find the previous char boundary
            let prev = step.text_value[..self.text_cursor]
                .char_indices()
                .next_back()
                .map_or(0, |(i, _)| i);
            step.text_value.remove(prev);
            self.text_cursor = prev;
        }
    }

    /// Get the `text_value` of a step by id.
    pub fn step_text_value(&self, id: &str) -> String {
        self.steps
            .iter()
            .find(|s| s.id == id)
            .map(|s| s.text_value.clone())
            .unwrap_or_default()
    }

    /// Recalculate `active_steps` based on `project_type`.
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
                    _ => true,
                }
            })
            .map(|(i, _)| i)
            .collect();
    }

    /// Collect all answers for serialization.
    pub fn answers(&self) -> Vec<(&'static str, Vec<String>)> {
        self.steps
            .iter()
            .map(|step| {
                let values: Vec<String> = if matches!(step.kind, StepKind::TextInput { .. }) {
                    // For TextInput, return selected provider label + masked key
                    let mut vals: Vec<String> = step
                        .selected
                        .iter()
                        .filter_map(|&i| step.options.get(i).map(|o| o.label.clone()))
                        .collect();
                    if !step.text_value.is_empty() {
                        vals.push("[key set]".to_string());
                    }
                    vals
                } else {
                    step.selected
                        .iter()
                        .filter_map(|&i| step.options.get(i).map(|o| o.label.clone()))
                        .collect()
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
                let names = [
                    "dark",
                    "light",
                    "solarized-dark",
                    "solarized-light",
                    "dracula",
                    "nord",
                    "monokai",
                    "gruvbox",
                ];
                names.get(idx).unwrap_or(&"dark").to_string()
            }
            "project_type" => match idx {
                0 => "existing",
                1 => "demo",
                _ => "existing",
            }
            .to_string(),
            "workspace_trust" => match idx {
                0 => "yes",
                1 => "no",
                _ => "yes",
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
            // Matches option order in steps.rs: OpenRouter=0, Anthropic=1, OpenAI=2, Guard=3, Offline=4
            "ai_provider" => match idx {
                0 => "openrouter".to_string(),
                1 => "anthropic".to_string(),
                2 => "openai".to_string(),
                3 => "guard_api".to_string(),
                4 => "offline".to_string(),
                _ => "offline".to_string(),
            },
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
