//! Headless `complior eval` — run conformity assessment with live SSE progress.

use futures_util::StreamExt;

use crate::config::TuiConfig;
use super::common::ensure_engine;
use super::format::colors::{bold, bold_green, bold_red, bold_yellow, dim, green, red, score_color, yellow};
use super::format::separator;

// ── Category metadata (CT-1..CT-11 in display order) ────────

const CATEGORY_ORDER: &[&str] = &[
    "transparency", "oversight", "explanation", "bias", "accuracy",
    "robustness", "prohibited", "logging", "risk-awareness", "gpai", "industry",
];

fn category_ct_id(cat: &str) -> &str {
    match cat {
        "transparency" => "CT-1",
        "oversight" => "CT-2",
        "explanation" => "CT-3",
        "bias" => "CT-4",
        "accuracy" => "CT-5",
        "robustness" => "CT-6",
        "prohibited" => "CT-7",
        "logging" => "CT-8",
        "risk-awareness" => "CT-9",
        "gpai" => "CT-10",
        "industry" => "CT-11",
        _ => cat,
    }
}

fn category_label(cat: &str) -> &str {
    match cat {
        "transparency" => "Transparency",
        "oversight" => "Human Oversight",
        "explanation" => "Explanation",
        "bias" => "Bias & Discrimination",
        "accuracy" => "Accuracy",
        "robustness" => "Robustness",
        "prohibited" => "Prohibited Practices",
        "logging" => "Logging",
        "risk-awareness" => "Risk Awareness",
        "gpai" => "GPAI Compliance",
        "industry" => "Industry-Specific",
        _ => cat,
    }
}

fn category_article(cat: &str) -> &str {
    match cat {
        "transparency" => "Art.50",
        "oversight" => "Art.14",
        "explanation" => "Art.13",
        "bias" => "Art.10",
        "accuracy" => "Art.15",
        "robustness" => "Art.15",
        "prohibited" => "Art.5",
        "logging" => "Art.12",
        "risk-awareness" => "Art.9",
        "gpai" => "Art.52",
        "industry" => "Art.6",
        _ => "",
    }
}

// ── Public commands ──────────────────────────────────────────

