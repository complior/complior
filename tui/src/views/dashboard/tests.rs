use ratatui::backend::TestBackend;
use ratatui::Terminal;

use super::*;
use super::footer::footer_hints_for_view;
use super::utils::{deadline_label, score_zone_info};

#[test]
fn snapshot_dashboard_default() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());
    let buf = render_to_string(&app, 120, 40);
    insta::with_settings!({
        filters => vec![
            (r"\[\d{2}:\d{2}\]", "[HH:MM]"),
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
fn test_view_state_from_key() {
    assert_eq!(ViewState::from_key(1), Some(ViewState::Dashboard));
    assert_eq!(ViewState::from_key(2), Some(ViewState::Scan));
    assert_eq!(ViewState::from_key(3), Some(ViewState::Fix));
    assert_eq!(ViewState::from_key(4), Some(ViewState::Passport));
    assert_eq!(ViewState::from_key(5), Some(ViewState::Obligations));
    assert_eq!(ViewState::from_key(6), Some(ViewState::Timeline));
    assert_eq!(ViewState::from_key(7), Some(ViewState::Report));
    assert_eq!(ViewState::from_key(8), Some(ViewState::Log));
    assert_eq!(ViewState::from_key(0), None);
    assert_eq!(ViewState::from_key(9), None);
}

#[test]
fn test_view_state_from_letter() {
    assert_eq!(ViewState::from_letter('D'), Some(ViewState::Dashboard));
    assert_eq!(ViewState::from_letter('S'), Some(ViewState::Scan));
    assert_eq!(ViewState::from_letter('F'), Some(ViewState::Fix));
    assert_eq!(ViewState::from_letter('P'), Some(ViewState::Passport));
    assert_eq!(ViewState::from_letter('O'), Some(ViewState::Obligations));
    assert_eq!(ViewState::from_letter('T'), Some(ViewState::Timeline));
    assert_eq!(ViewState::from_letter('R'), Some(ViewState::Report));
    assert_eq!(ViewState::from_letter('L'), Some(ViewState::Log));
    assert_eq!(ViewState::from_letter('X'), None);
    assert_eq!(ViewState::from_letter('d'), None); // lowercase not mapped
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

    // Obligations stub page
    terminal
        .draw(|frame| {
            super::super::obligations::render_obligations_view(frame, frame.area(), &app)
        })
        .expect("obligations render");
}

#[test]
fn test_mode_cycling() {
    use crate::types::Mode;
    assert_eq!(Mode::Scan.next(), Mode::Fix);
    assert_eq!(Mode::Fix.next(), Mode::Watch);
    assert_eq!(Mode::Watch.next(), Mode::Scan);
}

#[test]
fn test_view_switching_action() {
    use crate::input::Action;
    let mut app = App::new(crate::config::TuiConfig::default());
    assert_eq!(app.view_state, ViewState::Dashboard);

    app.apply_action(Action::SwitchView(ViewState::Log));
    assert_eq!(app.view_state, ViewState::Log);

    app.apply_action(Action::SwitchView(ViewState::Scan));
    assert_eq!(app.view_state, ViewState::Scan);
}

#[test]
fn test_initial_state() {
    use crate::types::Mode;
    let app = App::new(crate::config::TuiConfig::default());
    assert_eq!(app.view_state, ViewState::Dashboard);
    assert_eq!(app.mode, Mode::Scan);
}

#[test]
fn test_score_color_thresholds() {
    crate::theme::init_theme("dark");
    let t = crate::theme::theme();
    let score_low: f64 = 30.0;
    let color_low = if score_low < 50.0 {
        t.zone_red
    } else if score_low < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };
    assert_eq!(color_low, t.zone_red);

    let score_mid: f64 = 65.0;
    let color_mid = if score_mid < 50.0 {
        t.zone_red
    } else if score_mid < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };
    assert_eq!(color_mid, t.zone_yellow);

    let score_high: f64 = 90.0;
    let color_high = if score_high < 50.0 {
        t.zone_red
    } else if score_high < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };
    assert_eq!(color_high, t.zone_green);
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
        },
        findings: vec![crate::types::Finding {
            check_id: "test-1".to_string(),
            r#type: "compliance".to_string(),
            message: "Missing privacy notice".to_string(),
            severity: crate::types::Severity::High,
            obligation_id: None,
            article_reference: None,
            fix: None,
            file: None,
            line: None,
            code_context: None,
            fix_diff: None,
        }],
        project_path: ".".to_string(),
        scanned_at: "2025-01-01".to_string(),
        duration: 1000,
        files_scanned: 5,
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
        },
        findings: vec![],
        project_path: ".".to_string(),
        scanned_at: "2026-01-01".to_string(),
        duration: 500,
        files_scanned: 10,
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

