use super::*;
use super::tests_helpers::render_to_string;

#[test]
fn dashboard_renders_agent_strip_when_passports_loaded() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.passport_view.loaded_passports = vec![
        serde_json::json!({
            "name": "core-engine",
            "autonomy_level": "L3",
            "compliance": { "complior_score": 82 }
        }),
        serde_json::json!({
            "name": "chat-bot",
            "autonomy_level": "L2",
            "compliance": { "complior_score": 67 }
        }),
    ];

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Agents (2)"), "Agent strip title should show count");
    assert!(buf.contains("core-engine"), "Agent strip should show agent name");
    assert!(buf.contains("chat-bot"), "Agent strip should show second agent");
}

#[test]
fn dashboard_hides_agent_strip_when_no_passports() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;

    let buf = render_to_string(&app, 120, 40);
    assert!(!buf.contains("Agents ("), "Agent strip should not appear with no passports");
}

#[test]
fn dashboard_agent_strip_shows_score_and_level() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.passport_view.loaded_passports = vec![
        serde_json::json!({
            "name": "recruiter",
            "autonomy_level": "L4",
            "compliance": { "complior_score": 45.5 }
        }),
    ];

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("L4"), "Agent strip should show autonomy level");
    assert!(buf.contains("46") || buf.contains("45"), "Agent strip should show compliance score");
}

#[test]
fn dashboard_agent_strip_handles_missing_fields() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.passport_view.loaded_passports = vec![
        serde_json::json!({"name": "minimal-agent"}),
    ];

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Agents (1)"), "Should render with minimal passport");
    assert!(buf.contains("minimal-agent"), "Should show agent name");
    assert!(buf.contains("?"), "Missing autonomy should show fallback '?'");
}

#[test]
fn passport_jk_navigation_bounds_checking() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Passport;
    app.passport_view.view_mode = crate::views::passport::PassportViewMode::AgentList;
    app.passport_view.loaded_passports = vec![
        serde_json::json!({"name": "a1"}),
        serde_json::json!({"name": "a2"}),
        serde_json::json!({"name": "a3"}),
    ];

    assert_eq!(app.passport_view.selected_passport, 0);

    // j (ScrollDown) → 1 → 2
    app.apply_action(crate::input::Action::ScrollDown);
    assert_eq!(app.passport_view.selected_passport, 1);
    app.apply_action(crate::input::Action::ScrollDown);
    assert_eq!(app.passport_view.selected_passport, 2);

    // j → still 2 (bounds)
    app.apply_action(crate::input::Action::ScrollDown);
    assert_eq!(app.passport_view.selected_passport, 2, "Should not exceed max index");

    // k (ScrollUp) → 1 → 0
    app.apply_action(crate::input::Action::ScrollUp);
    assert_eq!(app.passport_view.selected_passport, 1);
    app.apply_action(crate::input::Action::ScrollUp);
    assert_eq!(app.passport_view.selected_passport, 0);

    // k → still 0 (bounds)
    app.apply_action(crate::input::Action::ScrollUp);
    assert_eq!(app.passport_view.selected_passport, 0, "Should not go below 0");
}

#[test]
fn auto_load_passports_on_dashboard_switch() {
    let mut app = App::new(crate::config::TuiConfig::default());
    assert!(app.passport_view.loaded_passports.is_empty());
    assert!(!app.passport_view.passport_loading);

    let cmd = app.apply_action(crate::input::Action::SwitchView(ViewState::Dashboard));
    assert!(
        matches!(cmd, Some(crate::app::AppCommand::LoadPassports)),
        "Switching to Dashboard should trigger LoadPassports"
    );
}

#[test]
fn passport_source_files_field_parsed() {
    // Verify that passports with source_files are correctly parsed and accessible
    let passport = serde_json::json!({
        "name": "test-agent",
        "autonomy_level": "L3",
        "compliance": { "complior_score": 80 },
        "source_files": ["src/agent.ts", "src/tools.ts", "src/config.ts"]
    });

    let source_files = passport.get("source_files")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
        .unwrap_or_default();

    assert_eq!(source_files.len(), 3);
    assert_eq!(source_files[0], "src/agent.ts");
    assert_eq!(source_files[1], "src/tools.ts");
    assert_eq!(source_files[2], "src/config.ts");
}

#[test]
fn passport_without_source_files_returns_empty() {
    // Passports without source_files should return empty vec
    let passport = serde_json::json!({
        "name": "legacy-agent",
        "autonomy_level": "L2",
        "compliance": { "complior_score": 50 }
    });

    let source_files = passport.get("source_files")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
        .unwrap_or_default();

    assert!(source_files.is_empty(), "Missing source_files should yield empty vec");
}
