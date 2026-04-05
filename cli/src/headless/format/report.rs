//! Human-readable compliance readiness report rendering.
//!
//! Renders `ComplianceReport` JSON (from `GET /report/status`) as a colored
//! terminal output matching the mockup in `docs/REPORT.md` §"Полный CLI вывод".

use super::colors::{
    bar_empty, bar_filled, bold, bold_green, bold_red, bold_yellow, dim, green, red, yellow,
};
use super::layers::display_width;

/// Render the full compliance readiness report as colored terminal text.
///
/// Takes the raw JSON from `GET /report/status` and formats it into a
/// human-readable report with box-drawing characters, progress bars,
/// and color coding.
pub fn format_report_human(report: &serde_json::Value) -> String {
    let mut o = String::with_capacity(4096);

    let readiness = &report["readiness"];
    let documents = &report["documents"];
    let obligations = &report["obligations"];
    let passports = &report["passports"];
    // Engine returns "actionPlan", not "actions"
    let actions = if report["actionPlan"].is_object() {
        &report["actionPlan"]
    } else {
        &report["actions"]
    };
    let summary = &report["summary"];

    let w = display_width().max(70);

    render_title_box(&mut o, summary, readiness, w);
    render_readiness_section(&mut o, readiness, w);
    render_two_column(&mut o, documents, obligations, w);
    render_passports_evidence(&mut o, passports, summary, w);
    render_actions_section(&mut o, actions, w);
    render_summary_section(&mut o, summary, documents, w);

    o
}

// ── Title box ──────────────────────────────────────────────────────

fn render_title_box(
    o: &mut String,
    summary: &serde_json::Value,
    readiness: &serde_json::Value,
    w: usize,
) {
    let inner = w.saturating_sub(4);
    let generated = summary["generatedAt"]
        .as_str()
        .unwrap_or("")
        .get(..19)
        .unwrap_or("—");

    o.push('\n');
    // Top border
    o.push_str(&format!("  {}{}{}\n", bold("╔"), bold(&"═".repeat(inner)), bold("╗")));

    // Title lines
    let title = "COMPLIOR READINESS REPORT";
    let subtitle = "EU AI Act · Regulation 2024/1689";
    let dateline = format!("Generated: {generated}");

    for line in [title, subtitle, &dateline] {
        let pad = inner.saturating_sub(line.len());
        let left = pad / 2;
        let right = pad - left;
        o.push_str(&format!(
            "  {}{}{}{}{}",
            bold("║"),
            " ".repeat(left),
            if line == title { bold(line) } else { line.to_string() },
            " ".repeat(right),
            bold("║\n"),
        ));
    }

    // Score in title box
    let score = readiness["readinessScore"].as_f64().unwrap_or(0.0) as u32;
    let zone = readiness["zone"].as_str().unwrap_or("red");
    let zone_upper = zone.to_uppercase();
    let score_line = format!("{score}/100  {zone_upper}");
    let bar = render_bar(score as f64, 30);
    let raw_len = 30 + 2 + score_line.len(); // bar chars + 2 spaces + score text
    let pad_l = inner.saturating_sub(raw_len) / 2;
    let pad_r = inner.saturating_sub(raw_len + pad_l);

    // Empty line
    o.push_str(&format!("  {}{}{}\n", bold("║"), " ".repeat(inner), bold("║")));

    o.push_str(&format!(
        "  {}{}{}{}  {}{}{}",
        bold("║"),
        " ".repeat(pad_l),
        zone_color(zone, &bar),
        " ".repeat(2 - 2), // already accounted
        zone_color(zone, &score_line),
        " ".repeat(pad_r),
        bold("║\n"),
    ));

    // Zone description
    let zone_desc = zone_description(zone);
    let desc_pad = inner.saturating_sub(zone_desc.chars().count());
    let desc_l = desc_pad / 2;
    let desc_r = desc_pad - desc_l;
    o.push_str(&format!(
        "  {}{}{}{}{}",
        bold("║"),
        " ".repeat(desc_l),
        zone_color(zone, zone_desc),
        " ".repeat(desc_r),
        bold("║\n"),
    ));

    o.push_str(&format!("  {}{}{}\n", bold("║"), " ".repeat(inner), bold("║")));

    // Middle border
    o.push_str(&format!("  {}{}{}\n", bold("╠"), bold(&"═".repeat(inner)), bold("╣")));
}

// ── Readiness breakdown ────────────────────────────────────────────

