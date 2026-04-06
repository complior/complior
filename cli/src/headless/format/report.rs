//! Human-readable compliance readiness report rendering.
//!
//! Renders `ComplianceReport` JSON (from `GET /report/status`) as a colored
//! terminal output matching the mockup in `docs/REPORT.md` §"Полный CLI вывод".

use super::colors::{
    bar_empty, bar_filled, bold, bold_green, bold_red, bold_yellow, cyan, dim, green, red, yellow,
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
    render_assessment(&mut o, obligations, summary, documents, actions, w);
    render_quick_wins(&mut o, actions, w);
    render_actions_section(&mut o, actions, w);
    render_legend(&mut o, w);
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

    let entries: [(&str, &str); 7] = [
        ("Scan", "scan"),
        ("Scan (security)", "scanSecurity"),
        ("Scan (LLM)", "scanLlm"),
        ("Docs", "documents"),
        ("Passports", "passports"),
        ("Eval", "eval"),
        ("Evidence", "evidence"),
    ];

    // Each score on its own line with a bar
    o.push_str(&format!("  {}\n", bold("Breakdown:")));

    for (label, key) in &entries {
        let dim_obj = &dims[*key];
        let available = dim_obj["available"].as_bool().unwrap_or(false);
        if available {
            let score = dim_obj["score"].as_f64().unwrap_or(0.0) as u32;
            let bar = render_bar(score as f64, 10);
            o.push_str(&format!(
                "    {:<17} {:>3}  {}\n",
                label,
                score,
                score_bar_color(score as f64, &bar),
            ));
        } else {
            o.push_str(&format!(
                "    {:<17}   {}  {}\n",
                label,
                dim("—"),
                dim("not run"),
            ));
        }
    }

    // Average line
    let readiness_score = readiness["readinessScore"].as_f64().unwrap_or(0.0) as u32;
    let zone = readiness["zone"].as_str().unwrap_or("red");
    let avg_bar = render_bar(readiness_score as f64, 10);
    o.push_str(&format!("    {:<17} {}\n", "", dim("──")));
    o.push_str(&format!(
        "    {:<17} {:>3}  {}  {}\n",
        bold("Average"),
        readiness_score,
        score_bar_color(readiness_score as f64, &avg_bar),
        zone_color(zone, &zone.to_uppercase()),
    ));

    // Critical caps
    if let Some(caps) = readiness["criticalCaps"].as_array() {
        if !caps.is_empty() {
            o.push_str(&format!("\n  {} Active Caps:\n", bold_red("⚠")));
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
// R3: obligations split into covered/uncovered with guidance
// R7: centered progress bar for obligations

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

    // R7: Centered progress bar
    let bar_raw = render_bar(pct as f64, 20);
    let bar_colored = score_bar_color(pct as f64, &bar_raw);
    let pct_label = format!("{pct}%");
    // Visual: " Progress: " (11) + bar (20) + " " (1) + pct_label + " " (1)
    let middle_visual = 11 + 20 + 1 + pct_label.len() + 1;
    let side_l = inner.saturating_sub(middle_visual) / 2;
    let side_r = inner.saturating_sub(middle_visual + side_l);
    o.push_str(&format!(
        "  {} Progress: {} {} {}\n\n",
        dim(&"─".repeat(side_l)),
        bar_colored,
        pct_label,
        dim(&"─".repeat(side_r)),
    ));

    // By-article breakdown — group into major articles
    if let Some(articles) = obligations["byArticle"].as_array() {
        let grouped = group_by_major_article(articles);

        // R3: Split into covered (>0) and uncovered (0%)
        let covered_arts: Vec<&(String, u64, u64, Option<String>)> =
            grouped.iter().filter(|(_, c, _, _)| *c > 0).collect();
        let uncovered_arts: Vec<&(String, u64, u64, Option<String>)> =
            grouped.iter().filter(|(_, c, _, _)| *c == 0).collect();

        // Show covered articles with progress bars
        for (label, art_covered, art_total, _title) in &covered_arts {
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

        // R3: Show uncovered articles with guidance
        if !uncovered_arts.is_empty() {
            let uncovered_count = uncovered_arts.len();
            let uncovered_total_obls: u64 = uncovered_arts.iter().map(|(_, _, t, _)| *t).sum();
            o.push_str(&format!(
                "\n  {} ({uncovered_count} articles, {uncovered_total_obls} obligations):\n",
                bold_yellow("⚠ MANUAL REVIEW REQUIRED"),
            ));

            let max_shown = 8;
            for (i, (label, _, art_total, first_title)) in uncovered_arts.iter().enumerate() {
                if i >= max_shown {
                    let remaining = uncovered_count - max_shown;
                    o.push_str(&format!(
                        "  {}  {}\n",
                        dim(&format!("(+{remaining} more)")),
                        dim("-> run complior obligations for full list"),
                    ));
                    break;
                }
                let topic = first_title.as_deref().unwrap_or("");
                // Truncate topic to fit
                let topic_display: String = if topic.chars().count() > 40 {
                    format!("{}…", topic.chars().take(39).collect::<String>())
                } else {
                    topic.to_string()
                };
                o.push_str(&format!(
                    "  {:<10} 0/{:<3} {}\n",
                    label, art_total, topic_display,
                ));
                // Guidance arrow
                let art_num = label.strip_prefix("Art. ").unwrap_or(label);
                let guidance = article_guidance(art_num);
                o.push_str(&format!(
                    "  {}  {} {}\n",
                    " ".repeat(14),
                    dim("->"),
                    dim(guidance),
                ));
            }
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

        // Passport command hints
        if !ps.is_empty() {
            o.push_str(&format!(
                "\n  {} {}     {}\n",
                dim("->"),
                dim("complior agent list"),
                dim("view all passports"),
            ));
            o.push_str(&format!(
                "  {} {}  {}\n",
                dim("->"),
                dim("complior agent show <name>"),
                dim("view passport details"),
            ));
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

// ── Assessment (R9) ────────────────────────────────────────────────

fn render_assessment(
    o: &mut String,
    obligations: &serde_json::Value,
    summary: &serde_json::Value,
    documents: &serde_json::Value,
    actions: &serde_json::Value,
    w: usize,
) {
    let inner = w.saturating_sub(4);
    let score = summary["readinessScore"].as_f64().unwrap_or(0.0) as u32;
    let zone = summary["zone"].as_str().unwrap_or("red");
    let zone_upper = zone.to_uppercase();
    let days = summary["daysUntilEnforcement"].as_u64().unwrap_or(0);

    let docs_total = documents["total"].as_u64().unwrap_or(0);
    let docs_missing = documents["byStatus"]["missing"].as_u64().unwrap_or(0);
    let docs_created = docs_total - docs_missing;
    let docs_reviewed = documents["byStatus"]["reviewed"].as_u64().unwrap_or(0);

    let obl_total = obligations["total"].as_u64().unwrap_or(0);
    let obl_covered = obligations["covered"].as_u64().unwrap_or(0);
    let obl_pct = obligations["coveragePercent"].as_f64().unwrap_or(0.0) as u32;

    // Count auto-fixable actions and total impact
    let (fixable_count, fixable_impact) = if let Some(items) = actions["actions"].as_array() {
        let mut count = 0u64;
        let mut impact = 0i64;
        for a in items {
            if a["fixAvailable"].as_bool().unwrap_or(false) {
                count += 1;
                impact += a["scoreImpact"].as_f64().unwrap_or(0.0) as i64;
            }
        }
        (count, impact)
    } else {
        (0, 0)
    };

    o.push_str(&format!("  {}\n\n", bold("ASSESSMENT")));

    // Build the assessment paragraph
    let mut text = format!(
        "Your project is in the {zone_upper} zone ({score}/100) with {days} days until enforcement."
    );
    text.push_str(&format!(
        " {docs_created} of {docs_total} documents created ({docs_reviewed} reviewed)."
    ));
    text.push_str(&format!(
        " {obl_covered} of {obl_total} obligations covered ({obl_pct}%)."
    ));
    if fixable_count > 0 {
        text.push_str(&format!(
            " {fixable_count} issue{} {} auto-fixable for ~+{fixable_impact} pts.",
            if fixable_count == 1 { "" } else { "s" },
            if fixable_count == 1 { "is" } else { "are" },
        ));
    }
    text.push_str(&format!(" {}", zone_recommendation(zone)));

    // Word-wrap and output
    let max_text_w = inner.saturating_sub(2);
    for line in wrap_text(&text, max_text_w) {
        o.push_str(&format!("  {line}\n"));
    }

    o.push('\n');
}

// ── Quick Wins (R6) ────────────────────────────────────────────────

fn render_quick_wins(o: &mut String, actions: &serde_json::Value, _w: usize) {
    let items = match actions["actions"].as_array() {
        Some(arr) => arr,
        None => return,
    };

    // Filter auto-fixable, sort by impact descending
    let mut fixable: Vec<&serde_json::Value> = items
        .iter()
        .filter(|a| a["fixAvailable"].as_bool().unwrap_or(false))
        .collect();

    if fixable.is_empty() {
        return;
    }

    fixable.sort_by(|a, b| {
        let ia = b["scoreImpact"].as_f64().unwrap_or(0.0);
        let ib = a["scoreImpact"].as_f64().unwrap_or(0.0);
        ia.partial_cmp(&ib).unwrap_or(std::cmp::Ordering::Equal)
    });

    o.push_str(&format!(
        "  {}  (auto-fixable, run {})\n\n",
        bold("⚡ QUICK WINS"),
        dim("complior fix"),
    ));

    let mut total_impact: i64 = 0;
    for action in fixable.iter().take(5) {
        let impact = action["scoreImpact"].as_f64().unwrap_or(0.0) as i64;
        let title = action["title"]
            .as_str()
            .unwrap_or(action["id"].as_str().unwrap_or("?"));
        let article = action["article"].as_str().unwrap_or("");
        let source = action["source"].as_str().unwrap_or("?");
        let (tag, _) = source_tag(source);

        let art_suffix = if article.is_empty() {
            String::new()
        } else {
            format!(" ({})", article)
        };

        // Truncate title+article to fit
        let title_art: String = if title.chars().count() + art_suffix.chars().count() > 48 {
            let max = 48usize.saturating_sub(art_suffix.chars().count());
            format!(
                "{}…{}",
                title.chars().take(max.saturating_sub(1)).collect::<String>(),
                art_suffix
            )
        } else {
            format!("{title}{art_suffix}")
        };

        o.push_str(&format!(
            "    {:<7} {:<48}  {}\n",
            green(&format!("+{impact} pts")),
            title_art,
            tag,
        ));
        total_impact += impact;
    }

    o.push_str(&format!(
        "\n  Total potential: {}\n\n",
        bold_green(&format!("+{total_impact} pts")),
    ));
}

// ── Priority Actions (R1+R2+R5+R8) ────────────────────────────────

fn render_actions_section(o: &mut String, actions: &serde_json::Value, w: usize) {
    let shown = actions["shownActions"].as_u64().unwrap_or(0);
    let total = actions["totalActions"].as_u64().unwrap_or(0);

    o.push_str(&format!(
        "  {}  top {shown} of {total}\n\n",
        bold("PRIORITY ACTIONS"),
    ));

    if let Some(items) = actions["actions"].as_array() {
        let inner = w.saturating_sub(4);

        // Header
        o.push_str(&format!(
            "  {:>2} {:<4}  {:>4}  {:<48} {}\n",
            "#", "Sev", "Days", "Action", "+pts",
        ));
        o.push_str(&format!("  {}\n", dim(&"─".repeat(inner))));

        // Column prefix width before Action: "  ##_SSSS__DDDD__" = 17 visual chars
        let action_col_start: usize = 17;

        for action in items.iter().take(20) {
            let rank = action["rank"].as_u64().unwrap_or(0);
            let source = action["source"].as_str().unwrap_or("?");
            let title = action["title"]
                .as_str()
                .unwrap_or(action["id"].as_str().unwrap_or("?"));
            let command = action["command"].as_str().unwrap_or("");
            let severity = action["severity"].as_str().unwrap_or("low");
            let days_left = action["daysLeft"].as_u64();
            let impact = action["scoreImpact"].as_f64().unwrap_or(0.0) as i32;
            let fix_available = action["fixAvailable"].as_bool().unwrap_or(false);

            // Severity: 4 visual chars
            let sev_colored = match severity {
                "critical" => bold_red("CRIT"),
                "high" => red("HIGH"),
                "medium" => yellow("MED"),
                _ => dim("LOW"),
            };
            let sev_visual: usize = match severity {
                "critical" | "high" => 4,
                _ => 3,
            };

            // R8: Days color-coded
            let (days_colored, days_visual) = format_days_colored(days_left);

            // R5: Source tag
            let (tag, tag_visual) = source_tag(source);

            // Impact string: +N for score impact, dimmed "—" for manual-only items
            let (impact_str, impact_visual) = if impact > 0 {
                let s = format!("+{impact}");
                let len = s.len();
                (s, len)
            } else {
                (dim("—"), 1)
            };
            let fix_marker = if fix_available { " ⚡" } else { "" };
            let fix_visual: usize = if fix_available { 2 } else { 0 };

            // R1: Use title instead of ID. Truncate to fit.
            let pts_suffix = format!("{impact_str}{fix_marker}");
            let pts_visual = impact_visual + fix_visual;
            let avail_for_title =
                w.saturating_sub(action_col_start + tag_visual + 1 + pts_visual + 2);
            let title_display: String = if title.chars().count() > avail_for_title {
                if avail_for_title > 1 {
                    format!(
                        "{}…",
                        title.chars().take(avail_for_title - 1).collect::<String>()
                    )
                } else {
                    "…".to_string()
                }
            } else {
                title.to_string()
            };
            let title_visual = title_display.chars().count();

            // Compute padding to right-align impact
            let used =
                action_col_start + tag_visual + 1 + title_visual + fix_visual + impact_visual;
            let gap = w.saturating_sub(used).max(1);

            // Build the line manually to handle ANSI padding
            let sev_pad = " ".repeat(4usize.saturating_sub(sev_visual));
            let days_pad = " ".repeat(4usize.saturating_sub(days_visual));

            o.push_str(&format!(
                "  {rank:>2} {sev_colored}{sev_pad}  {days_pad}{days_colored}  {tag} {title_display}{}{}",
                " ".repeat(gap),
                pts_suffix,
            ));
            o.push('\n');

            // R2: Second row with command
            if !command.is_empty() {
                let cmd_indent = " ".repeat(action_col_start - 2);
                o.push_str(&format!(
                    "  {cmd_indent}{} {}\n",
                    dim("->"),
                    dim(command),
                ));
            }
        }
    }

    o.push('\n');
}

// ── Legend (R4) ─────────────────────────────────────────────────────

fn render_legend(o: &mut String, w: usize) {
    let inner = w.saturating_sub(4);
    o.push_str(&format!("  {}\n", dim(&"─".repeat(inner))));
    o.push_str(&format!("  {}\n", bold("LEGEND")));
    o.push_str(&format!(
        "  Sources:   {} code analysis  {} compliance docs  {} EU AI Act\n",
        green("[scan]"),
        yellow("[doc]"),
        red("[obl]"),
    ));
    o.push_str(&format!(
        "             {} agent passport  {} model evaluation\n",
        cyan("[pass]"),
        bold_yellow("[eval]"),
    ));
    o.push_str(&format!(
        "  Severity:  {} = blocking risk  {} = before enforcement\n",
        bold_red("CRIT"),
        red("HIGH"),
    ));
    o.push_str(&format!(
        "             {} = recommended  {} = best practice\n",
        yellow("MED"),
        dim("LOW"),
    ));
    o.push_str(&format!(
        "  Icons:     {} auto-fixable  {} covered  {} missing  {} draft  {} scaffold\n\n",
        bold("⚡"),
        green("✓"),
        red("✗"),
        yellow("~"),
        dim("□"),
    ));
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

/// Zone-based recommendation for the assessment paragraph.
fn zone_recommendation(zone: &str) -> &'static str {
    match zone {
        "green" => "Maintain compliance posture and monitor for changes.",
        "yellow" => "Address remaining gaps to reach audit readiness.",
        "orange" => "Focus on critical uncovered obligations first.",
        _ => "Immediate action required on critical obligations.",
    }
}

/// R8: Color-code days-left value based on urgency.
/// Returns (colored_string, visual_width).
fn format_days_colored(days_left: Option<u64>) -> (String, usize) {
    match days_left {
        Some(0) => (bold_red("NOW!"), 4),
        Some(d) if d <= 30 => {
            let s = format!("{d}");
            let len = s.len();
            (red(&s), len)
        }
        Some(d) if d <= 90 => {
            let s = format!("{d}");
            let len = s.len();
            (yellow(&s), len)
        }
        Some(d) => {
            let s = format!("{d}");
            let len = s.len();
            (s, len)
        }
        None => ("—".to_string(), 1),
    }
}

/// R5: Colored source tag. Returns (colored_tag, visual_width).
fn source_tag(source: &str) -> (String, usize) {
    match source {
        "scan" | "scanner" => (green("[scan]"), 6),
        "doc" | "document" | "documents" => (yellow("[doc]"), 5),
        "obligation" | "obligations" => (red("[obl]"), 5),
        "passport" | "passports" => (cyan("[pass]"), 6),
        "eval" | "evaluation" => (bold_yellow("[eval]"), 6),
        other => {
            let tag = format!("[{other}]");
            let len = tag.len();
            (dim(&tag), len)
        }
    }
}

/// R9: Simple word-wrap for plain text.
fn wrap_text(text: &str, max_width: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut current = String::new();

    for word in text.split_whitespace() {
        if current.is_empty() {
            current = word.to_string();
        } else if current.len() + 1 + word.len() <= max_width {
            current.push(' ');
            current.push_str(word);
        } else {
            lines.push(current);
            current = word.to_string();
        }
    }
    if !current.is_empty() {
        lines.push(current);
    }
    lines
}

/// R3: Map EU AI Act article numbers to actionable guidance.
fn article_guidance(art_num: &str) -> &'static str {
    match art_num {
        "5" => "Verify no banned AI systems are deployed",
        "6" => "Classify your AI system per Annex III criteria",
        "8" => "Meet technical documentation requirements",
        "9" => "Establish and document risk management processes",
        "10" => "Implement data quality and governance measures",
        "11" => "Maintain technical documentation",
        "12" => "Implement record-keeping and logging",
        "13" => "Provide clear information to AI system users",
        "14" => "Ensure effective human oversight mechanisms",
        "15" => "Ensure system accuracy, robustness, cybersecurity",
        "16" => "Establish post-market monitoring system",
        "17" => "Implement quality management system",
        "26" => "Verify deployer obligations are met",
        "27" => "Conduct fundamental rights impact assessment",
        "49" => "Register in the EU database before placing on market",
        "50" => "Meet transparency requirements for AI systems",
        "51" => "Ensure AI literacy across your organization",
        "52" => "Address GPAI model transparency obligations",
        "53" => "Apply systemic risk evaluation and mitigation",
        _ => "Review and address these requirements",
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
/// Returns `Vec<(label, covered, total, first_obligation_title)>` sorted by article number.
fn group_by_major_article(
    articles: &[serde_json::Value],
) -> Vec<(String, u64, u64, Option<String>)> {
    use std::collections::BTreeMap;

    // BTreeMap with numeric key for sorting
    // label → (covered, total, sort_key, first_title)
    let mut groups: BTreeMap<String, (u64, u64, u32, Option<String>)> = BTreeMap::new();

    for art in articles {
        let raw_article = art["article"].as_str().unwrap_or("?");
        let total = art["total"].as_u64().unwrap_or(0);
        let covered = art["covered"].as_u64().unwrap_or(0);
        let label = extract_major_article(raw_article);

        // Get first obligation title from this article group
        let first_title = art["obligations"]
            .as_array()
            .and_then(|obls| obls.first())
            .and_then(|o| o["title"].as_str())
            .map(|s| s.to_string());

        // Extract numeric sort key
        let sort_key = label
            .chars()
            .filter(|c| c.is_ascii_digit())
            .collect::<String>()
            .parse::<u32>()
            .unwrap_or(999);

        let entry = groups.entry(label).or_insert((0, 0, sort_key, None));
        entry.0 += covered;
        entry.1 += total;
        // Keep the first title we find for this group
        if entry.3.is_none() {
            entry.3 = first_title;
        }
    }

    let mut result: Vec<(String, u64, u64, u32, Option<String>)> = groups
        .into_iter()
        .map(|(label, (covered, total, key, title))| (label, covered, total, key, title))
        .collect();
    result.sort_by_key(|(_, _, _, key, _)| *key);

    result
        .into_iter()
        .map(|(label, covered, total, _, title)| (label, covered, total, title))
        .collect()
}