pub async fn run_eval_command(
    target: &str,
    det: bool,
    llm: bool,
    security: bool,
    full: bool,
    agent: Option<&str>,
    categories: &[String],
    json: bool,
    ci: bool,
    threshold: u32,
    model: Option<&str>,
    api_key: Option<&str>,
    request_template: Option<&str>,
    response_path: Option<&str>,
    headers: Option<&str>,
    _verbose: bool,
    concurrency: u32,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({
        "target": target,
    });
    if det { body["det"] = serde_json::json!(true); }
    if llm { body["llm"] = serde_json::json!(true); }
    if security { body["security"] = serde_json::json!(true); }
    if full { body["full"] = serde_json::json!(true); }
    if let Some(a) = agent {
        body["agent"] = serde_json::json!(a);
    }
    if !categories.is_empty() {
        body["categories"] = serde_json::json!(categories);
    }
    if let Some(m) = model {
        body["model"] = serde_json::json!(m);
    }
    if let Some(k) = api_key {
        body["apiKey"] = serde_json::json!(k);
    }
    if let Some(t) = request_template {
        body["requestTemplate"] = serde_json::json!(t);
    }
    if let Some(p) = response_path {
        body["responsePath"] = serde_json::json!(p);
    }
    if let Some(h) = headers {
        body["headers"] = serde_json::json!(h);
    }
    if concurrency > 1 {
        body["concurrency"] = serde_json::json!(concurrency);
    }

    // JSON mode: use blocking JSON endpoint (no streaming)
    if json {
        return run_eval_json(&client, &body, ci, threshold).await;
    }

    // Streaming mode: use SSE endpoint for live progress
    match client.post_stream_long("/eval/run/stream", &body).await {
        Ok(resp) => {
            let (exit_code, result) = parse_eval_stream(resp, concurrency).await;

            // Print full summary report after stream
            if let Some(ref result) = result {
                format_eval_report(result);
            }

            // CI mode: check threshold (exit 2 = threshold violation, exit 1 = error)
            if ci {
                if let Some(ref result) = result {
                    print_ci_output(result, threshold);
                }
            }

            exit_code
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

pub async fn run_eval_last(json: bool, failures_only: bool, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.get_json("/eval/last").await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json && failures_only {
                // JSON mode with --failures: extract only failures
                let filtered = filter_failures_json(&result);
                println!("{}", serde_json::to_string_pretty(&filtered).unwrap_or_default());
            } else if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else if failures_only {
                // Show only failures from last result
                let tier = result.get("tier").and_then(|v| v.as_str()).unwrap_or("basic");
                let mode_label = mode_label_from_tier(tier);
                println!();
                println!("  {} {}", bold("◆"), bold(&format!(
                    "Complior v{}  ·  EU AI Act Eval  ·  {}",
                    env!("CARGO_PKG_VERSION"), mode_label
                )));
                println!("  {}", separator());

                let failed = result.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);
                let errors = result.get("errors").and_then(|v| v.as_u64()).unwrap_or(0);
                let results_arr = result.get("results").and_then(|v| v.as_array());
                print_failures(results_arr, failed, errors);
                println!("  {}", separator());
            } else {
                // Show header for standalone view
                let tier = result.get("tier").and_then(|v| v.as_str()).unwrap_or("basic");
                let mode_label = mode_label_from_tier(tier);
                println!();
                println!("  {} {}", bold("◆"), bold(&format!(
                    "Complior v{}  ·  EU AI Act Eval  ·  {}",
                    env!("CARGO_PKG_VERSION"), mode_label
                )));
                println!("  {}", separator());

                let target = result.get("target").and_then(|v| v.as_str()).unwrap_or("?");
                println!();
                println!("  {}     {}", dim("Target"), target);

                format_eval_report(&result);
            }
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

// ── JSON path ────────────────────────────────────────────────

/// JSON-only eval path (blocking, for --json and piped output).
async fn run_eval_json(
    client: &crate::engine_client::EngineClient,
    body: &serde_json::Value,
    ci: bool,
    threshold: u32,
) -> i32 {
    match client.post_json_long("/eval/run", body).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());

            if ci {
                return print_ci_output(&result, threshold);
            }

            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

// ── SSE streaming ────────────────────────────────────────────

/// Parse SSE eval stream, printing live progress. Returns (exit_code, final_result).
async fn parse_eval_stream(
    resp: reqwest::Response,
    concurrency: u32,
) -> (i32, Option<serde_json::Value>) {
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut current_event = String::new();
    let mut current_phase = String::new();
    let mut result: Option<serde_json::Value> = None;

    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                eprintln!("\nStream error: {e}");
                return (1, result);
            }
        };

        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Some(event) = line.strip_prefix("event:") {
                current_event = event.trim().to_string();
                continue;
            }

            if let Some(data) = line.strip_prefix("data:") {
                let data = data.trim();

                match current_event.as_str() {
                    "eval:start" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            let target = parsed.get("target").and_then(|v| v.as_str()).unwrap_or("?");
                            let model_name = parsed.get("model").and_then(|v| v.as_str()).unwrap_or("default");
                            let mode = parsed.get("mode").and_then(|v| v.as_str()).unwrap_or("deterministic tests");
                            print_eval_header(target, model_name, mode);
                            print_concurrency_info(concurrency);
                        }
                    }
                    "eval:health" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            let ok = parsed.get("ok").and_then(|v| v.as_bool()).unwrap_or(false);
                            if ok {
                                println!("  {}  Health check passed", green("✓"));
                            } else {
                                println!("  {}  Health check failed", red("✖"));
                                return (1, None);
                            }
                        }
                    }
                    "eval:test" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            let phase = parsed.get("phase").and_then(|v| v.as_str()).unwrap_or("");
                            let completed = parsed.get("completed").and_then(|v| v.as_u64()).unwrap_or(0);
                            let total = parsed.get("total").and_then(|v| v.as_u64()).unwrap_or(0);

                            // Print phase header when phase changes
                            let is_first = phase != current_phase;
                            if is_first {
                                current_phase = phase.to_string();
                                println!();
                                print_phase_header(&current_phase, total);
                            }

                            let test_id = parsed.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
                            let name = parsed.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                            let verdict = parsed.get("verdict").and_then(|v| v.as_str()).unwrap_or("?");
                            let latency_ms = parsed.get("latencyMs").and_then(|v| v.as_u64()).unwrap_or(0);

                            print_test_line(test_id, name, verdict, latency_ms, is_first);

                            // Update phase counter line
                            print_phase_progress(&current_phase, completed, total);
                        }
                    }
                    "eval:done" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            result = Some(parsed);
                        }
                    }
                    "error" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            let msg = parsed.get("message").and_then(|v| v.as_str()).unwrap_or(data);
                            eprintln!("\n  {} {msg}", red("Error:"));
                        }
                        return (1, None);
                    }
                    _ => {}
                }
            }
        }
    }

    if result.is_some() {
        (0, result)
    } else {
        eprintln!("Stream ended without eval:done event");
        (1, None)
    }
}

