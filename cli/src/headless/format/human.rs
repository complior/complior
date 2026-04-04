//! Human-readable scan report rendering.

use crate::types::{CheckResultType, Finding, ScanResult, Severity};

use super::colors::{diamond, bold, dim, yellow, resolve_grade, grade_color, score_color, bold_red, bar_filled, bar_empty, layer_status_color, green, check_mark, severity_icon, severity_color};
use super::labels::{check_label, ext_check_label};
use super::layers::{BASE_LAYERS, DEEP_TOOL_NAMES, display_width, BAR_WIDTH, infer_layer_results, sort_findings_full, apply_finding_limits, MAX_MEDIUM, DEEP_LAYERS, infer_layer_tag};
use super::{plural, project_name, separator, FormatOptions};

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

    if opts.quiet {
        // Quiet mode: only critical findings after score
        render_quiet_findings(&mut o, &fail_findings);
    } else {
        render_framework_breakdown(&mut o, opts);
        render_layer_results_section(&mut o, result);
        render_findings_section(&mut o, result, &fail_findings);
        render_agent_summaries(&mut o, result);
        render_quick_actions(&mut o, result, &fail_findings);
    }

    o
}

fn render_header(o: &mut String, result: &ScanResult) {
    let version = env!("CARGO_PKG_VERSION");
    let mut title = format!("{} Complior v{version}  ·  EU AI Act Compliance Scanner", diamond());
    if result.tier == Some(2) {
        title.push_str("  ·  Deep Mode");
    }
    let is_llm = result.deep_analysis == Some(true) && result.tier != Some(2);
    if is_llm {
        title.push_str("  ·  LLM Mode");
    }
    o.push('\n');
    o.push_str(&format!("  {}\n", bold(&title)));
    o.push_str(&format!("  {}\n", separator()));
}

