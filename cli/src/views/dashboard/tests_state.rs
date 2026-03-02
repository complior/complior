use super::*;

#[test]
fn test_view_state_from_key() {
    assert_eq!(ViewState::from_key(1), Some(ViewState::Dashboard));
    assert_eq!(ViewState::from_key(2), Some(ViewState::Scan));
    assert_eq!(ViewState::from_key(3), Some(ViewState::Fix));
    assert_eq!(ViewState::from_key(4), Some(ViewState::Passport));
    assert_eq!(ViewState::from_key(5), Some(ViewState::Timeline));
    assert_eq!(ViewState::from_key(6), Some(ViewState::Report));
    assert_eq!(ViewState::from_key(7), Some(ViewState::Log));
    assert_eq!(ViewState::from_key(0), None);
    assert_eq!(ViewState::from_key(8), None);
}

#[test]
fn test_view_state_from_letter() {
    assert_eq!(ViewState::from_letter('D'), Some(ViewState::Dashboard));
    assert_eq!(ViewState::from_letter('S'), Some(ViewState::Scan));
    assert_eq!(ViewState::from_letter('F'), Some(ViewState::Fix));
    assert_eq!(ViewState::from_letter('P'), Some(ViewState::Passport));
    assert_eq!(ViewState::from_letter('T'), Some(ViewState::Timeline));
    assert_eq!(ViewState::from_letter('R'), Some(ViewState::Report));
    assert_eq!(ViewState::from_letter('L'), Some(ViewState::Log));
    assert_eq!(ViewState::from_letter('O'), None);
    assert_eq!(ViewState::from_letter('X'), None);
    assert_eq!(ViewState::from_letter('d'), None); // lowercase not mapped
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
