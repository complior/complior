use crate::config::TuiConfig;
use super::common::ensure_engine;

pub async fn run_eval_command(
    target: &str,
    tier: &str,
    agent: Option<&str>,
    categories: &[String],
    json: bool,
    ci: bool,
    threshold: u32,
    model: Option<&str>,
    api_key: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({
        "target": target,
        "tier": tier,
    });
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

    eprintln!("Running eval against {target} (tier: {tier})...");

    match client.post_json("/eval/run", &body).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else {
                format_eval_report(&result);
            }

            // CI mode: check threshold
            if ci {
                let score = result.get("overallScore").and_then(|v| v.as_u64()).unwrap_or(0);
                if score < threshold as u64 {
                    eprintln!("CI FAIL: Score {score} < threshold {threshold}");
                    return 1;
                }
                eprintln!("CI PASS: Score {score} >= threshold {threshold}");
            }

            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

pub async fn run_eval_last(json: bool, config: &TuiConfig) -> i32 {
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

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else {
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

fn format_eval_report(result: &serde_json::Value) {
    let target = result.get("target").and_then(|v| v.as_str()).unwrap_or("?");
    let tier = result.get("tier").and_then(|v| v.as_str()).unwrap_or("?");
    let overall = result.get("overallScore").and_then(|v| v.as_u64()).unwrap_or(0);
    let grade = result.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
    let total = result.get("totalTests").and_then(|v| v.as_u64()).unwrap_or(0);
    let passed = result.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
    let failed = result.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);
    let errors = result.get("errors").and_then(|v| v.as_u64()).unwrap_or(0);
    let duration = result.get("duration").and_then(|v| v.as_u64()).unwrap_or(0);
    let capped = result.get("criticalCapped").and_then(|v| v.as_bool()).unwrap_or(false);

    println!();
    println!("  Complior Eval Report");
    println!("  {}", "=".repeat(50));
    println!("  Target: {target}");
    println!("  Tier:   {tier}");
    println!();

    // Score bar
    let filled = (overall as f64 / 100.0 * 30.0) as usize;
    let bar = format!("[{}{}] {}/100 ({})",
        "#".repeat(filled),
        "-".repeat(30 - filled),
        overall,
        grade,
    );
    println!("  Overall Score: {bar}");

    if capped {
        println!("  WARNING: Score capped due to critical category failure");
    }

    // Security score
    if let Some(sec_score) = result.get("securityScore").and_then(|v| v.as_u64()) {
        let sec_grade = result.get("securityGrade").and_then(|v| v.as_str()).unwrap_or("?");
        let sec_filled = (sec_score as f64 / 100.0 * 30.0) as usize;
        let sec_bar = format!("[{}{}] {}/100 ({})",
            "#".repeat(sec_filled),
            "-".repeat(30 - sec_filled),
            sec_score,
            sec_grade,
        );
        println!("  Security Score: {sec_bar}");
    }

    println!();
    println!("  Tests: {total} total | {passed} passed | {failed} failed | {errors} errors");
    println!("  Duration: {:.1}s", duration as f64 / 1000.0);

    // Category breakdown
    if let Some(categories) = result.get("categories").and_then(|v| v.as_array()) {
        println!();
        println!("  {:<20} {:>6} {:>6} {:>6}/{:<6}", "CATEGORY", "SCORE", "GRADE", "PASS", "TOTAL");
        println!("  {}", "-".repeat(52));

        for cat in categories {
            let cat_name = cat.get("category").and_then(|v| v.as_str()).unwrap_or("?");
            let cat_total = cat.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
            if cat_total == 0 { continue; }
            let cat_score = cat.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
            let cat_grade = cat.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
            let cat_passed = cat.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);

            println!("  {:<20} {:>5}% {:>6} {:>6}/{:<6}",
                cat_name, cat_score, cat_grade, cat_passed, cat_total);
        }
    }

    println!();
}