fn render_scan_info(o: &mut String, result: &ScanResult) {
    let name = project_name(&result.project_path);
    o.push_str(&format!("  {}  {}\n", dim("Scanning"), name));

    // Files line with optional excluded count
    let mut files_info = format!("{} collected", result.files_scanned);
    if let Some(excl) = result.files_excluded
        && excl > 0 {
            files_info.push_str(&format!(", {excl} excluded"));
        }
    o.push_str(&format!("  {}     {}\n", dim("Files"), files_info));

    // >500 files warning
    if result.files_scanned > 500 {
        o.push_str(&format!(
            "  {}  {}\n",
            yellow("!"),
            dim("Large project — consider adding .compliorignore to speed up scans"),
        ));
    }

    // Elapsed time
    let elapsed = if result.duration >= 1000 {
        format!("{:.1}s", result.duration as f64 / 1000.0)
    } else {
        format!("{}ms", result.duration)
    };
    o.push_str(&format!("  {}   {}\n", dim("Elapsed"), elapsed));

    // Derive layers from constants (single source of truth)
    let mut layers: Vec<String> = BASE_LAYERS
        .iter()
        .filter(|(tag, _)| {
            match *tag {
                "GPAI" => result.findings.iter().any(|f| f.check_id.starts_with("gpai-")),
                "L5" => result.findings.iter().any(|f| f.check_id.starts_with("l5-") || f.l5_analyzed == Some(true)),
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

    // L5 cost (when --llm was used)
    if let Some(cost) = result.l5_cost {
        o.push_str(&format!("  {}  ${:.2} (estimated)\n", dim("LLM Cost"), cost));
    }

    o.push('\n');
}

#[allow(clippy::cast_precision_loss)]
fn render_score_block(o: &mut String, result: &ScanResult, opts: &FormatOptions) {
    o.push_str(&format!("  {}\n", separator()));
    let width = display_width();

    // Compliance score with grade
    let compliance = result.score.total_score;
    let grade = resolve_grade(compliance);
    let cscore_text = format!("{compliance:.0} / 100");
    let grade_text = format!("  {}", grade_color(grade, grade));
    let clabel = "COMPLIANCE SCORE";

    // Build score + delta + grade
    let mut score_suffix = cscore_text.clone();
    if let Some(prev) = opts.prev_score {
        score_suffix.push_str(&format!("  {}", dim(&format!("(was {prev:.0})"))));
    }
    score_suffix.push_str(&grade_text);

    // Pad (use raw text len without ANSI for alignment)
    let raw_score_len = format!("{compliance:.0} / 100").len() + 2 + grade.len();
    let extra = if opts.prev_score.is_some() {
        let prev_str = format!("(was {:.0})", opts.prev_score.unwrap_or(0.0));
        prev_str.len() + 2
    } else {
        0
    };
    let cpad = width.saturating_sub(clabel.len() + raw_score_len + extra);
    o.push_str(&format!(
        "  {}{}{}\n",
        bold(clabel),
        " ".repeat(cpad),
        format!("{}{}",
            score_color(compliance, &cscore_text),
            if opts.prev_score.is_some() {
                format!("  {}", dim(&format!("(was {:.0})", opts.prev_score.unwrap_or(0.0))))
            } else {
                String::new()
            },
        ),
    ));
    // Grade on same line — append after score
    o.pop(); // remove trailing newline
    o.push_str(&format!("  {}\n", grade_color(grade, grade)));

    // Security score: infer from OWASP/MITRE frameworks
    let has_security = if let Some(ref frameworks) = opts.framework_scores {
        let security_fw = frameworks.iter().find(|fw| {
            fw.framework_id.contains("owasp") || fw.framework_id.contains("mitre")
        });
        if let Some(sec) = security_fw {
            let sgrade = resolve_grade(sec.score);
            let sscore_text = format!("{:.0} / 100", sec.score);
            let slabel = "SECURITY SCORE";
            let raw_slen = sscore_text.len() + 2 + sgrade.len();
            let spad = width.saturating_sub(slabel.len() + raw_slen);
            o.push_str(&format!(
                "  {}{}{}  {}\n",
                bold(slabel),
                " ".repeat(spad),
                score_color(sec.score, &sscore_text),
                grade_color(sgrade, sgrade),
            ));
            true
        } else {
            false
        }
    } else {
        false
    };

    // Security N/A hint when no security data
    if !has_security {
        let slabel = "SECURITY SCORE";
        let na_text = "N/A";
        let spad = width.saturating_sub(slabel.len() + na_text.len());
        o.push_str(&format!(
            "  {}{}{}\n",
            bold(slabel),
            " ".repeat(spad),
            dim(na_text),
        ));
        o.push_str(&format!(
            "  {}\n",
            dim("Run `complior eval --security <url>` for security scoring"),
        ));
    }

    o.push_str(&format!("  {}\n", separator()));

    // Only show cap message if score is actually at/near the cap (40)
    // If score > 50, the cap isn't limiting anything
    if result.score.critical_cap_applied && result.score.total_score <= 50.0 {
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
        let padded_score = format!("{score_text:>8}");
        let filled = ((fw.score / 100.0) * BAR_WIDTH as f64).round() as usize;
        let empty = BAR_WIDTH.saturating_sub(filled);
        let bar = format!("{}{}", bar_filled().repeat(filled), bar_empty().repeat(empty));
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
            "    {:<6}{:<25}{}   {}\n",
            lr.id, lr.label, status_colored, dim(&lr.summary),
        ));
    }

    // L5 LLM Analysis summary (when --llm was used)
    let is_llm = result.deep_analysis == Some(true) && result.tier != Some(2);
    if is_llm {
        let l5_count = result.findings.iter().filter(|f| f.l5_analyzed == Some(true)).count();
        let l5_changed = result.findings.iter().filter(|f| {
            f.l5_analyzed == Some(true) && f.r#type == CheckResultType::Fail
        }).count();
        let status = if l5_count > 0 { "DONE" } else { "SKIP" };
        let summary = if l5_count > 0 {
            format!("{l5_count} analyzed, {l5_changed} flagged")
        } else {
            "no uncertain findings".to_string()
        };
        let status_colored = layer_status_color(status, status);
        o.push_str(&format!(
            "    {:<6}{:<25}{}   {}\n",
            "L5", "LLM Analysis", status_colored, dim(&summary),
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
        o.push_str(&format!("\n  {}  {}\n\n", green(check_mark()), "No compliance issues found"));
        return;
    }

    // Multi-key sort: severity → layer → confidence
    let mut sorted: Vec<&Finding> = all_fails.to_vec();
    sort_findings_full(&mut sorted);

    let is_deep = result.tier == Some(2);
    let is_llm = result.deep_analysis == Some(true) && result.tier != Some(2);

    o.push('\n');
    let has_agents = result.agent_summaries.as_ref().is_some_and(|s| !s.is_empty());

    // Global finding counter for F-001 IDs
    let mut finding_num: usize = 1;

    if has_agents {
        // Show ALL findings when agent grouping is active — no display limits
        render_findings_by_agent(o, &sorted, result, &mut finding_num);
    } else if is_deep {
        let visible = apply_finding_limits(&sorted);
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
            render_findings_by_layer(o, &ext_findings, &mut finding_num);
        }
        if !base_findings.is_empty() {
            let n = base_findings.len();
            o.push_str(&format!(
                "  {} ({n} finding{})\n",
                bold("FROM BASE SCAN"),
                plural(n),
            ));
            render_findings_by_layer(o, &base_findings, &mut finding_num);
        }
    } else if is_llm {
        let visible = apply_finding_limits(&sorted);
        let l5_findings: Vec<&Finding> = visible
            .iter()
            .filter(|f| f.l5_analyzed == Some(true))
            .copied()
            .collect();
        let base_findings: Vec<&Finding> = visible
            .iter()
            .filter(|f| f.l5_analyzed != Some(true))
            .copied()
            .collect();

        if !l5_findings.is_empty() {
            let n = l5_findings.len();
            o.push_str(&format!(
                "  {} ({n} finding{})\n",
                bold("LLM ANALYSIS (--llm)"),
                plural(n),
            ));
            render_findings_by_layer(o, &l5_findings, &mut finding_num);
        }
        if !base_findings.is_empty() {
            let n = base_findings.len();
            o.push_str(&format!(
                "  {} ({n} finding{})\n",
                bold("BASE SCAN (L1-L4)"),
                plural(n),
            ));
            render_findings_by_layer(o, &base_findings, &mut finding_num);
        }
    } else {
        let visible = apply_finding_limits(&sorted);
        render_findings_by_layer(o, &visible, &mut finding_num);
    }

    // Note about hidden findings (only when limits applied — not in agent mode)
    if !has_agents {
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
    } // !has_agents
}

/// Render findings grouped first by agent, then by layer within each agent.
fn render_findings_by_agent(o: &mut String, findings: &[&Finding], result: &ScanResult, finding_num: &mut usize) {
    let summaries = match &result.agent_summaries {
        Some(s) => s,
        None => return,
    };

    for summary in summaries {
        let agent_findings: Vec<&Finding> = findings
            .iter()
            .filter(|f| f.agent_id.as_deref() == Some(&summary.agent_id))
            .copied()
            .collect();
        if agent_findings.is_empty() {
            continue;
        }

        let crit = agent_findings.iter().filter(|f| f.severity == Severity::Critical).count();
        let high = agent_findings.iter().filter(|f| f.severity == Severity::High).count();
        let n = agent_findings.len();
        let mut parts = vec![format!("{n} finding{}", plural(n))];
        if crit > 0 { parts.push(format!("{crit} critical")); }
        if high > 0 { parts.push(format!("{high} high")); }

        o.push_str(&format!("  {} · {}  ({})\n",
            bold(&summary.agent_name),
            dim("AI System"),
            parts.join(" · "),
        ));

        render_findings_by_layer(o, &agent_findings, finding_num);
        o.push('\n');
    }

    // Unattributed findings (no agent_id)
    let unattributed: Vec<&Finding> = findings
        .iter()
        .filter(|f| f.agent_id.is_none())
        .copied()
        .collect();
    if !unattributed.is_empty() {
        let n = unattributed.len();
        o.push_str(&format!("  {} ({n} finding{})\n",
            bold("PROJECT-LEVEL"),
            plural(n),
        ));
        render_findings_by_layer(o, &unattributed, finding_num);
        o.push('\n');
    }
}

/// Render findings grouped by layer subcategories.
fn render_findings_by_layer(o: &mut String, findings: &[&Finding], finding_num: &mut usize) {
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
            render_single_finding(o, f, finding_num);
            *finding_num += 1;
        }
    }
}

