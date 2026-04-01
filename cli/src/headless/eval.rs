//! Headless `complior eval` — run conformity assessment with live SSE progress.

use std::time::Instant;

use futures_util::StreamExt;

use crate::config::TuiConfig;
use super::common::{ensure_engine, url_encode};
use super::format::colors::{
    bold, bar_filled, bar_empty, cyan,
    check_mark, diamond, dim, green, h_line, red, resolve_grade,
    score_color, skip_icon, use_unicode, warning_icon, yellow,
};
use super::format::layers::display_width;
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

// ── Adapter detection (Phase 3a) ─────────────────────────────

/// Detect adapter type from target URL (client-side heuristic).
fn detect_adapter(target: &str) -> &'static str {
    if target.contains("openai.com") || target.contains("/v1/") {
        "openai"
    } else if target.contains("anthropic.com") {
        "anthropic"
    } else if target.contains(":11434") || target.contains("ollama") {
        "ollama"
    } else {
        "http"
    }
}

/// Derive judge provider label from model string.
fn judge_provider_label(model: &str) -> &'static str {
    if model.contains("openrouter") || model.starts_with("openrouter/") {
        "via OpenRouter"
    } else if model.contains("anthropic") || model.starts_with("claude") {
        "via Anthropic"
    } else if model.contains("openai") || model.starts_with("gpt") {
        "via OpenAI"
    } else if model.contains("gemini") || model.contains("google") {
        "via Google"
    } else {
        "via API"
    }
}

// ── Phase tracking for progress display ─────────────────────

/// Accumulated phase stats for completion summaries.
struct PhaseStats {
    phase: String,
    passed: u64,
    failed: u64,
    total: u64,
    start: Instant,
    cost_estimate: f64,
}

impl PhaseStats {
    fn new(phase: &str, total: u64) -> Self {
        Self {
            phase: phase.to_string(),
            passed: 0,
            failed: 0,
            total,
            start: Instant::now(),
            cost_estimate: 0.0,
        }
    }

    fn record(&mut self, verdict: &str, method: &str) {
        match verdict {
            "pass" => self.passed += 1,
            "fail" | "error" => self.failed += 1,
            _ => {}
        }
        // Estimate cost for LLM-judge calls
        if method == "llm-judge" {
            self.cost_estimate += 0.006; // ~$0.006 per call
        }
    }