fn render_readiness_section(o: &mut String, readiness: &serde_json::Value, _w: usize) {
    let dims = &readiness["dimensions"];

    let entries: Vec<(&str, &str)> = vec![
        ("Scan", "scan"),
        ("Docs", "documents"),
        ("Passports", "passports"),
        ("Eval", "eval"),
        ("Evidence", "evidence"),
    ];

    // Compact dimension line
    let mut parts: Vec<String> = Vec::new();
    let mut unavailable: Vec<&str> = Vec::new();

    for (label, key) in &entries {
        let dim_obj = &dims[*key];
        let available = dim_obj["available"].as_bool().unwrap_or(false);
        if available {
            let score = dim_obj["score"].as_f64().unwrap_or(0.0) as u32;
            let weight = (dim_obj["weight"].as_f64().unwrap_or(0.0) * 100.0) as u32;
            parts.push(format!("{label}: {score} ({weight}%)"));
        } else {
            unavailable.push(label);
        }
    }

    o.push_str(&format!("  {}  {}\n", bold("Breakdown:"), parts.join("  │  ")));

    if !unavailable.is_empty() {
        o.push_str(&format!(
            "  {}  {} — weight redistributed\n",
            dim("          "),
            dim(&format!("{} not available", unavailable.join(", "))),
        ));
    }

    // Critical caps
    if let Some(caps) = readiness["criticalCaps"].as_array() {
        if !caps.is_empty() {
            o.push_str(&format!("  {} Active Caps:\n", bold_red("⚠")));
            for cap in caps {
                if let Some(text) = cap.as_str() {
                    o.push_str(&format!("    {}\n", red(text)));
                }
            }
        }
    }

    // Days until enforcement
    let days = readiness["daysUntilEnforcement"].as_u64().unwrap_or(0);
    o.push_str(&format!(
        "\n  {} {} days until enforcement (2 Aug 2026)\n\n",
        bold("⏰"),
        days,
    ));
}

// ── Documents + Obligations (two-column) ───────────────────────────

fn render_two_column(
    o: &mut String,
    documents: &serde_json::Value,
    obligations: &serde_json::Value,
    w: usize,
) {
    let inner = w.saturating_sub(4);

    // Documents header
    let total_docs = documents["total"].as_u64().unwrap_or(0);
    let by_status = &documents["byStatus"];
    let reviewed = by_status["reviewed"].as_u64().unwrap_or(0);
    let draft = by_status["draft"].as_u64().unwrap_or(0);
    let scaffold = by_status["scaffold"].as_u64().unwrap_or(0);
    let missing = by_status["missing"].as_u64().unwrap_or(0);
    let created = total_docs - missing;

    o.push_str(&format!(
        "  {}  {created}/{total_docs}\n",
        bold("DOCUMENTS"),
    ));

    // Document status summary
    if reviewed > 0 {
        o.push_str(&format!("  {} {reviewed} reviewed\n", green("✓")));
    }
    if draft > 0 {
        o.push_str(&format!("  {} {draft} draft\n", yellow("~")));
    }
    if scaffold > 0 {
        o.push_str(&format!("  {} {scaffold} scaffold\n", dim("□")));
    }
    if missing > 0 {
        o.push_str(&format!("  {} {missing} missing\n", red("✗")));
    }

    // Individual documents
    if let Some(docs) = documents["documents"].as_array() {
        o.push('\n');
        for doc in docs {
            let status = doc["status"].as_str().unwrap_or("missing");
            let doc_type = doc["docType"].as_str().unwrap_or("?");
            let article = doc["article"].as_str().unwrap_or("");
            let icon = match status {
                "reviewed" => green("✓"),
                "draft" => yellow("~"),
                "scaffold" => dim("□"),
                _ => red("✗"),
            };
            let status_tag = match status {
                "reviewed" => green("RVWD"),
                "draft" => yellow("DRFT"),
                "scaffold" => dim("SCAF"),
                _ => red("MISS"),
            };
            o.push_str(&format!(
                "  {icon} {status_tag}  {:<28} {}\n",
                doc_type,
                dim(article),
            ));
        }
    }

    o.push_str(&format!("\n  {}\n", dim(&"─".repeat(inner))));

    // Obligations
    let total_obl = obligations["total"].as_u64().unwrap_or(0);
    let covered = obligations["covered"].as_u64().unwrap_or(0);
    let pct = obligations["coveragePercent"].as_f64().unwrap_or(0.0) as u32;

    o.push_str(&format!(
        "  {}  {covered}/{total_obl} ({pct}%)\n\n",
        bold("OBLIGATIONS"),
    ));

    // By-article breakdown — group into major articles (Art. 4, Art. 5, ...)
    if let Some(articles) = obligations["byArticle"].as_array() {
        let grouped = group_by_major_article(articles);
        for (label, art_covered, art_total) in &grouped {
            let art_total = (*art_total).max(1);
            let art_pct = (*art_covered as f64 / art_total as f64 * 100.0) as u32;
            let bar = render_bar(art_pct as f64, 10);
            let ratio = format!("{art_covered}/{art_total}");
            o.push_str(&format!(
                "  {:<14} {:>5}  {art_pct:>3}%  {}\n",
                label,
                ratio,
                score_bar_color(art_pct as f64, &bar),
            ));
        }
    }

    // Critical uncovered
    if let Some(critical) = obligations["critical"].as_array() {
        if !critical.is_empty() {
            o.push_str(&format!(
                "\n  {} CRITICAL UNCOVERED:\n",
                bold_red("⚠"),
            ));
            for obl in critical.iter().take(5) {
                let id = obl["id"].as_str().unwrap_or("?");
                let art = obl["article"].as_str().unwrap_or("");
                let title = obl["title"].as_str().unwrap_or("");
                o.push_str(&format!("    {}  {}  {}\n", red(id), dim(art), title));
            }
        }
    }

    o.push_str(&format!("\n  {}\n", dim(&"─".repeat(inner))));
}

