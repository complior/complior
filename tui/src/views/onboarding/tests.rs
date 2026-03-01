#[cfg(test)]
mod tests {
    use crate::views::onboarding::*;

    #[test]
    fn test_onboarding_10_steps() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.steps.len(), 9);
        assert_eq!(wiz.current_step, 0);
        assert!(!wiz.completed);
        // new() starts with all steps active; recalculate_active_steps() applies skipping
        assert_eq!(wiz.total_visible_steps(), 9);
    }

    #[test]
    fn test_step_kinds() {
        let wiz = OnboardingWizard::new();
        assert_eq!(wiz.steps[0].kind, StepKind::ThemeSelect);   // welcome_theme
        assert_eq!(wiz.steps[1].kind, StepKind::Radio);          // navigation
        assert_eq!(wiz.steps[2].kind, StepKind::Radio);          // project_type
        assert_eq!(wiz.steps[7].kind, StepKind::Checkbox);       // scan_scope
        assert_eq!(wiz.steps[8].kind, StepKind::Summary);        // summary
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
        wiz.current_step = 7; // scan_scope (checkbox)
        assert_eq!(wiz.steps[7].selected, vec![0, 1, 2]); // defaults
        wiz.cursor = 3;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[7].selected, vec![0, 1, 2, 3]);
        // Toggle off
        wiz.cursor = 1;
        wiz.toggle_selection();
        assert_eq!(wiz.steps[7].selected, vec![0, 2, 3]);
    }

    #[test]
    fn test_select_all_and_minimum() {
        let mut wiz = OnboardingWizard::new();
        wiz.current_step = 7; // scan_scope
        wiz.select_all();
        assert_eq!(wiz.steps[7].selected, vec![0, 1, 2, 3, 4]);
        wiz.select_minimum();
        assert_eq!(wiz.steps[7].selected, vec![0]);
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
        // 9 active steps by default — need 8 non-completing advances
        for _ in 0..8 {
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
        // Skip: workspace_trust (idx 3 — demo skips it)
        //        scan_scope (idx 7 — demo skips it)
        assert!(!wiz.active_steps.contains(&3)); // workspace_trust skipped
        assert!(!wiz.active_steps.contains(&7)); // scan_scope skipped
        assert_eq!(wiz.total_visible_steps(), 7);
    }

    #[test]
    fn test_conditional_skip_new() {
        let mut wiz = OnboardingWizard::new();
        wiz.project_type = Some("new".to_string());
        wiz.recalculate_active_steps();
        // Skip: scan_scope (idx 7 — "new" skips scan_scope)
        // Keep: workspace_trust (idx 3 — only skipped for demo)
        assert!(wiz.active_steps.contains(&3));  // workspace_trust kept
        assert!(!wiz.active_steps.contains(&7)); // scan_scope skipped
        assert_eq!(wiz.total_visible_steps(), 8);
    }

    #[test]
    fn test_conditional_skip_existing() {
        let mut wiz = OnboardingWizard::new();
        wiz.project_type = Some("existing".to_string());
        wiz.recalculate_active_steps();
        // All steps visible for "existing"
        assert_eq!(wiz.total_visible_steps(), 9);
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
        // Industry step should have HIGH RISK tags (idx 6)
        let industry = &wiz.steps[6];
        assert_eq!(industry.id, "industry");
        let high_risk_count = industry
            .options
            .iter()
            .filter(|o| o.tag == Some("HIGH RISK"))
            .count();
        assert_eq!(high_risk_count, 6);
    }
}
