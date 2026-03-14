use std::collections::BTreeMap;
use std::io::Write as _;

use crate::types::{CheckResultType, Finding, ScanResult, Severity};

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

// ── Pager ───────────────────────────────────────────────────────────

/// Print text through a pager (`less`) when stdout is a TTY and output is long.
/// Falls back to plain stdout if pager is unavailable or stdout is piped.
pub fn print_paged(text: &str) {
    use std::io::IsTerminal as _;

    // If stdout is not a terminal (piped/redirected), just print
    if !std::io::stdout().is_terminal() {
        print!("{text}");
        return;
    }

    // If output is short enough, don't bother with pager
    let term_height = crossterm::terminal::size().map(|(_, h)| h as usize).unwrap_or(24);
    let line_count = text.lines().count();
    if line_count <= term_height.saturating_sub(2) {
        print!("{text}");
        return;
    }

    // Try to spawn pager: less -RFX (colors, quit-if-short, no-clear)
    let pager = std::env::var("PAGER").unwrap_or_else(|_| "less".into());
    match std::process::Command::new(&pager)
        .args(if pager.contains("less") { vec!["-RFX"] } else { vec![] })
        .stdin(std::process::Stdio::piped())
        .spawn()
    {
        Ok(mut child) => {
            if let Some(ref mut stdin) = child.stdin {
                let _ = stdin.write_all(text.as_bytes());
            }
            // Drop stdin to signal EOF, then wait
            child.stdin.take();
            let _ = child.wait();
        }
        Err(_) => {
            // Pager not available — fall back to stdout
            print!("{text}");
        }
    }
}

// ── Human-readable output ──────────────────────────────────────────

const BAR_WIDTH: usize = 30;
/// Max individual rows to show per check_id before collapsing.
const MAX_PER_CHECK: usize = 3;

