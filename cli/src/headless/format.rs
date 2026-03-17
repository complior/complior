use std::collections::BTreeMap;
use std::io::Write as _;

use crate::types::{CheckResultType, Finding, FindingType, ScanResult, Severity};

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

// ── Data extraction ─────────────────────────────────────────────────

pub(super) struct DetectedSdk {
    pub(super) name: String,
    pub(super) version: String,
}

struct ComplianceMechanism {
    label: String,
    location: String,
}

struct ClassifiedFindings<'a> {
    sdks: Vec<DetectedSdk>,
    mechanisms: Vec<ComplianceMechanism>,
    missing_docs: Vec<&'a Finding>,
    code_config_issues: Vec<&'a Finding>,
}

/// Extract project name from the last path segment.
pub(super) fn project_name(path: &str) -> &str {
    path.rsplit('/').find(|s| !s.is_empty()).unwrap_or(path)
}

/// Parse an `l3-ai-sdk-detected` pass message into a detected SDK.
///
/// Message format: `"AI SDK detected: OpenAI (openai@^4.20.0) in npm"`
pub(super) fn parse_sdk(message: &str) -> Option<DetectedSdk> {
    // Find the name between ": " and " ("
    let after_colon = message.find(": ").map(|i| i + 2)?;
    let paren_open = message[after_colon..].find(" (")?;
    let name = message[after_colon..after_colon + paren_open].to_string();

    // Find version between "@" and ")" inside parens
    let pkg_start = after_colon + paren_open + 2; // skip " ("
    let pkg_end = message[pkg_start..].find(')')?;
    let pkg_str = &message[pkg_start..pkg_start + pkg_end];
    let version = if let Some(at_pos) = pkg_str.rfind('@') {
        pkg_str[at_pos + 1..].trim_start_matches('^').trim_start_matches('~').to_string()
    } else {
        pkg_str.to_string()
    };

    Some(DetectedSdk { name, version })
}

/// Extract file location from an L4 pass message.
///
/// Message format: `"AI disclosure found in src/compliance/disclosure.tsx:3 (Art. 14)"`
/// Returns the file:line portion, or `"clean"` for nhi-clean messages.
pub(super) fn parse_mechanism_location(message: &str, check_id: &str) -> String {
    if check_id == "l4-nhi-clean" {
        return "clean".to_string();
    }
    // Look for " found in " or " found at "
    for marker in &[" found in ", " found at "] {
        if let Some(idx) = message.find(marker) {
            let after = &message[idx + marker.len()..];
            // Take until space or end (strip trailing article reference like " (Art. 14)")
            let end = after.find(" (").unwrap_or(after.len());
            let loc = after[..end].trim();
            if !loc.is_empty() {
                return loc.to_string();
            }
        }
    }
    String::new()
}

