use super::*;

#[test]
fn test_default_passport_has_fields() {
    let fields = fields::default_passport_fields();
    assert_eq!(fields.len(), 18);
    assert_eq!(fields[0].category, "Identity");
    assert_eq!(fields[0].name, "name");
}

#[test]
fn test_passport_completeness() {
    let mut state = PassportViewState::default();
    assert_eq!(state.completeness(), 0);
    state.fields[0].value = "test".to_string();
    let pct = state.completeness();
    assert!(pct > 0 && pct < 10);
}

#[test]
fn test_wrap_text() {
    let result = wrap_text("short text", 40);
    assert_eq!(result, vec!["short text"]);

    let result = wrap_text("this is a longer text that needs wrapping", 15);
    assert!(result.len() > 1);
}

#[test]
fn test_load_from_passports_populates_fields() {
    let mut state = PassportViewState::default();
    assert_eq!(state.completeness(), 0);

    // Simulate a loaded passport from engine
    let passport = serde_json::json!({
        "name": "test-agent",
        "version": "1.0.0",
        "description": "A test AI agent",
        "autonomy_level": "L3",
        "framework": "OpenAI",
        "model": { "provider": "openai", "model_id": "gpt-4", "deployment": "api", "data_residency": "eu" },
        "owner": { "team": "backend", "contact": "team@test.com", "responsible_person": "Alice" },
        "compliance": {
            "eu_ai_act": { "risk_class": "limited" },
            "complior_score": 72
        },
        "permissions": {
            "tools": ["search", "create_file"],
            "data_access": { "read": ["users"], "write": ["orders"], "delete": [] }
        },
        "logging": { "retention_days": 365, "actions_logged": true },
        "constraints": { "human_approval_required": ["delete_account"] },
    });

    state.loaded_passports = vec![passport];
    state.load_from_passports();

    // Check that fields got populated
    let name_field = state.fields.iter().find(|f| f.name == "name").unwrap();
    assert_eq!(name_field.value, "test-agent");

    let autonomy_field = state.fields.iter().find(|f| f.name == "autonomy").unwrap();
    assert_eq!(autonomy_field.value, "L3");

    let risk_field = state.fields.iter().find(|f| f.name == "riskClass").unwrap();
    assert_eq!(risk_field.value, "limited");

    let provider_field = state.fields.iter().find(|f| f.name == "provider").unwrap();
    assert_eq!(provider_field.value, "openai");

    // Manual fields should remain empty
    let worker_field = state.fields.iter().find(|f| f.name == "workerNotification").unwrap();
    assert!(worker_field.value.is_empty());

    // Completeness should be > 0 now
    assert!(state.completeness() > 0);
}

#[test]
fn test_load_from_passports_empty() {
    let mut state = PassportViewState::default();
    state.load_from_passports(); // No passports loaded
    assert_eq!(state.completeness(), 0);
}

#[test]
fn test_completeness_color_thresholds() {
    crate::theme::init_theme("dark");
    let t = crate::theme::theme();

    // 100% → green
    assert_eq!(completeness_color(100, &t), t.zone_green);

    // 80-99% → yellow
    assert_eq!(completeness_color(80, &t), t.zone_yellow);
    assert_eq!(completeness_color(99, &t), t.zone_yellow);

    // 50-79% → amber (severity_medium)
    assert_eq!(completeness_color(50, &t), t.severity_medium);
    assert_eq!(completeness_color(79, &t), t.severity_medium);

    // <50% → red
    assert_eq!(completeness_color(0, &t), t.zone_red);
    assert_eq!(completeness_color(49, &t), t.zone_red);
}

#[test]
fn test_detail_mode_toggle() {
    let mut state = PassportViewState::default();
    assert_eq!(state.detail_mode, PassportDetailMode::FieldDetail);

    state.detail_mode = PassportDetailMode::ObligationChecklist;
    assert_eq!(state.detail_mode, PassportDetailMode::ObligationChecklist);

    state.detail_mode = PassportDetailMode::FieldDetail;
    assert_eq!(state.detail_mode, PassportDetailMode::FieldDetail);
}

#[test]
fn test_obligation_scroll_state() {
    let mut state = PassportViewState::default();
    assert_eq!(state.obligation_scroll, 0);
    state.obligation_scroll = 5;
    assert_eq!(state.obligation_scroll, 5);
}

