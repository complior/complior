use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::headless::format::colors::*;
use crate::headless::format::labels::check_label;
use crate::headless::format::layers::SEP_WIDTH;
use crate::headless::format::{plural, project_name, separator};

/// Run a headless fix (dry-run or apply).
pub async fn run_headless_fix(
    dry_run: bool,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
    use_ai: bool,
) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    // Check engine
    match client.status().await {
        Ok(status) if status.ready => {}
        _ => {
            eprintln!("Error: Cannot connect to engine at {engine_url}");
            return 1;
        }
    }

    let scan_path = super::common::resolve_project_path(path);

    // Check if engine already has a scan result (may be from deep/tier2 scan).
    // If yes — reuse it to avoid overwriting deep scan findings with a regular scan.
    let preview = client.get_json("/fix/preview").await;
    let cached_fixes: Option<&Vec<serde_json::Value>> = preview
        .as_ref()
        .ok()
        .and_then(|v| v.get("fixes"))
        .and_then(|v| v.as_array())
        .filter(|arr| !arr.is_empty());

    // Two paths: use cached scan or trigger fresh scan
    let (fixable, current_score) = if let Some(fixes) = cached_fixes {
        // Engine has existing scan result — extract fixable check IDs from preview
        let check_ids: Vec<String> = fixes
            .iter()
            .filter_map(|f| f.get("checkId").and_then(|v| v.as_str()).map(String::from))
            .collect();
        // Get current score from status endpoint (lightweight, no re-scan)
        let score = client
            .get_json("/status")
            .await
            .ok()
            .and_then(|v| v.get("score").and_then(|s| s.as_f64()))
            .unwrap_or(0.0);
        (check_ids, score)
    } else {
        // No previous scan — run a fresh one
        match client.scan(&scan_path).await {
            Ok(result) => {
                let ids: Vec<String> = result
                    .findings
                    .iter()
                    .filter(|f| f.fix.is_some())
                    .map(|f| f.check_id.clone())
                    .collect();
                (ids, result.score.total_score)
            }
            Err(e) => {
                eprintln!("Scan failed: {e}");
                return 1;
            }
        }
    };

    if fixable.is_empty() {
        if json {
            println!("{{\"dryRun\": {dry_run}, \"changes\": [], \"message\": \"No fixable findings\"}}");
        } else {
            println!("No fixable findings. Score: {current_score:.0}/100");
        }
        return 0;
    }

    if dry_run {
        // Request dry-run from engine
        match client.fix_dry_run(&fixable).await {
            Ok(dr_result) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&dr_result).unwrap_or_default());
                } else {
                    print!("{}", format_dry_run_report(&dr_result, current_score, &scan_path));
                }
            }
            Err(_) => {
                // Offline estimate — rough approximation based on fix count
                let impact = (fixable.len() as f64 * 3.0).min(60.0) as i32;
                let predicted = (current_score + impact as f64).min(100.0);
                if json {
                    println!("{{\"dryRun\": true, \"fixable\": {}, \"currentScore\": {current_score:.0}, \"predictedScore\": {predicted:.0}}}", fixable.len());
                } else {
                    println!("Dry-Run Fix Analysis (offline estimate)");
                    println!("Fixable: {} findings", fixable.len());
                    println!("Predicted: {current_score:.0} -> {predicted:.0} (+{impact})");
                }
            }
        }
    } else {
        // Apply all fixes via engine
        let body = serde_json::json!({ "useAi": use_ai, "projectPath": scan_path });
        if use_ai && !json {
            println!("AI-enriched mode: documents will be enhanced with LLM-generated content\n");
        }
        // LLM enrichment can take minutes for multiple documents — use long timeout
        let fix_result = if use_ai {
            client.post_json_long("/fix/apply-all", &body).await
        } else {
            client.post_json("/fix/apply-all", &body).await
        };
        match fix_result {
            Ok(resp) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&resp).unwrap_or_default());
                } else {
                    print!("{}", format_fix_report(&resp, &scan_path));
                }
            }
            Err(e) => {
                eprintln!("Fix apply failed: {e}");
                return 1;
            }
        }
    }

    0
}

// ── Report formatting ────────────────────────────────────────────