/// Classify all findings into structured groups for rendering.
fn classify_findings(findings: &[Finding]) -> ClassifiedFindings<'_> {
    let mut sdks: Vec<DetectedSdk> = Vec::new();
    let mut seen_sdk_names: Vec<String> = Vec::new();
    let mut mechanisms: Vec<ComplianceMechanism> = Vec::new();
    let mut missing_docs: Vec<&Finding> = Vec::new();
    let mut code_config_issues: Vec<&Finding> = Vec::new();

    for f in findings {
        match f.r#type {
            CheckResultType::Pass => {
                // Extract SDKs from l3-ai-sdk-detected
                if f.check_id == "l3-ai-sdk-detected" {
                    if let Some(sdk) = parse_sdk(&f.message) {
                        if !seen_sdk_names.contains(&sdk.name) {
                            seen_sdk_names.push(sdk.name.clone());
                            sdks.push(sdk);
                        }
                    }
                }
                // Extract compliance mechanisms from l4-* pass findings
                if f.check_id.starts_with("l4-") && f.message.contains(" found") {
                    let label = check_label(&f.check_id);
                    let location = parse_mechanism_location(&f.message, &f.check_id);
                    mechanisms.push(ComplianceMechanism { label, location });
                }
                // l4-nhi-clean gets special treatment as a mechanism
                if f.check_id == "l4-nhi-clean" && !f.message.contains(" found") {
                    mechanisms.push(ComplianceMechanism {
                        label: "Secrets Scan".to_string(),
                        location: "clean".to_string(),
                    });
                }
            }
            CheckResultType::Fail => {
                match f.finding_type() {
                    FindingType::B => missing_docs.push(f),
                    FindingType::A | FindingType::C => code_config_issues.push(f),
                }
            }
            CheckResultType::Skip => {}
        }
    }

    // Sort each fail group by severity
    let sev_ord = |f: &&Finding| match f.severity {
        Severity::Critical => 0,
        Severity::High => 1,
        Severity::Medium => 2,
        Severity::Low => 3,
        Severity::Info => 4,
    };
    missing_docs.sort_by_key(sev_ord);
    code_config_issues.sort_by_key(sev_ord);

    ClassifiedFindings { sdks, mechanisms, missing_docs, code_config_issues }
}

// ── Human-readable output ──────────────────────────────────────────

const BAR_WIDTH: usize = 20;
const CAT_BAR_WIDTH: usize = 20;
/// Max individual rows to show per check_id before collapsing.
const MAX_PER_CHECK: usize = 3;

/// Format scan result as structured human-readable text.
#[allow(clippy::cast_precision_loss)]
pub fn format_human(result: &ScanResult) -> String {
    let classified = classify_findings(&result.findings);
    let mut o = String::with_capacity(8192);

    render_header(&mut o, result);
    render_score_bar(&mut o, result);
    render_severity_summary(&mut o, &classified);
    render_deadline_countdown(&mut o);
    render_ai_stack(&mut o, result, &classified);
    render_whats_in_place(&mut o, &classified);
    render_whats_missing(&mut o, &classified);
    render_category_breakdown(&mut o, result);
    render_fix_roadmap(&mut o, &classified);
    render_footer(&mut o, result, &classified);

    o
}

fn render_header(o: &mut String, result: &ScanResult) {
    let name = project_name(&result.project_path);
    o.push('\n');
    o.push_str(&format!("  Complior — {name}\n"));
    o.push_str(&format!("  {}\n\n", "─".repeat(50)));
}

#[allow(clippy::cast_precision_loss)]
fn render_score_bar(o: &mut String, result: &ScanResult) {
    let score = result.score.total_score;
    let zone = format!("{:?}", result.score.zone).to_lowercase();
    let filled = ((score / 100.0) * BAR_WIDTH as f64).round() as usize;
    let empty = BAR_WIDTH.saturating_sub(filled);
    let bar = format!("{}{}", "█".repeat(filled), "░".repeat(empty));
    o.push_str(&format!("  Score:  {bar}  {score:.0}/100 ({zone})\n"));

    if result.score.critical_cap_applied {
        o.push_str("  !! Score capped — critical violations limit maximum achievable score\n");
    }
}

fn render_severity_summary(o: &mut String, classified: &ClassifiedFindings<'_>) {
    let all_fails: Vec<&&Finding> = classified.missing_docs.iter()
        .chain(classified.code_config_issues.iter())
        .collect();
    if all_fails.is_empty() {
        return;
    }

    let mut critical = 0u32;
    let mut high = 0u32;
    let mut medium = 0u32;
    let mut low = 0u32;
    for f in &all_fails {
        match f.severity {
            Severity::Critical => critical += 1,
            Severity::High => high += 1,
            Severity::Medium => medium += 1,
            Severity::Low | Severity::Info => low += 1,
        }
    }

    let mut parts: Vec<String> = Vec::new();
    if critical > 0 { parts.push(format!("{critical} critical")); }
    if high > 0 { parts.push(format!("{high} high")); }
    if medium > 0 { parts.push(format!("{medium} medium")); }
    if low > 0 { parts.push(format!("{low} low")); }

    let with_fix_diff = all_fails.iter().filter(|f| f.fix_diff.is_some()).count();
    let with_fix = all_fails.iter().filter(|f| f.fix.is_some()).count();
    let manual = all_fails.len() - with_fix;

    o.push_str(&format!("  Findings: {}\n", parts.join(" | ")));
    o.push_str(&format!(
        "  Fixable:  {} auto-fixable, {} with suggestions, {} manual\n",
        with_fix_diff, with_fix.saturating_sub(with_fix_diff), manual
    ));
}