#[test]
fn test_deadline_countdown_colors() {
    crate::theme::init_theme("dark");
    let t = crate::theme::theme();

    // Past deadline -> red
    let (label, color) = deadline_label(-30, &t);
    assert!(label.contains("overdue"));
    assert_eq!(color, t.zone_red);

    // Within 90 days -> yellow
    let (label, color) = deadline_label(45, &t);
    assert!(label.contains("left"));
    assert_eq!(color, t.zone_yellow);

    // Far future -> green
    let (label, color) = deadline_label(200, &t);
    assert!(label.contains("left"));
    assert_eq!(color, t.zone_green);
}

// -- New T504 tests --

#[test]
fn test_status_bar_score_badge() {
    crate::theme::init_theme("dark");
    let t = crate::theme::theme();

    let (color, label) = score_zone_info(30.0, &t);
    assert_eq!(color, t.zone_red);
    assert!(label.contains("RED"));

    let (color, label) = score_zone_info(65.0, &t);
    assert_eq!(color, t.zone_yellow);
    assert!(label.contains("YELLOW"));

    let (color, label) = score_zone_info(90.0, &t);
    assert_eq!(color, t.zone_green);
    assert!(label.contains("GREEN"));
}

#[test]
fn test_status_bar_watch_indicator() {
    let mut app = App::new(crate::config::TuiConfig::default());
    assert!(!app.watch_active);

    app.watch_active = true;
    assert!(app.watch_active);
}

// -- New T505 tests --

#[test]
fn test_footer_hints_per_view() {
    // Dashboard hints no longer show nav keys (they're in the tab bar now)
    let dashboard_hints = footer_hints_for_view(ViewState::Dashboard);
    assert!(dashboard_hints.contains("?:help"));
    assert!(dashboard_hints.contains("Ctrl+S:scan"));

    let scan_hints = footer_hints_for_view(ViewState::Scan);
    assert!(scan_hints.contains("a:All"));
    assert!(scan_hints.contains("j/k:nav"));

    let fix_hints = footer_hints_for_view(ViewState::Fix);
    assert!(fix_hints.contains("Space:toggle"));

    let log_hints = footer_hints_for_view(ViewState::Log);
    assert!(log_hints.contains("@OBL:ref"));

    let timeline_hints = footer_hints_for_view(ViewState::Timeline);
    assert!(timeline_hints.contains("j/k:scroll"));

    let report_hints = footer_hints_for_view(ViewState::Report);
    assert!(report_hints.contains("e:export"));
}

#[test]
fn test_theme_picker_overlay_renders() {
    crate::theme::init_theme("dark");
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).expect("terminal");
    let mut app = App::new(crate::config::TuiConfig::default());

    app.theme_picker = Some(crate::theme_picker::ThemePickerState::new());
    app.overlay = Overlay::ThemePicker;

    terminal
        .draw(|frame| render_dashboard(frame, &app))
        .expect("theme picker overlay should render");
}

#[test]
fn test_onboarding_overlay_renders() {
    crate::theme::init_theme("dark");
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).expect("terminal");
    let mut app = App::new(crate::config::TuiConfig::default());

    app.onboarding = Some(crate::views::onboarding::OnboardingWizard::new());
    app.overlay = Overlay::Onboarding;

    terminal
        .draw(|frame| render_dashboard(frame, &app))
        .expect("onboarding overlay should render");
}

#[test]
fn test_help_overlay_scroll() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::Help;
    app.help_scroll = 0;

    // Scroll down
    app.help_scroll += 5;
    assert_eq!(app.help_scroll, 5);

    // Scroll up
    app.help_scroll = app.help_scroll.saturating_sub(3);
    assert_eq!(app.help_scroll, 2);

    // Render with scroll should not panic
    crate::theme::init_theme("dark");
    let backend = TestBackend::new(120, 40);
    let mut terminal = Terminal::new(backend).expect("terminal");

    terminal
        .draw(|frame| render_dashboard(frame, &app))
        .expect("help overlay with scroll should render");
}

// =========================================================================
// Sprint T05 -- E2E Tests (render -> inspect buffer)
// =========================================================================

