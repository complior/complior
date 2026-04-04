//! Scan output formatting: JSON, SARIF, and human-readable.

pub mod colors;
mod human;
pub mod labels;
pub mod layers;

use std::io::IsTerminal as _;
use std::io::Write as _;

use crate::types::{FrameworkScoreResult, ScanResult, Severity};

// ── Public API ───────────────────────────────────────────────────

/// Options for customizing human-readable scan output.
pub struct FormatOptions {
    /// Framework scores from multi-framework scoring (EU AI Act, OWASP, MITRE).
    pub framework_scores: Option<Vec<FrameworkScoreResult>>,
    /// Quiet mode: show only critical findings and score.
    pub quiet: bool,
    /// Previous score for delta display (e.g. `63 / 100  (was 71)`).
    pub prev_score: Option<f64>,
}

pub use human::format_human;

// ── Shared helpers (used by both scan + fix formatters) ─────────

/// Full-width separator line using dynamic terminal width.
pub fn separator() -> String {
    colors::dim(&colors::h_line().repeat(layers::display_width()))
}

/// Extract project name from the last non-empty path segment.
pub fn project_name(path: &str) -> &str {
    path.rsplit('/').find(|s| !s.is_empty()).unwrap_or(path)
}

/// Pluralization suffix: "s" for n != 1, "" for n == 1.
pub const fn plural(n: usize) -> &'static str {
    if n == 1 { "" } else { "s" }
}

/// Format scan result as JSON with enrichments (grade, finding IDs, obligationIds).
pub fn format_json(result: &ScanResult) -> String {
    let mut value = match serde_json::to_value(result) {
        Ok(v) => v,
        Err(e) => {
            return serde_json::to_string(&serde_json::json!({"error": e.to_string()}))
                .unwrap_or_default();
        }
    };

    // Add grade object
    let compliance_grade = colors::resolve_grade(result.score.total_score);
    let grade_obj = serde_json::json!({
        "compliance": compliance_grade,
    });
    if let Some(obj) = value.as_object_mut() {
        obj.insert("grade".to_string(), grade_obj);
    }

    // Sort findings by severity and add IDs + obligationIds
    if let Some(findings_arr) = value.get_mut("findings").and_then(|v| v.as_array_mut()) {
        // Sort by severity key
        findings_arr.sort_by(|a, b| {
            let sa =
                severity_sort_key(a.get("severity").and_then(|v| v.as_str()).unwrap_or("info"));
            let sb =
                severity_sort_key(b.get("severity").and_then(|v| v.as_str()).unwrap_or("info"));
            sa.cmp(&sb)
        });

        for (i, finding) in findings_arr.iter_mut().enumerate() {
            if let Some(obj) = finding.as_object_mut() {
                // Add finding ID
                obj.insert(
                    "id".to_string(),
                    serde_json::json!(format!("F-{:03}", i + 1)),
                );

                // Map obligationId → obligationIds array
                if let Some(oblig_id) = obj
                    .get("obligationId")
                    .and_then(|v| v.as_str())
                    .map(String::from)
                    && !oblig_id.is_empty()
                {
                    obj.insert("obligationIds".to_string(), serde_json::json!([oblig_id]));
                }
            }
        }
    }

    serde_json::to_string_pretty(&value).unwrap_or_else(|e| format!("{{\"error\": \"{e}\"}}"))
}

/// Map severity string to sort key for JSON output.
fn severity_sort_key(sev: &str) -> u8 {
    match sev {
        "critical" => 0,
        "high" => 1,
        "medium" => 2,
        "low" => 3,
        "info" => 4,
        _ => 5,
    }
}

/// Format scan result as SARIF v2.1.0.
#[allow(clippy::cast_precision_loss)]
pub fn format_sarif(result: &ScanResult) -> String {
    let rules: Vec<serde_json::Value> = result
        .findings
        .iter()
        .map(|f| {
            serde_json::json!({
                "id": f.check_id,
                "shortDescription": { "text": f.message },
                "defaultConfiguration": {
                    "level": sarif_level(&f.severity)
                }
            })
        })
        .collect();

    let results: Vec<serde_json::Value> = result
        .findings
        .iter()
        .map(|f| {
            serde_json::json!({
                "ruleId": f.check_id,
                "message": { "text": f.message },
                "level": sarif_level(&f.severity),
                "properties": {
                    "severity": f.severity.as_str(),
                    "type": f.r#type
                }
            })
        })
        .collect();

    let sarif = serde_json::json!({
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "complior",
                    "version": env!("CARGO_PKG_VERSION"),
                    "informationUri": "https://complior.eu",
                    "rules": rules
                }
            },
            "results": results,
            "properties": {
                "complianceScore": result.score.total_score,
                "zone": format!("{:?}", result.score.zone).to_lowercase(),
                "totalChecks": result.score.total_checks,
                "passedChecks": result.score.passed_checks,
                "failedChecks": result.score.failed_checks
            }
        }]
    });

    serde_json::to_string_pretty(&sarif).unwrap_or_else(|e| format!("{{\"error\": \"{e}\"}}"))
}

/// Map Severity to SARIF level string.
pub(super) const fn sarif_level(severity: &Severity) -> &'static str {
    match severity {
        Severity::Critical | Severity::High => "error",
        Severity::Medium => "warning",
        Severity::Low | Severity::Info => "note",
    }
}

// ── Pager ────────────────────────────────────────────────────────

/// Print text through a pager (`less`) when stdout is a TTY and output is long.
/// Falls back to plain stdout if pager is unavailable or stdout is piped.
pub fn print_paged(text: &str) {
    if !std::io::stdout().is_terminal() {
        print!("{text}");
        return;
    }

    let term_height = crossterm::terminal::size()
        .map(|(_, h)| h as usize)
        .unwrap_or(24);
    let line_count = text.lines().count();
    if line_count <= term_height.saturating_sub(2) {
        print!("{text}");
        return;
    }

    let pager = std::env::var("PAGER").unwrap_or_else(|_| "less".into());
    match std::process::Command::new(&pager)
        .args(if pager.contains("less") {
            vec!["-R"]
        } else {
            vec![]
        })
        .stdin(std::process::Stdio::piped())
        .spawn()
    {
        Ok(mut child) => {
            if let Some(ref mut stdin) = child.stdin {
                let _ = stdin.write_all(text.as_bytes());
            }
            child.stdin.take();
            let _ = child.wait();
        }
        Err(_) => {
            print!("{text}");
        }
    }
}