/// EU AI Act enforcement: Aug 2, 2026. Show days remaining.
fn render_deadline_countdown(o: &mut String) {
    // Target: 2026-08-02 (EU AI Act full enforcement)
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // 2026-08-02 00:00:00 UTC = 1785369600
    const ENFORCEMENT_EPOCH: u64 = 1_785_369_600;
    if now < ENFORCEMENT_EPOCH {
        let days_left = (ENFORCEMENT_EPOCH - now) / 86400;
        o.push_str(&format!("  Deadline: EU AI Act enforcement in {days_left} days (Aug 2, 2026)\n"));
    }
}

fn render_ai_stack(o: &mut String, result: &ScanResult, classified: &ClassifiedFindings<'_>) {
    o.push('\n');
    o.push_str("  Your AI Stack\n");
    o.push_str(&format!("  {}\n", "─".repeat(50)));

    if classified.sdks.is_empty() {
        o.push_str("  No AI SDKs detected in dependencies\n");
    } else {
        // Group SDKs into lines of up to 3
        let sdk_strings: Vec<String> = classified.sdks.iter()
            .map(|s| format!("{} v{}", s.name, s.version))
            .collect();
        for chunk in sdk_strings.chunks(3) {
            o.push_str(&format!("  {}\n", chunk.join(", ")));
        }
    }
    o.push_str(&format!("  {} files scanned in {:.1}s\n", result.files_scanned, result.duration as f64 / 1000.0));
}

fn render_whats_in_place(o: &mut String, classified: &ClassifiedFindings<'_>) {
    if classified.mechanisms.is_empty() {
        return;
    }
    let count = classified.mechanisms.len();
    o.push('\n');

    // Header with right-aligned count
    let header = "What's in Place";
    let count_str = format!("{count} mechanisms");
    let total_width: usize = 60;
    let used = header.len();
    let pad = total_width.saturating_sub(used);
    o.push_str(&format!("  {header}{count_str:>pad$}\n"));
    o.push_str(&format!("  {}\n", "─".repeat(50)));

    for m in &classified.mechanisms {
        let label_width = 25;
        o.push_str(&format!("  {:<label_width$} {}\n", m.label, m.location));
    }
}

fn render_whats_missing(o: &mut String, classified: &ClassifiedFindings<'_>) {
    let total_missing = classified.missing_docs.len() + classified.code_config_issues.len();
    if total_missing == 0 {
        return;
    }
    let auto_fixable = classified.missing_docs.iter().chain(classified.code_config_issues.iter())
        .filter(|f| f.fix.is_some()).count();

    o.push('\n');
    // Header with right-aligned count
    let header = "What's Missing";
    let count_str = format!("{total_missing} issues, {auto_fixable} fixable");
    let total_width: usize = 60;
    let used = header.len();
    let pad = total_width.saturating_sub(used);
    o.push_str(&format!("  {header}{count_str:>pad$}\n"));
    o.push_str(&format!("  {}\n", "─".repeat(50)));

    // Documents needed
    if !classified.missing_docs.is_empty() {
        o.push('\n');
        o.push_str(&format!("  Documents needed ({}):\n\n", classified.missing_docs.len()));
        render_finding_group(o, &classified.missing_docs);
    }

    // Code & config issues
    if !classified.code_config_issues.is_empty() {
        o.push('\n');
        o.push_str(&format!("  Code & config issues ({}):\n\n", classified.code_config_issues.len()));
        render_finding_group(o, &classified.code_config_issues);
    }
}

