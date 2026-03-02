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

    pub(super) fn with_tag(mut self, tag: &'static str) -> Self {
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
}

/// Full onboarding wizard state.
#[derive(Debug, Clone)]
pub struct OnboardingWizard {
    pub steps: Vec<OnboardingStep>,
    pub current_step: usize,
    pub cursor: usize,
    pub completed: bool,
    pub result_summary: Option<String>,

    /// Set after project_type step, drives conditional skipping.
    pub project_type: Option<String>,
    /// Indices of visible steps (recalculated on project_type change).
    pub active_steps: Vec<usize>,
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

    /// Collect all answers for serialization.
    pub fn answers(&self) -> Vec<(&'static str, Vec<String>)> {
        self.steps
            .iter()
            .map(|step| {
                let values: Vec<String> = step
                    .selected
                    .iter()
                    .filter_map(|&i| step.options.get(i).map(|o| o.label.clone()))
                    .collect();
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