    fn elapsed_ms(&self) -> u64 {
        self.start.elapsed().as_millis() as u64
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
    verbose: bool,
    concurrency: u32,
    no_remediation: bool,
    remediation_report: bool,
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

    // Validate --agent passport exists before eval (skip in CI/JSON modes)
    if !ci && !json {
        if let Some(agent_name) = agent {
            let project_path = config.project_path.clone().unwrap_or_else(|| ".".to_string());
            let show_url = format!(
                "/agent/show?path={}&name={}",
                url_encode(&project_path),
                url_encode(agent_name)
            );
            let passport_exists = match client.get_json(&show_url).await {
                Ok(resp) => resp.get("error").is_none(),
                Err(_) => false,
            };

            if !passport_exists {
                eprintln!(
                    "{}  Passport '{}' not found.",
                    warning_icon(),
                    bold(agent_name)
                );
                eprint!("   Create a new passport with this name? [y/N] ");

                let mut answer = String::new();
                if std::io::stdin().read_line(&mut answer).is_ok()
                    && answer.trim().eq_ignore_ascii_case("y")
                {
                    let init_body = serde_json::json!({
                        "path": project_path,
                        "name": agent_name,
                    });
                    match client.post_json("/agent/init", &init_body).await {
                        Ok(_) => eprintln!("   {} Passport '{}' created.", check_mark(), agent_name),
                        Err(e) => {
                            eprintln!("   Error creating passport: {e}");
                            return 1;
                        }
                    }
                } else {
                    eprintln!("   Eval will run but results won't be saved to a passport.");
                    // Remove agent from body so engine doesn't try to sync
                    body.as_object_mut().map(|o| o.remove("agent"));
                }
            }
        } else {
            eprintln!(
                "{}  No --agent specified. Eval results won't be linked to any passport.",
                dim("hint:")
            );
            eprintln!(
                "{}  Use: complior eval --target <url> --agent <passport-name>",
                dim("     ")
            );
        }
    }

    // JSON mode: use blocking JSON endpoint (no streaming)
    if json {
        return run_eval_json(&client, &body, ci, threshold, remediation_report).await;
    }

    // Streaming mode: use SSE endpoint for live progress
    match client.post_stream_long("/eval/run/stream", &body).await {
        Ok(resp) => {
            let (exit_code, result) = parse_eval_stream(resp, concurrency, verbose).await;

            // Print full summary report after stream
            if let Some(ref result) = result {
                // Fetch remediation data for inline recommendations
                if !no_remediation {
                    let remediation = fetch_remediation(&client, result).await;
                    format_eval_report_with_remediation(result, &remediation);
                } else {
                    format_eval_report(result);
                }

                // Full remediation report export
                if remediation_report {
                    print_remediation_report(&client).await;
                }
            }

            // CI mode: check threshold (exit 2 = threshold violation, exit 1 = error)
            if ci {
                if let Some(ref result) = result {
                    return print_ci_output(result, threshold);
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

pub async fn run_eval_last(json: bool, failures_only: bool, ci: bool, threshold: u32, config: &TuiConfig) -> i32 {
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
                println!("  {} {}", bold(diamond()), bold(&format!(
                    "Complior v{}  ·  EU AI Act Eval  ·  {}",
                    env!("CARGO_PKG_VERSION"), mode_label
                )));
                println!("  {}", separator());

                let failed = result.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);
                let errors = result.get("errors").and_then(|v| v.as_u64()).unwrap_or(0);
                let inconclusive = result.get("inconclusive").and_then(|v| v.as_u64()).unwrap_or(0);
                let results_arr = result.get("results").and_then(|v| v.as_array());
                print_failures(results_arr, failed, errors, inconclusive);
                println!("  {}", separator());
            } else {
                // Show header for standalone view
                let tier = result.get("tier").and_then(|v| v.as_str()).unwrap_or("basic");
                let mode_label = mode_label_from_tier(tier);
                println!();
                println!("  {} {}", bold(diamond()), bold(&format!(
                    "Complior v{}  ·  EU AI Act Eval  ·  {}",
                    env!("CARGO_PKG_VERSION"), mode_label
                )));
                println!("  {}", separator());

                let target = result.get("target").and_then(|v| v.as_str()).unwrap_or("?");
                println!();
                println!("  {}     {}", dim("Target"), target);

                format_eval_report(&result);
            }

            // CI mode: check threshold against last result
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

// ── JSON path ────────────────────────────────────────────────

/// JSON-only eval path (blocking, for --json and piped output).
async fn run_eval_json(
    client: &crate::engine_client::EngineClient,
    body: &serde_json::Value,
    ci: bool,
    threshold: u32,
    remediation_report: bool,
) -> i32 {
    match client.post_json_long("/eval/run", body).await {
        Ok(mut result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            // US-REM-08: Include remediationPlan in JSON when --remediation
            if remediation_report {
                if let Ok(report) = client.post_json("/eval/remediation-report", &serde_json::json!({})).await {
                    if let Some(actions) = report.get("actions") {
                        result.as_object_mut().map(|obj| obj.insert("remediationPlan".to_string(), actions.clone()));
                    }
                    if let Some(patch) = report.get("system_prompt_patch") {
                        result.as_object_mut().map(|obj| obj.insert("systemPromptPatch".to_string(), patch.clone()));
                    }
                    if let Some(api_config) = report.get("api_config_patch") {
                        result.as_object_mut().map(|obj| obj.insert("apiConfigPatch".to_string(), api_config.clone()));
                    }
                }
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
    verbose: bool,
) -> (i32, Option<serde_json::Value>) {
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut current_event = String::new();
    let mut current_phase = String::new();
    let mut result: Option<serde_json::Value> = None;

    // Phase 3b: track health check latency
    let mut start_time = Instant::now();

    // Phase 4: track phase stats for completion summaries
    let mut phase_stats: Option<PhaseStats> = None;
    let mut prev_category = String::new();
    let mut _total_cost: f64 = 0.0;

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
                            let judge_model = parsed.get("judgeModel").and_then(|v| v.as_str());

                            // Phase 3: Enhanced header
                            print_eval_header(target, model_name, mode, judge_model);
                            print_concurrency_info(concurrency);

                            start_time = Instant::now();
                        }
                    }
                    "eval:health" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            let ok = parsed.get("ok").and_then(|v| v.as_bool()).unwrap_or(false);
                            // Phase 3b: health check with latency
                            let latency_ms = start_time.elapsed().as_millis();
                            if ok {
                                println!("  {}  Health check passed ({}ms)", green(check_mark()), latency_ms);
                            } else {
                                // Phase 3e: actionable error message
                                println!("  {}  Health check failed — target not reachable",
                                    red(if use_unicode() { "✖" } else { "X" }));
                                println!("     Check: is the endpoint running? Try: curl <target>");
                                return (1, None);
                            }
                        }
                    }
                    "eval:test" => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            let phase = parsed.get("phase").and_then(|v| v.as_str()).unwrap_or("");
                            let completed = parsed.get("completed").and_then(|v| v.as_u64()).unwrap_or(0);
                            let total = parsed.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
                            let verdict = parsed.get("verdict").and_then(|v| v.as_str()).unwrap_or("?");
                            let method = parsed.get("method").and_then(|v| v.as_str()).unwrap_or("deterministic");
                            let category = parsed.get("category").and_then(|v| v.as_str()).unwrap_or("");
                            let test_id = parsed.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
                            let name = parsed.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                            let latency_ms = parsed.get("latencyMs").and_then(|v| v.as_u64()).unwrap_or(0);
                            let severity = parsed.get("severity").and_then(|v| v.as_str());

                            // Phase change: print completion summary for previous phase
                            let is_first = phase != current_phase;
                            if is_first {
                                // Erase previous progress bar, print phase completion
                                if let Some(stats) = phase_stats.take() {
                                    erase_prev_line();
                                    print_phase_completion(&stats);
                                    _total_cost += stats.cost_estimate;
                                }

                                current_phase = phase.to_string();
                                prev_category.clear();
                                println!();
                                print_phase_header(&current_phase, total);

                                // Start tracking new phase
                                phase_stats = Some(PhaseStats::new(phase, total));
                            }

                            // Record verdict in phase stats
                            if let Some(ref mut stats) = phase_stats {
                                stats.record(verdict, method);
                            }

                            // Erase previous progress bar line (except first test in phase)
                            if !is_first {
                                erase_prev_line();
                            }

                            // Category separator when category changes within a phase
                            if category != prev_category && !category.is_empty() {
                                let ct = category_ct_id(category);
                                let label = category_label(category);
                                println!("  {} {} {} {}",
                                    dim(h_line()), dim(h_line()), dim(&format!("{ct} {label}")),
                                    dim(&h_line().repeat(3)));
                                prev_category = category.to_string();
                            }

                            // Show every test result line
                            print_test_line(test_id, name, verdict, latency_ms, severity, method);

                            // Verbose: show probe, response, reasoning
                            if verbose {
                                if let Some(probe) = parsed.get("probe").and_then(|v| v.as_str()) {
                                    if !probe.is_empty() {
                                        println!("         {} {}", dim("Probe:"), truncate_str(probe, 80));
                                    }
                                }
                                if let Some(response) = parsed.get("response").and_then(|v| v.as_str()) {
                                    if !response.is_empty() {
                                        println!("         {} {}", dim("Response:"), truncate_str(response, 80));
                                    }
                                }
                                if let Some(reasoning) = parsed.get("reasoning").and_then(|v| v.as_str()) {
                                    if !reasoning.is_empty() {
                                        println!("         {} {}", dim("Reasoning:"), truncate_str(reasoning, 80));
                                    }
                                }
                            }

                            // Always print progress bar (as a full line, will be erased on next update)
                            print_progress_bar(completed, total, test_id, category, name, method == "llm-judge");
                        }
                    }
                    "eval:done" => {
                        // Print final phase completion summary
                        if let Some(stats) = phase_stats.take() {
                            erase_prev_line();
                            print_phase_completion(&stats);
                            _total_cost += stats.cost_estimate;
                        }

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

/// Print the styled eval header block with version, mode, adapter, and judge model.
fn print_eval_header(target: &str, model: &str, mode: &str, judge_model: Option<&str>) {
    let mode_label = match mode {
        "full" => "Full Eval · Conformity + Security",
        "deterministic + LLM-judged" => "Conformity Check · Det + LLM",
        "LLM-judged tests" => "LLM-Judge Conformity",
        "security probes" => "Security Probes",
        _ => "Conformity Check",
    };

    println!();
    println!("  {} {}", bold(diamond()), bold(&format!(
        "Complior v{}  ·  EU AI Act Eval  ·  {}",
        env!("CARGO_PKG_VERSION"), mode_label
    )));
    println!("  {}", separator());
    println!();
    println!("  {}     {}", dim("Target"), target);
    println!("  {}      {}", dim("Model"), model);

    // Phase 3a: Adapter detection line
    let adapter = detect_adapter(target);
    println!("  {}    {} (auto-detected)", dim("Adapter"), adapter);

    // Phase 3c: LLM judge block
    if let Some(jm) = judge_model {
        if jm != "default" {
            let provider = judge_provider_label(jm);
            println!("  {}  {} ({})", dim("LLM Judge"), jm, provider);
        }
    }
}

/// Print concurrency info line (only if > 1). Phase 3d: consistent alignment.
fn print_concurrency_info(concurrency: u32) {
    if concurrency > 1 {
        println!("  {}   {}", dim("Parallel"), format!("{concurrency} workers"));
    }
    println!();
}

/// Print a phase section header (DETERMINISTIC TESTS, LLM-JUDGE TESTS, etc.).
fn print_phase_header(phase: &str, total: u64) {
    let label = phase_label(phase);
    println!("  {}  {}", bold(label), dim(&format!("0/{total}")));
}

/// Print a single test result line with optional severity and timeout/error handling.
fn print_test_line(
    _test_id: &str,
    name: &str,
    verdict: &str,
    latency_ms: u64,
    severity: Option<&str>,
    method: &str,
) {
    // Phase 9a: timeout handling
    if latency_ms > 30000 {
        let timeout_str = format!("{:.1}s", latency_ms as f64 / 1000.0);
        println!("    {}  TIMEOUT ({})  {}",
            yellow(if use_unicode() { "▲" } else { "!" }),
            timeout_str, name);
        return;
    }

    // Phase 9b: LLM error display
    if verdict == "error" && method == "llm-judge" {
        println!("    {}  LLM ERROR  {}",
            yellow(if use_unicode() { "▲" } else { "!" }),
            name);
        return;
    }

    let icon = match verdict {
        "pass" => green(check_mark()),
        "fail" => red(if use_unicode() { "✖" } else { "X" }),
        "skip" => dim(skip_icon()),
        "error" | "inconclusive" => yellow(if use_unicode() { "▲" } else { "!" }),
        _ => dim(if use_unicode() { "·" } else { "." }),
    };

    // Compact format for passes: icon + id + name (no padding, no latency)
    if verdict == "pass" || verdict == "skip" {
        println!("    {}  {}", icon, dim(&truncate_str(name, 50)));
        return;
    }

    // Detailed format for failures/errors: icon + id + name + severity + latency
    let latency = format_latency(latency_ms);
    let sev_tag = match severity {
        Some("critical") => format!(" · {}", red("CRITICAL")),
        Some("high") => format!(" · {}", yellow("HIGH")),
        Some("medium") => format!(" · {}", cyan("MEDIUM")),
        Some("low") => format!(" · {}", dim("LOW")),
        _ => String::new(),
    };

    println!("    {}  {}{} {}", icon, name, sev_tag, dim(&latency));
}

/// Erase previous line using ANSI: move up 1 + clear entire line.
/// Used to overwrite the progress bar before printing the next update.
fn erase_prev_line() {
    if use_unicode() {
        print!("\x1b[1A\x1b[2K");
    }
}

/// Progress bar printed as a full line (with newline).
/// Gets erased on next test update via `erase_prev_line()`.
fn print_progress_bar(completed: u64, total: u64, _test_id: &str, category: &str, name: &str, is_llm: bool) {
    if total == 0 { return; }
    let bar_width: usize = 20;
    let filled = ((completed as f64 / total as f64) * bar_width as f64).round() as usize;
    let empty = bar_width.saturating_sub(filled);
    let bar = format!("{}{}", bar_filled().repeat(filled), bar_empty().repeat(empty));

    let ct_id = category_ct_id(category);

    // Phase 4c: LLM pending indicator
    let pending = if is_llm && completed < total {
        if use_unicode() { " \u{27F3}" } else { " ~" }
    } else {
        ""
    };

    // Print as full line with println! — will be erased on next update
    println!("  [{}] {:>3}/{}  {} {}: {}{}",
        bar, completed, total, ct_id, category_label(category),
        truncate_str(name, 30), pending);
}

/// Phase 4d: phase completion summary line.
fn print_phase_completion(stats: &PhaseStats) {
    let label = phase_label(&stats.phase);
    let dur = format_duration(stats.elapsed_ms());
    let failed_part = if stats.failed > 0 {
        format!("  ({} failed)", stats.failed)
    } else {
        String::new()
    };

    // Phase 4e: cost in LLM completion
    let cost_part = if stats.cost_estimate > 0.0 {
        format!("  ~${:.2}", stats.cost_estimate)
    } else {
        String::new()
    };

    println!("  {}  {}  {}/{} passed{}  in {}{}",
        green(check_mark()), bold(label),
        stats.passed, stats.total, failed_part, dur, cost_part);
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
    let skipped = result.get("skipped").and_then(|v| v.as_u64()).unwrap_or(0);
    let duration = result.get("duration").and_then(|v| v.as_u64()).unwrap_or(0);
    let capped = result.get("criticalCapped").and_then(|v| v.as_bool()).unwrap_or(false);
    let sec_score = result.get("securityScore").and_then(|v| v.as_u64());
    let sec_grade = result.get("securityGrade").and_then(|v| v.as_str());
    let adapter_name = result.get("adapterName").and_then(|v| v.as_str());
    let results_arr = result.get("results").and_then(|v| v.as_array());
    let categories_arr = result.get("categories").and_then(|v| v.as_array());

    // Count LLM-judged tests
    let llm_count = results_arr.map(|r| r.iter().filter(|t|
        t.get("method").and_then(|v| v.as_str()) == Some("llm-judge")
    ).count() as u64).unwrap_or(0);

    // 1. Completion line
    println!();
    print_completion_line(total_tests, duration, llm_count);

    // 2. Failures (detailed problems)
    print_failures(results_arr, failed, errors, inconclusive);

    // 3. Cost estimation (LLM judge calls)
    if llm_count > 0 {
        print_cost_estimate(llm_count);
    }

    // 4. Quick actions
    print_quick_actions(target, tier, overall, sec_score, categories_arr, failed, results_arr);

    // 5. RESULTS — final summary block
    print_summary(target, tier, overall, grade, sec_score, sec_grade,
        passed, failed, errors, inconclusive, skipped, total_tests, duration,
        llm_count, capped, adapter_name, results_arr);

    // 6. Critical gaps (inside results block)
    print_critical_gaps(categories_arr);

    // 7. Category breakdown
    print_category_breakdown(categories_arr, tier);

    // 8. OWASP security breakdown
    if sec_score.is_some() {
        print_owasp_breakdown(results_arr);
    }

    // Closing separator
    println!();
    println!("  {}", separator());
}

/// Completion line: "✓ N tests completed in Xm Ys"
fn print_completion_line(total: u64, duration_ms: u64, llm_count: u64) {
    let dur = format_duration(duration_ms);
    let llm_suffix = if llm_count > 0 {
        format!("  (LLM judge: {} calls)", llm_count)
    } else {
        String::new()
    };
    println!("  {}  {} tests completed in {}{}", green(check_mark()), total, dur, dim(&llm_suffix));
}

/// Summary section with scores, grade, and test stats.
#[allow(clippy::too_many_arguments)]
fn print_summary(
    target: &str, tier: &str, overall: u64, grade: &str,
    sec_score: Option<u64>, sec_grade: Option<&str>,
    passed: u64, failed: u64, errors: u64, inconclusive: u64, skipped: u64, total: u64,
    duration_ms: u64, llm_count: u64, capped: bool,
    adapter_name: Option<&str>,
    results_arr: Option<&Vec<serde_json::Value>>,
) {
    let w = display_width();

    println!();
    println!("  {}", separator());
    println!("  {}", bold("RESULTS"));
    println!("  {}", separator());

    // Conformity score (all modes except security-only)
    if tier != "security" {
        let score_str = format!("{overall} / 100");
        let label = "CONFORMITY SCORE";
        let pad = w.saturating_sub(label.len() + score_str.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), score_color(overall as f64, &score_str));
    }

    // Security score
    if let Some(ss) = sec_score {
        let score_str = format!("{ss} / 100");
        let label = "SECURITY SCORE";
        let pad = w.saturating_sub(label.len() + score_str.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), score_color(ss as f64, &score_str));
    }

    // Grade (overall or single)
    let display_grade = if tier == "full" {
        let min_score = sec_score.map(|s| s.min(overall)).unwrap_or(overall);
        let g = resolve_grade(min_score as f64).to_string();
        let label = "OVERALL GRADE";
        let pad = w.saturating_sub(label.len() + g.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), eval_grade_color(&g));
        g
    } else if tier == "security" {
        // Security-only: use security grade, not conformity grade (which is 0/F)
        let g = sec_grade.unwrap_or(grade);
        let label = "GRADE";
        let pad = w.saturating_sub(label.len() + g.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), eval_grade_color(g));
        g.to_string()
    } else {
        let label = "GRADE";
        let pad = w.saturating_sub(label.len() + grade.len());
        println!("  {}{}{}", bold(label), " ".repeat(pad), eval_grade_color(grade));
        grade.to_string()
    };

