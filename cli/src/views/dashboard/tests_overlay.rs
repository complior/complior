use ratatui::Terminal;
use ratatui::backend::TestBackend;

use super::tests_helpers::render_to_string;
use super::*;

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

// --- T505: Help Overlay E2E ---

#[test]
fn e2e_t505_help_overlay_shows_view_specific_section() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::Help;
    app.help_scroll = 0;

    // Dashboard view -- help should show "Dashboard View"
    app.view_state = ViewState::Dashboard;
    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("Dashboard View"),
        "Help overlay should show 'Dashboard View' section"
    );
    assert!(
        buf.contains("Keyboard Shortcuts"),
        "Help overlay should have title"
    );

    // Scan view -- help should show "Scan View"
    app.view_state = ViewState::Scan;
    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("Scan View"),
        "Help overlay should show 'Scan View' section"
    );

    // Chat (Log) view -- help should show "Log View"
    app.view_state = ViewState::Log;
    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("Log View"),
        "Help overlay should show 'Log View' section"
    );
}

#[test]
fn e2e_t505_help_overlay_shows_global_shortcuts() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::Help;
    app.help_scroll = 0;

    let buf = render_to_string(&app, 120, 40);
    assert!(buf.contains("General"), "Help should have General section");
    assert!(
        buf.contains("Navigation"),
        "Help should have Navigation section"
    );
    assert!(
        buf.contains("Features"),
        "Help should have Features section"
    );
    assert!(buf.contains("Ctrl+C"), "Help should show Ctrl+C shortcut");
    assert!(
        buf.contains("Command palette"),
        "Help should show Command palette"
    );
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
    assert_ne!(
        buf0, buf10,
        "Help overlay should show different content after scrolling"
    );
}

// --- T704: Confirm Dialog ---

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
    assert_eq!(
        app.overlay,
        Overlay::None,
        "ConfirmDialog should close on 'y'"
    );
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
    assert_eq!(
        app.overlay,
        Overlay::None,
        "ConfirmDialog should close on 'n'"
    );
}

// --- T705: Dismiss Modal ---

#[test]
fn e2e_t705_quick_action_d_opens_dismiss_modal() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.view_state = ViewState::Scan;
    app.last_scan = Some(super::tests_helpers::make_scan_result(
        75.0,
        crate::types::Zone::Yellow,
    ));
    app.scan_view.selected_finding = Some(0);

    // Press 'd' for dismiss
    app.handle_view_key('d');
    assert_eq!(
        app.overlay,
        Overlay::DismissModal,
        "'d' should open dismiss modal"
    );
    assert!(app.dismiss_modal.is_some());
}

#[test]
fn e2e_t705_dismiss_modal_close_on_esc() {
    let mut app = App::new(crate::config::TuiConfig::default());
    app.dismiss_modal = Some(crate::components::quick_actions::DismissModal::new(0));
    app.overlay = Overlay::DismissModal;

    app.apply_action(crate::input::Action::EnterNormalMode);
    assert_eq!(
        app.overlay,
        Overlay::None,
        "Dismiss modal should close on Esc"
    );
    assert!(app.dismiss_modal.is_none());
}

// --- T08: Undo overlay ---

#[test]
fn e2e_t08_undo_overlay_renders() {
    crate::theme::init_theme("dark");
    let mut app = App::new(crate::config::TuiConfig::default());
    app.overlay = Overlay::UndoHistory;

    let buf = render_to_string(&app, 120, 40);
    assert!(
        buf.contains("Undo History"),
        "Undo History overlay should render"
    );
}

// --- Multiple overlays on different views ---

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