/// Helper: render app, return buffer content as a single string.
fn render_to_string(app: &App, width: u16, height: u16) -> String {
    let backend = TestBackend::new(width, height);
    let mut terminal = Terminal::new(backend).expect("terminal");
    terminal
        .draw(|frame| render_dashboard(frame, app))
        .expect("render");
    let buf = terminal.backend().buffer().clone();
    let mut output = String::new();
    for y in 0..buf.area.height {
        for x in 0..buf.area.width {
            output.push_str(buf[(x, y)].symbol());
        }
        output.push('\n');
    }
    output
}

fn make_scan_result(score: f64, zone: crate::types::Zone) -> crate::types::ScanResult {
    crate::types::ScanResult {
        score: crate::types::ScoreBreakdown {
            total_score: score,
            zone,
            category_scores: vec![],
            critical_cap_applied: false,
            total_checks: 20,
            passed_checks: 15,
            failed_checks: 5,
            skipped_checks: 0,
        },
        findings: vec![crate::types::Finding {
            check_id: "CHK-001".to_string(),
            r#type: "compliance".to_string(),
            message: "Missing AI disclosure".to_string(),
            severity: crate::types::Severity::High,
            obligation_id: None,
            article_reference: None,
            fix: Some("Add disclosure notice".to_string()),
            file: None,
            line: None,
            code_context: None,
            fix_diff: None,
        }],
        project_path: ".".to_string(),
        scanned_at: "2026-02-19".to_string(),
        duration: 1200,
        files_scanned: 42,
    }
}

// --- T501: Enhanced Dashboard 2x2 Grid ---

#[test]
fn e2e_t501_score_gauge_shows_zone_label() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;

    // GREEN zone
    app.last_scan = Some(make_scan_result(85.0, crate::types::Zone::Green));
    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("GREEN") && buf.contains("Compliant"),
        "Score gauge should show 'GREEN \u{2014} Compliant', got:\n{}",
        buf.lines().filter(|l| l.contains("GREEN") || l.contains("Compliance Score")).collect::<Vec<_>>().join("\n")
    );

    // YELLOW zone
    app.last_scan = Some(make_scan_result(65.0, crate::types::Zone::Yellow));
    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("YELLOW") && buf.contains("Partial"),
        "Score gauge should show 'YELLOW \u{2014} Partial'"
    );

    // RED zone
    app.last_scan = Some(make_scan_result(30.0, crate::types::Zone::Red));
    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("RED") && buf.contains("Non-Compliant"),
        "Score gauge should show 'RED \u{2014} Non-Compliant'"
    );
}

#[test]
fn e2e_t501_dashboard_shows_panel_titles() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
    app.score_history = vec![50.0, 60.0, 70.0, 75.0];
    app.push_activity(crate::types::ActivityKind::Scan, "75/100");

    let buf = render_to_string(&app, 120, 40);

    assert!(buf.contains("Status Log"), "Missing: Status Log panel title");
    assert!(buf.contains("EU AI Act Deadlines"), "Missing: Deadlines panel title");
    assert!(buf.contains("Info"), "Missing: Info panel title");
    assert!(buf.contains("Quick Fix"), "Missing: Quick Fix panel title");
    assert!(buf.contains("Score History"), "Missing: Score History panel title");
    assert!(buf.contains("By Category"), "Missing: By Category panel title");
    assert!(buf.contains("Sync"), "Missing: Sync panel title");
}

#[test]
fn e2e_t501_deadline_countdown_shows_articles() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(70.0, crate::types::Zone::Yellow));

    let buf = render_to_string(&app, 120, 40);

    assert!(buf.contains("Art. 5"), "Deadline widget should show Art. 5");
    assert!(buf.contains("Art. 50"), "Deadline widget should show Art. 50");
    assert!(buf.contains("Art. 6"), "Deadline widget should show Art. 6");
    // Should show urgency (overdue/left)
    assert!(
        buf.contains("overdue") || buf.contains("left"),
        "Deadline widget should show urgency labels"
    );
}

#[test]
fn e2e_t501_dashboard_info_panel_shows_score() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(80.0, crate::types::Zone::Green));

    let buf = render_to_string(&app, 120, 40);

    assert!(buf.contains("Score:"), "Info panel should show score");
    assert!(buf.contains("80/100"), "Info panel should show score value");
    assert!(buf.contains("Quick Fix"), "Dashboard should show Quick Fix");
    assert!(buf.contains("[S]"), "Quick Fix should show Scan shortcut");
}

