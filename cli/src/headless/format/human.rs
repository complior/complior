//! Human-readable scan report rendering.

use crate::types::{CheckResultType, Finding, ScanResult, Severity};

use super::colors::*;
use super::labels::{check_label, ext_check_label};
use super::layers::*;
use super::FormatOptions;

/// Format scan result as structured human-readable text.
#[allow(clippy::cast_precision_loss)]
pub fn format_human(result: &ScanResult, opts: &FormatOptions) -> String {
    let mut o = String::with_capacity(8192);

    // Precompute fail findings once (used by findings + quick actions)
    let fail_findings: Vec<&Finding> = result
        .findings
        .iter()
        .filter(|f| f.r#type == CheckResultType::Fail)
        .collect();

    render_header(&mut o, result);
    render_scan_info(&mut o, result);
    render_score_block(&mut o, result, opts);
    render_framework_breakdown(&mut o, opts);
    render_layer_results_section(&mut o, result);
    render_findings_section(&mut o, result, &fail_findings);
    render_quick_actions(&mut o, result, &fail_findings);

    o
}

fn render_header(o: &mut String, result: &ScanResult) {
    let version = env!("CARGO_PKG_VERSION");
    let mut title = format!("◆ Complior v{version}  ·  EU AI Act Compliance Scanner");
    if result.tier == Some(2) {
        title.push_str("  ·  Deep Mode");
    }
    o.push('\n');
    o.push_str(&format!("  {}\n", bold(&title)));
    o.push_str(&format!("  {}\n", separator()));
}

fn render_scan_info(o: &mut String, result: &ScanResult) {
    let name = project_name(&result.project_path);
    o.push_str(&format!("  {}  {}\n", dim("Scanning"), name));
    o.push_str(&format!("  {}     {} collected\n", dim("Files"), result.files_scanned));

    // Derive layers from constants (single source of truth)
    let mut layers: Vec<String> = BASE_LAYERS
        .iter()
        .filter(|(tag, _)| {
            match *tag {
                "GPAI" => result.findings.iter().any(|f| f.check_id.starts_with("gpai-")),
                "L5" => result.findings.iter().any(|f| f.check_id.starts_with("l5-")),
                "CROSS" => false, // cross-layer is implicit, not shown in header
                _ => true,
            }
        })
        .map(|(tag, label)| format!("{tag} {label}"))
        .collect();
    if result.tier == Some(2) {
        for (tag, tool_name) in DEEP_TOOL_NAMES {
            layers.push(format!("{tag} {tool_name}"));
        }
    }
    o.push_str(&format!("  {}    {}\n", dim("Layers"), layers.join(" · ")));
    o.push('\n');
}

#[allow(clippy::cast_precision_loss)]
fn render_score_block(o: &mut String, result: &ScanResult, opts: &FormatOptions) {
    o.push_str(&format!("  {}\n", separator()));

    // Compliance score
    let compliance = result.score.total_score;
    let cscore_text = format!("{:.0} / 100", compliance);
    let clabel = "COMPLIANCE SCORE";
    let cpad = SEP_WIDTH.saturating_sub(clabel.len() + cscore_text.len());
    o.push_str(&format!(
        "  {}{}{}\n",
        bold(clabel),
        " ".repeat(cpad),
        score_color(compliance, &cscore_text),
    ));

    // Security score: infer from OWASP/MITRE frameworks
    if let Some(ref frameworks) = opts.framework_scores {
        let security_fw = frameworks.iter().find(|fw| {
            fw.framework_id.contains("owasp") || fw.framework_id.contains("mitre")
        });
        if let Some(sec) = security_fw {
            let sscore_text = format!("{:.0} / 100", sec.score);
            let slabel = "SECURITY SCORE";
            let spad = SEP_WIDTH.saturating_sub(slabel.len() + sscore_text.len());
            o.push_str(&format!(
                "  {}{}{}\n",
                bold(slabel),
                " ".repeat(spad),
                score_color(sec.score, &sscore_text),
            ));
        }
    }

    o.push_str(&format!("  {}\n", separator()));

    if result.score.critical_cap_applied {
        o.push_str(&format!(
            "  {}\n",
            bold_red("!! Score capped — critical violations limit maximum achievable score")
        ));
    }
    o.push('\n');
}

#[allow(clippy::cast_precision_loss)]
fn render_framework_breakdown(o: &mut String, opts: &FormatOptions) {
    let frameworks = match &opts.framework_scores {
        Some(f) if !f.is_empty() => f,
        _ => return,
    };

    o.push_str(&format!("  {}\n", bold("Framework Breakdown")));
    let name_width = 28;
    for fw in frameworks {
        let score_text = format!("{:.0} / 100", fw.score);
        let padded_score = format!("{:>8}", score_text);
        let filled = ((fw.score / 100.0) * BAR_WIDTH as f64).round() as usize;
        let empty = BAR_WIDTH.saturating_sub(filled);
        let bar = format!("{}{}", "█".repeat(filled), "░".repeat(empty));
        o.push_str(&format!(
            "    {:<name_width$}{}   {}\n",
            fw.framework_name,
            score_color(fw.score, &padded_score),
            dim(&bar),
        ));
    }
    o.push('\n');
}

fn render_layer_results_section(o: &mut String, result: &ScanResult) {
    let layers = infer_layer_results(&result.findings, result.tier);
    if layers.is_empty() {
        return;
    }

    o.push_str(&format!("  {}\n", bold("Layer Results")));
    for lr in &layers {
        let status_colored = layer_status_color(lr.status, lr.status);
        o.push_str(&format!(
            "    {:<6}{:<23}{}   {}\n",
            lr.id, lr.label, status_colored, dim(&lr.summary),
        ));
    }
    o.push('\n');
}

fn render_findings_section(o: &mut String, result: &ScanResult, all_fails: &[&Finding]) {
    let total = all_fails.len();
    let critical = all_fails.iter().filter(|f| f.severity == Severity::Critical).count();
    let high = all_fails.iter().filter(|f| f.severity == Severity::High).count();
    let medium = all_fails.iter().filter(|f| f.severity == Severity::Medium).count();

    o.push_str(&format!("  {}\n", separator()));

    let mut stats_parts = vec![format!("{total} total")];
    if critical > 0 { stats_parts.push(format!("{critical} critical")); }
    if high > 0 { stats_parts.push(format!("{high} high")); }
    if medium > 0 { stats_parts.push(format!("{medium} medium")); }

    o.push_str(&format!("  {}  ({})\n", bold("FINDINGS"), stats_parts.join(" · ")));
    o.push_str(&format!("  {}\n", separator()));

    if all_fails.is_empty() {
        o.push_str(&format!("\n  {}  {}\n\n", green("✓"), "No compliance issues found"));
        return;
    }

    // Sort by severity, apply display limits
    let mut sorted: Vec<&Finding> = all_fails.to_vec();
    sorted.sort_by_key(|f| f.severity.sort_key());
    let visible = apply_finding_limits(&sorted);

    let is_deep = result.tier == Some(2);

    o.push('\n');
    if is_deep {
        let ext_findings: Vec<&Finding> = visible
            .iter()
            .filter(|f| f.check_id.starts_with("ext-"))
            .copied()
            .collect();
        let base_findings: Vec<&Finding> = visible
            .iter()
            .filter(|f| !f.check_id.starts_with("ext-"))
            .copied()
            .collect();

        if !ext_findings.is_empty() {
            let n = ext_findings.len();
            o.push_str(&format!(
                "  {} ({n} additional finding{})\n",
                bold("NEW IN --DEEP"),
                plural(n),
            ));
            render_findings_by_layer(o, &ext_findings);
        }
        if !base_findings.is_empty() {
            let n = base_findings.len();
            o.push_str(&format!(
                "  {} ({n} finding{})\n",
                bold("FROM BASE SCAN"),
                plural(n),
            ));
            render_findings_by_layer(o, &base_findings);
        }
    } else {
        render_findings_by_layer(o, &visible);
    }

    // Note about hidden findings
    let low_count = all_fails
        .iter()
        .filter(|f| matches!(f.severity, Severity::Low | Severity::Info))
        .count();
    let med_hidden = medium.saturating_sub(MAX_MEDIUM);
    if low_count > 0 || med_hidden > 0 {
        let mut skip_parts = Vec::new();
        if med_hidden > 0 {
            skip_parts.push(format!("{med_hidden} medium"));
        }
        if low_count > 0 {
            skip_parts.push(format!("{low_count} low"));
        }
        o.push_str(&format!(
            "  {} {} not shown (use --json for full report)\n\n",
            dim("..."),
            skip_parts.join(", "),
        ));
    }
}

/// Render findings grouped by layer subcategories.
fn render_findings_by_layer(o: &mut String, findings: &[&Finding]) {
    let all_layers: Vec<(&str, &str)> = [BASE_LAYERS, DEEP_LAYERS].concat();

    for (tag, label) in &all_layers {
        let layer_findings: Vec<&&Finding> = findings
            .iter()
            .filter(|f| infer_layer_tag(&f.check_id) == *tag)
            .collect();
        if layer_findings.is_empty() {
            continue;
        }

        o.push_str(&format!("\n    {} {}\n", bold(tag), dim(label)));
        for f in layer_findings {
            render_single_finding(o, f);
        }
    }
}

fn render_single_finding(o: &mut String, f: &Finding) {
    let icon = severity_icon(&f.severity);
    let sev = severity_color(&f.severity, f.severity.label());

    let label = if f.check_id.starts_with("ext-") {
        ext_check_label(&f.check_id)
    } else {
        check_label(&f.check_id)
    };

    let article = f
        .article_reference
        .as_deref()
        .or_else(|| {
            f.explanation
                .as_ref()
                .map(|e| e.article.as_str())
                .filter(|a| !a.is_empty())
        });

    let header_detail = match article {
        Some(art) => format!("{art} · {label}"),
        None => label,
    };
    o.push_str(&format!("      {}  {}  {}\n", icon, sev, header_detail));
    o.push_str(&format!("         {}\n", f.message));

    if let Some(ref loc) = f.file_line_label() {
        o.push_str(&format!("         {}  {}\n", dim("File:"), loc));
    }
    if let Some(ref fix) = f.fix {
        o.push_str(&format!("         {}  {}\n", dim("Fix:"), clean_fix_message(fix)));
    }

    o.push('\n');
}

fn render_quick_actions(o: &mut String, result: &ScanResult, fail_findings: &[&Finding]) {
    o.push_str(&format!("  {}\n", separator()));
    o.push_str(&format!("  {}\n", bold("QUICK ACTIONS")));
    o.push_str(&format!("  {}\n", separator()));

    let has_fixable = fail_findings.iter().any(|f| f.fix.is_some());
    let has_missing_docs = fail_findings.iter().any(|f| {
        !f.check_id.starts_with("l3-")
            && !f.check_id.starts_with("l4-")
            && !f.check_id.starts_with("cross-")
            && !f.check_id.starts_with("ext-")
    });
    let is_tier1 = result.tier.is_none() || result.tier == Some(1);

    if has_fixable {
        o.push_str(&format!("  {:<26}{}\n", "Auto-fix available", dim("complior fix")));
    }
    if has_missing_docs {
        o.push_str(&format!("  {:<26}{}\n", "Generate docs", dim("complior docs generate --missing")));
    }
    if is_tier1 {
        o.push_str(&format!("  {:<26}{}\n", "Deep scan", dim("complior scan --deep")));
    }
    o.push_str(&format!("  {:<26}{}\n", "Full interactive view", dim("complior tui")));
    o.push_str(&format!("  {:<26}{}\n", "Export JSON", dim("complior scan --json > report.json")));

    o.push('\n');
    let critical_count = fail_findings.iter().filter(|f| f.severity == Severity::Critical).count();
    let high_count = fail_findings.iter().filter(|f| f.severity == Severity::High).count();

    if critical_count > 0 {
        o.push_str(&format!(
            "  {}: fix {critical_count} critical issue{} to improve your score\n",
            bold("Next"), plural(critical_count),
        ));
    } else if high_count > 0 {
        o.push_str(&format!(
            "  {}: fix {high_count} high-severity issue{} to improve your score\n",
            bold("Next"), plural(high_count),
        ));
    } else if result.score.total_score < 80.0 {
        o.push_str(&format!("  {}: resolve remaining findings to reach 80+\n", bold("Next")));
    } else {
        o.push_str(&format!("  {}: your project is on track for EU AI Act compliance\n", bold("Next")));
    }
    o.push_str(&format!("  {}\n", separator()));
}

// ── Small helpers ────────────────────────────────────────────────

fn separator() -> String {
    dim(&"─".repeat(SEP_WIDTH))
}

/// Extract project name from the last path segment.
fn project_name(path: &str) -> &str {
    path.rsplit('/').find(|s| !s.is_empty()).unwrap_or(path)
}

/// Strip engine prefix patterns from fix messages (e.g. "Fix complior.injection: ...").
fn clean_fix_message(fix: &str) -> &str {
    if let Some(rest) = fix.strip_prefix("Fix ") {
        if let Some(idx) = rest.find(": ") {
            if rest[..idx].starts_with("complior.") {
                return rest[idx + 2..].trim();
            }
        }
    }
    fix
}

/// Pluralization suffix: "s" for n != 1, "" for n == 1.
fn plural(n: usize) -> &'static str {
    if n == 1 { "" } else { "s" }
}
