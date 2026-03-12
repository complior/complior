use super::*;
use super::tests_helpers::{render_to_string, make_scan_result};

// --- T704: Toast Notifications ---

#[test]
fn e2e_t704_toast_appears_after_scan() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    assert!(app.toasts.toasts.is_empty());

    app.set_scan_result(make_scan_result(85.0, crate::types::Zone::Green));
    assert!(!app.toasts.toasts.is_empty(), "Toast should appear after scan");
    let toast = &app.toasts.toasts[0];
    assert!(toast.message.contains("85"), "Toast should contain score");
}

#[test]
fn e2e_t704_toast_overlay_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.toasts.push(crate::components::toast::ToastKind::Info, "Test toast");

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("[i]"), "Toast [i] marker should render in overlay");
    assert!(buf.contains("Test toast"), "Toast message should render");
}

// --- T702: Widget Zoom ---

#[test]
fn e2e_t702_zoom_toggle_via_e_key() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Normal;
    app.view_state = ViewState::Dashboard;
    assert!(!app.zoom.is_zoomed());

    // Press 'e' to zoom
    app.apply_action(crate::input::Action::ViewKey('e'));
    assert!(app.zoom.is_zoomed(), "'e' on Dashboard should toggle zoom");

    // Press 'e' again to unzoom
    app.apply_action(crate::input::Action::ViewKey('e'));
    assert!(!app.zoom.is_zoomed(), "'e' again should unzoom");
}

// --- T703: Split-View Fix ---

#[test]
fn e2e_t703_fix_split_resize() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Fix;
    assert_eq!(app.fix_split_pct, 40, "Default split should be 40%");

    // Resize left '<'
    app.handle_view_key('<');
    assert_eq!(app.fix_split_pct, 35, "'<' should decrease split by 5");

    // Resize right '>'
    app.handle_view_key('>');
    app.handle_view_key('>');
    assert_eq!(app.fix_split_pct, 45, "'>' twice should increase split to 45");

    // Clamp at bounds
    for _ in 0..20 {
        app.handle_view_key('<');
    }
    assert_eq!(app.fix_split_pct, 25, "Split should clamp at 25% min");

    for _ in 0..20 {
        app.handle_view_key('>');
    }
    assert_eq!(app.fix_split_pct, 75, "Split should clamp at 75% max");
}

#[test]
fn e2e_t703_fix_view_uses_split_pct() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Fix;
    app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
    app.fix_view = crate::views::fix::FixViewState::from_scan(
        &app.last_scan.as_ref().unwrap().findings,
    );
    app.fix_split_pct = 30;

    // Should render without panic with custom split
    let _buf = render_to_string(&app, 120, 40);
}

// --- Framework Focus Toggle ---

fn make_multi_framework(count: usize) -> crate::types::MultiFrameworkScoreResult {
    let frameworks = (0..count)
        .map(|i| crate::types::FrameworkScoreResult {
            framework_id: format!("fw-{i}"),
            framework_name: format!("Framework {i}"),
            score: 70.0 + i as f64 * 10.0,
            grade: "B".to_string(),
            grade_type: "letter".to_string(),
            gaps: 3 - i.min(3) as u32,
            total_checks: 20,
            passed_checks: 14 + i as u32,
            deadline: None,
            categories: vec![],
        })
        .collect();
    crate::types::MultiFrameworkScoreResult {
        frameworks,
        selected_framework_ids: vec![],
        computed_at: "2026-03-11T00:00:00Z".to_string(),
    }
}

#[test]
fn e2e_framework_focus_cycle() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.framework_scores = Some(make_multi_framework(2));
    assert_eq!(app.focused_framework, None);

    // None → Some(0)
    app.handle_view_key('f');
    assert_eq!(app.focused_framework, Some(0));

    // Some(0) → Some(1)
    app.handle_view_key('f');
    assert_eq!(app.focused_framework, Some(1));

    // Some(1) → None (wrap around)
    app.handle_view_key('f');
    assert_eq!(app.focused_framework, None);
}

#[test]
fn e2e_framework_focus_noop_single() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.framework_scores = Some(make_multi_framework(1));
    assert_eq!(app.focused_framework, None);

    app.handle_view_key('f');
    assert_eq!(app.focused_framework, None, "'f' should be no-op with single framework");
}

#[test]
fn e2e_framework_focus_esc_resets() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.framework_scores = Some(make_multi_framework(3));

    app.handle_view_key('f');
    assert_eq!(app.focused_framework, Some(0));

    app.handle_view_escape();
    assert_eq!(app.focused_framework, None, "Esc should reset focus to None");
}

#[test]
fn e2e_framework_focus_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.framework_scores = Some(make_multi_framework(2));
    app.focused_framework = Some(0);

    // Should render without panic
    let _buf = render_to_string(&app, 120, 40);
}

#[test]
fn e2e_framework_focus_zero_frameworks_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.framework_scores = Some(crate::types::MultiFrameworkScoreResult {
        frameworks: vec![],
        selected_framework_ids: vec![],
        computed_at: "2026-03-11T00:00:00Z".to_string(),
    });

    // Zero frameworks → falls back to score gauge without panic
    let _buf = render_to_string(&app, 120, 40);
}

#[test]
fn e2e_framework_focus_stale_index_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    app.framework_scores = Some(make_multi_framework(2));
    // Stale index (out of bounds) → falls back to cards without panic
    app.focused_framework = Some(5);

    let _buf = render_to_string(&app, 120, 40);
}

#[test]
fn e2e_framework_focus_noop_no_data() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Dashboard;
    // No framework_scores at all
    assert_eq!(app.focused_framework, None);

    app.handle_view_key('f');
    assert_eq!(app.focused_framework, None, "'f' should be no-op without framework data");
}

