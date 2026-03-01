use super::*;

#[test]
fn test_default_passport_has_fields() {
    let fields = fields::default_passport_fields();
    assert_eq!(fields.len(), 18);
    assert_eq!(fields[0].category, "Identity");
    assert_eq!(fields[0].name, "name");
}

#[test]
fn test_passport_completeness() {
    let mut state = PassportViewState::default();
    assert_eq!(state.completeness(), 0);
    state.fields[0].value = "test".to_string();
    let pct = state.completeness();
    assert!(pct > 0 && pct < 10);
}

#[test]
fn test_next_empty_field() {
    let state = PassportViewState::default();
    // All empty, so next empty from index 0 should be index 1
    assert_eq!(state.next_empty_field(), Some(1));
}

#[test]
fn test_wrap_text() {
    let result = wrap_text("short text", 40);
    assert_eq!(result, vec!["short text"]);

    let result = wrap_text("this is a longer text that needs wrapping", 15);
    assert!(result.len() > 1);
}

#[test]
fn test_passport_renders_without_panic() {
    crate::theme::init_theme("dark");
    let backend = ratatui::backend::TestBackend::new(100, 30);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
    let app = crate::app::App::new(crate::config::TuiConfig::default());

    terminal
        .draw(|frame| render_passport_view(frame, frame.area(), &app))
        .expect("render");
}
