//! Scan output formatting: JSON, SARIF, and human-readable.

mod colors;
mod human;
mod labels;
mod layers;

use std::io::IsTerminal as _;
use std::io::Write as _;

use crate::types::{FrameworkScoreResult, ScanResult, Severity};

// ── Public API ───────────────────────────────────────────────────

/// Options for customizing human-readable scan output.
pub struct FormatOptions {
    /// Framework scores from multi-framework scoring (EU AI Act, OWASP, MITRE).
    pub framework_scores: Option<Vec<FrameworkScoreResult>>,
}

pub use human::format_human;

/// Format scan result as JSON.
pub fn format_json(result: &ScanResult) -> String {
    serde_json::to_string_pretty(result).unwrap_or_else(|e| {
        serde_json::to_string(&serde_json::json!({"error": e.to_string()}))
            .unwrap_or_default()
    })
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
pub(super) fn sarif_level(severity: &Severity) -> &'static str {
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

    let term_height = crossterm::terminal::size().map(|(_, h)| h as usize).unwrap_or(24);
    let line_count = text.lines().count();
    if line_count <= term_height.saturating_sub(2) {
        print!("{text}");
        return;
    }

    let pager = std::env::var("PAGER").unwrap_or_else(|_| "less".into());
    match std::process::Command::new(&pager)
        .args(if pager.contains("less") { vec!["-R"] } else { vec![] })
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
