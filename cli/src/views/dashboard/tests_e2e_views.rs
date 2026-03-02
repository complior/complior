use super::*;
use super::tests_helpers::{render_to_string, make_scan_result};

// --- Cross-cutting: All views render without panic ---

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

// --- T08: Owl Header ---

#[test]
fn e2e_t08_owl_header_renders() {
    crate::theme::init_theme("dark");
    let app = App::new(crate::config::TuiConfig::default());
    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("(o)(o)"), "Owl header should render");
    assert!(buf.contains("complior"), "Owl header should show version");
}