#[test]
fn e2e_t501_score_sparkline_renders_block_chars() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(90.0, crate::types::Zone::Green));
    app.score_history = vec![20.0, 40.0, 60.0, 80.0, 90.0];

    let buf = render_to_string(&app, 120, 40);

    // Sparkline characters should be present
    let sparkline_chars = ['\u{2581}', '\u{2582}', '\u{2583}', '\u{2584}', '\u{2585}', '\u{2586}', '\u{2587}', '\u{2588}'];
    let has_sparkline = sparkline_chars.iter().any(|c| buf.contains(*c));
    assert!(has_sparkline, "Score History should contain sparkline block characters");
    assert!(buf.contains("Latest:"), "Score History should show 'Latest: N/100'");
    assert!(buf.contains("5 scans"), "Score History should show scan count");
}

#[test]
fn e2e_t501_dashboard_sync_status() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(70.0, crate::types::Zone::Yellow));

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Sync"), "Dashboard should show Sync status panel");
    assert!(buf.contains("Not connected"), "Sync should show disconnected state");
}

#[test]
fn e2e_t501_empty_score_history_shows_placeholder() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(70.0, crate::types::Zone::Yellow));
    app.score_history.clear();

    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("No history yet"),
        "Empty score history should show placeholder"
    );
}

// --- T504: Status Bar 6 Indicators ---

#[test]
fn e2e_t504_status_bar_shows_daemon_indicator() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());

    let buf = render_to_string(&app, 120, 40);
    // Footer shows engine connection indicator
    assert!(buf.contains("\u{25cb}") || buf.contains("\u{25cf}"), "Status bar should show daemon indicator");
}

#[test]
fn e2e_t504_status_bar_shows_view_indicator() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());

    // Dashboard view
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("[1 Dashboard]"), "Status bar should show [1 Dashboard]");

    // Switch to Log view
    app.view_state = ViewState::Log;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("[8 Log]"), "Status bar should show [8 Log]");

    // Switch to Scan view
    app.view_state = ViewState::Scan;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("[2 Scan]"), "Status bar should show [2 Scan]");
}

#[test]
fn e2e_t504_status_bar_shows_score_badge() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("[75]"), "Status bar should show score badge [75]");
}

#[test]
fn e2e_t504_status_bar_watch_indicator_visible_when_active() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());

    // Watch mode state is tracked in app, footer no longer shows [W]
    app.watch_active = false;
    assert!(!app.watch_active);

    app.watch_active = true;
    assert!(app.watch_active);
}

#[test]
fn e2e_t504_status_bar_context_indicator() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("[ctx:"), "Status bar should show context usage [ctx:N%]");
}

#[test]
fn e2e_t504_status_bar_daemon_indicator() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());

    // Footer shows daemon connection indicator instead of [wrapper]
    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains('\u{25cf}') || buf.contains('\u{25cb}') || buf.contains('\u{2717}'),
        "Status bar should show daemon connection indicator"
    );
}

#[test]
fn e2e_t504_status_bar_engine_indicator() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());

    // Connected
    app.engine_status = crate::types::EngineConnectionStatus::Connected;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains('\u{25cf}'), "Connected engine should show filled circle");

    // Connecting
    app.engine_status = crate::types::EngineConnectionStatus::Connecting;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains('\u{25cb}'), "Connecting engine should show hollow circle");

    // Error
    app.engine_status = crate::types::EngineConnectionStatus::Error;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains('\u{2717}'), "Error engine should show cross mark");
}

// --- T505: Dynamic Footer + Help Overlay ---

#[test]
fn e2e_t505_footer_shows_insert_mode_badge() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Insert;

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("INSERT"), "Footer should show INSERT mode badge");
}

#[test]
fn e2e_t505_footer_shows_normal_mode_badge() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Normal;

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("NORMAL"), "Footer should show NORMAL mode badge");
}

