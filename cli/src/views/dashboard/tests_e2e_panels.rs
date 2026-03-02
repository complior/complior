use super::*;
use super::tests_helpers::{render_to_string, make_scan_result};

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
