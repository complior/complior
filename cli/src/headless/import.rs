use crate::cli::ImportAction;
use crate::config::TuiConfig;
use super::common::ensure_engine;

pub async fn run_import_command(action: &ImportAction, config: &TuiConfig) -> i32 {
    match action {
        ImportAction::Promptfoo { file, json } => {
            run_import_promptfoo(file.as_deref(), *json, config).await
        }
    }
}

async fn run_import_promptfoo(file: Option<&str>, json: bool, config: &TuiConfig) -> i32 {
    // Read JSON from file or stdin
    let input = match file {
        Some(path) => match std::fs::read_to_string(path) {
            Ok(data) => data,
            Err(e) => {
                eprintln!("Error reading file {path}: {e}");
                return 1;
            }
        },
        None => {
            use std::io::Read;
            let mut buf = String::new();
            if let Err(e) = std::io::stdin().read_to_string(&mut buf) {
                eprintln!("Error reading stdin: {e}");
                return 1;
            }
            buf
        }
    };

    // Parse JSON
    let body: serde_json::Value = match serde_json::from_str(&input) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Error: Invalid JSON: {e}");
            return 1;
        }
    };

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.post_json("/import/promptfoo", &body).await {
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

            // Human-readable output
            let score = result.get("securityScore").and_then(|s| s.get("score")).and_then(|v| v.as_f64()).unwrap_or(0.0);
            let grade = result.get("securityScore").and_then(|s| s.get("grade")).and_then(|v| v.as_str()).unwrap_or("?");
            let probes = result.get("probesRun").and_then(|v| v.as_u64()).unwrap_or(0);
            let passed = result.get("probesPassed").and_then(|v| v.as_u64()).unwrap_or(0);
            let failed = result.get("probesFailed").and_then(|v| v.as_u64()).unwrap_or(0);

            println!();
            println!("  Promptfoo Import Complete");
            println!("  {}", "-".repeat(40));
            println!("  Probes imported: {probes}");
            println!("  Passed: {passed}  Failed: {failed}");
            println!();
            println!("  Security Score: {score:.0}/100 (Grade: {grade})");

            // Category breakdown
            if let Some(categories) = result.get("securityScore").and_then(|s| s.get("categories")).and_then(|v| v.as_array()) {
                println!();
                println!("  {:<16} {:>6} {:>8} {:>8}", "CATEGORY", "SCORE", "PASSED", "TOTAL");
                println!("  {}", "-".repeat(42));
                for cat in categories {
                    let cat_id = cat.get("categoryId").and_then(|v| v.as_str()).unwrap_or("?");
                    let cat_score = cat.get("score").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let cat_passed = cat.get("probesPassed").and_then(|v| v.as_u64()).unwrap_or(0);
                    let cat_total = cat.get("probesTotal").and_then(|v| v.as_u64()).unwrap_or(0);
                    println!("  {:<16} {:>5.0}% {:>8} {:>8}", cat_id, cat_score, cat_passed, cat_total);
                }
            }

            if result.get("securityScore").and_then(|s| s.get("criticalCapped")).and_then(|v| v.as_bool()).unwrap_or(false) {
                println!();
                println!("  WARNING: Score capped at 49 due to critical gap (category with 0% pass rate)");
            }

            println!();
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}
