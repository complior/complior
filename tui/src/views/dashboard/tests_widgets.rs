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
