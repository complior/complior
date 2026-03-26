#[cfg(test)]
mod tests {
    use crate::views::onboarding::*;

    #[test]
    fn test_onboarding_7_steps() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.steps.len(), 7);
        assert_eq!(wiz.current_step, 0);
        assert!(!wiz.completed);
        // new() starts with all steps active; recalculate_active_steps() applies skipping
        assert_eq!(wiz.total_visible_steps(), 7);
    }

    #[test]
    fn test_step_kinds() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.steps[0].kind, StepKind::ThemeSelect);   // welcome_theme
        assert_eq!(wiz.steps[1].kind, StepKind::Radio);          // project_type
        assert_eq!(wiz.steps[2].kind, StepKind::Radio);          // workspace_trust
        assert_eq!(wiz.steps[3].kind, StepKind::Radio);          // role
        assert_eq!(wiz.steps[4].kind, StepKind::Radio);          // industry
        assert_eq!(wiz.steps[5].kind, StepKind::TextInput { masked: true }); // ai_provider
        assert_eq!(wiz.steps[6].kind, StepKind::Summary);        // summary
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
        // 7 active steps by default — need 6 non-completing advances
        for _ in 0..6 {
            assert!(!wiz.next_step());
        }
        assert!(!wiz.completed);
        let done = wiz.next_step();
        assert!(done);
        assert!(wiz.completed);
        assert!(wiz.result_summary.is_some());
    }

    #[test]
    fn test_conditional_skip_demo() {
        let mut wiz = OnboardingWizard::new();
        wiz.project_type = Some("demo".to_string());
        wiz.recalculate_active_steps();
        // Skip: workspace_trust (idx 2 — demo skips it)
        assert!(!wiz.active_steps.contains(&2)); // workspace_trust skipped
        assert_eq!(wiz.total_visible_steps(), 6);
    }

    #[test]
    fn test_conditional_skip_existing() {
        let mut wiz = OnboardingWizard::new();
        wiz.project_type = Some("existing".to_string());
        wiz.recalculate_active_steps();
        // All steps visible for "existing"
        assert_eq!(wiz.total_visible_steps(), 7);
    }

    #[test]
    fn test_selected_config_value() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.selected_config_value("welcome_theme"), "dark"); // idx 0 = Complior Dark
        assert_eq!(wiz.selected_config_value("project_type"), "existing"); // idx 0 = My project
        assert_eq!(wiz.selected_config_value("role"), "deployer");
        assert_eq!(wiz.selected_config_value("industry"), "general");
    }

    #[test]
    fn test_ai_provider_config_value() {
        let mut wiz = OnboardingWizard::new();
        // ai_provider step is at index 5
        wiz.steps[5].selected = vec![0];
        assert_eq!(wiz.selected_config_value("ai_provider"), "openrouter");
        wiz.steps[5].selected = vec![1];
        assert_eq!(wiz.selected_config_value("ai_provider"), "anthropic");
        wiz.steps[5].selected = vec![2];
        assert_eq!(wiz.selected_config_value("ai_provider"), "openai");
        wiz.steps[5].selected = vec![3];
        assert_eq!(wiz.selected_config_value("ai_provider"), "guard_api");
        wiz.steps[5].selected = vec![4];
        assert_eq!(wiz.selected_config_value("ai_provider"), "offline");
    }

    #[test]
    fn test_text_input_methods() {
        let mut wiz = OnboardingWizard::new();
        wiz.current_step = 5; // ai_provider (TextInput)

        // insert_char
        wiz.insert_char('s');
        wiz.insert_char('k');
        wiz.insert_char('-');
        assert_eq!(wiz.steps[5].text_value, "sk-");
        assert_eq!(wiz.text_cursor, 3);

        // delete_char_before
        wiz.delete_char_before();
        assert_eq!(wiz.steps[5].text_value, "sk");
        assert_eq!(wiz.text_cursor, 2);

        // step_text_value
        assert_eq!(wiz.step_text_value("ai_provider"), "sk");
        assert_eq!(wiz.step_text_value("nonexistent"), "");
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
    fn test_resume_out_of_bounds_restarts() {
        // Saved step from old config with more steps — should restart from 0
        let wiz = OnboardingWizard::resume(99);
        assert_eq!(wiz.current_step, 0, "out-of-bounds resume should restart from step 0");
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
        // Industry step is at index 4
        let industry = &wiz.steps[4];
        assert_eq!(industry.id, "industry");
        let high_risk_count = industry
            .options
            .iter()
            .filter(|o| o.tag == Some("HIGH RISK"))
            .count();
        assert_eq!(high_risk_count, 6);
    }

    #[test]
    fn test_ai_provider_has_recommended_tag() {
        let wiz = OnboardingWizard::new();
        let ai_step = &wiz.steps[5];
        assert_eq!(ai_step.id, "ai_provider");
        assert_eq!(ai_step.options[3].tag, Some("RECOMMENDED")); // Guard API
        assert_eq!(ai_step.options.len(), 5);
    }

    #[test]
    fn test_next_step_resets_provider_substep() {
        let mut wiz = OnboardingWizard::new();
        wiz.provider_substep = 2;
        wiz.text_cursor = 5;
        wiz.validation_message = Some("test".to_string());
        wiz.next_step();
        assert_eq!(wiz.provider_substep, 0);
        assert_eq!(wiz.text_cursor, 0);
        assert!(wiz.validation_message.is_none());
    }

    #[test]
    fn snapshot_ai_provider_substep0() {
        use ratatui::backend::TestBackend;
        use ratatui::Terminal;

        crate::theme::init_theme("dark");
        let mut wiz = OnboardingWizard::new();
        // Navigate to ai_provider step (index 5)
        for _ in 0..5 {
            wiz.next_step();
        }
        assert_eq!(wiz.steps[wiz.current_step].id, "ai_provider");

        let backend = TestBackend::new(80, 36);
        let mut terminal = Terminal::new(backend).expect("terminal");
        terminal
            .draw(|frame| {
                crate::views::onboarding::render_onboarding(frame, &wiz);
            })
            .expect("render");

        let buf = terminal.backend().buffer().clone();
        let mut output = String::new();
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                output.push_str(buf[(x, y)].symbol());
            }
            output.push('\n');
        }
        // Verify key content is rendered
        assert!(output.contains("AI Connection"), "Should show AI Connection title");
        assert!(output.contains("OpenRouter"), "Should show OpenRouter option");
        assert!(output.contains("Anthropic"), "Should show Anthropic option");
        assert!(output.contains("RECOMMENDED"), "Should show RECOMMENDED tag");
        assert!(output.contains("Offline"), "Should show Offline option");
    }

    #[test]
    fn snapshot_ai_provider_substep1_key_input() {
        use ratatui::backend::TestBackend;
        use ratatui::Terminal;

        crate::theme::init_theme("dark");
        let mut wiz = OnboardingWizard::new();
        for _ in 0..5 {
            wiz.next_step();
        }
        // Simulate: OpenRouter selected, switch to key input
        wiz.steps[wiz.current_step].selected = vec![0]; // OpenRouter
        wiz.provider_substep = 1;
        wiz.insert_char('s');
        wiz.insert_char('k');
        wiz.insert_char('-');
        wiz.insert_char('o');
        wiz.insert_char('r');
        wiz.insert_char('-');
        wiz.insert_char('t');
        wiz.insert_char('e');

        let backend = TestBackend::new(80, 36);
        let mut terminal = Terminal::new(backend).expect("terminal");
        terminal
            .draw(|frame| crate::views::onboarding::render_onboarding(frame, &wiz))
            .expect("render");

        let buf = terminal.backend().buffer().clone();
        let mut output = String::new();
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                output.push_str(buf[(x, y)].symbol());
            }
            output.push('\n');
        }
        // First 4 chars visible, rest masked
        assert!(output.contains("sk-o"), "Should show first 4 chars of key");
        assert!(output.contains("credentials"), "Should show credentials path hint");
    }

    #[test]
    fn snapshot_ai_provider_substep3_valid() {
        use ratatui::backend::TestBackend;
        use ratatui::Terminal;

        crate::theme::init_theme("dark");
        let mut wiz = OnboardingWizard::new();
        for _ in 0..5 {
            wiz.next_step();
        }
        wiz.steps[wiz.current_step].selected = vec![0];
        wiz.provider_substep = 3;
        wiz.validation_message = Some("Key accepted (OpenRouter).".to_string());

        let backend = TestBackend::new(80, 36);
        let mut terminal = Terminal::new(backend).expect("terminal");
        terminal
            .draw(|frame| crate::views::onboarding::render_onboarding(frame, &wiz))
            .expect("render");

        let buf = terminal.backend().buffer().clone();
        let mut output = String::new();
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                output.push_str(buf[(x, y)].symbol());
            }
            output.push('\n');
        }
        assert!(output.contains("Key accepted"), "Should show success message");
        assert!(output.contains("\u{2713}"), "Should show checkmark");
    }

    #[test]
    fn snapshot_ai_provider_substep3_invalid() {
        use ratatui::backend::TestBackend;
        use ratatui::Terminal;

        crate::theme::init_theme("dark");
        let mut wiz = OnboardingWizard::new();
        for _ in 0..5 {
            wiz.next_step();
        }
        wiz.steps[wiz.current_step].selected = vec![0];
        wiz.provider_substep = 3;
        wiz.validation_message = Some("Invalid — Key too short.".to_string());

        let backend = TestBackend::new(80, 36);
        let mut terminal = Terminal::new(backend).expect("terminal");
        terminal
            .draw(|frame| crate::views::onboarding::render_onboarding(frame, &wiz))
            .expect("render");

        let buf = terminal.backend().buffer().clone();
        let mut output = String::new();
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                output.push_str(buf[(x, y)].symbol());
            }
            output.push('\n');
        }
        assert!(output.contains("Invalid"), "Should show error message");
        assert!(output.contains("\u{2717}"), "Should show X mark");
        assert!(output.contains("retry"), "Should show retry hint");
    }

    #[test]
    fn test_project_type_two_options() {
        let wiz = OnboardingWizard::new();
        let pt_step = &wiz.steps[1];
        assert_eq!(pt_step.id, "project_type");
        assert_eq!(pt_step.options.len(), 2);
        assert_eq!(wiz.selected_config_value("project_type"), "existing");
    }
}