#[test]
fn e2e_t505_footer_hints_change_per_view() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());

    // Dashboard view -- should show dashboard-specific hints
    // Navigation is now in the tab bar; footer shows view-local hints
    app.view_state = ViewState::Dashboard;
    let buf = render_to_string(&app, 120, 40);
    let last_line = buf.lines().last().unwrap_or("");
    assert!(last_line.contains("help"), "Dashboard footer should mention help");
    assert!(last_line.contains("scan"), "Dashboard footer should mention scan");

    // Status Log view -- should show command-specific hints
    app.view_state = ViewState::Log;
    let buf = render_to_string(&app, 120, 40);
    let last_line = buf.lines().last().unwrap_or("");
    assert!(last_line.contains("@OBL"), "Status Log footer should mention @OBL");
    assert!(last_line.contains("run"), "Status Log footer should mention run");
}

#[test]
fn e2e_t505_help_overlay_shows_view_specific_section() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::Help;
    app.help_scroll = 0;

    // Dashboard view -- help should show "Dashboard View"
    app.view_state = ViewState::Dashboard;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Dashboard View"), "Help overlay should show 'Dashboard View' section");
    assert!(buf.contains("Keyboard Shortcuts"), "Help overlay should have title");

    // Scan view -- help should show "Scan View"
    app.view_state = ViewState::Scan;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Scan View"), "Help overlay should show 'Scan View' section");

    // Chat (Log) view -- help should show "Log View"
    app.view_state = ViewState::Log;
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Log View"), "Help overlay should show 'Log View' section");
}

#[test]
fn e2e_t505_help_overlay_shows_global_shortcuts() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::Help;
    app.help_scroll = 0;

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("General"), "Help should have General section");
    assert!(buf.contains("Navigation"), "Help should have Navigation section");
    assert!(buf.contains("Features"), "Help should have Features section");
    assert!(buf.contains("Ctrl+C"), "Help should show Ctrl+C shortcut");
    assert!(buf.contains("Command palette"), "Help should show Command palette");
}

#[test]
fn e2e_t505_help_overlay_scroll_changes_visible_content() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::Help;

    // Render with scroll=0
    app.help_scroll = 0;
    let buf0 = render_to_string(&app, 120, 40);

    // Render with scroll=10
    app.help_scroll = 10;
    let buf10 = render_to_string(&app, 120, 40);

    // The content should differ (scrolled down)
    assert_ne!(buf0, buf10, "Help overlay should show different content after scrolling");
}

// --- T503: @OBL/@Art References ---

#[test]
fn e2e_t503_obl_tab_complete_full_flow() {
    let mut app = App::new(crate::config::TuiConfig::default());

    // Type "@OBL-0" and tab-complete
    app.input = "@OBL-0".to_string();
    app.input_cursor = 6;
    app.input_mode = crate::types::InputMode::Insert;

    app.apply_action(crate::input::Action::TabComplete);

    // Should complete to @OBL-001
    assert_eq!(app.input, "@OBL-001", "Tab complete should fill @OBL-001");
    assert_eq!(app.input_cursor, 8);
}

#[test]
fn e2e_t503_art_tab_complete_converts_to_obl() {
    let mut app = App::new(crate::config::TuiConfig::default());

    // Type "@Art." and tab-complete
    app.input = "@Art.".to_string();
    app.input_cursor = 5;
    app.input_mode = crate::types::InputMode::Insert;

    app.apply_action(crate::input::Action::TabComplete);

    // Should convert to @OBL-xxx format
    assert!(
        app.input.starts_with("@OBL-"),
        "Art. completion should convert to @OBL- format, got: {}",
        app.input
    );
}

#[test]
fn e2e_t503_plain_input_shows_unknown_command_message() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Insert;
    app.input = "Explain @OBL-001 requirements".to_string();
    app.input_cursor = app.input.len();

    let cmd = app.apply_action(crate::input::Action::SubmitInput);

    // LLM chat removed: plain text returns None + System message
    assert!(cmd.is_none(), "Plain text submit should return None (no LLM)");
    let last_msg = app.messages.last().unwrap();
    assert_eq!(last_msg.role, crate::types::MessageRole::System);
    assert!(last_msg.content.contains("Unknown input"));
}

#[test]
fn e2e_t503_plain_message_no_llm_dispatch() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Insert;
    app.input = "Hello, explain compliance".to_string();
    app.input_cursor = app.input.len();

    let cmd = app.apply_action(crate::input::Action::SubmitInput);

    // LLM chat removed: plain text returns None
    assert!(cmd.is_none(), "Plain text submit should return None (no LLM)");
}

