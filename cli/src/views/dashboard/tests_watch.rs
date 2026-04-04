use super::tests_helpers::{make_scan_result, render_to_string};
use super::*;

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
    assert!(!crate::watcher::is_relevant(Path::new(
        "node_modules/express/index.js"
    )));
    assert!(!crate::watcher::is_relevant(Path::new(
        "target/debug/complior"
    )));
    assert!(!crate::watcher::is_relevant(Path::new("dist/bundle.js")));
    assert!(!crate::watcher::is_relevant(Path::new("build/output.js")));
    assert!(!crate::watcher::is_relevant(Path::new(
        "__pycache__/mod.pyc"
    )));
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
