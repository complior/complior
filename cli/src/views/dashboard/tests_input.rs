use super::*;

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
    assert!(
        cmd.is_none(),
        "Plain text submit should return None (no LLM)"
    );
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
    assert!(
        cmd.is_none(),
        "Plain text submit should return None (no LLM)"
    );
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

    let buf = super::tests_helpers::render_to_string(&app, 120, 40);
    assert!(
        buf.contains("@OBL-001"),
        "Status Log should render @OBL-001 in system events"
    );
    assert!(
        buf.contains("Compliance"),
        "Status Log should render the message text"
    );
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
    assert!(
        matches!(cmd, Some(crate::app::AppCommand::Scan)),
        "`:scan` should return Scan command"
    );
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