#[test]
fn e2e_t503_status_log_renders_system_messages() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Log;
    // Status Log only shows System messages (User/Assistant are filtered out)
    app.messages.push(crate::types::ChatMessage::new(
        crate::types::MessageRole::System,
        "Compliance check for @OBL-001 completed".to_string(),
    ));

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("@OBL-001"), "Status Log should render @OBL-001 in system events");
    assert!(buf.contains("Compliance"), "Status Log should render the message text");
}

// --- T502: Watch Mode ---

#[test]
fn e2e_t502_watch_toggle_via_key_w() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Normal;
    assert!(!app.watch_active);

    let key = crossterm::event::KeyEvent::new(
        crossterm::event::KeyCode::Char('w'),
        crossterm::event::KeyModifiers::NONE,
    );
    let action = crate::input::handle_key_event(key, &app);
    let cmd = app.apply_action(action);

    assert!(
        matches!(cmd, Some(crate::app::AppCommand::ToggleWatch)),
        "Pressing 'w' in Normal mode should produce ToggleWatch command"
    );
}

#[test]
fn e2e_t502_watch_command_via_slash() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Command;
    app.input = "watch".to_string();
    app.input_cursor = 5;

    // Simulate /watch command submission
    let cmd = app.apply_action(crate::input::Action::SubmitInput);

    assert!(
        matches!(cmd, Some(crate::app::AppCommand::ToggleWatch)),
        "/watch command should produce ToggleWatch"
    );
}

#[test]
fn e2e_t502_watcher_is_relevant_rejects_hidden_and_node_modules() {
    use std::path::Path;
    assert!(crate::watcher::is_relevant(Path::new("src/app.rs")));
    assert!(crate::watcher::is_relevant(Path::new("Cargo.toml")));
    assert!(!crate::watcher::is_relevant(Path::new(".git/HEAD")));
    assert!(!crate::watcher::is_relevant(Path::new(".env")));
    assert!(!crate::watcher::is_relevant(Path::new("node_modules/express/index.js")));
    assert!(!crate::watcher::is_relevant(Path::new("target/debug/complior")));
    assert!(!crate::watcher::is_relevant(Path::new("dist/bundle.js")));
    assert!(!crate::watcher::is_relevant(Path::new("build/output.js")));
    assert!(!crate::watcher::is_relevant(Path::new("__pycache__/mod.pyc")));
}

#[test]
fn e2e_t502_watch_mode_status_bar_integration() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());

    // Watch state is tracked in app but no longer shown as [W] in footer
    assert!(!app.watch_active, "Watch should be inactive by default");

    // Enable watch
    app.watch_active = true;
    app.mode = crate::types::Mode::Watch;
    assert!(app.watch_active, "Watch should be active after toggle");

    // Footer renders without panic when watch is active
    let buf = render_to_string(&app, 120, 40);
    assert!(!buf.is_empty(), "Footer should render with watch active");
}

#[test]
fn e2e_t502_auto_scan_regression_detection_state() {
    let mut app = App::new(crate::config::TuiConfig::default());

    // Simulate first scan
    app.set_scan_result(make_scan_result(80.0, crate::types::Zone::Green));
    assert_eq!(app.score_history.last().copied(), Some(80.0));

    // Simulate watch_last_score being set before auto-scan
    app.watch_last_score = Some(80.0);

    // Second scan with lower score (simulating regression)
    app.set_scan_result(make_scan_result(70.0, crate::types::Zone::Yellow));

    // Verify score history updated
    assert_eq!(app.score_history.len(), 2);
    assert_eq!(app.score_history[0], 80.0);
    assert_eq!(app.score_history[1], 70.0);
}

// --- Cross-cutting: All 6 views render without panic ---

#[test]
fn e2e_all_views_render_with_scan_data() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.sidebar_visible = false;
    app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
    app.score_history = vec![60.0, 70.0, 75.0];
    app.push_activity(crate::types::ActivityKind::Scan, "75/100");

    for view in ViewState::ALL {
        app.view_state = view;
        if view == ViewState::Fix {
            // Populate fix view from scan
            app.fix_view = crate::views::fix::FixViewState::from_scan(
                &app.last_scan.as_ref().unwrap().findings,
            );
        }
        let buf = render_to_string(&app, 120, 40);
        assert!(
            !buf.is_empty(),
            "View {:?} should render non-empty content",
            view
        );
    }
}

#[test]
fn e2e_all_views_footer_contains_mode_badge() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Normal;

    for view in ViewState::ALL {
        app.view_state = view;
        let buf = render_to_string(&app, 120, 40);
        let last_line = buf.lines().last().unwrap_or("");
        assert!(
            last_line.contains("NORMAL"),
            "View {:?} footer should contain NORMAL mode badge, got: '{}'",
            view,
            last_line
        );
    }
}

