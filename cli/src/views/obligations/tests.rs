use super::*;

fn sample_obligations() -> Vec<ObligationItem> {
    vec![
        ObligationItem {
            id: "OBL-001".to_string(),
            article: "Article 4".to_string(),
            title: "AI Literacy".to_string(),
            role: "both".to_string(),
            risk_levels: vec!["high".to_string(), "limited".to_string()],
            severity: "medium".to_string(),
            deadline: Some("2025-02-02".to_string()),
            obligation_type: "training".to_string(),
            covered: true,
            description: "Train staff on AI risks".to_string(),
            linked_checks: vec!["ai-literacy".to_string(), "l2-ai-literacy".to_string()],
        },
        ObligationItem {
            id: "OBL-009".to_string(),
            article: "Article 9".to_string(),
            title: "Risk Management".to_string(),
            role: "provider".to_string(),
            risk_levels: vec!["high".to_string()],
            severity: "critical".to_string(),
            deadline: Some("2026-08-02".to_string()),
            obligation_type: "assessment".to_string(),
            covered: false,
            description: "Establish risk management system".to_string(),
            linked_checks: vec!["l2-monitoring-policy".to_string()],
        },
        ObligationItem {
            id: "OBL-013".to_string(),
            article: "Article 13".to_string(),
            title: "Transparency".to_string(),
            role: "deployer".to_string(),
            risk_levels: vec!["limited".to_string()],
            severity: "medium".to_string(),
            deadline: None,
            obligation_type: "documentation".to_string(),
            covered: true,
            description: "Ensure transparency of AI systems".to_string(),
            linked_checks: vec![],
        },
    ]
}

#[test]
fn test_default_state() {
    let state = ObligationsViewState::default();
    assert!(state.obligations.is_empty());
    assert_eq!(state.selected_index, 0);
    assert_eq!(state.filter, ObligationFilter::All);
}

#[test]
fn test_filter_all() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::All;
    assert_eq!(state.filtered_obligations().len(), 3);
}

#[test]
fn test_filter_provider() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::RoleProvider;
    let filtered = state.filtered_obligations();
    // "both" + "provider" = 2
    assert_eq!(filtered.len(), 2);
    assert!(filtered.iter().all(|o| o.role == "provider" || o.role == "both"));
}

#[test]
fn test_filter_deployer() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::RoleDeployer;
    let filtered = state.filtered_obligations();
    // "both" + "deployer" = 2
    assert_eq!(filtered.len(), 2);
}

#[test]
fn test_filter_covered() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::CoveredOnly;
    let filtered = state.filtered_obligations();
    assert_eq!(filtered.len(), 2);
    assert!(filtered.iter().all(|o| o.covered));
}

#[test]
fn test_filter_uncovered() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::UncoveredOnly;
    let filtered = state.filtered_obligations();
    assert_eq!(filtered.len(), 1);
    assert!(!filtered[0].covered);
}

#[test]
fn test_filter_critical() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::SeverityCritical;
    let filtered = state.filtered_obligations();
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].severity, "critical");
}

#[test]
fn test_covered_count() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    assert_eq!(state.covered_count(), 2);
}

#[test]
fn test_filter_cycle() {
    let f = ObligationFilter::All;
    assert_eq!(f.cycle(), ObligationFilter::RoleProvider);
    assert_eq!(f.cycle().cycle(), ObligationFilter::RoleDeployer);
    assert_eq!(f.cycle().cycle().cycle(), ObligationFilter::RiskHigh);
    assert_eq!(f.cycle().cycle().cycle().cycle(), ObligationFilter::RiskLimited);
    assert_eq!(f.cycle().cycle().cycle().cycle().cycle(), ObligationFilter::CoveredOnly);
    assert_eq!(f.cycle().cycle().cycle().cycle().cycle().cycle(), ObligationFilter::UncoveredOnly);
    assert_eq!(f.cycle().cycle().cycle().cycle().cycle().cycle().cycle(), ObligationFilter::SeverityCritical);
    assert_eq!(f.cycle().cycle().cycle().cycle().cycle().cycle().cycle().cycle(), ObligationFilter::All);
}

#[test]
fn test_filter_risk_high() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::RiskHigh;
    let filtered = state.filtered_obligations();
    // OBL-001 (high+limited) and OBL-009 (high) match
    assert_eq!(filtered.len(), 2);
}

#[test]
fn test_filter_risk_limited() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    state.filter = ObligationFilter::RiskLimited;
    let filtered = state.filtered_obligations();
    // OBL-001 (high+limited) and OBL-013 (limited) match
    assert_eq!(filtered.len(), 2);
}

#[test]
fn test_critical_path_count() {
    let mut state = ObligationsViewState::default();
    state.obligations = sample_obligations();
    // OBL-009 is uncovered + has deadline = critical path
    assert_eq!(state.critical_path_count(), 1);
}

#[test]
fn test_is_critical_path() {
    let obls = sample_obligations();
    assert!(!obls[0].is_critical_path()); // covered
    assert!(obls[1].is_critical_path());  // uncovered + deadline
    assert!(!obls[2].is_critical_path()); // covered
}

#[test]
fn test_load_from_json() {
    let mut state = ObligationsViewState::default();
    let data = vec![
        serde_json::json!({
            "id": "OBL-001",
            "article": "Article 4",
            "title": "AI Literacy",
            "role": "both",
            "severity": "medium",
            "deadline": "2025-02-02",
            "obligation_type": "training",
            "covered": true,
            "description": "Train staff"
        }),
        serde_json::json!({
            "id": "OBL-009",
            "article": "Article 9",
            "title": "Risk Management",
            "role": "provider",
            "severity": "critical",
            "covered": false,
            "description": "Risk mgmt system"
        }),
    ];
    state.load_from_json(&data);
    assert_eq!(state.obligations.len(), 2);
    assert_eq!(state.obligations[0].id, "OBL-001");
    assert!(state.obligations[0].covered);
    assert!(!state.obligations[1].covered);
}

#[test]
fn test_obligations_renders_without_panic() {
    crate::theme::init_theme("dark");
    let backend = ratatui::backend::TestBackend::new(100, 30);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    app.obligations_view.obligations = sample_obligations();

    terminal
        .draw(|frame| render_obligations_view(frame, frame.area(), &app))
        .expect("render");
}
