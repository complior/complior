use crate::theme;
use crate::types::Finding;

// =========================================================================
// Date helpers for deadline countdown
// =========================================================================

/// Approximate current epoch days from system time.
pub(super) fn current_epoch_days() -> i64 {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    (secs / 86400) as i64
}

/// Parse "YYYY-MM-DD" into approximate epoch days.
pub(super) fn parse_epoch_days(date: &str) -> i64 {
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return 0;
    }
    let y: i64 = parts[0].parse().unwrap_or(2025);
    let m: i64 = parts[1].parse().unwrap_or(1);
    let d: i64 = parts[2].parse().unwrap_or(1);
    // Approximate: 365.25 * year + 30.44 * month + day from epoch
    // More accurate: days from 1970-01-01
    
    (y - 1970) * 365 + (y - 1969) / 4 - (y - 1901) / 100 + (y - 1601) / 400
        + (m - 1) * 30 + (m + 1) / 2 - if m > 2 { 2 } else { 0 }
        + d - 1
}

/// Format deadline diff into human-readable label with urgency color.
pub fn deadline_label(days_diff: i64, t: &theme::ThemeColors) -> (String, ratatui::style::Color) {
    if days_diff < 0 {
        let abs = -days_diff;
        (format!("{abs}d overdue"), t.zone_red)
    } else if days_diff < 90 {
        (format!("{days_diff}d left"), t.zone_yellow)
    } else {
        (format!("{days_diff}d left"), t.zone_green)
    }
}

/// Score -> (color, zone label).
pub fn score_zone_info(score: f64, t: &theme::ThemeColors) -> (ratatui::style::Color, &'static str) {
    let color = crate::views::score_zone_color(score, t);
    let label = if score < 50.0 {
        "RED \u{2014} Non-Compliant"
    } else if score < 80.0 {
        "YELLOW \u{2014} Partial"
    } else {
        "GREEN \u{2014} Compliant"
    };
    (color, label)
}

/// Derive category breakdown from findings when engine doesn't provide `category_scores`.
///
/// Maps obligation IDs / article references to 5 high-level categories:
/// prohibited, `risk_mgmt`, documentation, transparency, technical.
pub(super) fn derive_categories_from_findings(findings: &[Finding]) -> Vec<(&'static str, u32)> {
    let mut prohibited = 0u32;
    let mut risk_mgmt = 0u32;
    let mut documentation = 0u32;
    let mut transparency = 0u32;
    let mut technical = 0u32;

    for f in findings {
        let art = f.article_reference.as_deref().unwrap_or("");
        let obl = f.obligation_id.as_deref().unwrap_or("");
        if art.contains("Art. 5") || obl.contains("prohibited") {
            prohibited += 1;
        } else if art.contains("Art. 9") || art.contains("Art. 27") || obl.contains("risk") {
            risk_mgmt += 1;
        } else if art.contains("Art. 11") || art.contains("Art. 12") || art.contains("Art. 18")
            || obl.contains("doc") || f.finding_type() == crate::types::FindingType::B
        {
            documentation += 1;
        } else if art.contains("Art. 50") || art.contains("Art. 13") || art.contains("Art. 52")
            || obl.contains("transp")
        {
            transparency += 1;
        } else {
            technical += 1;
        }
    }

    vec![
        ("prohibited", prohibited),
        ("risk_mgmt", risk_mgmt),
        ("documentation", documentation),
        ("transparency", transparency),
        ("technical", technical),
    ]
}
