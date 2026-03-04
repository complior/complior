#[cfg(test)]
mod tests {
    use crate::app::{App, AppCommand};
    use crate::config::TuiConfig;
    use crate::input::Action;
    use crate::types::{InputMode, Overlay, Panel, ViewState};

    use super::super::MAX_TERMINAL_LINES;

    #[test]
    fn test_app_creation() {
        let app = App::new(TuiConfig::default());
        assert!(app.running);
        assert_eq!(app.active_panel, Panel::Chat);
        assert_eq!(app.input_mode, InputMode::Normal);
        assert_eq!(app.messages.len(), 1);
        assert!(app.sidebar_visible);
    }

    #[test]
    fn test_panel_cycling() {
        let mut app = App::new(TuiConfig::default());
        assert_eq!(app.active_panel, Panel::Chat);
        app.next_panel();
        assert_eq!(app.active_panel, Panel::Score);
        app.next_panel();
        assert_eq!(app.active_panel, Panel::FileBrowser);
        app.next_panel();
        assert_eq!(app.active_panel, Panel::Chat);
    }

    #[test]
    fn test_command_parsing() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("help");
        assert!(cmd.is_none());
        assert!(app.messages.len() > 1);
    }

    #[test]
    fn test_scan_command() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("scan");
        assert!(matches!(cmd, Some(AppCommand::Scan)));
        assert!(app.operation_start.is_some());
    }

    #[test]
    fn test_input_history() {
        let mut app = App::new(TuiConfig::default());
        app.push_to_history("/scan");
        app.push_to_history("hello");
        assert_eq!(app.input_history.len(), 2);

        // Navigate up
        app.input = "current".to_string();
        app.history_up();
        assert_eq!(app.input, "hello");
        app.history_up();
        assert_eq!(app.input, "/scan");

        // Navigate down
        app.history_down();
        assert_eq!(app.input, "hello");
        app.history_down();
        assert_eq!(app.input, "current");
    }

    #[test]
    fn test_terminal_buffer_limit() {
        let mut app = App::new(TuiConfig::default());
        for i in 0..1050 {
            app.add_terminal_line(format!("line {i}"));
        }
        assert_eq!(app.terminal_output.len(), MAX_TERMINAL_LINES);
        assert!(app.terminal_output[0].contains("50")); // first 50 lines removed
    }

    #[test]
    fn test_bang_bash_prefix() {
        let mut app = App::new(TuiConfig::default());
        app.input = "!ls -la".to_string();
        app.input_cursor = app.input.len();
        let cmd = app.apply_action(Action::SubmitInput);
        assert!(matches!(cmd, Some(AppCommand::RunCommand(c)) if c == "ls -la"));
        assert!(app.terminal_visible);
    }

    #[test]
    fn test_activity_log_capped_at_10() {
        use crate::types::ActivityKind;
        let mut app = App::new(TuiConfig::default());
        for i in 0..15 {
            app.push_activity(ActivityKind::Scan, format!("scan {i}"));
        }
        assert_eq!(app.activity_log.len(), 10);
        // Oldest entries should have been dropped
        assert!(app.activity_log[0].detail.contains("5"));
        assert!(app.activity_log[9].detail.contains("14"));
    }

    #[test]
    fn test_score_history_load_from_disk() {
        let mut app = App::new(TuiConfig::default());
        // Simulate loading score history (as from session restore)
        let history = vec![42.0, 55.0, 68.0, 75.0, 82.0];
        app.score_history = history.clone();
        assert_eq!(app.score_history.len(), 5);
        assert_eq!(app.score_history, history);
    }

    #[test]
    fn test_watch_command_returns_toggle() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("watch");
        assert!(matches!(cmd, Some(AppCommand::ToggleWatch)));
    }

    #[test]
    fn test_reconnect_command() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("reconnect");
        assert!(matches!(cmd, Some(AppCommand::Reconnect)));
    }

    #[test]
    fn test_theme_command() {
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("theme light");
        assert!(matches!(cmd, Some(AppCommand::SwitchTheme(n)) if n == "light"));
    }

    #[test]
    fn test_view_command() {
        let mut app = App::new(TuiConfig::default());
        assert_eq!(app.view_state, ViewState::Dashboard);

        let cmd = app.handle_command("view 4");
        assert!(cmd.is_none());
        assert_eq!(app.view_state, ViewState::Passport);

        let cmd = app.handle_command("view 2");
        assert!(cmd.is_none());
        assert_eq!(app.view_state, ViewState::Scan);

        // Invalid view number
        let cmd = app.handle_command("view 9");
        assert!(cmd.is_none());
        assert_eq!(app.view_state, ViewState::Scan);
    }

    #[test]
    fn test_obl_tab_complete_without_dash() {
        let mut app = App::new(TuiConfig::default());
        app.input = "@OBL".to_string();
        app.input_cursor = 4;
        app.input_mode = InputMode::Insert;
        app.apply_action(crate::input::Action::TabComplete);
        // Should complete to @OBL-001 (first obligation)
        assert!(app.input.starts_with("@OBL-0"));
        assert!(app.input.len() > 4);
    }

    #[test]
    fn test_obl_tab_complete_with_dash() {
        let mut app = App::new(TuiConfig::default());
        app.input = "@OBL-".to_string();
        app.input_cursor = 5;
        app.input_mode = InputMode::Insert;
        app.apply_action(crate::input::Action::TabComplete);
        // Should complete to @OBL-001
        assert_eq!(app.input, "@OBL-001");
    }

    // ── T06 tests ──

    #[test]
    fn test_theme_picker_open_close() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());
        assert!(app.theme_picker.is_none());
        assert_eq!(app.overlay, Overlay::None);

        // Open theme picker
        app.apply_action(Action::ShowThemePicker);
        assert!(app.theme_picker.is_some());
        assert_eq!(app.overlay, Overlay::ThemePicker);

        // Close with Esc
        app.apply_action(Action::EnterNormalMode);
        assert!(app.theme_picker.is_none());
        assert_eq!(app.overlay, Overlay::None);
    }

    #[test]
    fn test_theme_picker_apply() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());

        // Open theme picker
        app.apply_action(Action::ShowThemePicker);
        assert_eq!(app.overlay, Overlay::ThemePicker);

        // Navigate to a different theme (move down)
        app.apply_action(Action::ScrollDown);

        // Apply with Enter
        app.apply_action(Action::SubmitInput);
        assert_eq!(app.overlay, Overlay::None);
        assert!(app.theme_picker.is_none());
        // Should have a system message about theme change
        assert!(app.messages.iter().any(|m| m.content.contains("Theme:")));
    }

    #[test]
    fn test_onboarding_wizard_flow() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());

        // Open onboarding
        app.onboarding = Some(crate::views::onboarding::OnboardingWizard::new());
        app.overlay = Overlay::Onboarding;

        // Navigate and select
        app.apply_action(Action::ScrollDown); // cursor to option 1
        app.apply_action(Action::InsertChar(' ')); // select it

        // Next step
        app.apply_action(Action::SubmitInput);
        assert_eq!(app.overlay, Overlay::Onboarding); // still open

        // Skip rest with Esc
        app.apply_action(Action::EnterNormalMode);
        assert_eq!(app.overlay, Overlay::None);
        assert!(app.onboarding.is_none());
    }

    #[test]
    fn test_code_search_submission() {
        let mut app = App::new(TuiConfig::default());
        app.code_content = Some("hello world\nfoo bar\nhello again".to_string());
        app.active_panel = Panel::CodeViewer;

        // Simulate code search: enter command mode, type query, submit
        app.apply_action(Action::CodeSearch);
        assert_eq!(app.input_mode, InputMode::Command);

        // Type search query
        app.input = "hello".to_string();
        app.input_cursor = 5;

        // Submit (should detect CodeViewer + no '/' prefix → code search)
        app.apply_action(Action::SubmitInput);

        assert_eq!(app.code_search_query.as_deref(), Some("hello"));
        assert_eq!(app.code_search_matches, vec![0, 2]);
        assert_eq!(app.code_scroll, 0); // jumped to first match
    }

    #[test]
    fn test_theme_command_opens_picker() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());
        let cmd = app.handle_command("theme");
        assert!(cmd.is_none());
        assert_eq!(app.overlay, Overlay::ThemePicker);
        assert!(app.theme_picker.is_some());
    }

    // ── T08 Tests ──

    #[test]
    fn test_click_areas_rebuilt_on_dashboard() {
        let mut app = App::new(TuiConfig::default());
        app.view_state = ViewState::Dashboard;
        app.rebuild_click_areas(120, 40);
        // Should have 8 view tabs in footer
        let tab_count = app.click_areas.iter()
            .filter(|(_, t)| matches!(t, crate::types::ClickTarget::ViewTab(_)))
            .count();
        assert_eq!(tab_count, 8);
    }

    #[test]
    fn test_click_areas_sidebar_toggle_when_visible() {
        let mut app = App::new(TuiConfig::default());
        app.sidebar_visible = true;
        app.rebuild_click_areas(120, 40); // Medium breakpoint, sidebar visible
        let has_sidebar = app.click_areas.iter()
            .any(|(_, t)| matches!(t, crate::types::ClickTarget::SidebarToggle));
        assert!(has_sidebar, "Medium width with sidebar visible should have SidebarToggle");
    }

    #[test]
    fn test_click_areas_no_sidebar_on_small_terminal() {
        let mut app = App::new(TuiConfig::default());
        app.sidebar_visible = true;
        app.rebuild_click_areas(80, 30); // Small breakpoint
        let has_sidebar = app.click_areas.iter()
            .any(|(_, t)| matches!(t, crate::types::ClickTarget::SidebarToggle));
        assert!(!has_sidebar, "Small terminal should not have SidebarToggle");
    }

    #[test]
    fn test_idle_suggestion_triggers_fetch() {
        let mut app = App::new(TuiConfig::default());
        app.input_mode = InputMode::Normal;
        // Simulate 15s idle
        app.idle_suggestions.last_input = std::time::Instant::now() - std::time::Duration::from_secs(15);
        let cmd = app.tick();
        assert!(matches!(cmd, Some(AppCommand::FetchSuggestions)));
        assert!(app.idle_suggestions.fetch_pending);
    }

    #[test]
    fn test_idle_no_fetch_when_insert_mode() {
        let mut app = App::new(TuiConfig::default());
        app.input_mode = InputMode::Insert;
        app.idle_suggestions.last_input = std::time::Instant::now() - std::time::Duration::from_secs(15);
        let cmd = app.tick();
        assert!(cmd.is_none(), "Should not trigger fetch in insert mode");
    }

    #[test]
    fn test_colon_mode_activation() {
        crate::theme::init_theme("dark");
        let mut app = App::new(TuiConfig::default());
        app.input_mode = InputMode::Normal;
        let _cmd = app.apply_action(Action::EnterColonMode);
        assert!(app.colon_mode);
        assert_eq!(app.input_mode, InputMode::Command);
    }
}