/// Parsed fix result entry for grouping and rendering.
struct FixEntry {
    check_id: String,
    fix_type: String,
    article: String,
    description: String,
    applied: bool,
    files: Vec<String>,
    manual_fields: Vec<String>,
    error: Option<String>,
    /// True if all actions are type "create" (scaffold / boilerplate).
    is_scaffold: bool,
}

fn extract_entries(resp: &serde_json::Value) -> Vec<FixEntry> {
    let results = match resp.get("results").and_then(|v| v.as_array()) {
        Some(r) => r,
        None => return Vec::new(),
    };

    results.iter().map(|r| {
        let plan = r.get("plan").unwrap_or(r);
        let check_id = plan.get("checkId").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        let fix_type = plan.get("fixType").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        let article = plan.get("article").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let description = plan.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let applied = r.get("applied").and_then(|v| v.as_bool()).unwrap_or(false);
        let error = r.get("error").and_then(|v| v.as_str()).map(String::from);

        let files: Vec<String> = plan
            .get("actions")
            .and_then(|v| v.as_array())
            .map(|actions| {
                actions.iter()
                    .filter_map(|a| a.get("path").and_then(|v| v.as_str()).map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        let manual_fields: Vec<String> = plan
            .get("manualFields")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default();

        // Scaffold detection: all actions are type "create" → boilerplate, not inline
        let is_scaffold = plan
            .get("actions")
            .and_then(|v| v.as_array())
            .map(|actions| {
                actions.iter().all(|a| {
                    a.get("type").and_then(|v| v.as_str()) == Some("create")
                })
            })
            .unwrap_or(true);

        FixEntry { check_id, fix_type, article, description, applied, files, manual_fields, error, is_scaffold }
    }).collect()
}

// ── Scaffold helpers ─────────────────────────────────────────────

/// Pad article to at least 9 chars so there's always a gap before the label.
/// "Art. 4" → "Art. 4   ", "Art. 50(1)" → "Art. 50(1)", "Art. 5(1)(f)" → "Art. 5(1)(f)"
fn pad_article(article: &str) -> String {
    format!("{:<9}", article)
}

fn scaffold_badge() -> String {
    yellow("[SCAFFOLD]")
}

fn scaffold_hint(check_id: &str, fix_type: &str) -> &'static str {
    match fix_type {
        "template_generation" => "Fill placeholders and review with your compliance team",
        "metadata_generation" => "Populate [TO BE SET] fields with actual system metadata",
        "dependency_fix" => "Follow the upgrade plan and run dependency audit",
        "config_fix" => match check_id {
            id if id.contains("bias") => "Populate test data paths and adjust fairness thresholds",
            id if id.contains("ci") => "Adjust workflow triggers and scan thresholds for your CI",
            id if id.contains("nhi") => "Move actual secrets to vault or environment variables",
            _ => "Review generated config and customize for your project",
        },
        "code_injection" => "Import this module into your codebase and wire into your pipeline",
        _ => "Review and customize for your project",
    }
}

// ── Apply report ─────────────────────────────────────────────────

fn format_fix_report(resp: &serde_json::Value, scan_path: &str) -> String {
    let mut o = String::with_capacity(8192);

    let summary = resp.get("summary");
    let score_before = summary.and_then(|s| s.get("scoreBefore")).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let score_after = summary.and_then(|s| s.get("scoreAfter")).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let applied_count = summary.and_then(|s| s.get("applied")).and_then(|v| v.as_u64()).unwrap_or(0);
    let failed_count = summary.and_then(|s| s.get("failed")).and_then(|v| v.as_u64()).unwrap_or(0);

    let entries = extract_entries(resp);

    // Header
    render_fix_header(&mut o, scan_path, applied_count, failed_count, false);

    // Score
    render_score_line(&mut o, score_before, score_after, applied_count);

    // Group entries
    let (docs, code, config_deps) = group_entries(&entries);

    if !docs.is_empty()       { render_doc_section(&mut o, &docs); }
    if !code.is_empty()        { render_code_section(&mut o, &code); }
    if !config_deps.is_empty() { render_config_dep_section(&mut o, &config_deps); }

    // Failures
    let failures: Vec<&FixEntry> = entries.iter().filter(|e| !e.applied).collect();
    if !failures.is_empty() {
        render_failures(&mut o, &failures);
    }

    // Unfixed findings (manual action needed)
    render_unfixed_findings(&mut o, resp);

    // Next steps
    let has_todos = docs.iter().any(|e| !e.manual_fields.is_empty());
    let has_scaffold = entries.iter().any(|e| e.applied && e.is_scaffold);
    render_next_steps(&mut o, has_todos, has_scaffold);

    o
}

fn render_fix_header(o: &mut String, scan_path: &str, applied: u64, failed: u64, is_preview: bool) {
    let mode = if is_preview { "Fix Preview" } else { "Fix Report" };
    let subtitle = if is_preview { "Dry Run · No Files Modified" } else { "EU AI Act Auto-Remediation" };
    o.push('\n');
    o.push_str(&format!("  {}\n", bold(&format!("◆ Complior {mode}  ·  {subtitle}"))));
    o.push_str(&format!("  {}\n", separator()));
    o.push_str(&format!("  {}{}\n", dim(&format!("{:<10}", "Project")), project_name(scan_path)));
    if is_preview {
        o.push_str(&format!("  {}{}\n", dim(&format!("{:<10}", "Fixes")), format!("{applied} planned")));
    } else {
        let fix_summary = if failed > 0 {
            format!("{applied} applied · {}", bold_red(&format!("{failed} failed")))
        } else {
            format!("{applied} applied · 0 failed")
        };
        o.push_str(&format!("  {}{}\n", dim(&format!("{:<10}", "Fixes")), fix_summary));
    }
    o.push_str(&format!("  {}\n", separator()));
}

fn render_score_line(o: &mut String, before: f64, after: f64, applied: u64) {
    let label = "SCORE";
    let score_text = format!("{:.0} → {:.0}", before, after);
    let pad = SEP_WIDTH.saturating_sub(label.len() + score_text.len());
    o.push_str(&format!("  {}{}{}\n", bold(label), " ".repeat(pad), score_color(after, &score_text)));
    if (before - after).abs() < 0.5 && applied > 0 {
        o.push_str(&format!("  {}\n", dim("(category improvements below weighted rounding threshold)")));
    }
    o.push_str(&format!("  {}\n\n", separator()));
}

/// Group entries into (documents, code/inline, config+deps).
fn group_entries(entries: &[FixEntry]) -> (Vec<&FixEntry>, Vec<&FixEntry>, Vec<&FixEntry>) {
    let mut docs = Vec::new();
    let mut code = Vec::new();
    let mut config_deps = Vec::new();

    for e in entries {
        if !e.applied { continue; }
        match e.fix_type.as_str() {
            "template_generation" | "metadata_generation" => docs.push(e),
            "code_injection" => code.push(e),
            "config_fix" | "dependency_fix" => config_deps.push(e),
            _ => code.push(e),
        }
    }

    (docs, code, config_deps)
}

// ── Document section ─────────────────────────────────────────────

fn render_doc_section(o: &mut String, entries: &[&FixEntry]) {
    o.push_str(&format!("  {}  ({} fix{})\n\n",
        bold("DOCUMENTS CREATED"),
        entries.len(),
        plural_es(entries.len()),
    ));

    for e in entries {
        let icon = green("✓");
        let article = if e.article.is_empty() { String::new() } else { format!("{} ", pad_article(&e.article)) };
        let label = check_label(&e.check_id);
        let badge = if e.is_scaffold { format!("  {}", scaffold_badge()) } else { String::new() };
        o.push_str(&format!("    {}  {}{}{}\n", icon, bold(&article), label, badge));

        for file in &e.files {
            o.push_str(&format!("                 → {}\n", cyan(file)));
        }

        if !e.manual_fields.is_empty() {
            let shown: Vec<&str> = e.manual_fields.iter().take(3).map(|s| s.as_str()).collect();
            let mut todo_text = shown.join(", ");
            let remaining = e.manual_fields.len().saturating_sub(3);
            if remaining > 0 {
                todo_text.push_str(&format!(" (+ {remaining} more)"));
            }
            o.push_str(&format!("                 {}\n", yellow(&format!("TODO: {todo_text}"))));
        }

        if e.is_scaffold {
            let hint = scaffold_hint(&e.check_id, &e.fix_type);
            o.push_str(&format!("                 {} {}\n", dim("↳"), dim(hint)));
        }
        o.push('\n');
    }
}

// ── Code section ─────────────────────────────────────────────────

/// Normalize a code fix description for dedup grouping.
/// Strips trailing " at path:line" so fixes of the same kind merge.
/// "Inline fix: wrap bare LLM call at src/chat/anthropic.ts:3" → "Wrap bare LLM call"
fn normalize_code_desc(desc: &str) -> String {
    // Strip "Inline fix: " prefix
    let base = desc
        .strip_prefix("Inline fix: ")
        .unwrap_or(desc);
    // Strip " at <path>" suffix (everything after last " at ")
    let core = if let Some(pos) = base.rfind(" at ") {
        &base[..pos]
    } else if let Some(pos) = base.rfind(" from ") {
        &base[..pos]
    } else {
        base
    };
    // Capitalize first letter
    let mut s = core.to_string();
    if let Some(first) = s.get_mut(0..1) {
        first.make_ascii_uppercase();
    }
    s
}

/// Classify a code fix entry into a sub-group name.
fn code_subgroup(check_id: &str) -> &'static str {
    if check_id.contains("bare-llm") || check_id.contains("bare-call") { return "SDK Wrapper"; }
    if check_id.contains("security-risk") || check_id.contains("unsafe-deser") { return "Security Fixes"; }
    if check_id.contains("error-handling") { return "Error Handling"; }
    if check_id.contains("nhi") || check_id.contains("detect-secrets") { return "Secret Externalization"; }
    if check_id.contains("banned") { return "Prohibited Dependencies"; }
    if check_id.contains("bandit") { return "Python Security"; }
    "Other Code Fixes"
}

fn render_code_section(o: &mut String, entries: &[&FixEntry]) {
    o.push_str(&format!("  {}  ({} fix{})\n\n",
        bold("CODE FIXES — INLINE"),
        entries.len(),
        plural_es(entries.len()),
    ));

    // Sub-group by category
    let group_order = [
        "SDK Wrapper", "Security Fixes", "Error Handling",
        "Secret Externalization", "Prohibited Dependencies",
        "Python Security", "Other Code Fixes",
    ];
    for group_name in &group_order {
        let group: Vec<&&FixEntry> = entries.iter()
            .filter(|e| code_subgroup(&e.check_id) == *group_name)
            .collect();
        if group.is_empty() { continue; }

        let count = group.len();
        let all_scaffold = group.iter().all(|e| e.is_scaffold);
        let group_badge = if all_scaffold { format!("  {}", scaffold_badge()) } else { String::new() };
        o.push_str(&format!("    {} ({count} fix{}){}\n",
            bold(group_name),
            plural_es(count),
            group_badge,
        ));

        // Deduplicate: same article + normalized description → merge file lists
        // Descriptions often end with " at file:line" — strip that for grouping
        let mut merged: Vec<(&str, String, Vec<&str>, bool)> = Vec::new();
        for e in &group {
            let norm = normalize_code_desc(&e.description);
            if let Some(existing) = merged.iter_mut().find(|(_, d, _, _)| *d == norm) {
                for f in &e.files {
                    existing.2.push(f.as_str());
                }
                existing.3 = existing.3 && e.is_scaffold;
            } else {
                let files: Vec<&str> = e.files.iter().map(|f| f.as_str()).collect();
                merged.push((&e.article, norm, files, e.is_scaffold));
            }
        }

        for (article, description, files, is_scaffold) in &merged {
            let icon = green("✓");
            let art_display = if article.is_empty() { String::new() } else { format!("{} ", pad_article(article)) };
            let badge = if *is_scaffold && !all_scaffold { format!("  {}", scaffold_badge()) } else { String::new() };
            o.push_str(&format!("      {}  {}{}{}\n", icon, bold(&art_display), description, badge));

            // Dedup file paths, then show first 2 + collapse
            let mut unique_files: Vec<&str> = Vec::new();
            for f in files {
                if !unique_files.contains(f) {
                    unique_files.push(f);
                }
            }
            let shown = unique_files.len().min(2);
            let file_list: Vec<&str> = unique_files.iter().take(shown).copied().collect();
            let extra = unique_files.len().saturating_sub(shown);
            let mut file_text = file_list.join(", ");
            if extra > 0 {
                file_text.push_str(&format!(" (+ {extra} more)"));
            }
            o.push_str(&format!("                     {}\n", dim(&file_text)));

            if *is_scaffold && !all_scaffold {
                o.push_str(&format!("                     {} {}\n", dim("↳"), dim("Integrate into your request pipeline and customize for your project")));
            }
        }

        if all_scaffold {
            o.push_str(&format!("      {} {}\n", dim("↳"), dim("Integrate into your request pipeline and customize for your project")));
        }
        o.push('\n');
    }
}

// ── Config & dependencies section ────────────────────────────────

fn render_config_dep_section(o: &mut String, entries: &[&FixEntry]) {
    o.push_str(&format!("  {}  ({} fix{})\n\n",
        bold("CONFIG & DEPENDENCIES"),
        entries.len(),
        plural_es(entries.len()),
    ));

    for e in entries {
        let icon = green("✓");
        let article = if e.article.is_empty() { String::new() } else { format!("{} ", pad_article(&e.article)) };
        let label = check_label(&e.check_id);
        let file_text = if e.files.is_empty() {
            String::new()
        } else {
            format!(" → {}", e.files[0])
        };
        let badge = if e.is_scaffold { format!("  {}", scaffold_badge()) } else { String::new() };
        o.push_str(&format!("    {}  {}{}{}{}\n", icon, bold(&article), label, dim(&file_text), badge));

        if e.is_scaffold {
            let hint = scaffold_hint(&e.check_id, &e.fix_type);
            o.push_str(&format!("                 {} {}\n", dim("↳"), dim(hint)));
        }
    }
    o.push('\n');
}

// ── Failures section ─────────────────────────────────────────────

fn render_failures(o: &mut String, failures: &[&FixEntry]) {
    o.push_str(&format!("  {}  ({} fix{})\n\n",
        bold_red("FAILED"),
        failures.len(),
        plural_es(failures.len()),
    ));

    for e in failures {
        let icon = red("✖");
        let label = check_label(&e.check_id);
        o.push_str(&format!("    {}  {}\n", icon, label));
        if let Some(ref err) = e.error {
            o.push_str(&format!("         {}\n", dim(err)));
        }
    }
    o.push('\n');
}

// ── Unfixed findings ─────────────────────────────────────────────

fn render_unfixed_findings(o: &mut String, resp: &serde_json::Value) {
    let unfixed = match resp.get("unfixedFindings").and_then(|v| v.as_array()) {
        Some(arr) if !arr.is_empty() => arr,
        _ => return,
    };

    o.push_str(&format!("  {}\n", separator()));
    o.push_str(&format!("  {}  ({} finding{})\n",
        bold("MANUAL ACTION NEEDED"),
        unfixed.len(),
        plural(unfixed.len()),
    ));
    o.push_str(&format!("  {}\n\n", separator()));

    for item in unfixed {
        let check_id = item.get("checkId").and_then(|v| v.as_str()).unwrap_or("?");
        let severity = item.get("severity").and_then(|v| v.as_str()).unwrap_or("medium");
        let message = item.get("message").and_then(|v| v.as_str()).unwrap_or("");
        let fix_hint = item.get("fix").and_then(|v| v.as_str());

        let sev_colored = match severity {
            "high" => red(severity),
            "medium" => yellow(severity),
            _ => dim(severity),
        };

        o.push_str(&format!("    {} [{}]  {}\n", yellow("▸"), sev_colored, check_label(check_id)));
        if !message.is_empty() {
            o.push_str(&format!("         {}\n", dim(message)));
        }
        if let Some(hint) = fix_hint {
            o.push_str(&format!("         {}: {}\n", bold("Fix"), hint));
        }
    }
    o.push('\n');
}

// ── Next steps ───────────────────────────────────────────────────

fn render_next_steps(o: &mut String, has_todos: bool, has_scaffold: bool) {
    o.push_str(&format!("  {}\n", separator()));
    o.push_str(&format!("  {}\n", bold("NEXT STEPS")));
    o.push_str(&format!("  {}\n", separator()));

    if has_todos {
        o.push_str(&format!("  {:<26}{}\n", "Fill TODO fields", dim("Review generated documents and complete manual sections")));
    }
    o.push_str(&format!("  {:<26}{}\n", "Review code changes", dim("Verify inline fixes don't break functionality")));
    o.push_str(&format!("  {:<26}{}\n", "Re-scan", dim("complior scan")));
    o.push_str(&format!("  {}\n", separator()));

    if has_scaffold {
        o.push_str(&format!("  {} → {}\n", bold("UPGRADE [SCAFFOLD]"), bold("PRODUCTION")));
        o.push_str(&format!("  {}\n", separator()));
        o.push_str(&format!("  {:<26}{}\n", "LLM-enhanced docs", dim("complior fix --ai")));
        o.push_str(&format!("  {:<26}{}\n", "Coding agent via MCP", dim("Connect your coding agent to Complior MCP server")));
        o.push_str(&format!("  {:<26}{}\n", "", dim("See: complior mcp --help")));
        o.push_str(&format!("  {}\n", separator()));
    }

    o.push('\n');
}

// ── Dry-run report ───────────────────────────────────────────────

fn format_dry_run_report(resp: &serde_json::Value, current_score: f64, scan_path: &str) -> String {
    let mut o = String::with_capacity(4096);

    let changes = resp.get("changes").and_then(|v| v.as_array());
    let predicted = resp.get("predictedScore").and_then(|v| v.as_f64()).unwrap_or(current_score);
    let change_count = changes.map(|c| c.len()).unwrap_or(0) as u64;

    render_fix_header(&mut o, scan_path, change_count, 0, true);
    render_score_line(&mut o, current_score, predicted, change_count);

    if let Some(changes) = changes {
        // Group by action type
        let creates: Vec<&serde_json::Value> = changes.iter()
            .filter(|c| c.get("action").and_then(|v| v.as_str()) == Some("CREATE"))
            .collect();
        let modifies: Vec<&serde_json::Value> = changes.iter()
            .filter(|c| c.get("action").and_then(|v| v.as_str()) != Some("CREATE"))
            .collect();

        if !creates.is_empty() {
            o.push_str(&format!("  {}  ({} file{})\n\n",
                bold("FILES TO CREATE"),
                creates.len(),
                plural(creates.len()),
            ));
            for c in &creates {
                let path = c.get("path").and_then(|v| v.as_str()).unwrap_or("?");
                o.push_str(&format!("    {}  {}\n", yellow("[PREVIEW]"), path));
            }
            o.push('\n');
        }
        if !modifies.is_empty() {
            o.push_str(&format!("  {}  ({} file{})\n\n",
                bold("FILES TO MODIFY"),
                modifies.len(),
                plural(modifies.len()),
            ));
            for c in &modifies {
                let path = c.get("path").and_then(|v| v.as_str()).unwrap_or("?");
                let action = c.get("action").and_then(|v| v.as_str()).unwrap_or("MODIFY");
                o.push_str(&format!("    {}  {:<40} [{}]\n", yellow("[PREVIEW]"), path, action));
            }
            o.push('\n');
        }
    }

    o.push_str(&format!("  {}\n", separator()));
    o.push_str(&format!("  Run {} to apply these changes\n", bold("complior fix")));
    o.push_str(&format!("  {}\n\n", separator()));

    o
}

/// "fix" → "fixes"
fn plural_es(n: usize) -> &'static str {
    if n == 1 { "" } else { "es" }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pad_article_short() {
        assert_eq!(pad_article("Art. 4"), "Art. 4   ");
        assert_eq!(pad_article("Art. 14"), "Art. 14  ");
    }

    #[test]
    fn test_pad_article_long() {
        // Long articles still get no truncation, just no extra padding
        let padded = pad_article("Art. 50(1)");
        assert_eq!(padded, "Art. 50(1)");
        let padded2 = pad_article("Art. 5(1)(f)");
        assert_eq!(padded2, "Art. 5(1)(f)");
    }

    #[test]
    fn test_normalize_code_desc_strips_at_suffix() {
        assert_eq!(
            normalize_code_desc("Inline fix: wrap bare LLM call at src/chat/anthropic.ts:3"),
            "Wrap bare LLM call"
        );
    }

    #[test]
    fn test_normalize_code_desc_strips_from_suffix() {
        assert_eq!(
            normalize_code_desc("Inline fix: remove banned dependency from package.json"),
            "Remove banned dependency"
        );
    }

    #[test]
    fn test_normalize_code_desc_no_prefix() {
        assert_eq!(
            normalize_code_desc("fix security risk at src/foo.ts:10"),
            "Fix security risk"
        );
    }

    #[test]
    fn test_normalize_code_desc_plain() {
        assert_eq!(
            normalize_code_desc("Add error handling"),
            "Add error handling"
        );
    }

    #[test]
    fn test_scaffold_hint_by_fix_type() {
        assert_eq!(scaffold_hint("l1-fria", "template_generation"), "Fill placeholders and review with your compliance team");
        assert_eq!(scaffold_hint("l3-bias", "config_fix"), "Populate test data paths and adjust fairness thresholds");
        assert_eq!(scaffold_hint("l3-ci", "config_fix"), "Adjust workflow triggers and scan thresholds for your CI");
        assert_eq!(scaffold_hint("l3-nhi", "config_fix"), "Move actual secrets to vault or environment variables");
        assert_eq!(scaffold_hint("l3-other", "config_fix"), "Review generated config and customize for your project");
        assert_eq!(scaffold_hint("x", "code_injection"), "Import this module into your codebase and wire into your pipeline");
        assert_eq!(scaffold_hint("x", "unknown_type"), "Review and customize for your project");
    }

    #[test]
    fn test_extract_entries_scaffold_detection() {
        let resp = serde_json::json!({
            "results": [
                {
                    "applied": true,
                    "plan": {
                        "checkId": "l4-bare-llm",
                        "fixType": "code_injection",
                        "article": "Art. 50(1)",
                        "description": "Inline fix: wrap bare LLM call at src/foo.ts:3",
                        "actions": [{ "type": "splice", "path": "src/foo.ts" }]
                    }
                },
                {
                    "applied": true,
                    "plan": {
                        "checkId": "l1-fria",
                        "fixType": "template_generation",
                        "article": "Art. 27",
                        "description": "FRIA Template",
                        "actions": [{ "type": "create", "path": "docs/fria.md" }]
                    }
                },
                {
                    "applied": true,
                    "plan": {
                        "checkId": "l4-hitl",
                        "fixType": "code_injection",
                        "article": "Art. 14",
                        "description": "Human Approval Gate",
                        "actions": [{ "type": "create", "path": "src/middleware/hitl.ts" }]
                    }
                }
            ]
        });
        let entries = extract_entries(&resp);
        assert_eq!(entries.len(), 3);
        assert!(!entries[0].is_scaffold, "splice action should not be scaffold");
        assert!(entries[1].is_scaffold, "create-only action should be scaffold");
        assert!(entries[2].is_scaffold, "create-only code_injection should be scaffold");
    }

    #[test]
    fn test_render_unfixed_findings_present() {
        // Force NO_COLOR for deterministic output
        // SAFETY: single-threaded test context
        unsafe { std::env::set_var("NO_COLOR", "1"); }

        let resp = serde_json::json!({
            "results": [],
            "summary": { "total": 0, "applied": 0, "failed": 0, "scoreBefore": 91, "scoreAfter": 91 },
            "unfixedFindings": [
                {
                    "checkId": "l4-logging",
                    "message": "Art. 12: No structured logging detected",
                    "severity": "medium",
                    "fix": "Add structured logging to your application"
                },
                {
                    "checkId": "l4-record-keeping",
                    "message": "Art. 12: No record-keeping policy found",
                    "severity": "high",
                    "fix": "Create a record-keeping policy document"
                }
            ]
        });

        let mut o = String::new();
        render_unfixed_findings(&mut o, &resp);

        assert!(o.contains("MANUAL ACTION NEEDED"), "should contain header");
        assert!(o.contains("2 findings"), "should show count");
        assert!(o.contains("Logging"), "should contain check label for l4-logging");
        assert!(o.contains("Record Keeping"), "should contain check label for l4-record-keeping");
        assert!(o.contains("Fix"), "should show fix hints");
    }

    #[test]
    fn test_render_unfixed_findings_empty() {
        let resp = serde_json::json!({
            "results": [],
            "summary": { "total": 0, "applied": 0, "failed": 0, "scoreBefore": 91, "scoreAfter": 91 },
            "unfixedFindings": []
        });

        let mut o = String::new();
        render_unfixed_findings(&mut o, &resp);

        assert!(o.is_empty(), "should produce no output for empty unfixed findings");
    }
}
