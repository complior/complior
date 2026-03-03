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
fn test_passport_renders_without_panic() {
    crate::theme::init_theme("dark");
    let backend = ratatui::backend::TestBackend::new(100, 30);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
    let app = crate::app::App::new(crate::config::TuiConfig::default());

    terminal
        .draw(|frame| render_passport_view(frame, frame.area(), &app))
        .expect("render");
}
