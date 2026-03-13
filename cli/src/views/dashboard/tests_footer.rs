use super::*;
use super::footer::footer_hints_for_view;
use super::tests_helpers::render_to_string;

// -- T505 tests --

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
    assert!(log_hints.contains("j/k:scroll"));

    let chat_hints = footer_hints_for_view(ViewState::Chat);
    assert!(chat_hints.contains("i:type"));

    let timeline_hints = footer_hints_for_view(ViewState::Timeline);
    assert!(timeline_hints.contains("j/k:scroll"));

    let report_hints = footer_hints_for_view(ViewState::Report);
    assert!(report_hints.contains("e:export"));
}

// --- T505: Dynamic Footer E2E ---

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

    // Chat view -- should show chat-specific hints
    app.view_state = ViewState::Chat;
    let buf = render_to_string(&app, 120, 40);
    let last_line = buf.lines().last().unwrap_or("");
    assert!(last_line.contains("type"), "Chat footer should mention type");
    assert!(last_line.contains("command"), "Chat footer should mention command");
}

// --- T08: Colon mode footer ---

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
