use crate::config::TuiConfig;
use super::common::ensure_engine;

pub async fn run_audit_command(
    target: &str,
    agent: Option<&str>,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({
        "target": target,
    });
    if let Some(a) = agent {
        body["agent"] = serde_json::json!(a);
    }
    if let Some(p) = path {
        body["path"] = serde_json::json!(p);
    }

    eprintln!("Running comprehensive audit (scan + eval)...");

    match client.post_json("/audit/run", &body).await {
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

            format_audit_report(&result);
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

fn format_audit_report(result: &serde_json::Value) {
    println!();
    println!("  Complior Audit Report (Scan + Eval)");
    println!("  {}", "=".repeat(50));
    println!();

    // Scan section
    if let Some(scan) = result.get("scan") {
        let score = scan.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
        let grade = scan.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
        let findings = scan.get("findings").and_then(|v| v.as_u64()).unwrap_or(0);
        println!("  Static Scan:  {score}/100 ({grade}) — {findings} findings");
    }

    // Eval section
    if let Some(eval) = result.get("eval") {
        let score = eval.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
        let grade = eval.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
        let tests = eval.get("tests").and_then(|v| v.as_u64()).unwrap_or(0);
        let passed = eval.get("passed").and_then(|v| v.as_u64()).unwrap_or(0);
        let failed = eval.get("failed").and_then(|v| v.as_u64()).unwrap_or(0);
        println!("  Dynamic Eval: {score}/100 ({grade}) — {passed}/{tests} passed, {failed} failed");

        if let Some(sec_score) = eval.get("securityScore").and_then(|v| v.as_u64()) {
            let sec_grade = eval.get("securityGrade").and_then(|v| v.as_str()).unwrap_or("?");
            println!("  Security:     {sec_score}/100 ({sec_grade})");
        }
    }

    // Combined
    if let Some(combined) = result.get("combined") {
        let score = combined.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
        println!();
        let filled = (score as f64 / 100.0 * 30.0) as usize;
        let bar = format!("[{}{}] {}/100",
            "#".repeat(filled),
            "-".repeat(30 - filled),
            score,
        );
        println!("  Combined Score: {bar}");
        println!("  (40% static scan + 60% dynamic eval)");
    }

    println!();
}