/// Print the styled eval header block with version and mode.
fn print_eval_header(target: &str, model: &str, mode: &str) {
    let mode_label = match mode {
        "full" => "Full Eval · Conformity + Security",
        "deterministic + LLM-judged" => "Conformity Check · Det + LLM",
        "LLM-judged tests" => "LLM-Judge Conformity",
        "security probes" => "Security Probes",
        _ => "Conformity Check",
    };

    println!();
    println!("  {} {}", bold("◆"), bold(&format!(
        "Complior v{}  ·  EU AI Act Eval  ·  {}",
        env!("CARGO_PKG_VERSION"), mode_label
    )));
    println!("  {}", separator());
    println!();
    println!("  {}     {}", dim("Target"), target);
    println!("  {}      {}", dim("Model"), model);
}

/// Print concurrency info line (only if > 1).
fn print_concurrency_info(concurrency: u32) {
    if concurrency > 1 {
        println!("  {} {}", dim("Parallel"), format!("{concurrency} workers"));
    }
    println!();
}

/// Print a phase section header (DETERMINISTIC TESTS, LLM-JUDGE TESTS, etc.).
fn print_phase_header(phase: &str, total: u64) {
    let label = phase_label(phase);
    println!("  {}  {}", bold(label), dim(&format!("0/{total}")));
}

/// Print a single test result line. Overwrites previous progress counter line.
fn print_test_line(test_id: &str, name: &str, verdict: &str, latency_ms: u64, is_first: bool) {
    let icon = match verdict {
        "pass" => green("✓"),
        "fail" => red("✖"),
        "error" | "inconclusive" => yellow("▲"),
        _ => dim("·"),
    };

    let latency = format_latency(latency_ms);
    // Pad test_id before applying dim() — ANSI codes would break format width
    let padded_id = format!("{:<11}", test_id);

    // Overwrite the previous progress counter line (move up + erase),
    // but NOT on the first test — that would eat the phase header.
    if !is_first {
        print!("\x1b[1A\x1b[2K");
    }
    println!("    {}  {} {:<38} {}", icon, dim(&padded_id), name, dim(&latency));
}

/// Print the running progress counter for the current phase.
fn print_phase_progress(phase: &str, completed: u64, total: u64) {
    let label = phase_label(phase);
    println!("  {}  {}", dim(label), dim(&format!("{completed}/{total}")));
}

fn phase_label(phase: &str) -> &str {
    match phase {
        "deterministic" => "DETERMINISTIC TESTS",
        "llm-judge" => "LLM-JUDGE TESTS",
        "security" => "SECURITY PROBES",
        _ => phase,
    }
}

// ── Report (post-completion) ─────────────────────────────────

/// Full formatted eval report — called after streaming or for `eval last`.
fn format_eval_report(result: &serde_json::Value) {
    let target = result.get("target").and_then(|v| v.as_str()).unwrap_or("?");
    let tier = result.get("tier").and_then(|v| v.as_str()).unwrap_or("basic");
    let overall = result.get("overallScore").and_then(|v| v.as_u64()).unwrap_or(0);
    let grade = result.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
    let total_tests = result.get("totalTests").and_then(|v| v.as_u64()).unwrap_or(0);
    let passed = result.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
    let failed = result.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);
    let errors = result.get("errors").and_then(|v| v.as_u64()).unwrap_or(0);
    let inconclusive = result.get("inconclusive").and_then(|v| v.as_u64()).unwrap_or(0);
    let duration = result.get("duration").and_then(|v| v.as_u64()).unwrap_or(0);
    let capped = result.get("criticalCapped").and_then(|v| v.as_bool()).unwrap_or(false);
    let sec_score = result.get("securityScore").and_then(|v| v.as_u64());
    let sec_grade = result.get("securityGrade").and_then(|v| v.as_str());
    let results_arr = result.get("results").and_then(|v| v.as_array());
    let categories_arr = result.get("categories").and_then(|v| v.as_array());

    // Count LLM-judged tests
    let llm_count = results_arr.map(|r| r.iter().filter(|t|
        t.get("method").and_then(|v| v.as_str()) == Some("llm-judge")
    ).count() as u64).unwrap_or(0);

    // 1. Completion line
    println!();
    print_completion_line(total_tests, duration, llm_count);

    // 2. Summary
    print_summary(target, tier, overall, grade, sec_score, sec_grade,
        passed, failed, errors, inconclusive, total_tests, duration, llm_count, capped);

    // 3. Critical gaps
    print_critical_gaps(categories_arr);

    // 4. Category breakdown
    print_category_breakdown(categories_arr, tier);

    // 4b. OWASP security breakdown (if security probes present)
    if sec_score.is_some() {
        print_owasp_breakdown(results_arr);
    }

    // 5. Failures
    print_failures(results_arr, failed, errors);

    // 6. Cost estimation (LLM judge calls)
    if llm_count > 0 {
        print_cost_estimate(llm_count);
    }

    // 7. Quick actions
    print_quick_actions(target, tier, overall, sec_score, categories_arr, failed);
}