    println!("  {}", separator());

    if capped {
        println!("  {}  Score capped due to critical category failure", yellow(if use_unicode() { "▲" } else { "!" }));
    }

    // Stats block
    println!();

    // Phase 5a: Separate conformity/security stats when tier=full
    if tier == "full" {
        // Count conformity vs security results separately
        let (conf_passed, conf_failed, sec_passed, sec_failed, sec_inconc) =
            count_conformity_security(results_arr);

        println!("  {}  {} passed · {} failed",
            dim(&format!("{:<10}", "Conformity")), conf_passed, conf_failed);
        let sec_inconc_part = if sec_inconc > 0 {
            format!(" · {} inconclusive", sec_inconc)
        } else {
            String::new()
        };
        println!("  {}  {} passed · {} failed{}",
            dim(&format!("{:<10}", "Security")), sec_passed, sec_failed, sec_inconc_part);
    }

    // Phase 5b: Warning/skipped counts in main stats line
    let label = if tier == "security" { "Probes" } else { "Tests" };
    let pad = if tier == "security" { "     " } else { "      " };
    let inc_part = if inconclusive > 0 {
        format!(" · {} warnings", inconclusive)
    } else {
        String::new()
    };
    let skip_part = if skipped > 0 {
        format!(" · {} skipped", skipped)
    } else {
        String::new()
    };
    let err_part = if errors > 0 {
        format!(" · {} errors", errors)
    } else {
        String::new()
    };
    println!("  {}{}{} passed · {} failed{}{}{}",
        dim(label), pad, passed, failed, inc_part, skip_part, err_part);