/// Format scan result as structured human-readable text.
#[allow(clippy::cast_precision_loss, clippy::too_many_lines)]
pub fn format_human(result: &ScanResult) -> String {
    let score = result.score.total_score;
    let zone = format!("{:?}", result.score.zone);

    let mut o = String::with_capacity(4096);

    // ── Header ──────────────────────────────────────────────────
    o.push('\n');
    o.push_str("  Complior — EU AI Act Compliance Scan\n");
    o.push_str(&format!("  {}\n", "─".repeat(50)));

    // ── Score bar ───────────────────────────────────────────────
    let filled = ((score / 100.0) * BAR_WIDTH as f64).round() as usize;
    let empty = BAR_WIDTH.saturating_sub(filled);
    let bar = format!("{}{}", "█".repeat(filled), "░".repeat(empty));
    o.push_str(&format!("  Score:  {bar}  {score:.0}/100 ({zone})\n"));

    // ── Summary stats ───────────────────────────────────────────
    o.push_str(&format!(
        "  Checks: {} passed  {} failed  {} skipped  ({} total)\n",
        result.score.passed_checks,
        result.score.failed_checks,
        result.score.skipped_checks,
        result.score.total_checks,
    ));
    o.push_str(&format!(
        "  Files:  {} scanned in {}ms\n",
        result.files_scanned, result.duration,
    ));

    // Partition findings
    let failures: Vec<&Finding> = result
        .findings
        .iter()
        .filter(|f| f.r#type == CheckResultType::Fail)
        .collect();
    let passes: Vec<&Finding> = result
        .findings
        .iter()
        .filter(|f| f.r#type == CheckResultType::Pass)
        .collect();

    // ── Severity breakdown ──────────────────────────────────────
    if !failures.is_empty() {
        let critical = failures.iter().filter(|f| f.severity == Severity::Critical).count();
        let high = failures.iter().filter(|f| f.severity == Severity::High).count();
        let medium = failures.iter().filter(|f| f.severity == Severity::Medium).count();
        let low = failures.iter().filter(|f| f.severity == Severity::Low).count();

        o.push('\n');
        o.push_str("  Severity Breakdown\n");
        if critical > 0 { o.push_str(&format!("  !! CRITICAL  {critical}\n")); }
        if high > 0     { o.push_str(&format!("   ! HIGH      {high}\n")); }
        if medium > 0   { o.push_str(&format!("   ~ MEDIUM    {medium}\n")); }
        if low > 0      { o.push_str(&format!("   - LOW       {low}\n")); }
    }

    // ── Failed findings table (with dedup) ──────────────────────
    if !failures.is_empty() {
        let mut sorted = failures.clone();
        sorted.sort_by_key(|f| match f.severity {
            Severity::Critical => 0,
            Severity::High => 1,
            Severity::Medium => 2,
            Severity::Low => 3,
            Severity::Info => 4,
        });

        let unique_checks: BTreeMap<&str, usize> = {
            let mut m = BTreeMap::new();
            for f in &sorted { *m.entry(f.check_id.as_str()).or_insert(0) += 1; }
            m
        };

        o.push('\n');
        o.push_str(&format!(
            "  Issues ({} findings, {} unique)\n",
            failures.len(), unique_checks.len()
        ));
        o.push_str(&format!("  {}\n", "─".repeat(76)));
        o.push_str(&format!("  {:<10} {:<35} {}\n", "SEVERITY", "WHAT", "WHY"));
        o.push_str(&format!("  {}\n", "─".repeat(76)));

        let mut seen: BTreeMap<&str, usize> = BTreeMap::new();
        for f in &sorted {
            let count = seen.entry(f.check_id.as_str()).or_insert(0);
            *count += 1;
            let total = unique_checks[f.check_id.as_str()];

            if *count <= MAX_PER_CHECK {
                let sev = severity_label(&f.severity);
                let what = check_label(&f.check_id);
                let why = finding_why(f);
                o.push_str(&format!("  {sev:<10} {what:<35} {why}\n"));
            } else if *count == MAX_PER_CHECK + 1 {
                let remaining = total - MAX_PER_CHECK;
                o.push_str(&format!(
                    "  {:<10} {:<35} ... and {remaining} more\n",
                    "", check_label(&f.check_id),
                ));
            }
        }
        o.push_str(&format!("  {}\n", "─".repeat(76)));
    }

    // ── Passed checks (collapsed by check_id) ──────────────────
    if !passes.is_empty() {
        let mut pass_groups: Vec<(&str, usize, &str)> = Vec::new();
        let mut pass_map: BTreeMap<&str, (usize, &str)> = BTreeMap::new();
        for f in &passes {
            let entry = pass_map.entry(f.check_id.as_str()).or_insert((0, &f.message));
            entry.0 += 1;
        }
        let mut seen_pass: BTreeMap<&str, bool> = BTreeMap::new();
        for f in &passes {
            if !seen_pass.contains_key(f.check_id.as_str()) {
                let (cnt, msg) = pass_map[f.check_id.as_str()];
                pass_groups.push((f.check_id.as_str(), cnt, msg));
                seen_pass.insert(f.check_id.as_str(), true);
            }
        }

        o.push('\n');
        o.push_str(&format!(
            "  Passed ({} checks, {} unique)\n",
            passes.len(), pass_groups.len()
        ));
        o.push_str(&format!("  {}\n", "─".repeat(76)));

        for (check_id, count, _msg) in &pass_groups {
            let label = check_label(check_id);
            let suffix = if *count > 1 { format!(" (x{count})") } else { String::new() };
            o.push_str(&format!("  PASS      {label:<35} OK{suffix}\n"));
        }
        o.push_str(&format!("  {}\n", "─".repeat(76)));
    }

    // ── Actionable fix suggestions (collapsed by check_id) ─────
    {
        let mut fix_groups: Vec<(&str, &str, usize)> = Vec::new();
        let mut fix_counts: BTreeMap<&str, (usize, &str)> = BTreeMap::new();
        let mut fix_order: Vec<&str> = Vec::new();
        for f in &failures {
            if let Some(ref fix) = f.fix {
                let entry = fix_counts.entry(f.check_id.as_str()).or_insert((0, fix.as_str()));
                entry.0 += 1;
                if entry.0 == 1 { fix_order.push(f.check_id.as_str()); }
            }
        }
        for check_id in &fix_order {
            let (count, fix_text) = fix_counts[check_id];
            fix_groups.push((check_id, fix_text, count));
        }

        if !fix_groups.is_empty() {
            o.push('\n');
            o.push_str(&format!("  How to Fix ({} actions)\n", fix_groups.len()));
            o.push_str(&format!("  {}\n", "─".repeat(76)));
            for (check_id, fix_text, count) in &fix_groups {
                let label = check_label(check_id);
                let cnt = if *count > 1 { format!(" (x{count})") } else { String::new() };
                o.push_str(&format!("  {label:<35} {fix_text}{cnt}\n"));
            }
            o.push_str(&format!("  {}\n", "─".repeat(76)));
        }
    }

    // ── Footer ──────────────────────────────────────────────────
    o.push('\n');
    if score >= 80.0 {
        o.push_str("  Status: COMPLIANT — Ready for EU AI Act deployment\n");
    } else if score >= 50.0 {
        o.push_str("  Status: PARTIAL — Address HIGH/CRITICAL findings before deployment\n");
    } else {
        o.push_str("  Status: NON-COMPLIANT — Significant gaps remain\n");
    }
    o.push_str("  Run `complior fix` to auto-generate missing documents\n");
    o.push('\n');

    o
}

// ── Helpers ─────────────────────────────────────────────────────

fn severity_label(s: &Severity) -> &'static str {
    match s {
        Severity::Critical => "CRITICAL",
        Severity::High => "HIGH",
        Severity::Medium => "MEDIUM",
        Severity::Low => "LOW",
        Severity::Info => "INFO",
    }
}

/// Human-readable label for a check_id.
fn check_label(check_id: &str) -> String {
    let label = match check_id {
        // ── L1: Document & component presence ───────────────
        "ai-disclosure"            => "AI Disclosure Notice",
        "content-marking"          => "Content Marking / Provenance",
        "interaction-logging"      => "Interaction Logging",
        "ai-literacy"              => "AI Literacy Training Policy",
        "ai-literacy-stale"        => "AI Literacy Training Overdue",
        "ai-literacy-incomplete"   => "AI Literacy Training Incomplete",
        "gpai-transparency"        => "GPAI Transparency Docs",
        "compliance-metadata"      => "Compliance Metadata",
        "documentation"            => "Compliance Documentation",
        "passport-presence"        => "Agent Passport",
        "passport-completeness"    => "Passport Completeness",
        "undeclared-permission"    => "Undeclared Code Permission",
        "unused-declared-permission" => "Unused Passport Permission",
        "behavioral-constraints"   => "Behavioral Constraints",
        "industry-detection"       => "Industry Risk Detection",
        "fria"                     => "Fundamental Rights Assessment",
        "art5-screening"           => "Prohibited Practices Screening",
        "technical-documentation"  => "Technical Documentation",
        "incident-report"          => "Incident Report Template",
        "declaration-of-conformity"=> "Declaration of Conformity",
        "monitoring-policy"        => "Post-Market Monitoring Policy",
        "worker-notification"      => "Worker AI Notification",
        "risk-management"          => "Risk Management System",
        "data-governance"          => "Data Governance Policy",
        "qms"                      => "Quality Management System",
        "instructions-for-use"     => "Instructions for Use",

        // ── L2: Document structure validation ───────────────
        "l2-fria"                  => "FRIA Structure Validation",
        "l2-art5-screening"        => "Art. 5 Screening Structure",
        "l2-tech-documentation"    => "Tech Docs Structure",
        "l2-incident-report"       => "Incident Report Structure",
        "l2-declaration-conformity"=> "Declaration Structure",
        "l2-monitoring-policy"     => "Monitoring Policy Structure",
        "l2-worker-notification"   => "Worker Notification Structure",
        "l2-ai-literacy"           => "AI Literacy Doc Structure",
        "l2-risk-management"       => "Risk Mgmt Doc Structure",
        "l2-data-governance"       => "Data Governance Doc Structure",
        "l2-qms"                   => "QMS Doc Structure",
        "l2-instructions-for-use"  => "Instructions Structure",

        // ── L3: Dependencies & configuration ────────────────
        "l3-dep-scan"              => "Dependency Analysis",
        "l3-dep-license"           => "Dependency License Check",
        "l3-dep-vuln"              => "Dependency Vulnerability",
        "l3-ai-sdk-detected"       => "AI SDK Detected",
        "l3-missing-bias-testing"  => "Bias Testing Missing",
        "l3-log-retention"         => "Log Retention Policy",
        "l3-env-config"            => "Environment Configuration",
        "l3-ci-compliance"         => "CI/CD Compliance Check",

        // ── L4: Code patterns & security ────────────────────
        "l4-bare-llm"              => "Bare LLM API Call (no SDK)",
        "l4-security-risk"         => "Security Vulnerability",
        "l4-human-oversight"       => "Human Oversight Mechanism",
        "l4-conformity-assessment" => "Conformity Assessment",
        "l4-disclosure"            => "AI Disclosure in Code",
        "l4-kill-switch"           => "Kill Switch / Feature Flag",
        "l4-logging"               => "AI Interaction Logging",
        "l4-content-marking"       => "Content Watermarking",
        "l4-data-governance"       => "Data Governance",
        "l4-accuracy-robustness"   => "Accuracy & Robustness Testing",
        "l4-gpai-transparency"     => "GPAI Model Documentation",
        "l4-deployer-monitoring"   => "Deployer Monitoring",
        "l4-record-keeping"        => "Record Keeping / Audit Trail",
        "l4-cybersecurity"         => "Cybersecurity Controls",
        "l4-nhi-clean"             => "Non-Human Identity Secrets",

        // ── Cross-layer verification ────────────────────────
        "cross-doc-code-mismatch"  => "Docs ↔ Code Mismatch",
        "cross-sdk-no-disclosure"  => "SDK Without Disclosure",
        "cross-banned-with-wrapper"=> "Prohibited Pkg + Controls",
        "cross-logging-no-retention"=> "Logging Without Retention",
        "cross-kill-switch-no-test"=> "Kill Switch Without Tests",
        "cross-passport-code-mismatch" => "Passport ↔ Code Mismatch",
        "cross-permission-passport-mismatch" => "Permission ↔ Passport Mismatch",

        // ── Dynamic patterns (prefix match) ─────────────────
        _ => return check_label_dynamic(check_id),
    };
    truncate(label, 33)
}

/// Handle dynamic check_ids (l3-banned-*, l4-nhi-*, industry-*).
fn check_label_dynamic(check_id: &str) -> String {
    if let Some(pkg) = check_id.strip_prefix("l3-banned-") {
        return truncate(&format!("Prohibited Package: {pkg}"), 33);
    }
    if let Some(cat) = check_id.strip_prefix("l4-nhi-") {
        return truncate(&format!("NHI Secret: {cat}"), 33);
    }
    if let Some(industry) = check_id.strip_prefix("industry-") {
        return truncate(&format!("Industry Risk: {industry}"), 33);
    }
    if let Some(doc) = check_id.strip_prefix("l2-") {
        return truncate(&format!("{} Structure", humanize_kebab(doc)), 33);
    }
    // Final fallback
    humanize_check_id(check_id)
}

/// Convert kebab-case to Title Case.
fn humanize_kebab(s: &str) -> String {
    s.split('-')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => format!("{}{}", c.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Convert a kebab-case check_id to Title Case as fallback.
fn humanize_check_id(id: &str) -> String {
    // Strip common prefixes
    let stripped = id
        .strip_prefix("l1-").or_else(|| id.strip_prefix("l2-"))
        .or_else(|| id.strip_prefix("l3-")).or_else(|| id.strip_prefix("l4-"))
        .or_else(|| id.strip_prefix("l5-")).or_else(|| id.strip_prefix("cross-"))
        .unwrap_or(id);

    let words: Vec<String> = stripped
        .split('-')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => format!("{}{}", c.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect();

    truncate(&words.join(" "), 33)
}

/// Build a concise "why" description for a failed finding.
fn finding_why(f: &Finding) -> String {
    // Extract the essential info: article + file location
    let mut meta: Vec<String> = Vec::new();

    if let Some(ref art) = f.article_reference {
        meta.push(art.clone());
    }
    if let Some(ref file) = f.file {
        if let Some(line) = f.line {
            meta.push(format!("{file}:{line}"));
        } else {
            meta.push(file.clone());
        }
    }

    // Build a clean message, stripping redundant article references
    let msg = clean_message(&f.message, f.article_reference.as_deref());

    if meta.is_empty() {
        truncate(&msg, 38)
    } else {
        let meta_str = meta.join(" | ");
        let avail = 38usize.saturating_sub(meta_str.len() + 3);
        if avail < 8 {
            truncate(&meta_str, 38)
        } else {
            let m = truncate(&msg, avail);
            format!("{m} ({meta_str})")
        }
    }
}

/// Strip article references and technical noise from a finding message.
fn clean_message(msg: &str, article: Option<&str>) -> String {
    let mut clean = msg.to_string();
    // Remove trailing "(Art. XX)" if already shown separately
    if let Some(art) = article {
        let pattern = format!("({art})");
        clean = clean.replace(&pattern, "").trim().to_string();
        // Also remove " — Art. XX" style
        let dash_pattern = format!("— {art}");
        clean = clean.replace(&dash_pattern, "").trim().to_string();
    }
    // Remove leading "No " for cleaner reading (the SEVERITY column implies failure)
    if clean.starts_with("No ") {
        clean = format!("Missing: {}", &clean[3..]);
    }
    clean
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else if max > 3 {
        format!("{}...", &s[..max - 3])
    } else {
        s[..max].to_string()
    }
}

/// Map Severity to SARIF level string.
pub(super) fn sarif_level(severity: &Severity) -> &'static str {
    match severity {
        Severity::Critical | Severity::High => "error",
        Severity::Medium => "warning",
        Severity::Low | Severity::Info => "note",
    }
}