// ── Passports + Evidence ───────────────────────────────────────────

fn render_passports_evidence(
    o: &mut String,
    passports: &serde_json::Value,
    summary: &serde_json::Value,
    w: usize,
) {
    let inner = w.saturating_sub(4);
    let total_agents = passports["totalAgents"].as_u64().unwrap_or(0);
    let avg = passports["averageCompleteness"].as_f64().unwrap_or(0.0) as u32;

    o.push_str(&format!(
        "  {}  {total_agents} agents (avg {avg}%)\n\n",
        bold("PASSPORTS"),
    ));

    if let Some(ps) = passports["passports"].as_array() {
        for p in ps {
            let name = p["name"].as_str().unwrap_or("?");
            let completeness = p["completeness"].as_f64().unwrap_or(0.0) as u32;
            let fria = if p["friaCompleted"].as_bool().unwrap_or(false) {
                green("✓")
            } else {
                red("✗")
            };
            let signed = if p["signed"].as_bool().unwrap_or(false) {
                green("✓")
            } else {
                red("✗")
            };
            let bar = render_bar(completeness as f64, 10);
            let missing_fields = p["missingFields"]
                .as_array()
                .map(|arr| arr.len())
                .unwrap_or(0);

            o.push_str(&format!(
                "  {:<22} {} {completeness:>3}%  FRIA:{fria}  Signed:{signed}",
                name,
                score_bar_color(completeness as f64, &bar),
            ));
            if missing_fields > 0 {
                o.push_str(&format!("  {}", dim(&format!("({missing_fields} missing)"))));
            }
            o.push('\n');
        }
    }

    // Evidence summary
    let chain_len = summary["evidenceChainLength"].as_u64().unwrap_or(0);
    let verified = summary["evidenceVerified"].as_bool().unwrap_or(false);
    let verified_icon = if verified { green("✓") } else { red("✗") };

    o.push_str(&format!(
        "\n  {}  {chain_len} entries  (verified: {verified_icon})\n",
        bold("EVIDENCE"),
    ));

    o.push_str(&format!("\n  {}\n", dim(&"─".repeat(inner))));
}

// ── Priority Actions ───────────────────────────────────────────────

