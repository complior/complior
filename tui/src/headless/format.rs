use crate::types::{ScanResult, Severity};

/// Format scan result as JSON.
pub fn format_json(result: &ScanResult) -> String {
    serde_json::to_string_pretty(result).unwrap_or_else(|e| format!("{{\"error\": \"{e}\"}}"))
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
                    "severity": format!("{:?}", f.severity).to_lowercase(),
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

/// Format scan result as human-readable text.
#[allow(clippy::cast_precision_loss)]
pub fn format_human(result: &ScanResult) -> String {
    let score = result.score.total_score;
    let zone = format!("{:?}", result.score.zone);

    let mut out = String::new();
    out.push_str(&format!("Score: {score:.0}/100 ({zone})\n"));
    out.push_str(&format!(
        "Checks: {} total, {} passed, {} failed, {} skipped\n",
        result.score.total_checks,
        result.score.passed_checks,
        result.score.failed_checks,
        result.score.skipped_checks
    ));
    out.push_str(&format!(
        "Files scanned: {} in {}ms\n",
        result.files_scanned, result.duration
    ));

    if !result.findings.is_empty() {
        out.push('\n');
        out.push_str(&format!("Findings ({}):\n", result.findings.len()));

        let critical = result.findings.iter().filter(|f| f.severity == Severity::Critical).count();
        let high = result.findings.iter().filter(|f| f.severity == Severity::High).count();
        let medium = result.findings.iter().filter(|f| f.severity == Severity::Medium).count();
        let low = result.findings.iter().filter(|f| f.severity == Severity::Low).count();

        if critical > 0 { out.push_str(&format!("  CRITICAL: {critical}\n")); }
        if high > 0 { out.push_str(&format!("  HIGH: {high}\n")); }
        if medium > 0 { out.push_str(&format!("  MEDIUM: {medium}\n")); }
        if low > 0 { out.push_str(&format!("  LOW: {low}\n")); }

        out.push('\n');
        for f in &result.findings {
            let sev = format!("{:?}", f.severity).to_uppercase();
            out.push_str(&format!("  [{sev}] {}: {}\n", f.check_id, f.message));
        }
    } else {
        out.push_str("\nNo findings. Great job!\n");
    }

    out
}

/// Map Severity to SARIF level string.
pub(super) fn sarif_level(severity: &Severity) -> &'static str {
    match severity {
        Severity::Critical | Severity::High => "error",
        Severity::Medium => "warning",
        Severity::Low | Severity::Info => "note",
    }
}