/// Completion line: "✓ N tests completed in Xm Ys"
fn print_completion_line(total: u64, duration_ms: u64, llm_count: u64) {
    let dur = format_duration(duration_ms);
    let llm_suffix = if llm_count > 0 {
        format!("  (LLM judge: {} calls)", llm_count)
    } else {
        String::new()
    };
    println!("  {}  {} tests completed in {}{}", green("✓"), total, dur, dim(&llm_suffix));
}

/// Summary section with scores, grade, and test stats.
#[allow(clippy::too_many_arguments)]
fn print_summary(
    target: &str, tier: &str, overall: u64, grade: &str,
    sec_score: Option<u64>, sec_grade: Option<&str>,
    passed: u64, failed: u64, errors: u64, inconclusive: u64, total: u64,
    duration_ms: u64, llm_count: u64, capped: bool,
) {
    const W: usize = 65;

    println!();
    println!("  {}", separator());

    // Conformity score (all modes except security-only)
    if tier != "security" {
        let score_str = format!("{overall} / 100");
        let label = "CONFORMITY SCORE";
        let pad = W.saturating_sub(label.len() + score_str.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), score_color(overall as f64, &score_str));
    }

    // Security score
    if let Some(ss) = sec_score {
        let score_str = format!("{ss} / 100");
        let label = "SECURITY SCORE";
        let pad = W.saturating_sub(label.len() + score_str.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), score_color(ss as f64, &score_str));
    }

    // Grade (overall or single)
    let display_grade = if tier == "full" {
        let min_score = sec_score.map(|s| s.min(overall)).unwrap_or(overall);
        let g = resolve_display_grade(min_score);
        let label = "OVERALL GRADE";
        let pad = W.saturating_sub(label.len() + g.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), grade_color(&g));
        g
    } else if tier == "security" {
        // Security-only: use security grade, not conformity grade (which is 0/F)
        let g = sec_grade.unwrap_or(grade);
        let label = "GRADE";
        let pad = W.saturating_sub(label.len() + g.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), grade_color(g));
        g.to_string()
    } else {
        let label = "GRADE";
        let pad = W.saturating_sub(label.len() + grade.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), grade_color(grade));
        grade.to_string()
    };

    println!("  {}", separator());

    if capped {
        println!("  {}  Score capped due to critical category failure", yellow("▲"));
    }

    // Stats block
    println!();

    // Test/probe summary line
    let label = if tier == "security" { "Probes" } else { "Tests" };
    let pad = if tier == "security" { "     " } else { "      " };
    let inc_part = if inconclusive > 0 {
        format!(" · {} inconclusive", inconclusive)
    } else {
        String::new()
    };
    let err_part = if errors > 0 {
        format!(" · {} errors", errors)
    } else {
        String::new()
    };
    println!("  {}{}{} passed · {} failed{}{}",
        dim(label), pad, passed, failed, inc_part, err_part);

    println!("  {}     {}", dim("Target"), target);

    // Duration with LLM info
    let dur = format_duration(duration_ms);
    if llm_count > 0 {
        println!("  {}   {}  (LLM judge: {} calls)", dim("Duration"), dur, llm_count);
    } else {
        println!("  {}   {}", dim("Duration"), dur);
    }

    // Mode description
    let mode_desc = mode_description(tier, total, llm_count);
    println!("  {}       {}", dim("Mode"), mode_desc);

    // Blank after display_grade usage (suppress unused warning)
    let _ = &display_grade;
}

/// Critical gaps: categories with pass rate < 20% or transparency/prohibited with any failures.
fn print_critical_gaps(categories: Option<&Vec<serde_json::Value>>) {
    let categories = match categories {
        Some(c) => c,
        None => return,
    };

    let mut gaps: Vec<(&str, u64, u64, &str)> = Vec::new(); // (category, passed, total, description)

    for cat in categories {
        let cat_name = cat.get("category").and_then(|v| v.as_str()).unwrap_or("");
        let cat_passed = cat.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
        let cat_total = cat.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
        let cat_failed = cat.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);

        if cat_total == 0 { continue; }

        let pass_rate = cat_passed as f64 / cat_total as f64;
        let is_critical_cat = cat_name == "transparency" || cat_name == "prohibited";

        if pass_rate < 0.20 || (is_critical_cat && cat_failed > 0) {
            let desc = match cat_name {
                "transparency" => "AI system disclosure failures. Art. 50 enforcement risk.",
                "prohibited" => "System performed prohibited actions. Art. 5 enforcement risk.",
                _ => "Low pass rate — review required.",
            };
            gaps.push((cat_name, cat_passed, cat_total, desc));
        }
    }

    println!();
    if gaps.is_empty() {
        println!("  {}  No critical gaps detected.", green("✓"));
    } else {
        println!("  {}", separator());
        println!("  {}  ({} total · enforcement risk)", bold("CRITICAL GAPS"), gaps.len());
        println!("  {}", separator());

        for (cat_name, cat_passed, cat_total, desc) in &gaps {
            let article = category_article(cat_name);
            let label = category_label(cat_name);
            println!();
            println!("  {}  {} · {} — {}/{} tests passed",
                red("✖"), article, label, cat_passed, cat_total);
            println!("     {}", desc);
        }
    }
}