    println!("  {}     {}", dim("Target"), target);

    // Phase 5c: Adapter line in summary
    let adapter = adapter_name.unwrap_or_else(|| detect_adapter(target));
    println!("  {}    {} (auto-detected)", dim("Adapter"), adapter);

    // Duration with LLM info
    let dur = format_duration(duration_ms);
    if llm_count > 0 {
        println!("  {}   {}  (LLM judge: {} calls)", dim("Duration"), dur, llm_count);
    } else {
        println!("  {}   {}", dim("Duration"), dur);
    }

    // Mode description — count security probes from results (not hardcoded)
    let security_count = results_arr
        .map(|r| r.iter().filter(|t| t.get("owaspCategory").and_then(|v| v.as_str()).is_some()).count() as u64)
        .unwrap_or(0);
    let mode_desc = mode_description(tier, total, llm_count, security_count);
    println!("  {}       {}", dim("Mode"), mode_desc);

    // Suppress unused warning
    let _ = &display_grade;
}

/// Count conformity vs security results separately.
fn count_conformity_security(results: Option<&Vec<serde_json::Value>>) -> (u64, u64, u64, u64, u64) {
    let results = match results {
        Some(r) => r,
        None => return (0, 0, 0, 0, 0),
    };

    let mut conf_passed = 0u64;
    let mut conf_failed = 0u64;
    let mut sec_passed = 0u64;
    let mut sec_failed = 0u64;
    let mut sec_inconc = 0u64;

    for r in results {
        let has_owasp = r.get("owaspCategory").and_then(|v| v.as_str()).is_some();
        let verdict = r.get("verdict").and_then(|v| v.as_str()).unwrap_or("");
        if has_owasp {
            match verdict {
                "pass" => sec_passed += 1,
                "fail" | "error" => sec_failed += 1,
                "inconclusive" => sec_inconc += 1,
                _ => {}
            }
        } else {
            match verdict {
                "pass" => conf_passed += 1,
                "fail" | "error" => conf_failed += 1,
                _ => {}
            }
        }
    }

    (conf_passed, conf_failed, sec_passed, sec_failed, sec_inconc)
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

        if cat_total == 0 || cat_failed == 0 { continue; }

        let desc = match cat_name {
            "transparency" => "AI system disclosure failures. Art. 50 enforcement risk.",
            "prohibited" => "System performed prohibited actions. Art. 5 enforcement risk.",
            "oversight" => "Missing human oversight controls. Art. 14 enforcement risk.",
            "explanation" => "Insufficient explainability. Art. 13 enforcement risk.",
            "bias" => "Discrimination or bias detected. Art. 10 enforcement risk.",
            "accuracy" => "Accuracy or reliability issues. Art. 15 enforcement risk.",
            "robustness" => "Robustness/security failures. Art. 15 enforcement risk.",
            "logging" => "Insufficient logging/audit trail. Art. 12 enforcement risk.",
            "risk-awareness" => "Missing risk awareness. Art. 9 enforcement risk.",
            "gpai" => "GPAI transparency failures. Art. 52 enforcement risk.",
            "industry" => "Industry-specific compliance gaps. Art. 6 enforcement risk.",
            _ => "Compliance failures detected.",
        };
        gaps.push((cat_name, cat_passed, cat_total, desc));
    }

    println!();
    if gaps.is_empty() {
        println!("  {}  No critical gaps detected.", green(check_mark()));
    } else {
        println!("  {}", separator());
        println!("  {}  ({} categories with failures)", bold("COMPLIANCE GAPS"), gaps.len());
        println!("  {}", separator());

        for (cat_name, cat_passed, cat_total, desc) in &gaps {
            let article = category_article(cat_name);
            let label = category_label(cat_name);
            println!();
            println!("  {}  {} · {} — {}/{} tests passed",
                red(if use_unicode() { "✖" } else { "X" }), article, label, cat_passed, cat_total);
            println!("     {}", desc);
        }
    }
}

/// Category breakdown with visual bars. Phase 6: enhanced skip/warning handling.
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
                    let cat_skipped = cat.get("skipped").and_then(|v| v.as_u64()).unwrap_or(0);

                    if cat_total == 0 {
                        // Phase 6a: skip icon for categories with no tests
                        println!("    {:<6}{:<24}  {}      (no tests)", ct_id, label, skip_icon());
                    } else {
                        let bar = format_bar(cat_passed, cat_total, 15);
                        let ratio = format!("{:>2}/{:>2}", cat_passed, cat_total);
                        let grade_str = eval_grade_color(cat_grade);

                        // Phase 6c: warning indicator for 0% pass categories
                        let warn = if cat_score == 0 && cat_total > 0 {
                            format!("  {}", red(warning_icon()))
                        } else if cat_score < 20 {
                            format!("  {}", red(warning_icon()))
                        } else {
                            String::new()
                        };

                        // Phase 6d: skipped count per category
                        let skip_note = if cat_skipped > 0 {
                            format!("    ({})", dim(&format!("{} skipped", cat_skipped)))
                        } else {
                            String::new()
                        };

                        println!("    {:<6}{:<24} {}   {}  {}{}{}",
                            ct_id, label, ratio, bar, grade_str, warn, skip_note);
                    }
                }
                None => {
                    // Phase 6b: specific skip reasons
                    let skip_reason = match cat_key {
                        "explanation" if tier == "basic" => "(requires --llm)",
                        "bias" if tier == "basic" => "(requires --llm)",
                        "gpai" if tier == "basic" => "(requires --llm)",
                        "robustness" if tier == "basic" || tier == "standard" => "(requires --security)",
                        _ if tier == "basic" => "(not tested)",
                        _ if tier == "security" => "(not in scope)",
                        _ => "(not tested)",
                    };
                    // Phase 6a: skip icon instead of —
                    println!("    {:<6}{:<24}  {}      {}", ct_id, label, skip_icon(), dim(skip_reason));
                }
            }
        }
    }
}

