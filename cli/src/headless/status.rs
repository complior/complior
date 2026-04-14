//! Headless `complior status` command (V1-M10 T-4).
//!
//! Calls GET /status/posture and renders CompliancePosture as human-readable
//! or JSON output.

use crate::config::TuiConfig;
use crate::headless::common::ensure_engine;
use crate::headless::format::colors::{
    bar_empty, bar_filled, bold, bold_red, bold_yellow, check_mark, cyan, dim, green,
    red, score_color, yellow,
};
use crate::headless::format::layers::display_width;
use crate::types::CompliancePosture;

/// Run `complior status [--json] [path]` — show aggregated compliance posture.
pub async fn run_headless_status(json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let _scan_path = super::common::resolve_project_path(path);

    match client.get_json("/status/posture").await {
        Ok(raw) => {
            if json {
                println!("{}", serde_json::to_string_pretty(&raw).unwrap_or_default());
            } else {
                let posture: CompliancePosture = match serde_json::from_value(raw) {
                    Ok(p) => p,
                    Err(e) => {
                        eprintln!("Error: Failed to parse compliance posture: {e}");
                        return 1;
                    }
                };
                let formatted = format_status_human(&posture);
                println!("{formatted}");
            }
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to fetch compliance posture: {e}");
            1
        }
    }
}

// ── Human-readable formatter ─────────────────────────────────────

fn format_status_human(posture: &CompliancePosture) -> String {
    let mut o = String::with_capacity(4096);
    let w = display_width().max(70);

    render_title(&mut o, w);
    render_score_block(&mut o, posture);
    render_disclaimer(&mut o, posture, w);
    render_categories(&mut o, posture, w);
    render_top_actions(&mut o, posture, w);
    render_footer(&mut o, posture, w);

    o
}

fn render_title(o: &mut String, w: usize) {
    o.push('\n');
    o.push_str(&cyan(&"─".repeat(w)));
    o.push('\n');
    o.push_str("  Complior Status — EU AI Act Compliance Posture\n");
    o.push_str(&cyan(&"─".repeat(w)));
    o.push('\n');
    o.push('\n');
}

fn render_score_block(o: &mut String, posture: &CompliancePosture) {
    let score = posture.score.total_score;
    let zone = &posture.score.zone;
    let passed = posture.score.passed_checks;
    let total = posture.score.total_checks;
    let failed = posture.score.failed_checks;

    let zone_colored = match zone.label() {
        "green" => green("green"),
        "yellow" => yellow("yellow"),
        "red" => red("red"),
        other => cyan(other),
    };

    let bar = build_bar(score);
    o.push_str(&format!("  {}  {:.0} / 100  ({})\n", bold("Score"), score, zone_colored));
    o.push_str(&format!("  {}\n\n", bar));

    let passed_str = if passed == total {
        green(&format!("{}/{total}", passed))
    } else {
        yellow(&format!("{}/{total}", passed))
    };
    let failed_str = if failed > 0 {
        red(&failed.to_string())
    } else {
        green("0")
    };
    o.push_str(&format!(
        "  {}  {} passed  ·  {} failed  ·  {} skipped\n\n",
        dim("Checks:"),
        passed_str,
        failed_str,
        posture.score.skipped_checks
    ));
}

fn build_bar(score: f64) -> String {
    let filled = (score / 100.0 * 20.0) as usize;
    let empty = 20usize.saturating_sub(filled);
    let filled_str = bar_filled().repeat(filled);
    let empty_str = bar_empty().repeat(empty);
    format!("  {}{}  {}", filled_str, empty_str, score_color(score, &format!("{:.0}", score)))
}

fn render_disclaimer(o: &mut String, posture: &CompliancePosture, w: usize) {
    let d = &posture.disclaimer;
    o.push_str(&format!("  {}\n", bold("Score Transparency")));
    o.push_str(&cyan(&"─".repeat(w)));
    o.push_str("\n\n");
    o.push_str(&format!("  {}\n", dim(&d.summary)));
    o.push_str(&format!(
        "  {} of {} applicable obligations covered by automated checks.\n",
        d.covered_obligations, d.total_applicable_obligations
    ));
    o.push_str(&format!(
        "  {} obligations require manual evidence.\n\n",
        d.uncovered_count
    ));

    if let Some(ref cap) = d.critical_cap_explanation {
        o.push_str("  ");
        o.push_str(&bold_red("!"));
        o.push_str("  ");
        o.push_str(&dim(cap));
        o.push_str("\n\n");
    }

    if !d.limitations.is_empty() {
        o.push_str(&format!("  {}  {}\n", bold("Limitations:"), dim("Score reflects automated checks only")));
        for lim in &d.limitations {
            if !lim.contains("automated checks only") {
                o.push_str("    • ");
                o.push_str(lim);
                o.push('\n');
            }
        }
        o.push('\n');
    }
}