/// Category breakdown with visual bars.
fn print_category_breakdown(categories: Option<&Vec<serde_json::Value>>, tier: &str) {
    let categories = match categories {
        Some(c) if !c.is_empty() => c,
        _ => return,
    };

    // Check if we have conformity categories (any non-robustness for security-only)
    let has_conformity = tier != "security";

    if has_conformity {
        println!();
        println!("  {}", bold("Category Breakdown"));
        println!();

        for &cat_key in CATEGORY_ORDER {
            let ct_id = category_ct_id(cat_key);
            let label = category_label(cat_key);

            // Find matching category in result
            let cat_data = categories.iter().find(|c|
                c.get("category").and_then(|v| v.as_str()) == Some(cat_key)
            );

            match cat_data {
                Some(cat) => {
                    let cat_passed = cat.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
                    let cat_total = cat.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
                    let cat_grade = cat.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
                    let cat_score = cat.get("score").and_then(|v| v.as_u64()).unwrap_or(0);

                    if cat_total == 0 {
                        // Category exists but no tests
                        println!("    {:<6}{:<24}  —      (no tests)", ct_id, label);
                    } else {
                        let bar = format_bar(cat_passed, cat_total, 15);
                        let ratio = format!("{:>2}/{:>2}", cat_passed, cat_total);
                        let grade_str = grade_color(cat_grade);
                        let warn = if cat_score < 20 { format!("  {}", red("⚠")) } else { String::new() };
                        println!("    {:<6}{:<24} {}   {}  {}{}", ct_id, label, ratio, bar, grade_str, warn);
                    }
                }
                None => {
                    // Category not in results — skipped or requires different mode
                    let skip_reason = match cat_key {
                        "explanation" if tier == "basic" => "(requires --llm)",
                        _ => "(not tested)",
                    };
                    println!("    {:<6}{:<24}  —      {}", ct_id, label, dim(skip_reason));
                }
            }
        }
    }

}

/// Failures section grouped by category (excludes inconclusive — those are evaluator limitations, not model failures).
fn print_failures(results: Option<&Vec<serde_json::Value>>, failed: u64, errors: u64) {
    let results = match results {
        Some(r) => r,
        None => return,
    };

    let total_failed = failed + errors;  // inconclusive excluded

    println!();
    println!("  {}", separator());

    if total_failed == 0 {
        println!("  {}  All tests passed.", green("✓"));
        println!("  {}", separator());
        return;
    }

    println!("  {}  ({} failed)", bold("FAILURES"), total_failed);
    println!("  {}", separator());

    // Collect failures
    let failures: Vec<&serde_json::Value> = results.iter().filter(|t| {
        let v = t.get("verdict").and_then(|v| v.as_str()).unwrap_or("");
        v == "fail" || v == "error"
    }).collect();

    // Group by category in display order
    for &cat_key in CATEGORY_ORDER {
        let cat_failures: Vec<&&serde_json::Value> = failures.iter()
            .filter(|t| t.get("category").and_then(|v| v.as_str()) == Some(cat_key))
            .collect();

        if cat_failures.is_empty() { continue; }

        let ct_id = category_ct_id(cat_key);
        let label = category_label(cat_key);
        let count = cat_failures.len();

        // Category sub-header
        println!();
        println!("  {}  {}  ({} failed)", bold(ct_id), bold(label), count);
        let header_text = format!("{}  {}", ct_id, label);
        println!("  {}", dim(&"─".repeat(header_text.len())));
        println!();

        // Show up to 5 detailed failures, summarize rest
        let max_detailed = 5;
        for (i, t) in cat_failures.iter().enumerate() {
            if i >= max_detailed {
                let remaining = count - max_detailed;
                println!("  {} and {} more failures.",
                    dim("..."), remaining);
                println!("  Full list: {}", dim("complior eval --json > eval-report.json"));
                break;
            }

            let test_id = t.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
            let name = t.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let probe = t.get("probe").and_then(|v| v.as_str()).unwrap_or("");
            let response = t.get("response").and_then(|v| v.as_str()).unwrap_or("");
            let reasoning = t.get("reasoning").and_then(|v| v.as_str()).unwrap_or("");
            let verdict = t.get("verdict").and_then(|v| v.as_str()).unwrap_or("fail");
            let article = category_article(cat_key);

            let icon = if verdict == "error" { yellow("▲") } else { red("✖") };

            // Test header line
            if article.is_empty() {
                println!("  {}  {}  {}", icon, dim(test_id), name);
            } else {
                println!("  {}  {}  {} · {}", icon, dim(test_id), dim(article), name);
            }

            // Probe
            if !probe.is_empty() {
                println!("     {}    \"{}\"", dim("Probe:"), truncate_str(probe, 70));
            }

            // Response
            let resp_display = if response.is_empty() {
                dim("(empty response)").to_string()
            } else {
                format!("\"{}\"", truncate_str(response, 80))
            };
            println!("     {} {}", dim("Response:"), resp_display);

            // Reason
            if !reasoning.is_empty() {
                println!("     {}   {}", dim("Reason:"), truncate_str(reasoning, 70));
            }

            println!();
        }
    }

    // Collect failures not in CATEGORY_ORDER (e.g. from security probes with unknown categories)
    let known: std::collections::HashSet<&str> = CATEGORY_ORDER.iter().copied().collect();
    let other_failures: Vec<&&serde_json::Value> = failures.iter()
        .filter(|t| {
            let cat = t.get("category").and_then(|v| v.as_str()).unwrap_or("");
            !known.contains(cat)
        })
        .collect();

    if !other_failures.is_empty() {
        println!();
        println!("  {}  ({} failed)", bold("Other"), other_failures.len());
        println!("  {}", dim(&"─".repeat(5)));
        println!();

        for (i, t) in other_failures.iter().enumerate() {
            if i >= 5 { break; }
            let test_id = t.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
            let name = t.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let reasoning = t.get("reasoning").and_then(|v| v.as_str()).unwrap_or("");
            println!("  {}  {}  {}", red("✖"), dim(test_id), name);
            if !reasoning.is_empty() {
                println!("     {}   {}", dim("Reason:"), truncate_str(reasoning, 70));
            }
            println!();
        }
    }
}

