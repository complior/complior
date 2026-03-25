use crate::cli::RedteamAction;
use crate::config::TuiConfig;
use super::common::ensure_engine;

pub async fn run_redteam_command(action: &RedteamAction, config: &TuiConfig) -> i32 {
    match action {
        RedteamAction::Run { agent, categories, max_probes, json } => {
            run_redteam_run(agent, categories, *max_probes, *json, config).await
        }
        RedteamAction::Last { json } => {
            run_redteam_last(*json, config).await
        }
        RedteamAction::Target { url, json, ci, threshold } => {
            // Alias: complior redteam target <url> → eval --security
            super::eval::run_eval_command(
                url, false, false, true, false, None, &[], *json, *ci, *threshold,
                None, None, None, None, None, false, 5, false, false, config,
            ).await
        }
    }
}

async fn run_redteam_run(
    agent: &str,
    categories: &[String],
    max_probes: Option<u32>,
    json: bool,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({ "agentName": agent });
    if !categories.is_empty() {
        body["categories"] = serde_json::json!(categories);
    }
    if let Some(max) = max_probes {
        body["maxProbes"] = serde_json::json!(max);
    }

    eprintln!("Running red-team probes against agent '{agent}'...");

    match client.post_json("/redteam/run", &body).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            format_redteam_report(&result);
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

async fn run_redteam_last(json: bool, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.get_json("/redteam/last").await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            format_redteam_report(&result);
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

fn format_redteam_report(report: &serde_json::Value) {
    let agent = report.get("agentName").and_then(|v| v.as_str()).unwrap_or("?");
    let total = report.get("totalProbes").and_then(|v| v.as_u64()).unwrap_or(0);
    let passed = report.get("passCount").and_then(|v| v.as_u64()).unwrap_or(0);
    let failed = report.get("failCount").and_then(|v| v.as_u64()).unwrap_or(0);
    let inconclusive = report.get("inconclusiveCount").and_then(|v| v.as_u64()).unwrap_or(0);
    let duration = report.get("duration").and_then(|v| v.as_u64()).unwrap_or(0);

    let score = report.get("securityScore").and_then(|s| s.get("score")).and_then(|v| v.as_f64()).unwrap_or(0.0);
    let grade = report.get("securityScore").and_then(|s| s.get("grade")).and_then(|v| v.as_str()).unwrap_or("?");
    let capped = report.get("securityScore").and_then(|s| s.get("criticalCapped")).and_then(|v| v.as_bool()).unwrap_or(false);

    println!();
    println!("  Red-Team Security Report: {agent}");
    println!("  {}", "=".repeat(50));
    println!();

    // Score bar
    let filled = (score / 100.0 * 30.0) as usize;
    let bar: String = format!("[{}{}] {:.0}/100 ({})",
        "#".repeat(filled),
        "-".repeat(30 - filled),
        score,
        grade,
    );
    println!("  Security Score: {bar}");

    if capped {
        println!("  WARNING: Score capped due to critical gap");
    }

    println!();
    println!("  Probes: {total} total | {passed} passed | {failed} failed | {inconclusive} inconclusive");
    println!("  Duration: {:.1}s", duration as f64 / 1000.0);

    // OWASP category breakdown
    if let Some(mapping) = report.get("owaspMapping").and_then(|v| v.as_object()) {
        println!();
        println!("  {:<8} {:<28} {:>6} {:>7} {:>7} {:>7}", "ID", "CATEGORY", "SCORE", "PASS", "FAIL", "TOTAL");
        println!("  {}", "-".repeat(68));

        let mut entries: Vec<_> = mapping.iter().collect();
        entries.sort_by_key(|(k, _)| k.to_string());

        for (_, cat) in entries {
            let cat_id = cat.get("categoryId").and_then(|v| v.as_str()).unwrap_or("?");
            let cat_name = cat.get("categoryName").and_then(|v| v.as_str()).unwrap_or("?");
            let cat_score = cat.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let cat_pass = cat.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
            let cat_fail = cat.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);
            let cat_total = cat.get("total").and_then(|v| v.as_u64()).unwrap_or(0);

            // Truncate long names
            let name = if cat_name.len() > 26 { &cat_name[..26] } else { cat_name };
            println!("  {:<8} {:<28} {:>5.0}% {:>7} {:>7} {:>7}", cat_id, name, cat_score, cat_pass, cat_fail, cat_total);
        }
    }

    println!();
}