/// Render a group of sorted fail findings with collapse logic.
fn render_finding_group(o: &mut String, findings: &[&Finding]) {
    // Count per check_id for collapse
    let mut check_counts: BTreeMap<&str, usize> = BTreeMap::new();
    for f in findings {
        *check_counts.entry(f.check_id.as_str()).or_insert(0) += 1;
    }

    let mut seen: BTreeMap<&str, usize> = BTreeMap::new();
    for f in findings {
        let count = seen.entry(f.check_id.as_str()).or_insert(0);
        *count += 1;
        let total = check_counts[f.check_id.as_str()];

        if *count <= MAX_PER_CHECK {
            let sev = severity_label(&f.severity);
            let label = check_label(&f.check_id);
            let article = f.article_reference.as_deref().unwrap_or("");
            let badge = f.finding_type().badge();

            // Line 1: SEVERITY  [A] Label  Article  (OBL-xxx)
            let mut line1 = format!("    {:<10}{} {}", sev, badge, label);
            if !article.is_empty() {
                let total_width = 62;
                let used = line1.len();
                if used + 2 + article.len() <= total_width {
                    let pad = total_width - used;
                    line1.push_str(&format!("{:>pad$}", article));
                } else {
                    line1.push_str(&format!("  {article}"));
                }
            }
            o.push_str(&line1);
            o.push('\n');

            // Line 1b: Obligation ID (if present)
            if let Some(ref obl_id) = f.obligation_id {
                o.push_str(&format!("              Obligation: {obl_id}\n"));
            }

            // Line 2: Compact penalty + deadline
            if let Some(ref expl) = f.explanation {
                let mut meta_parts: Vec<String> = Vec::new();
                if !expl.penalty.is_empty() {
                    meta_parts.push(compact_penalty(&expl.penalty));
                }
                if !expl.deadline.is_empty() {
                    meta_parts.push(format_deadline(&expl.deadline));
                }
                if !meta_parts.is_empty() {
                    o.push_str(&format!("              {}\n", meta_parts.join("  |  ")));
                }
                // Line 2b: Business impact (if present)
                if !expl.business_impact.is_empty() {
                    let impact = truncate_str(&expl.business_impact, 80);
                    o.push_str(&format!("              Impact: {impact}\n"));
                }
            }

            // Line 3: Fix suggestion (with auto-fix indicator)
            if let Some(ref fix) = f.fix {
                let prefix = if f.fix_diff.is_some() { "=> " } else { "-> " };
                o.push_str(&format!("              {prefix}{fix}\n"));
            }

            // Line 4: file:line
            if let Some(ref loc) = f.file_line_label() {
                o.push_str(&format!("              {loc}\n"));
            }

            o.push('\n');
        } else if *count == MAX_PER_CHECK + 1 {
            let remaining = total - MAX_PER_CHECK;
            o.push_str(&format!(
                "    {:<10}... and {remaining} more {}\n\n",
                "", check_label(&f.check_id),
            ));
        }
    }
}

#[allow(clippy::cast_precision_loss)]
fn render_category_breakdown(o: &mut String, result: &ScanResult) {
    if result.score.category_scores.is_empty() {
        return;
    }
    o.push('\n');
    o.push_str("  Category Breakdown\n");
    o.push_str(&format!("  {}\n", "─".repeat(50)));

    for cat in &result.score.category_scores {
        let name = category_name(&cat.category);
        let pct = if cat.obligation_count > 0 {
            (cat.passed_count as f64 / cat.obligation_count as f64 * 100.0).round() as usize
        } else {
            0
        };
        let cat_filled = (pct * CAT_BAR_WIDTH / 100).min(CAT_BAR_WIDTH);
        let cat_empty = CAT_BAR_WIDTH.saturating_sub(cat_filled);
        let cat_bar = format!("{}{}", "█".repeat(cat_filled), "░".repeat(cat_empty));
        o.push_str(&format!(
            "  {:<25} {} {:>3}%  ({}/{})\n",
            name, cat_bar, pct, cat.passed_count, cat.obligation_count
        ));
    }
}