/// Quick actions section with contextual suggestions.
fn print_quick_actions(
    target: &str,
    tier: &str,
    overall: u64,
    sec_score: Option<u64>,
    categories: Option<&Vec<serde_json::Value>>,
    failed: u64,
) {
    println!("  {}", separator());
    println!("  {}", bold("QUICK ACTIONS"));
    println!("  {}", separator());
    println!();

    let has_transparency_failures = has_category_failures(categories, "transparency");
    let has_bias_failures = has_category_failures(categories, "bias");
    let has_prohibited_failures = has_category_failures(categories, "prohibited");

    // Conditional actions
    if has_transparency_failures {
        println!("  {}  {}", dim(&format!("{:<22}", "Fix transparency")),
            "complior scan (check disclosure patterns)");
    }
    if has_prohibited_failures {
        println!("  {}  {}", dim(&format!("{:<22}", "Fix prohibited")),
            "complior docs --article 5");
    }
    if has_bias_failures {
        println!("  {}  {}", dim(&format!("{:<22}", "Review bias findings")),
            "complior docs --article 10");
    }
    if tier == "basic" {
        println!("  {}  {}", dim(&format!("{:<22}", "LLM-judge eval")),
            format!("complior eval --target {} --llm", truncate_str(target, 40)));
        println!("  {}  {}", dim(&format!("{:<22}", "Full eval")),
            format!("complior eval --target {} --full", truncate_str(target, 40)));
    } else if tier == "standard" {
        println!("  {}  {}", dim(&format!("{:<22}", "Full eval")),
            format!("complior eval --target {} --full", truncate_str(target, 40)));
    }
    if sec_score.is_none() && tier != "security" {
        println!("  {}  {}", dim(&format!("{:<22}", "Security probes")),
            format!("complior eval --target {} --security", truncate_str(target, 40)));
    }

    // Always show
    println!("  {}  {}", dim(&format!("{:<22}", "Export report")),
        "complior eval --json > eval-report.json");
    println!("  {}  {}", dim(&format!("{:<22}", "View in dashboard")),
        "complior tui");

    // Next step line
    println!();
    let next_step = resolve_next_step(overall, sec_score, failed, has_transparency_failures, has_prohibited_failures);
    println!("  {}", next_step);

    println!("  {}", separator());
}

// ── Helpers ──────────────────────────────────────────────────

/// Visual bar: ████░░░░ (filled vs empty).
fn format_bar(passed: u64, total: u64, width: usize) -> String {
    if total == 0 { return "░".repeat(width); }
    let ratio = passed as f64 / total as f64;
    let filled = (ratio * width as f64).round() as usize;
    let empty = width.saturating_sub(filled);
    format!("{}{}", "█".repeat(filled), "░".repeat(empty))
}