fn render_categories(o: &mut String, posture: &CompliancePosture, w: usize) {
    if posture.categories.is_empty() {
        return;
    }

    o.push_str(&format!("  {}\n", bold("Category Breakdown")));
    o.push_str(&cyan(&"─".repeat(w)));
    o.push_str("\n\n");

    for cat in &posture.categories {
        let impact_marker = match cat.impact.as_str() {
            "high" => bold_red("▲"),
            "medium" => bold_yellow("◆"),
            "low" => green("●"),
            _ => dim("○"),
        };

        let bar = build_category_bar(cat.score);
        let score_colored = score_color(cat.score, &format!("{:.0}", cat.score));
        let weight_pct = (cat.weight * 100.0).round() as usize;

        o.push_str(&format!(
            "  {} {}  {}  {}\n",
            impact_marker,
            bold(&cat.category),
            bar,
            score_colored
        ));
        o.push_str(&format!(
            "    {} of {} obligations met  ·  weight {}%\n",
            cat.passed, cat.passed + cat.failed, weight_pct
        ));

        if !cat.top_failures.is_empty() {
            o.push_str(&format!("    {}: ", dim("Top failures")));
            o.push_str(&cat.top_failures.join(", "));
            o.push('\n');
        }

        if !cat.explanation.is_empty() {
            o.push_str("    ");
            o.push_str(&dim(&cat.explanation));
            o.push('\n');
        }
        o.push('\n');
    }
}

fn build_category_bar(score: f64) -> String {
    let filled = (score / 100.0 * 10.0) as usize;
    let empty = 10usize.saturating_sub(filled);
    format!(
        "[{}{}]",
        bar_filled().repeat(filled),
        bar_empty().repeat(empty)
    )
}

fn render_top_actions(o: &mut String, posture: &CompliancePosture, w: usize) {
    if posture.top_actions.is_empty() {
        return;
    }

    o.push_str(&format!("  {}\n", bold("Priority Actions")));
    o.push_str(&cyan(&"─".repeat(w)));
    o.push_str("\n\n");

    for action in &posture.top_actions {
        let sev_colored = match action.severity.as_str() {
            "critical" => bold_red(&action.severity.to_uppercase()),
            "high" => red(&action.severity.to_uppercase()),
            "medium" => yellow(&action.severity.to_uppercase()),
            "low" => green(&action.severity.to_uppercase()),
            _ => dim(&action.severity),
        };

        o.push_str(&format!(
            "  {}. {}  [{}]  {}\n",
            action.rank,
            bold(&action.id),
            sev_colored,
            action.title
        ));

        if !action.article.is_empty() {
            o.push_str(&format!("      {} {}\n", dim("Article:"), action.article));
        }

        if let Some(effort) = &action.effort {
            o.push_str(&format!("      {} {}\n", dim("Effort:"), effort));
        }

        if action.fix_available {
            o.push_str("      ");
            o.push_str(check_mark());
            o.push_str("  run ");
            o.push_str(&bold(&action.command));
            o.push('\n');
        }

        if let Some(ps) = action.projected_score {
            o.push_str(&format!("      {} projected score: {:.0}\n", dim("→"), ps));
        }

        o.push('\n');
    }
}

fn render_footer(o: &mut String, posture: &CompliancePosture, w: usize) {
    o.push_str(&cyan(&"─".repeat(w)));
    o.push('\n');
    o.push_str(&format!(
        "  {}  {} passports  ·  {} documents\n",
        dim("Registry:"),
        posture.passport_count,
        posture.document_count
    ));

    if let Some(ref at) = posture.last_scan_at {
        let date = at.get(..10).unwrap_or(at.as_str());
        o.push_str(&format!("  {}  last scan: {}\n", dim("Scan:"), date));
    }

    if posture.evidence_verified.is_some() {
        let verified = posture.evidence_verified.unwrap_or(false);
        let icon = if verified { "✓".to_string() } else { dim("✗") };
        let text = if verified { green("verified") } else { dim("not verified") };
        o.push_str(&format!("  {}  evidence chain: {}\n", icon, text));
    }

    o.push('\n');
    o.push_str(&cyan(&"─".repeat(w)));
    o.push_str("\n\n");
}
