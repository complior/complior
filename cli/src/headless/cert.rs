use crate::cli::CertAction;
use crate::config::TuiConfig;

use super::common::{ensure_engine, resolve_project_path, url_encode};

pub async fn run_cert_command(action: &CertAction, config: &TuiConfig) -> i32 {
    match action {
        CertAction::Readiness { name, json, path } => {
            run_cert_readiness(name, *json, path.as_deref(), config).await
        }
    }
}

async fn run_cert_readiness(name: &str, json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let project_path = resolve_project_path(path);

    let url = format!(
        "/cert/readiness?name={}&path={}",
        url_encode(name),
        url_encode(&project_path),
    );

    match client.get_json(&url).await {
        Ok(value) => {
            if json {
                println!("{}", serde_json::to_string_pretty(&value).unwrap_or_default());
            } else {
                print_readiness_human(&value, name);
            }
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

fn print_readiness_human(value: &serde_json::Value, name: &str) {
    let score = value.get("overallScore").and_then(|v| v.as_u64()).unwrap_or(0);
    let level = value
        .get("readinessLevel")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let met = value.get("metRequirements").and_then(|v| v.as_u64()).unwrap_or(0);
    let partial = value.get("partialRequirements").and_then(|v| v.as_u64()).unwrap_or(0);
    let unmet = value.get("unmetRequirements").and_then(|v| v.as_u64()).unwrap_or(0);
    let total = value.get("totalRequirements").and_then(|v| v.as_u64()).unwrap_or(0);

    let level_icon = match level {
        "certified" => "V",
        "near_ready" => "~",
        "in_progress" => ">",
        _ => "!",
    };

    println!();
    println!("  AIUC-1 Readiness: {name}");
    println!("  -------------------------");
    println!("  [{level_icon}] Score: {score}% ({level})");
    println!("  Requirements: {met}/{total} met, {partial} partial, {unmet} unmet");
    println!();

    // Category breakdown
    if let Some(categories) = value.get("categories").and_then(|v| v.as_array()) {
        println!("  Category Scores:");
        for cat in categories {
            let label = cat.get("label").and_then(|v| v.as_str()).unwrap_or("?");
            let cat_score = cat.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
            let bar_len = (cat_score as usize) / 5;
            let bar = "#".repeat(bar_len);
            let empty = ".".repeat(20 - bar_len);
            println!("    {label:<25} [{bar}{empty}] {cat_score}%");
        }
        println!();
    }

    // Gaps
    if let Some(gaps) = value.get("gaps").and_then(|v| v.as_array()) {
        if !gaps.is_empty() {
            println!("  Gaps ({} items):", gaps.len());
            for gap in gaps {
                if let Some(g) = gap.as_str() {
                    println!("    - {g}");
                }
            }
            println!();
        }
    }
}