/// Failures section grouped by category. Phase 7: enhanced with severity, warnings, limits.
fn print_failures(results: Option<&Vec<serde_json::Value>>, failed: u64, errors: u64, inconclusive: u64) {
    let results = match results {
        Some(r) => r,
        None => return,
    };

    let total_failed = failed + errors;  // inconclusive excluded from "failed" count

    println!();
    println!("  {}", separator());

    // Phase 7d: Enhanced all-passed message
    if total_failed == 0 && inconclusive == 0 {
        println!("  {}  All tests passed — no conformity or security failures detected.", green(check_mark()));
        println!("  {}", separator());
        return;
    }

    if total_failed == 0 {
        println!("  {}  All tests passed.", green(check_mark()));
        println!("  {}", separator());
        return;
    }

    // Phase 7c: Warning count in failures header
    let warn_part = if inconclusive > 0 {
        format!(" · {} warnings", inconclusive)
    } else {
        String::new()
    };
    println!("  {}  ({} failed{})", bold("FAILURES"), total_failed, warn_part);
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
        println!("  {}", dim(&h_line().repeat(header_text.len())));
        println!();

        // Phase 7e: severity-based limits
        // Critical/High: always show. Medium: max 3. Low: max 2.
        let mut medium_shown = 0u32;
        let mut medium_hidden = 0u32;
        let mut low_shown = 0u32;
        let mut low_hidden = 0u32;

        for t in &cat_failures {
            let severity = t.get("severity").and_then(|v| v.as_str()).unwrap_or("medium");

            match severity {
                "medium" => {
                    if medium_shown >= 3 {
                        medium_hidden += 1;
                        continue;
                    }
                    medium_shown += 1;
                }
                "low" => {
                    if low_shown >= 2 {
                        low_hidden += 1;
                        continue;
                    }
                    low_shown += 1;
                }
                _ => {} // critical/high always shown
            }

            let test_id = t.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
            let name = t.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let probe = t.get("probe").and_then(|v| v.as_str()).unwrap_or("");
            let response = t.get("response").and_then(|v| v.as_str()).unwrap_or("");
            let reasoning = t.get("reasoning").and_then(|v| v.as_str()).unwrap_or("");
            let verdict = t.get("verdict").and_then(|v| v.as_str()).unwrap_or("fail");
            let article = category_article(cat_key);

            let icon = if verdict == "error" {
                yellow(if use_unicode() { "▲" } else { "!" })
            } else {
                red(if use_unicode() { "✖" } else { "X" })
            };

            // Phase 7a: severity tag on failure lines
            let sev_tag = match severity {
                "critical" => format!(" · {}", red("CRITICAL")),
                "high" => format!(" · {}", yellow("HIGH")),
                "medium" => format!(" · {}", cyan("MEDIUM")),
                "low" => format!(" · {}", dim("LOW")),
                _ => String::new(),
            };

            // Test header line
            if article.is_empty() {
                println!("  {}  {}{} · {}", icon, dim(test_id), sev_tag, name);
            } else {
                println!("  {}  {}  {}{} · {}", icon, dim(test_id), dim(article), sev_tag, name);
            }

            let tw = term_width();

            // Phase 7b: Expected line
            if !name.is_empty() {
                println!("{}", wrap_aligned("     Expected: ", name, tw));
            }

            // Probe
            if !probe.is_empty() {
                let label = format!("     {}    \"", dim("Probe:"));
                println!("{}\"", wrap_aligned(&label, probe, tw));
            }

            // Response
            if response.is_empty() {
                println!("     {} {}", dim("Response:"), dim("(empty response)"));
            } else {
                let resp_text = truncate_str(response, 300);
                let label = format!("     {} \"", dim("Response:"));
                println!("{}\"", wrap_aligned(&label, &resp_text, tw));
            }

            // Reason
            if !reasoning.is_empty() {
                println!("{}", wrap_aligned("     Reason:   ", reasoning, tw));
            }

            println!();
        }

        // Phase 7e: summary for hidden medium/low failures
        if medium_hidden > 0 {
            println!("  {} and {} more medium failures.",
                dim("..."), medium_hidden);
        }
        if low_hidden > 0 {
            println!("  {} and {} more low failures.",
                dim("..."), low_hidden);
        }
        if medium_hidden > 0 || low_hidden > 0 {
            println!("  Full list: {}", dim("complior eval --json > eval-report.json"));
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
        println!("  {}", dim(&h_line().repeat(5)));
        println!();

        for (i, t) in other_failures.iter().enumerate() {
            if i >= 5 { break; }
            let test_id = t.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
            let name = t.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let reasoning = t.get("reasoning").and_then(|v| v.as_str()).unwrap_or("");
            let severity = t.get("severity").and_then(|v| v.as_str());
            let sev_tag = match severity {
                Some("critical") => format!(" · {}", red("CRITICAL")),
                Some("high") => format!(" · {}", yellow("HIGH")),
                _ => String::new(),
            };
            println!("  {}  {}{} · {}", red(if use_unicode() { "✖" } else { "X" }), dim(test_id), sev_tag, name);
            if !reasoning.is_empty() {
                println!("     {}   {}", dim("Reason:"), truncate_str(reasoning, 70));
            }
            println!();
        }
    }
}

