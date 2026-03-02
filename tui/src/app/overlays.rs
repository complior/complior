use crate::input::Action;
use crate::types::{ChatMessage, MessageRole, Overlay};

use super::{App, AppCommand};

impl App {
    fn handle_theme_picker_action(&mut self, action: Action) -> Option<AppCommand> {
        match action {
            Action::ScrollDown => {
                if let Some(tp) = &mut self.theme_picker {
                    tp.move_down();
                }
                None
            }
            Action::ScrollUp => {
                if let Some(tp) = &mut self.theme_picker {
                    tp.move_up();
                }
                None
            }
            Action::SubmitInput => {
                // Apply selected theme and close
                let name = self
                    .theme_picker
                    .as_ref()
                    .map(|tp| tp.selected_name().to_string())
                    .unwrap_or_default();
                self.theme_picker = None;
                self.overlay = Overlay::None;
                if !name.is_empty() {
                    crate::theme::init_theme(&name);
                    self.messages.push(ChatMessage::new(
                        MessageRole::System,
                        format!("Theme: {name}"),
                    ));
                    self.toasts.push(crate::components::toast::ToastKind::Info, format!("Theme: {name}"));
                    return Some(AppCommand::SaveTheme(name));
                }
                None
            }
            Action::EnterNormalMode | Action::Quit => {
                self.theme_picker = None;
                self.overlay = Overlay::None;
                None
            }
            _ => None,
        }
    }

    fn handle_onboarding_action(&mut self, action: Action) -> Option<AppCommand> {
        use crate::views::onboarding::{OnboardingWizard, StepKind};

        // Determine current step kind
        let step_kind = self
            .onboarding
            .as_ref()
            .and_then(|wiz| wiz.current().map(|s| s.kind.clone()));

        match action {
            Action::ScrollDown => {
                if let Some(wiz) = &mut self.onboarding {
                    wiz.move_cursor_down();
                    // ThemeSelect: auto-select at cursor so preview updates
                    if matches!(step_kind, Some(StepKind::ThemeSelect)) {
                        wiz.toggle_selection();
                    }
                }
                None
            }
            Action::ScrollUp => {
                if let Some(wiz) = &mut self.onboarding {
                    wiz.move_cursor_up();
                    // ThemeSelect: auto-select at cursor so preview updates
                    if matches!(step_kind, Some(StepKind::ThemeSelect)) {
                        wiz.toggle_selection();
                    }
                }
                None
            }
            Action::InsertChar(' ') => {
                if matches!(step_kind, Some(StepKind::Checkbox | StepKind::Radio | StepKind::ThemeSelect)) {
                    if let Some(wiz) = &mut self.onboarding {
                        wiz.toggle_selection();
                    }
                }
                None
            }
            Action::InsertChar('a') => {
                if matches!(step_kind, Some(StepKind::Checkbox))
                    && let Some(wiz) = &mut self.onboarding
                {
                    wiz.select_all();
                }
                None
            }
            Action::InsertChar('n') => {
                if matches!(step_kind, Some(StepKind::Checkbox))
                    && let Some(wiz) = &mut self.onboarding
                {
                    wiz.select_minimum();
                }
                None
            }
            Action::SubmitInput => {
                // Handle post-step side effects before advancing
                if let Some(wiz) = &mut self.onboarding {
                    if wiz.completed {
                        // Already on completion screen — close wizard
                        let summary = wiz.result_summary.clone();
                        if let Some(s) = &summary {
                            self.messages.push(ChatMessage::new(
                                MessageRole::System,
                                format!("Setup complete: {s}"),
                            ));
                        }
                        self.onboarding = None;
                        self.overlay = Overlay::None;
                        return Some(AppCommand::CompleteOnboarding);
                    }

                    let current_id = wiz.current().map(|s| s.id);

                    // Step 5 (workspace_trust): "No, exit" → quit
                    if current_id == Some("workspace_trust") {
                        let selected_idx = wiz.steps[wiz.current_step]
                            .selected
                            .first()
                            .copied()
                            .unwrap_or(0);
                        if selected_idx == 1 {
                            // "No, exit"
                            self.messages.push(ChatMessage::new(
                                MessageRole::System,
                                "Run complior in a trusted folder.".to_string(),
                            ));
                            self.onboarding = None;
                            self.overlay = Overlay::None;
                            self.running = false;
                            return None;
                        }
                    }
                }

                // Advance to next step
                let completed = self
                    .onboarding
                    .as_mut()
                    .is_some_and(OnboardingWizard::next_step);

                // Post-advance side effects
                if let Some(wiz) = &mut self.onboarding {
                    let prev_step = wiz
                        .active_steps
                        .iter()
                        .position(|&i| i == wiz.current_step)
                        .and_then(|pos| pos.checked_sub(1).map(|p| wiz.active_steps[p]));

                    // After Step 4 (project_type): update project_type and recalculate skips
                    if prev_step.and_then(|ps| wiz.steps.get(ps)).map(|s| s.id) == Some("project_type") {
                        let pt = wiz.selected_config_value("project_type");
                        wiz.project_type = Some(pt);
                        wiz.recalculate_active_steps();
                    }

                    // After Step 1 (welcome_theme): apply selected theme
                    if prev_step.and_then(|ps| wiz.steps.get(ps)).map(|s| s.id) == Some("welcome_theme") {
                        let theme_name = wiz.selected_config_value("welcome_theme");
                        crate::theme::init_theme(&theme_name);
                    }
                }

                if completed {
                    // Show summary step — not closing yet
                    // The summary step's SubmitInput will close
                }
                None
            }
            Action::DeleteChar => {
                // Backspace = previous step
                if let Some(wiz) = &mut self.onboarding {
                    wiz.prev_step();
                }
                None
            }
            Action::EnterNormalMode | Action::Quit => {
                // Esc = save partial + close wizard
                let last_step = self
                    .onboarding
                    .as_ref()
                    .map(|wiz| wiz.current_step)
                    .unwrap_or(0);
                self.onboarding = None;
                self.overlay = Overlay::None;
                Some(AppCommand::SaveOnboardingPartial(last_step))
            }
            _ => None,
        }
    }