fn render_actions_section(o: &mut String, actions: &serde_json::Value, _w: usize) {
    let shown = actions["shownActions"].as_u64().unwrap_or(0);
    let total = actions["totalActions"].as_u64().unwrap_or(0);

    o.push_str(&format!(
        "  {}  top {shown} of {total}\n\n",
        bold("PRIORITY ACTIONS"),
    ));

    if let Some(items) = actions["actions"].as_array() {
        // Header
        o.push_str(&format!(
            "  {:<4} {:<8} {:<24} {:<10} {:<5} {:<5} {}\n",
            "#", "Source", "ID", "Article", "Sev", "Days", "Impact",
        ));
        o.push_str(&format!("  {}\n", dim(&"─".repeat(64))));

        for action in items.iter().take(20) {
            let rank = action["rank"].as_u64().unwrap_or(0);
            let source = action["source"].as_str().unwrap_or("?");
            let id = action["id"].as_str().unwrap_or("?");
            let article = action["article"].as_str().unwrap_or("");
            let severity = action["severity"].as_str().unwrap_or("low");
            let days_left = action["daysLeft"].as_u64();
            let impact = action["scoreImpact"].as_f64().unwrap_or(0.0) as i32;
            let fix_available = action["fixAvailable"].as_bool().unwrap_or(false);

            let sev_colored = match severity {
                "critical" => bold_red("CRIT"),
                "high" => red("HIGH"),
                "medium" => yellow("MED"),
                _ => dim("LOW"),
            };

            let days_str = match days_left {
                Some(0) => bold_red("NOW!"),
                Some(d) => format!("{d}"),
                None => "—".to_string(),
            };

            let impact_str = if impact > 0 {
                format!("+{impact}pts")
            } else {
                "—".to_string()
            };

            let fix_marker = if fix_available { " ⚡" } else { "" };

            // Truncate id to 22 chars
            let id_display: String = if id.len() > 22 {
                format!("{}…", &id[..21])
            } else {
                id.to_string()
            };

            o.push_str(&format!(
                "  {rank:>3}  {source:<8} {id_display:<24} {article:<10} {sev_colored:<5} {days_str:>4}  {impact_str}{fix_marker}\n",
            ));
        }
    }

    // Auto-fixable count
    if let Some(items) = actions["actions"].as_array() {
        let fixable: usize = items
            .iter()
            .filter(|a| a["fixAvailable"].as_bool().unwrap_or(false))
            .count();
        if fixable > 0 {
            o.push_str(&format!(
                "\n  {} {fixable} auto-fixable: run {}\n",
                bold("⚡"),
                dim("complior fix"),
            ));
        }
    }

    o.push('\n');
}

// ── Summary footer ─────────────────────────────────────────────────

fn render_summary_section(
    o: &mut String,
    summary: &serde_json::Value,
    documents: &serde_json::Value,
    w: usize,
) {
    let inner = w.saturating_sub(4);

    // Border
    o.push_str(&format!("  {}{}{}\n", bold("╠"), bold(&"═".repeat(inner)), bold("╣")));

    let score = summary["readinessScore"].as_f64().unwrap_or(0.0) as u32;
    let zone = summary["zone"].as_str().unwrap_or("red");
    let scan = summary["scanScore"]
        .as_f64()
        .map(|s| format!("{:.0}", s))
        .unwrap_or_else(|| "—".to_string());
    let eval = summary["evalScore"]
        .as_f64()
        .map(|s| format!("{:.0}", s))
        .unwrap_or_else(|| "—".to_string());
    let obl_total = summary["obligationsTotal"].as_u64().unwrap_or(0);
    let obl_covered = summary["obligationsCovered"].as_u64().unwrap_or(0);
    let total_findings = summary["totalFindings"].as_u64().unwrap_or(0);
    let critical_findings = summary["criticalFindings"].as_u64().unwrap_or(0);
    let auto_fixable = summary["autoFixable"].as_u64().unwrap_or(0);
    let days = summary["daysUntilEnforcement"].as_u64().unwrap_or(0);
    let version = summary["compliorVersion"].as_str().unwrap_or(env!("CARGO_PKG_VERSION"));

    // Docs: compute created from documents section (total - missing)
    let docs_total = documents["total"].as_u64().unwrap_or(0);
    let docs_missing = documents["byStatus"]["missing"].as_u64().unwrap_or(0);
    let docs_created = docs_total - docs_missing;
    let docs_reviewed = documents["byStatus"]["reviewed"].as_u64().unwrap_or(0);
    let docs_draft = documents["byStatus"]["draft"].as_u64().unwrap_or(0);

    o.push_str(&format!(
        "  {}  Readiness: {score}/100 {}  │  Scan: {scan}  │  Eval: {eval}\n",
        bold("SUMMARY"),
        zone_color(zone, &zone.to_uppercase()),
    ));

    // Docs line: "14/14 created (2 reviewed, 3 draft)" — matches REPORT.md mockup
    let mut docs_detail = Vec::new();
    if docs_reviewed > 0 {
        docs_detail.push(format!("{docs_reviewed} reviewed"));
    }
    if docs_draft > 0 {
        docs_detail.push(format!("{docs_draft} draft"));
    }
    let docs_extra = if docs_detail.is_empty() {
        String::new()
    } else {
        format!("  ({})", docs_detail.join(", "))
    };

    o.push_str(&format!(
        "  {}  Docs: {docs_created}/{docs_total} created{docs_extra}  │  Obligations: {obl_covered}/{obl_total}  │  Findings: {total_findings} ({critical_findings} crit, {auto_fixable} fixable)\n",
        " ".repeat(7),
    ));

    o.push_str(&format!("  {}  ", " ".repeat(7)));
    o.push_str(&format!(
        "{} {days} days until EU AI Act enforcement\n",
        bold("⏰"),
    ));

    o.push_str(&format!(
        "  {}  Complior v{version}\n",
        " ".repeat(7),
    ));

    // Bottom border
    o.push_str(&format!("  {}{}{}\n", bold("╚"), bold(&"═".repeat(inner)), bold("╝")));
    o.push('\n');
}