#[test]
fn test_completeness_data_storage() {
    let mut state = PassportViewState::default();
    assert!(state.completeness_data.is_none());

    let data = serde_json::json!({
        "score": 72,
        "total": 36,
        "filled": 26,
        "obligations": [
            { "id": "OBL-001", "title": "Risk management", "covered": true },
            { "id": "OBL-002", "title": "Data governance", "covered": false },
        ],
        "missingFields": ["aiLiteracy", "impactAssessment"]
    });
    state.completeness_data = Some(data.clone());
    assert!(state.completeness_data.is_some());
    let stored = state.completeness_data.as_ref().unwrap();
    assert_eq!(stored.get("score").unwrap().as_u64().unwrap(), 72);
}

#[test]
fn test_obligation_checklist_renders_without_panic() {
    crate::theme::init_theme("dark");
    let backend = ratatui::backend::TestBackend::new(100, 30);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    app.passport_view.detail_mode = PassportDetailMode::ObligationChecklist;
    app.passport_view.completeness_data = Some(serde_json::json!({
        "score": 72,
        "total": 36,
        "filled": 26,
        "obligations": [
            { "id": "OBL-001", "title": "Risk management", "covered": true },
        ]
    }));

    terminal
        .draw(|frame| render_passport_view(frame, frame.area(), &app))
        .expect("render");
}

#[test]
fn test_passport_renders_without_panic() {
    crate::theme::init_theme("dark");
    let backend = ratatui::backend::TestBackend::new(100, 30);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
    let app = crate::app::App::new(crate::config::TuiConfig::default());

    terminal
        .draw(|frame| render_passport_view(frame, frame.area(), &app))
        .expect("render");
}

#[test]
fn test_default_view_mode_is_agent_list() {
    let state = PassportViewState::default();
    assert_eq!(state.view_mode, PassportViewMode::AgentList);
    assert_eq!(state.selected_passport, 0);
}

#[test]
fn test_selected_passport_navigation() {
    let mut state = PassportViewState::default();
    state.loaded_passports = vec![
        serde_json::json!({"name": "agent-1", "autonomy_level": "L2"}),
        serde_json::json!({"name": "agent-2", "autonomy_level": "L4"}),
        serde_json::json!({"name": "agent-3", "autonomy_level": "L3"}),
    ];
    assert_eq!(state.selected_passport, 0);
    state.selected_passport = 1;
    assert_eq!(state.selected_passport, 1);
    state.selected_passport = 2;
    assert_eq!(state.selected_passport, 2);
}

#[test]
fn test_load_from_selected_passport() {
    let mut state = PassportViewState::default();
    state.loaded_passports = vec![
        serde_json::json!({"name": "agent-1", "version": "1.0.0"}),
        serde_json::json!({"name": "agent-2", "version": "2.0.0"}),
    ];
    // Select second passport
    state.selected_passport = 1;
    state.load_from_passports();

    let name_field = state.fields.iter().find(|f| f.name == "name").unwrap();
    assert_eq!(name_field.value, "agent-2");
}

#[test]
fn test_agent_list_renders_without_panic() {
    crate::theme::init_theme("dark");
    let backend = ratatui::backend::TestBackend::new(120, 40);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    app.passport_view.view_mode = PassportViewMode::AgentList;
    app.passport_view.loaded_passports = vec![
        serde_json::json!({
            "name": "test-agent-1", "autonomy_level": "L3", "type": "hybrid",
            "framework": "OpenAI", "version": "1.0.0", "description": "Test",
            "model": {"provider": "openai", "model_id": "gpt-4"},
            "owner": {"team": "test"},
            "compliance": {"eu_ai_act": {"risk_class": "high"}, "complior_score": 45}
        }),
        serde_json::json!({
            "name": "test-agent-2", "autonomy_level": "L2", "type": "assistive",
            "framework": "Anthropic", "version": "2.0.0", "description": "Test 2",
            "model": {"provider": "anthropic", "model_id": "claude-3"},
            "owner": {"team": "backend"},
            "compliance": {"eu_ai_act": {"risk_class": "limited"}, "complior_score": 85}
        }),
    ];

    terminal
        .draw(|frame| render_passport_view(frame, frame.area(), &app))
        .expect("render");
}