/// Show top fixes by predicted score impact.
fn render_fix_roadmap(o: &mut String, classified: &ClassifiedFindings<'_>) {
    let mut all_fails: Vec<&Finding> = classified.missing_docs.iter()
        .chain(classified.code_config_issues.iter())
        .copied()
        .filter(|f| f.fix.is_some())
        .collect();
    if all_fails.is_empty() {
        return;
    }

    // Sort by predicted impact (highest first)
    all_fails.sort_by(|a, b| b.predicted_impact().cmp(&a.predicted_impact()));

    o.push('\n');
    o.push_str("  Fix Roadmap (by score impact)\n");
    o.push_str(&format!("  {}\n", "─".repeat(50)));

    // Show top 5 fixes
    let show_count = all_fails.len().min(5);
    let mut cumulative_impact = 0i32;
    for f in all_fails.iter().take(show_count) {
        let impact = f.predicted_impact();
        cumulative_impact += impact;
        let fix = f.fix.as_deref().unwrap_or("");
        let label = check_label(&f.check_id);
        let auto = if f.fix_diff.is_some() { " [auto]" } else { "" };
        o.push_str(&format!(
            "  +{:<3} {}{}\n",
            impact, label, auto
        ));
        o.push_str(&format!("       {fix}\n"));
    }

    if all_fails.len() > show_count {
        let remaining: i32 = all_fails.iter().skip(show_count).map(|f| f.predicted_impact()).sum();
        o.push_str(&format!(
            "  +{:<3} ... and {} more fixes\n",
            remaining, all_fails.len() - show_count
        ));
        cumulative_impact += remaining;
    }
    o.push_str(&format!("  ───  Est. score gain: +{cumulative_impact} points\n"));
}

fn render_footer(o: &mut String, result: &ScanResult, classified: &ClassifiedFindings<'_>) {
    let score = result.score.total_score;
    let fail_count = classified.missing_docs.len() + classified.code_config_issues.len();
    let auto_fixable = classified.missing_docs.iter().chain(classified.code_config_issues.iter())
        .filter(|f| f.fix.is_some()).count();

    o.push('\n');
    if score >= 80.0 {
        o.push_str("  Status: COMPLIANT — Ready for EU AI Act deployment\n");
    } else if score >= 50.0 {
        if auto_fixable > 0 {
            o.push_str(&format!(
                "  Status: PARTIAL — {} issues remaining ({} auto-fixable)\n",
                fail_count, auto_fixable
            ));
        } else {
            o.push_str(&format!(
                "  Status: PARTIAL — {} issues remaining\n",
                fail_count
            ));
        }
    } else if auto_fixable > 0 {
        o.push_str(&format!(
            "  Status: NON-COMPLIANT — {} issues ({} auto-fixable)\n",
            fail_count, auto_fixable
        ));
    } else {
        o.push_str(&format!(
            "  Status: NON-COMPLIANT — {} issues remaining\n",
            fail_count
        ));
    }

    // Actionable next steps
    o.push('\n');
    o.push_str("  Next steps:\n");
    if auto_fixable > 0 {
        o.push_str(&format!("    complior fix             Auto-fix {} issues\n", auto_fixable));
        o.push_str("    complior fix --dry-run   Preview changes before applying\n");
    } else if fail_count > 0 {
        o.push_str("    complior fix             Auto-generate missing documents\n");
    }
    if result.deep_analysis.is_none() {
        o.push_str("    complior scan --deep     AI-powered document quality analysis\n");
    }
    if fail_count > 0 {
        o.push_str("    complior scan --json     Machine-readable output for CI/CD\n");
    }
    o.push('\n');
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

/// Truncate a string to max_len chars, appending "..." if truncated.
fn truncate_str(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        let end = s.char_indices()
            .nth(max_len.saturating_sub(3))
            .map(|(i, _)| i)
            .unwrap_or(max_len.saturating_sub(3));
        format!("{}...", &s[..end])
    }
}