// --- T705: Context Meter + Quick Actions ---

#[test]
fn e2e_t705_context_pct_computed_from_messages() {
    let mut app = App::new(crate::config::TuiConfig::default());

    // Add messages to increase context
    for i in 0..10 {
        app.messages.push(crate::types::ChatMessage::new(
            crate::types::MessageRole::User,
            format!("msg {i}"),
        ));
    }

    // context_pct is now computed locally, not stored as a field
    let pct = crate::widgets::context_meter::context_pct(app.messages.len(), 32);
    // 11 messages (1 welcome + 10) / 32 max ~= 34%
    assert!(pct > 0, "Context pct should be >0 with messages");
    assert!(pct < 50, "Context pct should be reasonable");
}

#[test]
fn e2e_t705_sidebar_shows_context_and_zen() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = true;
    app.zen_active = true;
    // Add ~15 messages to simulate ~45% context (15/32 ~= 47%)
    for i in 0..14 {
        app.messages.push(crate::types::ChatMessage::new(
            crate::types::MessageRole::System,
            format!("event {i}"),
        ));
    }

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Ctx:"), "Sidebar should show context meter");
    assert!(buf.contains("Zen"), "Sidebar should show Zen status");
}

// --- S05: Dashboard Metrics Widgets (Cost, Debt, Readiness) ---

fn make_cost() -> crate::types::CostEstimateResult {
    crate::types::CostEstimateResult {
        remediation_cost: 800.0,
        documentation_cost: 400.0,
        total_cost: 1200.0,
        potential_fine: 35_000_000.0,
        roi: 29.0,
    }
}

fn make_debt(total: f64, level: &str) -> crate::types::DebtResult {
    crate::types::DebtResult {
        total_debt: total,
        level: level.to_string(),
        findings_debt: total * 0.5,
        documentation_debt: total * 0.3,
        freshness_debt: total * 0.2,
    }
}

fn make_readiness(score: f64, level: &str, gap_count: usize) -> crate::types::ReadinessResult {
    let gaps: Vec<String> = (0..gap_count)
        .map(|i| format!("Missing requirement {i}"))
        .collect();
    crate::types::ReadinessResult {
        overall_score: score,
        readiness_level: level.to_string(),
        categories: vec![crate::types::ReadinessCategory {
            category: "documentation".to_string(),
            label: "Documentation".to_string(),
            score: score * 0.8,
            max_weight: 0.3,
            achieved_weight: 0.3 * score / 100.0,
        }],
        gaps,
        total_requirements: 15,
        met_requirements: (15.0 * score / 100.0) as u32,
        unmet_requirements: gap_count as u32,
    }
}

#[test]
fn e2e_dashboard_metrics_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
    app.cost_estimate = Some(make_cost());
    app.debt_score = Some(make_debt(24.5, "medium"));
    app.readiness_score = Some(make_readiness(72.0, "near_ready", 3));

    let buf = render_to_string(&app, 120, 50);
    assert!(buf.contains("Metrics"), "Metrics panel title should render");
    assert!(buf.contains("Cost:"), "Cost row should render");
    assert!(buf.contains("1200"), "Cost total should appear");
    assert!(buf.contains("Debt:"), "Debt row should render");
    assert!(buf.contains("MEDIUM"), "Debt level should appear uppercase");
    assert!(buf.contains("Ready:"), "Readiness row should render");
    assert!(buf.contains("72"), "Readiness score should appear");
    assert!(buf.contains("3 gaps"), "Gap count should appear");
}

#[test]
fn e2e_dashboard_metrics_empty_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    // No metrics loaded, no scan
    assert!(app.cost_estimate.is_none());
    assert!(app.debt_score.is_none());
    assert!(app.readiness_score.is_none());

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Metrics"), "Metrics panel title should render even without data");
    assert!(buf.contains("Run /scan first"), "Should show placeholder when no scan");
}

#[test]
fn e2e_debt_level_colors() {
    let t = {
        crate::theme::init_theme("dark");
        crate::theme::theme()
    };
    use super::panels::{debt_level_color, readiness_level_color};
    let _ = readiness_level_color; // silence unused import

    // Low debt → green
    assert_eq!(debt_level_color(10.0, &t), t.zone_green);
    // Medium debt → yellow
    assert_eq!(debt_level_color(35.0, &t), t.zone_yellow);
    // High debt → red
    assert_eq!(debt_level_color(60.0, &t), t.zone_red);
    // Boundary: 20.0 → yellow
    assert_eq!(debt_level_color(20.0, &t), t.zone_yellow);
    // Boundary: 50.0 → yellow
    assert_eq!(debt_level_color(50.0, &t), t.zone_yellow);
}

#[test]
fn e2e_readiness_level_colors() {
    let t = {
        crate::theme::init_theme("dark");
        crate::theme::theme()
    };
    use super::panels::readiness_level_color;

    // Certified (>=90) → green
    assert_eq!(readiness_level_color(95.0, &t), t.zone_green);
    // Near ready (70-89) → yellow
    assert_eq!(readiness_level_color(75.0, &t), t.zone_yellow);
    // In progress (40-69) → yellow
    assert_eq!(readiness_level_color(55.0, &t), t.zone_yellow);
    // Early (<40) → red
    assert_eq!(readiness_level_color(30.0, &t), t.zone_red);
    // Boundary: 90.0 → green
    assert_eq!(readiness_level_color(90.0, &t), t.zone_green);
    // Boundary: 40.0 → yellow
    assert_eq!(readiness_level_color(40.0, &t), t.zone_yellow);
    // Boundary: 39.9 → red
    assert_eq!(readiness_level_color(39.9, &t), t.zone_red);
}