// ── Helpers ────────────────────────────────────────────────────────

/// Render a fixed-width progress bar.
fn render_bar(percent: f64, width: usize) -> String {
    let filled = ((percent / 100.0) * width as f64).round() as usize;
    let empty = width.saturating_sub(filled);
    format!(
        "{}{}",
        bar_filled().repeat(filled),
        bar_empty().repeat(empty),
    )
}

/// Color a progress bar based on score.
fn score_bar_color(score: f64, text: &str) -> String {
    if score >= 90.0 {
        bold_green(text)
    } else if score >= 70.0 {
        green(text)
    } else if score >= 50.0 {
        yellow(text)
    } else {
        red(text)
    }
}

/// Color text based on readiness zone.
fn zone_color(zone: &str, text: &str) -> String {
    match zone {
        "green" => bold_green(text),
        "yellow" => yellow(text),
        "orange" => bold_yellow(text),
        _ => bold_red(text),
    }
}

/// Zone description text matching REPORT.md spec.
fn zone_description(zone: &str) -> &'static str {
    match zone {
        "green" => "Ready for audit — all key requirements covered",
        "yellow" => "Partial readiness — improvements needed",
        "orange" => "Significant gaps — active work required",
        _ => "Critical unreadiness — urgent action needed",
    }
}

/// Extract the major article number from strings like "Article 10(2)(a)-(e)" → "10",
/// "Annex III point 2" → "Annex III", "Article 50(1)" → "50".
fn extract_major_article(raw: &str) -> String {
    if raw.starts_with("Annex") {
        // Group all Annex entries together: "Annex II ...", "Annex III ..."
        let parts: Vec<&str> = raw.split_whitespace().collect();
        if parts.len() >= 2 {
            return format!("{} {}", parts[0], parts[1]);
        }
        return raw.to_string();
    }
    // "Article 10(2)(a)" → extract "10"
    let s = raw
        .strip_prefix("Article ")
        .or_else(|| raw.strip_prefix("Art. "))
        .or_else(|| raw.strip_prefix("Art."))
        .unwrap_or(raw)
        .trim_start();
    let end = s
        .find(|c: char| !c.is_ascii_digit())
        .unwrap_or(s.len());
    if end == 0 {
        return raw.to_string();
    }
    format!("Art. {}", &s[..end])
}

/// Group `byArticle` JSON entries by major article number.
/// Returns `Vec<(label, covered, total)>` sorted by article number.
fn group_by_major_article(articles: &[serde_json::Value]) -> Vec<(String, u64, u64)> {
    use std::collections::BTreeMap;

    // BTreeMap with numeric key for sorting
    let mut groups: BTreeMap<String, (u64, u64, u32)> = BTreeMap::new(); // label → (covered, total, sort_key)

    for art in articles {
        let raw_article = art["article"].as_str().unwrap_or("?");
        let total = art["total"].as_u64().unwrap_or(0);
        let covered = art["covered"].as_u64().unwrap_or(0);
        let label = extract_major_article(raw_article);

        // Extract numeric sort key
        let sort_key = label
            .chars()
            .filter(|c| c.is_ascii_digit())
            .collect::<String>()
            .parse::<u32>()
            .unwrap_or(999);

        let entry = groups.entry(label).or_insert((0, 0, sort_key));
        entry.0 += covered;
        entry.1 += total;
    }

    let mut result: Vec<(String, u64, u64, u32)> = groups
        .into_iter()
        .map(|(label, (covered, total, key))| (label, covered, total, key))
        .collect();
    result.sort_by_key(|(_, _, _, key)| *key);

    result
        .into_iter()
        .map(|(label, covered, total, _)| (label, covered, total))
        .collect()
}