/// Quick actions section with contextual suggestions. Phase 8: enhanced.
fn print_quick_actions(
    target: &str,
    tier: &str,
    overall: u64,
    sec_score: Option<u64>,
    categories: Option<&Vec<serde_json::Value>>,
    failed: u64,
    results: Option<&Vec<serde_json::Value>>,
) {
    println!("  {}", separator());
    println!("  {}", bold("QUICK ACTIONS"));
    println!("  {}", separator());
    println!();

    let has_transparency_failures = has_category_failures(categories, "transparency");
    let has_bias_failures = has_category_failures(categories, "bias");
    let has_prohibited_failures = has_category_failures(categories, "prohibited");
    let has_logging_failures = has_category_failures(categories, "logging");

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

    // Phase 8a: Log testing suggestion
    if has_logging_failures {
        println!("  {}  {}", dim(&format!("{:<22}", "Review logs")),
            format!("complior eval --categories logging --target {}", truncate_str(target, 40)));
    }

    // Phase 8b: Security-specific OWASP actions
    if let Some(results) = results {
        let owasp_failures = collect_owasp_failure_categories(results);
        if owasp_failures.contains(&"LLM01") {
            println!("  {}  {}", dim(&format!("{:<22}", "Fix prompt injection")),
                "Review input sanitization (OWASP LLM01)");
        }
        if owasp_failures.contains(&"LLM02") {
            println!("  {}  {}", dim(&format!("{:<22}", "Fix data leakage")),
                "Review output filtering (OWASP LLM02)");
        }
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

    // Phase 8c: Guard Service suggestion
    if let Some(ss) = sec_score {
        if ss < 60 {
            println!("  {}  {}", dim(&format!("{:<22}", "Enable Guard Service")),
                format!("complior guard --target {}", truncate_str(target, 40)));
        }
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
    if total == 0 { return bar_empty().repeat(width); }
    let ratio = passed as f64 / total as f64;
    let filled = (ratio * width as f64).round() as usize;
    let empty = width.saturating_sub(filled);
    format!("{}{}", bar_filled().repeat(filled), bar_empty().repeat(empty))
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

/// Wrap text with indentation alignment.
/// `label_prefix` is the leading text (e.g. "     Fix:      "),
/// and the continuation lines are indented to the same column.
fn wrap_aligned(label_prefix: &str, text: &str, term_width: usize) -> String {
    let indent = label_prefix.chars().count();
    let usable = if term_width > indent + 10 { term_width - indent } else { 80 };
    let cleaned: String = text.split_whitespace().collect::<Vec<&str>>().join(" ");

    let mut lines: Vec<String> = Vec::new();
    let mut current = String::new();

    for word in cleaned.split_whitespace() {
        let word_len = word.chars().count();
        let cur_len = current.chars().count();
        if cur_len == 0 {
            current = word.to_string();
        } else if cur_len + 1 + word_len <= usable {
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

    if lines.is_empty() {
        return format!("{label_prefix}");
    }

    let pad: String = " ".repeat(indent);
    let mut result = format!("{label_prefix}{}", lines[0]);
    for line in &lines[1..] {
        result.push('\n');
        result.push_str(&pad);
        result.push_str(line);
    }
    result
}

/// Get terminal width, defaulting to 100.
fn term_width() -> usize {
    crossterm::terminal::size().map(|(w, _)| w as usize).unwrap_or(100)
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

/// Color a grade letter based on its value (delegates to shared colors helper).
fn eval_grade_color(grade: &str) -> String {
    super::format::colors::grade_color(grade, grade)
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
fn mode_description(tier: &str, total: u64, llm_count: u64, security_count: u64) -> String {
    match tier {
        "security" => format!("{total} security probes (OWASP LLM Top 10)"),
        "full" => {
            let conformity = total.saturating_sub(security_count);
            format!("{total} tests ({conformity} conformity + {security_count} security probes)")
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

/// Collect OWASP categories that have failures (for security-specific quick actions).
fn collect_owasp_failure_categories(results: &[serde_json::Value]) -> Vec<&str> {
    let mut cats: Vec<&str> = Vec::new();
    for r in results {
        let verdict = r.get("verdict").and_then(|v| v.as_str()).unwrap_or("");
        if verdict != "fail" && verdict != "error" { continue; }
        if let Some(cat) = r.get("owaspCategory").and_then(|v| v.as_str()) {
            if !cats.contains(&cat) {
                cats.push(cat);
            }
        }
    }
    cats
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

    // Labels match TS canonical source: security-integration.ts OWASP_LLM_LABELS
    // Shortened for CLI display (28-char column width)
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
        let inconc_str = if *inconc > 0 { format!("  {}", dim(&format!("{inconc} {}", warning_icon()))) } else { String::new() };
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

// ── Remediation (US-REM-07..10) ──────────────────────────────

/// Fetch remediation data from engine for failed tests.
async fn fetch_remediation(
    client: &crate::engine_client::EngineClient,
    result: &serde_json::Value,
) -> serde_json::Value {
    let results_arr = match result.get("results").and_then(|v| v.as_array()) {
        Some(r) => r,
        None => return serde_json::Value::Null,
    };

    // Collect failed test IDs
    let failed_ids: Vec<&str> = results_arr.iter()
        .filter(|t| {
            let v = t.get("verdict").and_then(|v| v.as_str()).unwrap_or("");
            v == "fail" || v == "error"
        })
        .filter_map(|t| t.get("testId").and_then(|v| v.as_str()))
        .collect();

    if failed_ids.is_empty() {
        return serde_json::Value::Null;
    }

    let ids_csv = failed_ids.join(",");
    let url = format!("/eval/remediation?testIds={}", ids_csv);

    match client.get_json(&url).await {
        Ok(data) => data,
        Err(_) => serde_json::Value::Null,
    }
}

/// Enhanced format_eval_report with inline remediation recommendations.
fn format_eval_report_with_remediation(result: &serde_json::Value, remediation: &serde_json::Value) {
    let target = result.get("target").and_then(|v| v.as_str()).unwrap_or("?");
    let tier = result.get("tier").and_then(|v| v.as_str()).unwrap_or("basic");
    let overall = result.get("overallScore").and_then(|v| v.as_u64()).unwrap_or(0);
    let grade = result.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
    let total_tests = result.get("totalTests").and_then(|v| v.as_u64()).unwrap_or(0);
    let passed = result.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
    let failed = result.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);
    let errors = result.get("errors").and_then(|v| v.as_u64()).unwrap_or(0);
    let inconclusive = result.get("inconclusive").and_then(|v| v.as_u64()).unwrap_or(0);
    let skipped = result.get("skipped").and_then(|v| v.as_u64()).unwrap_or(0);
    let duration = result.get("duration").and_then(|v| v.as_u64()).unwrap_or(0);
    let capped = result.get("criticalCapped").and_then(|v| v.as_bool()).unwrap_or(false);
    let sec_score = result.get("securityScore").and_then(|v| v.as_u64());
    let sec_grade = result.get("securityGrade").and_then(|v| v.as_str());
    let adapter_name = result.get("adapterName").and_then(|v| v.as_str());
    let results_arr = result.get("results").and_then(|v| v.as_array());
    let categories_arr = result.get("categories").and_then(|v| v.as_array());

    let llm_count = results_arr.map(|r| r.iter().filter(|t|
        t.get("method").and_then(|v| v.as_str()) == Some("llm-judge")
    ).count() as u64).unwrap_or(0);

    // 1. Completion line
    println!();
    print_completion_line(total_tests, duration, llm_count);

    // 2. Failures with inline Fix/Why
    print_failures_with_remediation(results_arr, failed, errors, inconclusive, remediation);

    // 3. Cost estimation
    if llm_count > 0 {
        print_cost_estimate(llm_count);
    }

    // 4-5. Remediation plan & quick actions removed — per-test Fix/Why is sufficient.
    //       Full remediation plan available via: complior eval --remediation

    // 6. RESULTS
    print_summary(target, tier, overall, grade, sec_score, sec_grade,
        passed, failed, errors, inconclusive, skipped, total_tests, duration,
        llm_count, capped, adapter_name, results_arr);

    // 7. Critical gaps
    print_critical_gaps(categories_arr);

    // 8. Category breakdown
    print_category_breakdown(categories_arr, tier);

    // 9. OWASP breakdown
    if sec_score.is_some() {
        print_owasp_breakdown(results_arr);
    }

    println!();
    println!("  {}", separator());
}

/// Failures with inline Fix: and Why: lines from remediation data.
fn print_failures_with_remediation(
    results: Option<&Vec<serde_json::Value>>,
    failed: u64,
    errors: u64,
    inconclusive: u64,
    remediation: &serde_json::Value,
) {
    let results = match results {
        Some(r) => r,
        None => return,
    };

    let total_failed = failed + errors;

    println!();
    println!("  {}", separator());

    if total_failed == 0 && inconclusive == 0 {
        println!("  {}  All tests passed — no conformity or security failures detected.", green(check_mark()));
        println!("  {}", separator());
        return;
    }

    if total_failed == 0 {
        println!("  {}  All tests passed.", green(check_mark()));
        println!("  {}", separator());
        return;
    }

    let warn_part = if inconclusive > 0 {
        format!(" · {} warnings", inconclusive)
    } else {
        String::new()
    };
    println!("  {}  ({} failed{})", bold("FAILURES"), total_failed, warn_part);
    println!("  {}", separator());

    let failures: Vec<&serde_json::Value> = results.iter().filter(|t| {
        let v = t.get("verdict").and_then(|v| v.as_str()).unwrap_or("");
        v == "fail" || v == "error"
    }).collect();

    for &cat_key in CATEGORY_ORDER {
        let cat_failures: Vec<&&serde_json::Value> = failures.iter()
            .filter(|t| t.get("category").and_then(|v| v.as_str()) == Some(cat_key))
            .collect();

        if cat_failures.is_empty() { continue; }

        let ct_id = category_ct_id(cat_key);
        let label = category_label(cat_key);
        let count = cat_failures.len();

        println!();
        println!("  {}  {}  ({} failed)", bold(ct_id), bold(label), count);
        let header_text = format!("{}  {}", ct_id, label);
        println!("  {}", dim(&h_line().repeat(header_text.len())));
        println!();

        let mut medium_shown = 0u32;
        let mut medium_hidden = 0u32;
        let mut low_shown = 0u32;
        let mut low_hidden = 0u32;

        for t in &cat_failures {
            let severity = t.get("severity").and_then(|v| v.as_str()).unwrap_or("medium");

            match severity {
                "medium" => {
                    if medium_shown >= 3 { medium_hidden += 1; continue; }
                    medium_shown += 1;
                }
                "low" => {
                    if low_shown >= 2 { low_hidden += 1; continue; }
                    low_shown += 1;
                }
                _ => {}
            }

            let test_id = t.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
            let name = t.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let response = t.get("response").and_then(|v| v.as_str()).unwrap_or("");
            let reasoning = t.get("reasoning").and_then(|v| v.as_str()).unwrap_or("");
            let verdict = t.get("verdict").and_then(|v| v.as_str()).unwrap_or("fail");
            let article = category_article(cat_key);

            let icon = if verdict == "error" {
                yellow(if use_unicode() { "▲" } else { "!" })
            } else {
                red(if use_unicode() { "✖" } else { "X" })
            };

            let sev_tag = match severity {
                "critical" => format!(" · {}", red("CRITICAL")),
                "high" => format!(" · {}", yellow("HIGH")),
                "medium" => format!(" · {}", cyan("MEDIUM")),
                "low" => format!(" · {}", dim("LOW")),
                _ => String::new(),
            };

            if article.is_empty() {
                println!("  {}  {}{} · {}", icon, dim(test_id), sev_tag, name);
            } else {
                println!("  {}  {}  {}{} · {}", icon, dim(test_id), dim(article), sev_tag, name);
            }

            let tw = term_width();

            // Show the prompt that was sent
            let probe = t.get("probe").and_then(|v| v.as_str()).unwrap_or("");
            if !probe.is_empty() {
                let label = format!("     {}    \"", dim("Prompt:"));
                println!("{}\"", wrap_aligned(&label, probe, tw));
            }

            if !name.is_empty() {
                println!("{}", wrap_aligned("     Expected: ", name, tw));
            }

            if response.is_empty() {
                println!("     {} {}", dim("Response:"), dim("(empty response)"));
            } else {
                let resp_text = truncate_str(response, 300);
                let label = format!("     {} \"", dim("Response:"));
                println!("{}\"", wrap_aligned(&label, &resp_text, tw));
            }

            if !reasoning.is_empty() {
                println!("{}", wrap_aligned("     Reason:   ", reasoning, tw));
            }

            // Inline remediation: Fix: and Why: lines
            if let Some(actions) = remediation.get(test_id).and_then(|v| v.as_array()) {
                if let Some(first_action) = actions.first() {
                    if let Some(guidance) = first_action.get("user_guidance") {
                        if let Some(what_to_do) = guidance.get("what_to_do").and_then(|v| v.as_array()) {
                            if let Some(first_step) = what_to_do.first().and_then(|v| v.as_str()) {
                                println!("{}", wrap_aligned("     Fix:      ", first_step, tw));
                            }
                        }
                        if let Some(why) = guidance.get("why").and_then(|v| v.as_str()) {
                            let first_sentence = why.split(". ").next().unwrap_or(why);
                            println!("{}", wrap_aligned("     Why:      ", first_sentence, tw));
                        }
                    }
                }
            }

            println!();
        }

        if medium_hidden > 0 {
            println!("  {} and {} more medium failures.", dim("..."), medium_hidden);
        }
        if low_hidden > 0 {
            println!("  {} and {} more low failures.", dim("..."), low_hidden);
        }
        if medium_hidden > 0 || low_hidden > 0 {
            println!("  Full list: {}", dim("complior eval --json > eval-report.json"));
        }
    }

    // Other failures (not in CATEGORY_ORDER)
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
        println!("  {}", dim(&h_line().repeat(5)));
        println!();

        for (i, t) in other_failures.iter().enumerate() {
            if i >= 5 { break; }
            let test_id = t.get("testId").and_then(|v| v.as_str()).unwrap_or("?");
            let name = t.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let reasoning = t.get("reasoning").and_then(|v| v.as_str()).unwrap_or("");
            let severity = t.get("severity").and_then(|v| v.as_str());
            let sev_tag = match severity {
                Some("critical") => format!(" · {}", red("CRITICAL")),
                Some("high") => format!(" · {}", yellow("HIGH")),
                _ => String::new(),
            };
            println!("  {}  {}{} · {}", red(if use_unicode() { "✖" } else { "X" }), dim(test_id), sev_tag, name);
            if !reasoning.is_empty() {
                println!("     {}   {}", dim("Reason:"), reasoning);
            }
            println!();
        }
    }
}

/// Print full remediation report (--remediation flag).
async fn print_remediation_report(client: &crate::engine_client::EngineClient) {
    match client.post_json("/eval/remediation-report", &serde_json::json!({})).await {
        Ok(report) => {
            let score = report.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
            let grade = report.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
            let total = report.get("total_failures").and_then(|v| v.as_u64()).unwrap_or(0);
            let gaps = report.get("critical_gaps").and_then(|v| v.as_array());

            println!();
            println!("  {}", separator());
            println!("  {}", bold("REMEDIATION REPORT"));
            println!("  {}", separator());
            println!();
            println!("  Score: {}/100 (Grade {})", score, grade);
            println!("  Total failures: {}", total);

            if let Some(gaps) = gaps {
                if !gaps.is_empty() {
                    let gap_strs: Vec<&str> = gaps.iter().filter_map(|v| v.as_str()).collect();
                    println!("  Critical gaps: {}", red(&gap_strs.join(", ")));
                }
            }

            // Show system prompt patch path hint
            if report.get("system_prompt_patch").and_then(|v| v.as_str()).is_some() {
                println!();
                println!("  {}  System prompt patch generated", green(check_mark()));
            }

            // Save report to disk (.complior/eval-fixes/)
            let fixes_dir = std::path::Path::new(".complior/eval-fixes");
            if let Err(e) = std::fs::create_dir_all(fixes_dir) {
                eprintln!("  {} Could not create {}: {}", yellow(warning_icon()), fixes_dir.display(), e);
            } else {
                // Save markdown report
                if let Some(md) = report.get("markdown_report").and_then(|v| v.as_str()) {
                    let md_path = fixes_dir.join("remediation-report.md");
                    if std::fs::write(&md_path, md).is_ok() {
                        println!("  {}  Saved: {}", green(check_mark()), md_path.display());
                    }
                }
                // Save system prompt patch
                if let Some(patch) = report.get("system_prompt_patch").and_then(|v| v.as_str()) {
                    let sp_path = fixes_dir.join("system-prompt-patch.md");
                    if std::fs::write(&sp_path, patch).is_ok() {
                        println!("  {}  Saved: {}", green(check_mark()), sp_path.display());
                    }
                }
                // Save API config patch
                if let Some(api_config) = report.get("api_config_patch") {
                    let ac_path = fixes_dir.join("api-config.json");
                    if let Ok(json_str) = serde_json::to_string_pretty(api_config) {
                        if std::fs::write(&ac_path, &json_str).is_ok() {
                            println!("  {}  Saved: {}", green(check_mark()), ac_path.display());
                        }
                    }
                    // Save guardrails.json from input/output validation
                    let guardrails = serde_json::json!({
                        "inputValidation": api_config.get("inputValidation"),
                        "outputValidation": api_config.get("outputValidation"),
                    });
                    let gr_path = fixes_dir.join("guardrails.json");
                    if let Ok(json_str) = serde_json::to_string_pretty(&guardrails) {
                        if std::fs::write(&gr_path, &json_str).is_ok() {
                            println!("  {}  Saved: {}", green(check_mark()), gr_path.display());
                        }
                    }
                }
            }

            println!();
            println!("  {}", separator());
        }
        Err(e) => {
            eprintln!("  {} Could not generate remediation report: {}", yellow(warning_icon()), e);
        }
    }
}

/// Run eval --fix: show eval findings as fix preview (US-REM-09).
pub async fn run_eval_fix(dry_run: bool, json: bool, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.get_json("/eval/findings").await {
        Ok(data) => {
            let findings = data.get("findings").and_then(|v| v.as_array());

            if json && dry_run {
                println!("{}", serde_json::to_string_pretty(&data).unwrap_or_default());
                return 0;
            }

            match findings {
                Some(f) if !f.is_empty() => {
                    println!();
                    println!("  {}", separator());
                    println!("  {}  ({} categories with failures)", bold("EVAL FIXES"), f.len());
                    println!("  {}", separator());
                    println!();

                    for finding in f {
                        let check_id = finding.get("checkId").and_then(|v| v.as_str()).unwrap_or("?");
                        let title = finding.get("title").and_then(|v| v.as_str()).unwrap_or("?");
                        let fix_type = finding.get("type").and_then(|v| v.as_str()).unwrap_or("?");
                        let severity = finding.get("severity").and_then(|v| v.as_str()).unwrap_or("medium");
                        let fix_desc = finding.get("fixDescription").and_then(|v| v.as_str()).unwrap_or("");

                        let icon = match severity {
                            "critical" => red(if use_unicode() { "✖" } else { "X" }),
                            "high" => yellow(if use_unicode() { "▲" } else { "!" }),
                            _ => cyan(if use_unicode() { "●" } else { "o" }),
                        };

                        let type_label = if fix_type == "A" { "system-prompt" } else { "config-file" };

                        println!("  {}  {} [{}] {}", icon, bold(check_id), dim(type_label), title);
                        if !fix_desc.is_empty() {
                            println!("     {}", truncate_str(fix_desc, 75));
                        }
                        println!();
                    }

                    if dry_run {
                        // Save fix previews to .complior/eval-fixes/
                        let fixes_dir = std::path::Path::new(".complior/eval-fixes");
                        if std::fs::create_dir_all(fixes_dir).is_ok() {
                            let fixes_json = serde_json::to_string_pretty(&data).unwrap_or_default();
                            let _ = std::fs::write(fixes_dir.join("eval-findings.json"), &fixes_json);
                        }
                        println!("  {} Dry-run mode — no changes applied.", dim("ℹ"));
                        println!("  {} Preview saved to .complior/eval-fixes/eval-findings.json", dim("ℹ"));
                    } else {
                        // Apply Type B fixes via engine
                        match client.post_json("/eval/apply-fixes", &serde_json::json!({})).await {
                            Ok(result) => {
                                if json {
                                    println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                                    return 0;
                                }
                                let applied_count = result.get("appliedCount").and_then(|v| v.as_u64()).unwrap_or(0);
                                let manual_count = result.get("manualCount").and_then(|v| v.as_u64()).unwrap_or(0);

                                if applied_count > 0 {
                                    println!("  {}  {} config fixes applied", green(check_mark()), applied_count);
                                    if let Some(applied) = result.get("applied").and_then(|v| v.as_array()) {
                                        for item in applied {
                                            let file = item.get("file").and_then(|v| v.as_str()).unwrap_or("?");
                                            println!("     {} {}", green("→"), cyan(file));
                                        }
                                    }
                                }

                                if manual_count > 0 {
                                    println!();
                                    println!("  {}  {} system-prompt fixes require manual action:", yellow(warning_icon()), manual_count);
                                    if let Some(manual) = result.get("manual").and_then(|v| v.as_array()) {
                                        for item in manual {
                                            let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("?");
                                            let desc = item.get("fixDescription").and_then(|v| v.as_str()).unwrap_or("");
                                            println!("     {} {}", yellow("▸"), title);
                                            if !desc.is_empty() {
                                                println!("       {}", dim(&truncate_str(desc, 70)));
                                            }
                                        }
                                    }
                                    println!();
                                    println!("  {} Full patch: complior eval --remediation", dim("ℹ"));
                                }

                                if applied_count > 0 {
                                    println!();
                                    println!("  {} Re-run complior eval to verify improvements", dim("ℹ"));
                                }
                            }
                            Err(e) => {
                                eprintln!("Error applying eval fixes: {e}");
                                return 1;
                            }
                        }
                    }

                    println!();
                    println!("  {}", separator());
                    0
                }
                _ => {
                    if json {
                        println!("{{\"applied\": [], \"manual\": [], \"message\": \"No eval findings to fix\"}}");
                    } else {
                        println!("  {}  No eval findings to fix. Run `complior eval` first.", dim(skip_icon()));
                    }
                    0
                }
            }
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
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
            green(check_mark()))
    } else if overall < 80 {
        format!("{}  address {} remaining failures to reach grade B (80+)",
            bold("Next:"), failed)
    } else {
        format!("{}  Ready for pre-deployment audit. Run `complior audit` for full compliance package.",
            green(check_mark()))
    }
}