/// Shorten penalty text for compact display.
///
/// `"€15M or 3% of annual global turnover"` → `"€15M / 3% turnover"`
pub(super) fn compact_penalty(penalty: &str) -> String {
    if penalty.contains(" or ") && penalty.contains("turnover") {
        let parts: Vec<&str> = penalty.splitn(2, " or ").collect();
        let amount = parts[0].trim_start_matches("up to ").trim();
        // Extract percentage
        let pct_part = parts.get(1).unwrap_or(&"");
        let pct = if let Some(idx) = pct_part.find('%') {
            // Walk backwards from % to find start of number
            let before = &pct_part[..idx];
            let num_start = before.rfind(|c: char| !c.is_ascii_digit() && c != '.').map(|i| i + 1).unwrap_or(0);
            &pct_part[num_start..=idx]
        } else {
            ""
        };
        if pct.is_empty() {
            amount.to_string()
        } else {
            format!("{amount} / {pct} turnover")
        }
    } else {
        penalty.to_string()
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
        "gpai-systemic-risk"       => "GPAI Systemic Risk Assessment",

        // ── L2: Document structure validation ───────────────
        "l2-fria"                  => "FRIA Structure Validation",
        "l2-art5-screening"        => "Art. 5 Screening Structure",
        "l2-tech-documentation"    => "Tech Docs Structure",
        "l2-incident-report"       => "Incident Report Structure",
        "l2-declaration-conformity"=> "Declaration Structure",
        "l2-monitoring-policy"     => "Monitoring Policy Structure",
        "l2-worker-notification"   => "Worker Notification Structure",
        "l2-ai-literacy"           => "AI Literacy Doc Structure",
        "l2-risk-management"       => "Risk Management Doc Structure",
        "l2-data-governance"       => "Data Governance Doc Structure",
        "l2-qms"                   => "QMS Doc Structure",
        "l2-instructions-for-use"  => "Instructions for Use Structure",
        "l2-biometrics-ai-policy"  => "Biometrics AI Policy Structure",
        "l2-critical-infra-ai-policy" => "Critical Infra Policy Structure",
        "l2-migration-ai-policy"   => "Migration AI Policy Structure",

        // ── L3: Dependencies & configuration ────────────────
        "l3-dep-scan"              => "Dependency Security Analysis",
        "l3-dep-license"           => "Dependency License Check",
        "l3-dep-vuln"              => "Dependency Vulnerability",
        "l3-ai-sdk-detected"       => "AI SDK Detected",
        "l3-missing-bias-testing"  => "Bias Testing Missing",
        "l3-log-retention"         => "Log Retention Policy",
        "l3-env-config"            => "Environment Configuration",
        "l3-ci-compliance"         => "CI/CD Compliance Check",

        // ── L4: Code patterns & security ────────────────────
        "l4-bare-llm"              => "Bare LLM API Call",
        "l4-security-risk"         => "Security Vulnerability",
        "l4-human-oversight"       => "Human Oversight Mechanism",
        "l4-conformity-assessment" => "Conformity Assessment",
        "l4-disclosure"            => "AI Disclosure in Code",
        "l4-kill-switch"           => "Kill Switch / Feature Flag",
        "l4-logging"               => "AI Interaction Logging",
        "l4-content-marking"       => "Content Watermarking",
        "l4-data-governance"       => "Data Governance Patterns",
        "l4-accuracy-robustness"   => "Accuracy & Robustness Testing",
        "l4-gpai-transparency"     => "GPAI Model Documentation",
        "l4-deployer-monitoring"   => "Deployer Monitoring",
        "l4-record-keeping"        => "Record Keeping / Audit Trail",
        "l4-cybersecurity"         => "Cybersecurity Controls",
        "l4-nhi-clean"             => "Secrets & Credentials Scan",

        // ── Cross-layer verification ────────────────────────
        "cross-doc-code-mismatch"  => "Documentation ↔ Code Mismatch",
        "cross-sdk-no-disclosure"  => "SDK Without AI Disclosure",
        "cross-banned-with-wrapper"=> "Prohibited Pkg + Controls",
        "cross-logging-no-retention"=> "Logging Without Retention",
        "cross-kill-switch-no-test"=> "Kill Switch Without Tests",
        "cross-passport-code-mismatch" => "Passport ↔ Code Mismatch",
        "cross-permission-passport-mismatch" => "Permission ↔ Passport Mismatch",

        // ── Dynamic patterns (prefix match) ─────────────────
        _ => return check_label_dynamic(check_id),
    };
    label.to_string()
}