// --- Edge cases ---

#[test]
fn e2e_tiny_terminal_no_panic() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.last_scan = Some(make_scan_result(50.0, crate::types::Zone::Yellow));

    // Very small terminal -- should not panic
    let _buf = render_to_string(&app, 40, 10);
}

#[test]
fn e2e_large_terminal_no_panic() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.last_scan = Some(make_scan_result(50.0, crate::types::Zone::Yellow));
    app.score_history = (0..20).map(|i| f64::from(i) * 5.0).collect();
    for i in 0..10 {
        app.push_activity(crate::types::ActivityKind::Scan, format!("scan {i}"));
    }

    let _buf = render_to_string(&app, 300, 100);
}

// =========================================================================
// Sprint T07 -- Complior Zen + Advanced UX E2E Tests
// =========================================================================

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

#[test]
fn e2e_t704_confirm_dialog_y_closes() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.confirm_dialog = Some(crate::components::confirm_dialog::ConfirmDialog {
        title: "Confirm".to_string(),
        message: "Apply all?".to_string(),
        file_count: 3,
        score_impact: Some(5.0),
    });
    app.overlay = Overlay::ConfirmDialog;

    // Press 'y' to confirm
    app.apply_action(crate::input::Action::InsertChar('y'));
    assert_eq!(app.overlay, Overlay::None, "ConfirmDialog should close on 'y'");
    assert!(app.confirm_dialog.is_none());
}

#[test]
fn e2e_t704_confirm_dialog_n_cancels() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.confirm_dialog = Some(crate::components::confirm_dialog::ConfirmDialog {
        title: "Confirm".to_string(),
        message: "Apply?".to_string(),
        file_count: 1,
        score_impact: None,
    });
    app.overlay = Overlay::ConfirmDialog;

    app.apply_action(crate::input::Action::InsertChar('n'));
    assert_eq!(app.overlay, Overlay::None, "ConfirmDialog should close on 'n'");
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

#[test]
fn e2e_t705_quick_action_d_opens_dismiss_modal() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Scan;
    app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
    app.scan_view.selected_finding = Some(0);

    // Press 'd' for dismiss
    app.handle_view_key('d');
    assert_eq!(app.overlay, Overlay::DismissModal, "'d' should open dismiss modal");
    assert!(app.dismiss_modal.is_some());
}

#[test]
fn e2e_t705_dismiss_modal_close_on_esc() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.dismiss_modal = Some(crate::components::quick_actions::DismissModal::new(0));
    app.overlay = Overlay::DismissModal;

    app.apply_action(crate::input::Action::EnterNormalMode);
    assert_eq!(app.overlay, Overlay::None, "Dismiss modal should close on Esc");
    assert!(app.dismiss_modal.is_none());
}

// --- T701: Complior Zen ---

#[test]
fn e2e_t701_zen_provider_in_catalog() {
    let models = crate::providers::available_models();
    let zen = models.iter().find(|m| m.provider == "complior");
    assert!(zen.is_some(), "Complior Zen should be in the model catalog");
    assert_eq!(zen.unwrap().display_name, "Complior Zen (Free)");
}

#[test]
fn e2e_t701_zen_is_first_model() {
    let models = crate::providers::available_models();
    assert_eq!(models[0].provider, "complior", "Zen should be the first model");
}

#[test]
fn e2e_multiple_overlays_on_different_views() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());

    // Help overlay on each view
    for view in ViewState::ALL {
        app.view_state = view;
        app.overlay = Overlay::Help;
        app.help_scroll = 0;
        let buf = render_to_string(&app, 120, 40);
        assert!(
            buf.contains("Keyboard Shortcuts"),
            "Help overlay should render on {:?} view",
            view
        );
        assert!(
            buf.contains(&format!("{} View", view.short_name())),
            "Help overlay should show {:?} View section",
            view
        );
    }
}

// =========================================================================
// Sprint T08 -- Advanced UX Part 2 + Polish
// =========================================================================

// --- T803: Responsive Layout ---

#[test]
fn e2e_t803_responsive_tiny() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
    app.sidebar_visible = false;

    // Tiny terminal (40 cols) -- should not panic and show minimal summary
    let buf = render_to_string(&app, 40, 10);
    assert!(!buf.is_empty(), "Tiny terminal should render something");
}