    pub(super) fn handle_overlay_action(&mut self, action: Action) -> Option<AppCommand> {
        // --- Theme Picker overlay ---
        if self.overlay == Overlay::ThemePicker {
            return self.handle_theme_picker_action(action);
        }

        // --- Onboarding overlay ---
        if self.overlay == Overlay::Onboarding {
            return self.handle_onboarding_action(action);
        }

        // --- Confirm Dialog overlay ---
        if self.overlay == Overlay::ConfirmDialog {
            match action {
                Action::InsertChar('y' | 'Y') => {
                    self.confirm_dialog = None;
                    self.overlay = Overlay::None;
                    self.toasts.push(crate::components::toast::ToastKind::Success, "Confirmed");
                }
                Action::EnterNormalMode | Action::Quit
                | Action::InsertChar('n' | 'N') => {
                    self.confirm_dialog = None;
                    self.overlay = Overlay::None;
                }
                _ => {}
            }
            return None;
        }

        // --- Undo History overlay ---
        if self.overlay == Overlay::UndoHistory {
            match action {
                Action::ScrollDown => self.undo_history.navigate_down(),
                Action::ScrollUp => self.undo_history.navigate_up(),
                Action::SubmitInput => {
                    // Undo selected entry
                    let id = self.undo_history.selected_id();
                    self.overlay = Overlay::None;
                    if let Some(id) = id {
                        return Some(AppCommand::Undo(Some(id)));
                    }
                }
                Action::EnterNormalMode | Action::Quit => {
                    self.overlay = Overlay::None;
                }
                _ => {}
            }
            return None;
        }

        // --- Dismiss Modal overlay ---
        if self.overlay == Overlay::DismissModal {
            match action {
                Action::ScrollDown => {
                    if let Some(modal) = &mut self.dismiss_modal {
                        modal.move_down();
                    }
                }
                Action::ScrollUp => {
                    if let Some(modal) = &mut self.dismiss_modal {
                        modal.move_up();
                    }
                }
                Action::SubmitInput => {
                    if let Some(modal) = &self.dismiss_modal {
                        let reason = modal.selected_reason();
                        self.toasts.push(
                            crate::components::toast::ToastKind::Info,
                            format!("Dismissed: {reason:?}"),
                        );
                    }
                    self.dismiss_modal = None;
                    self.overlay = Overlay::None;
                }
                Action::EnterNormalMode | Action::Quit => {
                    self.dismiss_modal = None;
                    self.overlay = Overlay::None;
                }
                _ => {}
            }
            return None;
        }

        match action {
            Action::EnterNormalMode | Action::Quit => {
                let was_getting_started = self.overlay == Overlay::GettingStarted;
                self.overlay = Overlay::None;
                self.overlay_filter.clear();
                if was_getting_started {
                    return Some(AppCommand::MarkFirstRunDone);
                }
                None
            }
            Action::ScrollDown if self.overlay == Overlay::CommandPalette => {
                let count = crate::components::command_palette::filtered_count(&self.overlay_filter);
                if count > 0 {
                    self.palette_index = (self.palette_index + 1).min(count - 1);
                }
                None
            }
            Action::ScrollUp if self.overlay == Overlay::CommandPalette => {
                self.palette_index = self.palette_index.saturating_sub(1);
                None
            }
            Action::InsertChar(c) => {
                self.overlay_filter.push(c);
                self.palette_index = 0;
                None
            }
            Action::DeleteChar => {
                self.overlay_filter.pop();
                self.palette_index = 0;
                None
            }
            Action::SubmitInput => {
                let filter = std::mem::take(&mut self.overlay_filter);
                match self.overlay {
                    Overlay::CommandPalette => {
                        self.overlay = Overlay::None;
                        if let Some(cmd) = crate::components::command_palette::filtered_command(&filter, self.palette_index) {
                            let cmd = cmd.trim_start_matches('/');
                            return self.handle_command(cmd);
                        }
                    }
                    Overlay::FilePicker => {
                        self.overlay = Overlay::None;
                        let matches = crate::components::file_picker::fuzzy_match_files(
                            &self.file_tree,
                            &filter,
                        );
                        if let Some(first) = matches.first() {
                            let path = first.path.to_string_lossy().to_string();
                            let mention = format!("@{path} ");
                            self.input.push_str(&mention);
                            self.input_cursor = self.input.len();
                        }
                    }
                    Overlay::GettingStarted => {
                        self.overlay = Overlay::None;
                        return Some(AppCommand::MarkFirstRunDone);
                    }
                    Overlay::Help => {
                        self.overlay = Overlay::None;
                    }
                    Overlay::ConfirmDialog => {
                        self.confirm_dialog = None;
                        self.overlay = Overlay::None;
                    }
                    Overlay::DismissModal => {
                        self.dismiss_modal = None;
                        self.overlay = Overlay::None;
                    }
                    Overlay::None | Overlay::ThemePicker | Overlay::Onboarding
                    | Overlay::UndoHistory => {}

                }
                None
            }
            // Help overlay scroll with j/k
            Action::ScrollUp if self.overlay == Overlay::Help => {
                self.help_scroll = self.help_scroll.saturating_sub(1);
                None
            }
            Action::ScrollDown if self.overlay == Overlay::Help => {
                self.help_scroll += 1;
                None
            }
            // Ignore no-op keys
            Action::None | Action::ScrollUp | Action::ScrollDown
            | Action::HistoryUp | Action::HistoryDown => None,
            _ => {
                if self.overlay == Overlay::GettingStarted {
                    self.overlay = Overlay::None;
                    return Some(AppCommand::MarkFirstRunDone);
                } else if self.overlay == Overlay::Help {
                    self.overlay = Overlay::None;
                }
                None
            }
        }
    }
}
