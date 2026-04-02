use ratatui::backend::TestBackend;
use ratatui::Terminal;

use super::*;
use super::tests_helpers::render_to_string;

#[test]
fn snapshot_dashboard_default() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());
    let buf = render_to_string(&app, 120, 40);
    insta::with_settings!({
        filters => vec![
            (r"\[\d{2}:\d{2}\]", "[HH:MM]"),
            (r"\d+d overdue", "[Nd overdue]"),
            (r"\d+d left", "[Nd left]"),
            (r"⚠ \d+d", "⚠ [Nd]"),
        ]
    }, {
        insta::assert_snapshot!(buf);
    });
}

#[test]
fn test_dashboard_renders_without_panic() {
    crate::theme::init_theme("dark");
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).expect("terminal");
    let app = App::new(crate::config::TuiConfig::default());

    terminal
        .draw(|frame| render_dashboard(frame, &app))
        .expect("render");
}

#[test]
fn test_stub_pages_render_without_panic() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());
    let backend = ratatui::backend::TestBackend::new(80, 24);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");

    // Passport stub page
    terminal
        .draw(|frame| {
            super::super::passport::render_passport_view(frame, frame.area(), &app)
        })
        .expect("passport render");
}

#[test]
fn test_dashboard_with_no_scan() {
    crate::theme::init_theme("dark");
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).expect("terminal");
    let app = App::new(crate::config::TuiConfig::default());
    assert!(app.last_scan.is_none());

    terminal
        .draw(|frame| render_dashboard(frame, &app))
        .expect("render");
}

#[test]
fn test_dashboard_with_scan_data() {
    crate::theme::init_theme("dark");
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).expect("terminal");
    let mut app = App::new(crate::config::TuiConfig::default());

    app.last_scan = Some(crate::types::ScanResult {
        score: crate::types::ScoreBreakdown {
            total_score: 75.0,
            zone: crate::types::Zone::Yellow,
            category_scores: vec![],
            critical_cap_applied: false,
            total_checks: 10,
            passed_checks: 7,
            failed_checks: 3,
            skipped_checks: 0,
            confidence_summary: None,
        },
        findings: vec![crate::types::Finding {
            check_id: "test-1".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "Missing privacy notice".to_string(),
            severity: crate::types::Severity::High,
            obligation_id: None,
            article_reference: None,
            fix: None,
            file: None,
            line: None,
            code_context: None,
            fix_diff: None,
            priority: None,
            confidence: None,
            confidence_level: None,
            evidence: None,
            explanation: None,
            agent_id: None,
            doc_quality: None,
            l5_analyzed: None,
        }],
        project_path: ".".to_string(),
        scanned_at: "2025-01-01".to_string(),
        duration: 1000,
        files_scanned: 5,
        files_excluded: None,
        deep_analysis: None,
        l5_cost: None,
        regulation_version: None,
        tier: None,
        external_tool_results: None,
        agent_summaries: None,
    });
    app.score_history = vec![60.0, 65.0, 75.0];

    terminal
        .draw(|frame| render_dashboard(frame, &app))
        .expect("render");
}

// -- New T501 tests --

#[test]
fn test_dashboard_2x2_grid_no_panic() {
    crate::theme::init_theme("dark");
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).expect("terminal");
    let mut app = App::new(crate::config::TuiConfig::default());

    // With scan data to trigger the 2x2 grid
    app.last_scan = Some(crate::types::ScanResult {
        score: crate::types::ScoreBreakdown {
            total_score: 85.0,
            zone: crate::types::Zone::Green,
            category_scores: vec![],
            critical_cap_applied: false,
            total_checks: 20,
            passed_checks: 17,
            failed_checks: 3,
            skipped_checks: 0,
            confidence_summary: None,
        },
        findings: vec![],
        project_path: ".".to_string(),
        scanned_at: "2026-01-01".to_string(),
        duration: 500,
        files_scanned: 10,
        files_excluded: None,
        deep_analysis: None,
        l5_cost: None,
        regulation_version: None,
        tier: None,
        external_tool_results: None,
        agent_summaries: None,
    });
    app.score_history = vec![50.0, 60.0, 70.0, 80.0, 85.0];

    // Add some activity entries
    app.push_activity(crate::types::ActivityKind::Scan, "85/100");
    app.push_activity(crate::types::ActivityKind::Scan, "Engine ready");
    app.push_activity(crate::types::ActivityKind::Watch, "src/main.rs");

    terminal
        .draw(|frame| render_dashboard(frame, &app))
        .expect("2x2 grid render should not panic");
}
