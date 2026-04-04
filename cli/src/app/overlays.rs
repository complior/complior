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
                    self.toasts.push(
                        crate::components::toast::ToastKind::Info,
                        format!("Theme: {name}"),
                    );
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
            Action::InsertChar(c) if matches!(step_kind, Some(StepKind::TextInput { .. })) => {
                if let Some(wiz) = &mut self.onboarding {
                    if wiz.provider_substep == 1 {
                        wiz.insert_char(c);
                    } else if wiz.provider_substep == 0 {
                        // Allow j/k/space navigation in substep 0
                        if c == ' ' {
                            wiz.toggle_selection()
                        }
                    }
                }
                None
            }
            Action::InsertChar(' ') => {
                if matches!(
                    step_kind,
                    Some(StepKind::Checkbox | StepKind::Radio | StepKind::ThemeSelect)
                ) && let Some(wiz) = &mut self.onboarding
                {
                    wiz.toggle_selection();
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
                // Handle TextInput substeps
                if matches!(step_kind, Some(StepKind::TextInput { .. }))
                    && let Some(wiz) = &mut self.onboarding
                {
                    match wiz.provider_substep {
                        0 => {
                            // Provider selected → set selection
                            let idx = wiz.cursor;
                            wiz.steps[wiz.current_step].selected = vec![idx];
                            match idx {
                                0..=2 => {
                                    // OpenRouter/Anthropic/OpenAI — go to key input
                                    wiz.provider_substep = 1;
                                    wiz.text_cursor = 0;
                                }
                                3 | 4 => {
                                    // Guard API or Offline — no key needed, advance
                                    let _completed = wiz.next_step();
                                }
                                _ => {}
                            }
                            return None;
                        }
                        1 => {
                            // Key submitted → validate for selected provider
                            let key = wiz.steps[wiz.current_step].text_value.clone();
                            let provider = wiz.selected_config_value("ai_provider");
                            if key.is_empty() {
                                wiz.validation_message =
                                    Some("Invalid — Key cannot be empty.".to_string());
                            } else {
                                match crate::config::validate_api_key(&provider, &key) {
                                    Ok(()) => {
                                        let label = match provider.as_str() {
                                            "openrouter" => "OpenRouter",
                                            "anthropic" => "Anthropic",
                                            "openai" => "OpenAI",
                                            _ => "API",
                                        };
                                        wiz.validation_message =
                                            Some(format!("Key accepted ({label})."));
                                    }
                                    Err(reason) => {
                                        wiz.validation_message =
                                            Some(format!("Invalid — {reason}"));
                                    }
                                }
                            }
                            wiz.provider_substep = 3;
                            return None;
                        }
                        3 => {
                            // Result screen → continue or retry
                            let is_valid = wiz
                                .validation_message
                                .as_ref()
                                .is_some_and(|m| !m.starts_with("Invalid"));
                            if is_valid {
                                let _completed = wiz.next_step();
                                return None;
                            }
                            // Retry: back to key input
                            wiz.provider_substep = 1;
                            wiz.steps[wiz.current_step].text_value.clear();
                            wiz.text_cursor = 0;
                            return None;
                        }
                        _ => {}
                    }
                }

                // Handle post-step side effects before advancing
                if let Some(wiz) = &mut self.onboarding {
                    if wiz.completed {
                        // Already on completion screen — emit command.
                        // Executor handles save + cleanup (needs wizard ref alive).
                        let summary = wiz.result_summary.clone();
                        if let Some(s) = &summary {
                            self.messages.push(ChatMessage::new(
                                MessageRole::System,
                                format!("Setup complete: {s}"),
                            ));
                        }
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
                    if prev_step.and_then(|ps| wiz.steps.get(ps)).map(|s| s.id)
                        == Some("project_type")
                    {
                        let pt = wiz.selected_config_value("project_type");
                        wiz.project_type = Some(pt);
                        wiz.recalculate_active_steps();
                    }

                    // After Step 1 (welcome_theme): apply selected theme
                    if prev_step.and_then(|ps| wiz.steps.get(ps)).map(|s| s.id)
                        == Some("welcome_theme")
                    {
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
                // Handle TextInput substeps first
                if matches!(step_kind, Some(StepKind::TextInput { .. }))
                    && let Some(wiz) = &mut self.onboarding
                {
                    match wiz.provider_substep {
                        1 => {
                            if wiz.text_cursor > 0 {
                                wiz.delete_char_before();
                            } else {
                                // Empty input → back to provider select
                                wiz.provider_substep = 0;
                            }
                            return None;
                        }
                        0 => {
                            wiz.prev_step();
                            return None;
                        }
                        3 => {
                            // Back to key input from result
                            wiz.provider_substep = 1;
                            return None;
                        }
                        _ => {}
                    }
                }

                // Backspace = previous step
                if let Some(wiz) = &mut self.onboarding {
                    wiz.prev_step();
                }
                None
            }
            Action::EnterNormalMode | Action::Quit => {
                // Esc/Quit blocked during onboarding — must complete it
                None
            }
            _ => None,
        }
    }

    fn handle_llm_settings_action(&mut self, action: Action) -> Option<AppCommand> {
        use crate::llm_settings::LlmSettingsField;

        match action {
            Action::ScrollDown => {
                if let Some(s) = &mut self.llm_settings
                    && !s.editing
                {
                    s.focused_field = match s.focused_field {
                        LlmSettingsField::Provider => LlmSettingsField::ApiKey,
                        LlmSettingsField::ApiKey => LlmSettingsField::Model,
                        LlmSettingsField::Model => LlmSettingsField::TestConnection,
                        LlmSettingsField::TestConnection => LlmSettingsField::TestConnection,
                    };
                }
                None
            }
            Action::ScrollUp => {
                if let Some(s) = &mut self.llm_settings
                    && !s.editing
                {
                    s.focused_field = match s.focused_field {
                        LlmSettingsField::Provider => LlmSettingsField::Provider,
                        LlmSettingsField::ApiKey => LlmSettingsField::Provider,
                        LlmSettingsField::Model => LlmSettingsField::ApiKey,
                        LlmSettingsField::TestConnection => LlmSettingsField::Model,
                    };
                }
                None
            }
            Action::InsertChar(' ')
                if self.llm_settings.as_ref().is_some_and(|s| {
                    !s.editing && s.focused_field == LlmSettingsField::Provider
                }) =>
            {
                if let Some(s) = &mut self.llm_settings {
                    s.selected_provider = (s.selected_provider + 1) % 3;
                }
                None
            }
            Action::SubmitInput => {
                if let Some(s) = &mut self.llm_settings {
                    if s.editing {
                        // Stop editing
                        s.editing = false;
                    } else {
                        match s.focused_field {
                            LlmSettingsField::Provider => {
                                s.selected_provider = (s.selected_provider + 1) % 3;
                            }
                            LlmSettingsField::ApiKey => {
                                s.editing = true;
                            }
                            LlmSettingsField::Model => {
                                s.editing = true;
                            }
                            LlmSettingsField::TestConnection => {
                                return Some(AppCommand::TestLlmConnection);
                            }
                        }
                    }
                }
                None
            }
            Action::InsertChar(c) => {
                if let Some(s) = &mut self.llm_settings
                    && s.editing
                {
                    match s.focused_field {
                        LlmSettingsField::ApiKey => s.api_key_input.push(c),
                        LlmSettingsField::Model => s.model_input.push(c),
                        _ => {}
                    }
                }
                None
            }
            Action::DeleteChar => {
                if let Some(s) = &mut self.llm_settings
                    && s.editing
                {
                    match s.focused_field {
                        LlmSettingsField::ApiKey => {
                            s.api_key_input.pop();
                        }
                        LlmSettingsField::Model => {
                            s.model_input.pop();
                        }
                        _ => {}
                    }
                }
                None
            }
            Action::EnterNormalMode | Action::Quit => {
                // Save settings and close
                if let Some(s) = self.llm_settings.take() {
                    let provider = crate::llm_settings::PROVIDERS[s.selected_provider].name();
                    self.llm_config.provider = Some(provider.to_string());
                    if !s.api_key_input.is_empty() {
                        self.llm_config.api_key = Some(s.api_key_input);
                    }
                    if !s.model_input.is_empty() {
                        self.llm_config.model = Some(s.model_input);
                    }
                    self.toasts.push(
                        crate::components::toast::ToastKind::Info,
                        "LLM settings saved",
                    );
                    self.overlay = Overlay::None;
                    return Some(AppCommand::SaveLlmSettings);
                }
                self.overlay = Overlay::None;
                None
            }
            _ => None,
        }
    }

    pub(super) fn handle_overlay_action(&mut self, action: Action) -> Option<AppCommand> {
        // --- LLM Settings overlay ---
        if self.overlay == Overlay::LlmSettings {
            return self.handle_llm_settings_action(action);
        }

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
                    self.toasts
                        .push(crate::components::toast::ToastKind::Success, "Confirmed");
                }
                Action::EnterNormalMode | Action::Quit | Action::InsertChar('n' | 'N') => {
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
                let count =
                    crate::components::command_palette::filtered_count(&self.overlay_filter);
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
                        if let Some(cmd) = crate::components::command_palette::filtered_command(
                            &filter,
                            self.palette_index,
                        ) {
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
                    Overlay::None
                    | Overlay::ThemePicker
                    | Overlay::Onboarding
                    | Overlay::UndoHistory
                    | Overlay::LlmSettings => {}
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
            Action::None
            | Action::ScrollUp
            | Action::ScrollDown
            | Action::HistoryUp
            | Action::HistoryDown => None,
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