fn render_single_finding(o: &mut String, f: &Finding, finding_num: &mut usize) {
    let fid = format!("F-{finding_num:03}");
    let icon = severity_icon(&f.severity);
    let sev = severity_color(&f.severity, f.severity.label());
    let layer_tag = infer_layer_tag(&f.check_id);

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
    let _fid = fid; // retained for JSON/SARIF; hidden from human output
    let llm_badge = if f.l5_analyzed == Some(true) { format!(" {}", yellow("[LLM]")) } else { String::new() };
    o.push_str(&format!(
        "      {}  {}  {}{}  {}\n",
        icon, sev, dim(&format!("[{layer_tag}]")), llm_badge, header_detail,
    ));
    o.push_str(&format!("         {}\n", f.message));

    if let Some(ref loc) = f.file_line_label() {
        o.push_str(&format!("         {}  {}\n", dim("File:"), loc));
    }
    if let Some(ref fix) = f.fix {
        o.push_str(&format!("         {}  {}\n", dim("Fix:"), clean_fix_message(fix)));
    }

    // L5 LLM verdict line
    if f.l5_analyzed == Some(true) {
        if let Some(conf) = f.confidence {
            let level = f.confidence_level.as_deref().unwrap_or("?");
            let verdict = match level {
                "PASS" => "confirmed",
                "LIKELY_PASS" => "likely valid",
                "UNCERTAIN" => "uncertain",
                "LIKELY_FAIL" => "likely issue",
                "FAIL" => "confirmed issue",
                _ => level,
            };
            o.push_str(&format!(
                "         {}  {} (confidence {:.0}%)\n",
                yellow("LLM:"), verdict, conf,
            ));
        }
    }

    // Docs command hint (if article reference exists)
    if let Some(art) = article
        && let Some(art_num) = extract_article_number(art) {
            o.push_str(&format!("         {}  {}\n", dim("Docs:"), dim(&format!("complior docs --article {art_num}"))));
        }

    o.push('\n');
}

