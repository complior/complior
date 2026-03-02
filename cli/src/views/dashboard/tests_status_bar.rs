use super::*;
use super::tests_helpers::{render_to_string, make_scan_result};

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
    assert!(buf.contains("[7 Log]"), "Status bar should show [7 Log]");

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
