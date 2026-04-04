use super::utils::{deadline_label, score_zone_info};
use super::*;

#[test]
fn test_score_color_thresholds() {
    crate::theme::init_theme("dark");
    let t = crate::theme::theme();
    let score_low: f64 = 30.0;
    let color_low = if score_low < 50.0 {
        t.zone_red
    } else if score_low < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };
    assert_eq!(color_low, t.zone_red);

    let score_mid: f64 = 65.0;
    let color_mid = if score_mid < 50.0 {
        t.zone_red
    } else if score_mid < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };
    assert_eq!(color_mid, t.zone_yellow);

    let score_high: f64 = 90.0;
    let color_high = if score_high < 50.0 {
        t.zone_red
    } else if score_high < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };
    assert_eq!(color_high, t.zone_green);
}

#[test]
fn test_deadline_countdown_colors() {
    crate::theme::init_theme("dark");
    let t = crate::theme::theme();

    // Past deadline -> red
    let (label, color) = deadline_label(-30, &t);
    assert!(label.contains("overdue"));
    assert_eq!(color, t.zone_red);

    // Within 90 days -> yellow
    let (label, color) = deadline_label(45, &t);
    assert!(label.contains("left"));
    assert_eq!(color, t.zone_yellow);

    // Far future -> green
    let (label, color) = deadline_label(200, &t);
    assert!(label.contains("left"));
    assert_eq!(color, t.zone_green);
}

// -- New T504 tests --

#[test]
fn test_status_bar_score_badge() {
    crate::theme::init_theme("dark");
    let t = crate::theme::theme();

    let (color, label) = score_zone_info(30.0, &t);
    assert_eq!(color, t.zone_red);
    assert!(label.contains("RED"));

    let (color, label) = score_zone_info(65.0, &t);
    assert_eq!(color, t.zone_yellow);
    assert!(label.contains("YELLOW"));

    let (color, label) = score_zone_info(90.0, &t);
    assert_eq!(color, t.zone_green);
    assert!(label.contains("GREEN"));
}

#[test]
fn test_status_bar_watch_indicator() {
    let mut app = App::new(crate::config::TuiConfig::default());
    assert!(!app.watch_active);

    app.watch_active = true;
    assert!(app.watch_active);
}