/// Quiet mode: show only header + score + critical findings.
fn render_quiet_findings(o: &mut String, all_fails: &[&Finding]) {
    let critical: Vec<&Finding> = all_fails
        .iter()
        .filter(|f| f.severity == Severity::Critical)
        .copied()
        .collect();

    if critical.is_empty() {
        return;
    }

    o.push_str(&format!("  {}  ({} critical)\n", bold("CRITICAL FINDINGS"), critical.len()));
    o.push_str(&format!("  {}\n\n", separator()));

    let mut finding_num: usize = 1;
    for f in &critical {
        render_single_finding(o, f, &mut finding_num);
        finding_num += 1;
    }
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

fn render_agent_summaries(o: &mut String, result: &ScanResult) {
    let summaries = match &result.agent_summaries {
        Some(s) if !s.is_empty() => s,
        _ => return,
    };

    let name_width = summaries
        .iter()
        .map(|s| s.agent_name.len())
        .max()
        .unwrap_or(22)
        .clamp(22, 40);
    let rule_width = name_width + 30;

    o.push_str(&format!("\n  {}\n", bold("PER-AGENT SUMMARY")));
    o.push_str(&format!("  {}\n\n", separator()));
    o.push_str(&format!(
        "    {:<name_width$} {:>8} {:>8} {:>6} {:>6}\n",
        "AGENT", "FINDINGS", "CRITICAL", "HIGH", "FILES",
    ));
    o.push_str(&format!("    {}\n", dim(&"-".repeat(rule_width))));
    for s in summaries {
        o.push_str(&format!(
            "    {:<name_width$} {:>8} {:>8} {:>6} {:>6}\n",
            s.agent_name, s.finding_count, s.critical_count, s.high_count, s.file_count,
        ));
    }
    o.push('\n');
}

// ── Small helpers ────────────────────────────────────────────────

/// Strip engine prefix patterns from fix messages (e.g. "Fix complior.injection: ...").
fn clean_fix_message(fix: &str) -> &str {
    if let Some(rest) = fix.strip_prefix("Fix ")
        && let Some(idx) = rest.find(": ")
            && rest[..idx].starts_with("complior.") {
                return rest[idx + 2..].trim();
            }
    fix
}

/// Extract article number from reference like "Art. 50(1)" → "50", "Art.6" → "6".
fn extract_article_number(art_ref: &str) -> Option<&str> {
    let s = art_ref.strip_prefix("Art.").or_else(|| art_ref.strip_prefix("Art "))?;
    let s = s.trim_start();
    // Take digits (stop at parenthesis, space, etc.)
    let end = s.find(|c: char| !c.is_ascii_digit()).unwrap_or(s.len());
    if end == 0 {
        return None;
    }
    Some(&s[..end])
}
