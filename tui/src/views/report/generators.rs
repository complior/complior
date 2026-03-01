use crate::types::ScanResult;

/// Report generator definition.
#[derive(Debug, Clone)]
pub struct ReportGenerator {
    pub key: char,
    pub name: &'static str,
    pub article: &'static str,
    pub description: &'static str,
    pub duration: &'static str,
}

/// All 9 report generators per spec Section 7.2.
pub const GENERATORS: &[ReportGenerator] = &[
    ReportGenerator { key: '1', name: "Audit Package", article: "All", description: "ZIP with all compliance docs", duration: "~60 sec" },
    ReportGenerator { key: '2', name: "FRIA Draft", article: "Art. 27", description: "Impact assessment (per-system)", duration: "~30 sec" },
    ReportGenerator { key: '3', name: "Risk Management Plan", article: "Art. 9", description: "Risk register (per-system)", duration: "~20 sec" },
    ReportGenerator { key: '4', name: "QMS Template", article: "Art. 17", description: "Quality management system", duration: "~15 sec" },
    ReportGenerator { key: '5', name: "Monitoring Plan", article: "Art. 72", description: "Post-market monitoring", duration: "~10 sec" },
    ReportGenerator { key: '6', name: "Worker Notification", article: "Art. 26(7)", description: "Employee notice", duration: "~10 sec" },
    ReportGenerator { key: '7', name: "Incident Report", article: "Art. 73", description: "Incident template", duration: "~10 sec" },
    ReportGenerator { key: '8', name: "EU DB Pre-fill", article: "Art. 49", description: "Database registration fields", duration: "~5 sec" },
    ReportGenerator { key: '9', name: "AESIA Excel Export", article: "AESIA", description: "12 Spanish regulator checklists", duration: "~30 sec" },
];

/// Map zone to human-readable label.
pub fn zone_label(zone: crate::types::Zone) -> &'static str {
    match zone {
        crate::types::Zone::Green => "GREEN (Compliant)",
        crate::types::Zone::Yellow => "YELLOW (Partial)",
        crate::types::Zone::Red => "RED (Non-compliant)",
    }
}

/// Generate compliance report as Markdown.
pub fn generate_report_markdown(scan: &ScanResult) -> String {
    let mut md = String::new();
    let zone = zone_label(scan.score.zone);

    md.push_str("# Compliance Report\n\n");

    // Executive Summary
    md.push_str("## Executive Summary\n\n");
    md.push_str(&format!(
        "- **Score:** {:.0}/100\n",
        scan.score.total_score
    ));
    md.push_str(&format!("- **Zone:** {zone}\n"));
    md.push_str(&format!("- **Project:** {}\n", scan.project_path));
    md.push_str(&format!("- **Scanned:** {}\n", scan.scanned_at));
    md.push_str(&format!("- **Files scanned:** {}\n", scan.files_scanned));
    md.push_str(&format!("- **Duration:** {}ms\n", scan.duration));
    md.push_str(&format!(
        "- **Checks:** {} total, {} passed, {} failed, {} skipped\n\n",
        scan.score.total_checks,
        scan.score.passed_checks,
        scan.score.failed_checks,
        scan.score.skipped_checks,
    ));

    // Category Scores
    if !scan.score.category_scores.is_empty() {
        md.push_str("## Category Scores\n\n");
        md.push_str("| Category | Score | Passed | Failed |\n");
        md.push_str("|----------|------:|-------:|-------:|\n");
        for cat in &scan.score.category_scores {
            let failed = cat.obligation_count.saturating_sub(cat.passed_count);
            md.push_str(&format!(
                "| {} | {:.0}% | {} | {} |\n",
                cat.category, cat.score, cat.passed_count, failed,
            ));
        }
        md.push('\n');
    }

    // Critical Findings
    let critical: Vec<_> = scan
        .findings
        .iter()
        .filter(|f| matches!(f.severity, crate::types::Severity::Critical))
        .collect();

    if !critical.is_empty() {
        md.push_str("## Critical Findings\n\n");
        for f in &critical {
            let obl = f.obligation_id.as_deref().unwrap_or("N/A");
            let art = f.article_reference.as_deref().unwrap_or("N/A");
            md.push_str(&format!("### {obl}: {}\n\n", f.message));
            md.push_str(&format!("- **Article:** {art}\n"));
            md.push_str("- **Severity:** CRITICAL\n");
            if let Some(fix) = &f.fix {
                md.push_str(&format!("- **Fix:** {fix}\n"));
            }
            md.push('\n');
        }
    }

    // All Findings
    md.push_str("## All Findings\n\n");
    if scan.findings.is_empty() {
        md.push_str("No findings. All checks passed.\n\n");
    } else {
        md.push_str("| # | Check ID | Severity | Message |\n");
        md.push_str("|--:|----------|----------|--------|\n");
        for (i, f) in scan.findings.iter().enumerate() {
            md.push_str(&format!(
                "| {} | {} | {:?} | {} |\n",
                i + 1,
                f.check_id,
                f.severity,
                f.message,
            ));
        }
        md.push('\n');
    }

    // Remediation Plan
    let fixable: Vec<_> = scan.findings.iter().filter(|f| f.fix.is_some()).collect();
    if !fixable.is_empty() {
        md.push_str("## Remediation Plan\n\n");
        for (i, f) in fixable.iter().enumerate() {
            let obl = f.obligation_id.as_deref().unwrap_or("N/A");
            md.push_str(&format!(
                "{}. **{obl}** — {} -> {}\n",
                i + 1,
                f.message,
                f.fix.as_deref().unwrap_or(""),
            ));
        }
        md.push('\n');
    }

    md.push_str("---\n\n");
    md.push_str("*Generated by Complior — EU AI Act Compliance Tool*\n");

    md
}

/// Export report to a Markdown file.
pub async fn export_report(scan: &ScanResult) -> Result<String, String> {
    let md = generate_report_markdown(scan);

    // Generate filename with date
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let days = now / 86400;
    // Approximate date for filename
    let year = 1970 + days / 365;
    let remaining = days % 365;
    let month = remaining / 30 + 1;
    let day = remaining % 30 + 1;
    let filename = format!("COMPLIANCE-REPORT-{year}-{month:02}-{day:02}.md");

    tokio::fs::write(&filename, &md)
        .await
        .map_err(|e| format!("Failed to write {filename}: {e}"))?;
    Ok(filename)
}