/// Handle dynamic check_ids (l3-banned-*, l4-nhi-*, industry-*).
fn check_label_dynamic(check_id: &str) -> String {
    if let Some(pkg) = check_id.strip_prefix("l3-banned-") {
        return format!("Prohibited Package: {pkg}");
    }
    if let Some(cat) = check_id.strip_prefix("l4-nhi-") {
        return format!("Secrets: {}", humanize_kebab(cat));
    }
    if check_id == "industry-biometrics" {
        return "High-Risk Domain: Biometrics".to_string();
    }
    if check_id == "industry-critical-infra" {
        return "High-Risk Domain: Critical Infrastructure".to_string();
    }
    if check_id == "industry-migration" {
        return "High-Risk Domain: Migration".to_string();
    }
    if check_id == "industry-legal" {
        return "High-Risk Domain: Legal".to_string();
    }
    if let Some(industry) = check_id.strip_prefix("industry-") {
        return format!("High-Risk Domain: {}", humanize_kebab(industry));
    }
    if let Some(doc) = check_id.strip_prefix("l2-") {
        return format!("{} Structure", humanize_kebab(doc));
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
    let stripped = id
        .strip_prefix("l1-").or_else(|| id.strip_prefix("l2-"))
        .or_else(|| id.strip_prefix("l3-")).or_else(|| id.strip_prefix("l4-"))
        .or_else(|| id.strip_prefix("l5-")).or_else(|| id.strip_prefix("cross-"))
        .unwrap_or(id);
    humanize_kebab(stripped)
}

/// Map category id to a readable name.
fn category_name(id: &str) -> &'static str {
    match id {
        "prohibited_practices" => "Prohibited Practices",
        "risk_management" => "Risk Management",
        "documentation" => "Documentation",
        "transparency" => "Transparency",
        "technical_safeguards" => "Technical Safeguards",
        "organizational" => "Organizational",
        "monitoring_and_reporting" => "Monitoring & Reporting",
        "deployer_specific" => "Deployer Obligations",
        _ => "Other",
    }
}

/// Format ISO date deadline to a readable string like "Aug 2026".
fn format_deadline(deadline: &str) -> String {
    // Input: "2026-08-02" → "Aug 2026"
    let parts: Vec<&str> = deadline.split('-').collect();
    if parts.len() >= 2 {
        let month = match parts[1] {
            "01" => "Jan", "02" => "Feb", "03" => "Mar", "04" => "Apr",
            "05" => "May", "06" => "Jun", "07" => "Jul", "08" => "Aug",
            "09" => "Sep", "10" => "Oct", "11" => "Nov", "12" => "Dec",
            _ => parts[1],
        };
        format!("{} {}", month, parts[0])
    } else {
        deadline.to_string()
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