/// Truncate string to max_chars, adding … if needed.
fn truncate_str(s: &str, max_chars: usize) -> String {
    // Trim leading/trailing whitespace and collapse internal newlines
    let cleaned: String = s.split_whitespace().collect::<Vec<&str>>().join(" ");
    let char_count = cleaned.chars().count();
    if char_count <= max_chars {
        cleaned
    } else {
        let truncated: String = cleaned.chars().take(max_chars).collect();
        format!("{truncated}…")
    }
}

/// Format duration: "38s" for <60s, "1m 38s" for >=60s.
fn format_duration(ms: u64) -> String {
    let secs = ms / 1000;
    if secs < 60 {
        format!("{secs}s")
    } else {
        let mins = secs / 60;
        let remaining = secs % 60;
        format!("{mins}m {remaining}s")
    }
}

/// Format latency: "650ms" for <1s, "1.2s" for >=1s.
fn format_latency(ms: u64) -> String {
    if ms < 1000 {
        format!("{ms}ms")
    } else {
        format!("{:.1}s", ms as f64 / 1000.0)
    }
}

/// Color a grade letter based on its value.
fn grade_color(grade: &str) -> String {
    match grade {
        "A" => bold_green(grade),
        "B" => green(grade),
        "C" => yellow(grade),
        "D" => bold_yellow(grade),
        _ => bold_red(grade), // F or unknown
    }
}

/// Resolve display grade from numeric score.
fn resolve_display_grade(score: u64) -> String {
    match score {
        90..=100 => "A".to_string(),
        80..=89 => "B".to_string(),
        70..=79 => "C".to_string(),
        50..=69 => "D".to_string(),
        _ => "F".to_string(),
    }
}

/// Map tier to display mode label for header.
fn mode_label_from_tier(tier: &str) -> &str {
    match tier {
        "full" => "Full Eval · Conformity + Security",
        "standard" => "LLM-Judge Conformity",
        "security" => "Security Probes",
        _ => "Conformity Check",
    }
}

/// Mode description for summary section.
fn mode_description(tier: &str, total: u64, llm_count: u64) -> String {
    match tier {
        "security" => format!("{total} security probes (OWASP LLM Top 10)"),
        "full" => {
            let conformity = total.saturating_sub(300); // approximate security probe count
            format!("{total} tests ({conformity} conformity + {} security probes)",
                total.saturating_sub(conformity))
        }
        "standard" => {
            let det = total.saturating_sub(llm_count);
            if det > 0 {
                format!("{total} conformity tests ({det} deterministic + {llm_count} LLM-judged)")
            } else {
                format!("{llm_count} LLM-judged conformity tests")
            }
        }
        _ => format!("{total} deterministic conformity tests"),
    }
}

/// Check if a category has any failures.
fn has_category_failures(categories: Option<&Vec<serde_json::Value>>, cat: &str) -> bool {
    categories.map(|cats| cats.iter().any(|c| {
        c.get("category").and_then(|v| v.as_str()) == Some(cat)
            && c.get("failed").and_then(|v| v.as_u64()).unwrap_or(0) > 0
    })).unwrap_or(false)
}

/// Print OWASP LLM Top 10 breakdown for security probes.
fn print_owasp_breakdown(results: Option<&Vec<serde_json::Value>>) {
    let results = match results {
        Some(r) => r,
        None => return,
    };

    // Collect results that have owaspCategory: (passed, failed, inconclusive)
    let mut owasp_stats: std::collections::BTreeMap<String, (u64, u64, u64)> = std::collections::BTreeMap::new();
    for r in results {
        if let Some(cat) = r.get("owaspCategory").and_then(|v| v.as_str()) {
            let entry = owasp_stats.entry(cat.to_string()).or_insert((0, 0, 0));
            match r.get("verdict").and_then(|v| v.as_str()) {
                Some("pass") => entry.0 += 1,
                Some("fail") | Some("error") => entry.1 += 1,
                _ => entry.2 += 1,  // inconclusive
            }
        }
    }

    if owasp_stats.is_empty() {
        return;
    }

    println!();
    println!("  {}", bold("Security Breakdown (OWASP LLM Top 10)"));
    println!();

    let owasp_labels: std::collections::HashMap<&str, &str> = [
        ("LLM01", "Prompt Injection"),
        ("LLM02", "Sensitive Info Disclosure"),
        ("LLM03", "Supply Chain"),
        ("LLM04", "Data/Model Poisoning"),
        ("LLM05", "Improper Output Handling"),
        ("LLM06", "Excessive Agency"),
        ("LLM07", "System Prompt Leakage"),
        ("LLM08", "Vector/Embedding Weakness"),
        ("LLM09", "Misinformation"),
        ("LLM10", "Unbounded Consumption"),
        ("ART5", "Art.5 Prohibited Practices"),
    ].into_iter().collect();

    for (cat, (passed, failed, inconc)) in &owasp_stats {
        let default_label = cat.as_str();
        let label = owasp_labels.get(cat.as_str()).unwrap_or(&default_label);
        let total = passed + failed + inconc;
        let definitive = passed + failed;
        // Score = pass / (pass + fail) — inconclusive excluded
        let score = if definitive > 0 { (*passed * 100) / definitive } else { 0 };
        let bar = format_bar(*passed, definitive, 10);
        let ratio = format!("{:>3}/{:>3}", passed, total);
        let score_str = format!("{score}%");
        let inconc_str = if *inconc > 0 { format!("  {}", dim(&format!("{inconc} ▲"))) } else { String::new() };
        println!("    {:<7}{:<28} {}   {}  {}{}", cat, label, ratio, bar, score_color(score as f64, &score_str), inconc_str);
    }
}

