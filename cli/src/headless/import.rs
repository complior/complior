use super::common::ensure_engine;
use crate::cli::ImportAction;
use crate::config::TuiConfig;

pub async fn run_import_command(action: &ImportAction, config: &TuiConfig) -> i32 {
    match action {
        ImportAction::Promptfoo { file, json } => {
            run_import_promptfoo(file.as_deref(), *json, config).await
        }
    }
}

async fn run_import_promptfoo(file: Option<&str>, json: bool, config: &TuiConfig) -> i32 {
    // Read JSON from file or stdin
    let input = if let Some(path) = file {
        match std::fs::read_to_string(path) {
            Ok(data) => data,
            Err(e) => {
                eprintln!("Error reading file {path}: {e}");
                return 1;
            }
        }
    } else {
        use std::io::Read;
        let mut buf = String::new();
        if let Err(e) = std::io::stdin().read_to_string(&mut buf) {
            eprintln!("Error reading stdin: {e}");
            return 1;
        }
        buf
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
                let msg = result
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&result).unwrap_or_default()
                );
                return 0;
            }

            // Human-readable output
            let score = result
                .get("securityScore")
                .and_then(|s| s.get("score"))
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(0.0);
            let grade = result
                .get("securityScore")
                .and_then(|s| s.get("grade"))
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let probes = result
                .get("probesRun")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let passed = result
                .get("probesPassed")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let failed = result
                .get("probesFailed")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);

            println!();
            println!("  Promptfoo Import Complete");
            println!("  {}", "-".repeat(40));
            println!("  Probes imported: {probes}");
            println!("  Passed: {passed}  Failed: {failed}");
            println!();
            println!("  Security Score: {score:.0}/100 (Grade: {grade})");

            // Category breakdown
            if let Some(categories) = result
                .get("securityScore")
                .and_then(|s| s.get("categories"))
                .and_then(|v| v.as_array())
            {
                println!();
                println!(
                    "  {:<16} {:>6} {:>8} {:>8}",
                    "CATEGORY", "SCORE", "PASSED", "TOTAL"
                );
                println!("  {}", "-".repeat(42));
                for cat in categories {
                    let cat_id = cat
                        .get("categoryId")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?");
                    let cat_score = cat
                        .get("score")
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(0.0);
                    let cat_passed = cat
                        .get("probesPassed")
                        .and_then(serde_json::Value::as_u64)
                        .unwrap_or(0);
                    let cat_total = cat
                        .get("probesTotal")
                        .and_then(serde_json::Value::as_u64)
                        .unwrap_or(0);
                    println!("  {cat_id:<16} {cat_score:>5.0}% {cat_passed:>8} {cat_total:>8}");
                }
            }

            if result
                .get("securityScore")
                .and_then(|s| s.get("criticalCapped"))
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false)
            {
                println!();
                println!(
                    "  WARNING: Score capped at 49 due to critical gap (category with 0% pass rate)"
                );
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