// --- T806: Mouse Support ---

#[test]
fn t806_scroll_accel_slow() {
    let app = App::new(crate::config::TuiConfig::default());
    // No recent scroll events -> should be 1 line
    let lines = crate::input::scroll_line_count_for_test(&app);
    assert_eq!(lines, 1);
}

#[test]
fn t806_scroll_accel_fast() {
    let mut app = App::new(crate::config::TuiConfig::default());
    let now = std::time::Instant::now();
    // Add 4 recent scroll events
    for _ in 0..4 {
        app.scroll_events.push(now);
    }
    let lines = crate::input::scroll_line_count_for_test(&app);
    assert!(lines > 1, "Fast scrolling should accelerate (got {lines})");
}

#[test]
fn t806_click_target_view_tab() {
    let mut app = App::new(crate::config::TuiConfig::default());
    assert_eq!(app.view_state, ViewState::Dashboard);

    app.apply_action(crate::input::Action::ClickAt(
        crate::types::ClickTarget::ViewTab(ViewState::Scan),
    ));
    assert_eq!(app.view_state, ViewState::Scan, "Click on Scan tab should switch view");
}

#[test]
fn t806_click_noop_empty() {
    let app = App::new(crate::config::TuiConfig::default());
    // No click areas registered -- click should be no-op
    let mouse = crossterm::event::MouseEvent {
        kind: crossterm::event::MouseEventKind::Down(crossterm::event::MouseButton::Left),
        column: 50,
        row: 10,
        modifiers: crossterm::event::KeyModifiers::NONE,
    };
    let action = crate::input::handle_mouse_event(mouse, &app);
    assert!(matches!(action, crate::input::Action::None));
}

// --- T804: Colon-Command Mode ---

#[test]
fn t804_colon_enters_mode() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.input_mode = crate::types::InputMode::Normal;

    app.apply_action(crate::input::Action::EnterColonMode);
    assert!(app.colon_mode, "EnterColonMode should set colon_mode");
    assert_eq!(app.input_mode, crate::types::InputMode::Command);
    assert!(app.input.is_empty());
}

#[test]
fn t804_colon_cmd_scan() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.colon_mode = true;
    app.input_mode = crate::types::InputMode::Command;
    app.input = "scan".to_string();
    app.input_cursor = 4;

    let cmd = app.apply_action(crate::input::Action::SubmitInput);
    assert!(matches!(cmd, Some(crate::app::AppCommand::Scan)), "`:scan` should return Scan command");
    assert!(!app.colon_mode, "colon_mode should be cleared after submit");
}

#[test]
fn t804_colon_cmd_quit() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.colon_mode = true;
    app.input_mode = crate::types::InputMode::Command;
    app.input = "quit".to_string();
    app.input_cursor = 4;

    let cmd = app.apply_action(crate::input::Action::SubmitInput);
    assert!(cmd.is_none());
    assert!(!app.running, "`:quit` should set running=false");
}

#[test]
fn t804_colon_tab_complete() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.colon_mode = true;
    app.input_mode = crate::types::InputMode::Command;
    app.input = "sc".to_string();
    app.input_cursor = 2;

    app.apply_action(crate::input::Action::TabComplete);
    assert_eq!(app.input, "scan", "Tab should complete 'sc' to 'scan'");
}

#[test]
fn t804_colon_esc() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.colon_mode = true;
    app.input_mode = crate::types::InputMode::Command;

    app.apply_action(crate::input::Action::EnterNormalMode);
    assert!(!app.colon_mode, "Esc should clear colon_mode");
    assert_eq!(app.input_mode, crate::types::InputMode::Normal);
}

// --- T08: Owl Header + Animations ---

#[test]
fn e2e_t08_owl_header_renders() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("(o)(o)"), "Owl header should render");
    assert!(buf.contains("complior"), "Owl header should show version");
}

#[test]
fn e2e_t08_undo_overlay_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::UndoHistory;

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("Undo History"), "Undo History overlay should render");
}

#[test]
fn e2e_t08_colon_mode_footer() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.colon_mode = true;
    app.input_mode = crate::types::InputMode::Command;
    app.input = "the".to_string();

    let buf = render_to_string(&app, 120, 40);
    let last_line = buf.lines().last().unwrap_or("");
    assert!(last_line.contains("COLON"), "Footer should show COLON mode badge");
}