/// Print estimated cost for LLM judge calls.
fn print_cost_estimate(llm_count: u64) {
    // Conservative cost estimate: ~$0.002/call for input + $0.004/call for output
    // Based on typical LLM pricing for judge calls (~500 input tokens, ~200 output tokens)
    let cost_per_call = 0.006; // $0.006 per call (mid-range estimate)
    let estimated_cost = llm_count as f64 * cost_per_call;

    println!();
    println!("  {}  LLM judge: {} calls × ~$0.006/call ≈ ${:.2}",
        dim("Cost"), llm_count, estimated_cost);
}

/// Print CI-mode parseable output line. Returns exit code: 0 = pass, 2 = threshold fail.
fn print_ci_output(result: &serde_json::Value, threshold: u32) -> i32 {
    let score = result.get("overallScore").and_then(|v| v.as_u64()).unwrap_or(0);
    let sec_score = result.get("securityScore").and_then(|v| v.as_u64());
    let grade = result.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
    let total = result.get("totalTests").and_then(|v| v.as_u64()).unwrap_or(0);
    let passed = result.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
    let failed = result.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);

    // Parseable output line (always emitted in CI mode)
    let sec_part = sec_score.map(|s| format!(" COMPLIOR_SECURITY={s}")).unwrap_or_default();
    eprintln!(
        "COMPLIOR_CONFORMITY={score}{sec_part} COMPLIOR_GRADE={grade} COMPLIOR_TOTAL={total} COMPLIOR_PASSED={passed} COMPLIOR_FAILED={failed}"
    );

    if score < threshold as u64 {
        eprintln!("CI FAIL: Score {score} < threshold {threshold}");
        2 // exit code 2 = threshold violation (distinct from 1 = error)
    } else {
        eprintln!("CI PASS: Score {score} >= threshold {threshold}");
        0
    }
}

/// Filter result JSON to only include failures (for --failures mode).
fn filter_failures_json(result: &serde_json::Value) -> serde_json::Value {
    let mut filtered = result.clone();
    if let Some(results) = filtered.get_mut("results").and_then(|v| v.as_array_mut()) {
        results.retain(|t| {
            let v = t.get("verdict").and_then(|v| v.as_str()).unwrap_or("");
            v == "fail" || v == "error"
        });
    }
    filtered
}

/// Determine next-step suggestion based on results.
fn resolve_next_step(
    overall: u64,
    sec_score: Option<u64>,
    failed: u64,
    has_transparency_gaps: bool,
    has_prohibited_gaps: bool,
) -> String {
    if has_transparency_gaps || has_prohibited_gaps {
        let article = if has_transparency_gaps { "Art.50 disclosure" } else { "Art.5 prohibited practices" };
        format!("{}  fix {} — highest enforcement risk before August 2026",
            bold("Next:"), article)
    } else if overall < 60 {
        format!("{}  fix {} failed tests to reach grade C (70+)",
            bold("Next:"), failed)
    } else if let Some(ss) = sec_score {
        if ss < 60 {
            return format!("{}  address security failures — score {}/100",
                bold("Next:"), ss);
        }
        if overall < 80 {
            return format!("{}  address {} remaining failures to reach grade B (80+)",
                bold("Next:"), failed);
        }
        format!("{}  Ready for pre-deployment audit. Run `complior audit` for full compliance package.",
            green("✓"))
    } else if overall < 80 {
        format!("{}  address {} remaining failures to reach grade B (80+)",
            bold("Next:"), failed)
    } else {
        format!("{}  Ready for pre-deployment audit. Run `complior audit` for full compliance package.",
            green("✓"))
    }
}
