use crate::cli::CertAction;
use crate::config::TuiConfig;

use super::common::{ensure_engine, resolve_project_path, url_encode};

pub async fn run_cert_command(action: &CertAction, config: &TuiConfig) -> i32 {
    match action {
        CertAction::Readiness { name, json, path } => {
            run_cert_readiness(name, *json, path.as_deref(), config).await
        }
        CertAction::Test {
            name,
            adversarial,
            categories,
            json,
            path,
        } => {
            if !adversarial {
                eprintln!("Error: --adversarial flag is required for cert test");
                return 1;
            }
            run_cert_test_adversarial(name, categories.as_deref(), *json, path.as_deref(), config)
                .await
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
                println!(
                    "{}",
                    serde_json::to_string_pretty(&value).unwrap_or_default()
                );
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

async fn run_cert_test_adversarial(
    name: &str,
    categories: Option<&str>,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let _project_path = resolve_project_path(path);

    let mut body = serde_json::json!({ "agent_name": name });
    if let Some(cats) = categories {
        let cat_list: Vec<&str> = cats.split(',').map(str::trim).collect();
        body["test_categories"] = serde_json::json!(cat_list);
    }

    if !json {
        eprintln!("Running adversarial tests for '{name}'... (this may take several minutes)");
    }

    match client.post_json_long("/cert/test/adversarial", &body).await {
        Ok(value) => {
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&value).unwrap_or_default()
                );
            } else {
                print_adversarial_human(&value, name);
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
    let score = value
        .get("overallScore")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let level = value
        .get("readinessLevel")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let met = value
        .get("metRequirements")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let partial = value
        .get("partialRequirements")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let unmet = value
        .get("unmetRequirements")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let total = value
        .get("totalRequirements")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);

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
            let cat_score = cat
                .get("score")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let bar_len = (cat_score as usize) / 5;
            let bar = "#".repeat(bar_len);
            let empty = ".".repeat(20 - bar_len);
            println!("    {label:<25} [{bar}{empty}] {cat_score}%");
        }
        println!();
    }

    // Gaps
    if let Some(gaps) = value.get("gaps").and_then(|v| v.as_array())
        && !gaps.is_empty()
    {
        println!("  Gaps ({} items):", gaps.len());
        for gap in gaps {
            if let Some(g) = gap.as_str() {
                println!("    - {g}");
            }
        }
        println!();
    }
}

fn print_adversarial_human(value: &serde_json::Value, name: &str) {
    let overall = value
        .get("overallScore")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let total = value
        .get("totalTests")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let passed = value
        .get("passCount")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let failed = value
        .get("failCount")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let inconclusive = value
        .get("inconclusiveCount")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let duration = value
        .get("duration")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);

    let icon = if overall >= 80 {
        "V"
    } else if overall >= 50 {
        "~"
    } else {
        "!"
    };

    println!();
    println!("  Adversarial Test Results: {name}");
    println!("  ----------------------------------");
    println!("  [{icon}] Overall Score: {overall}%");
    println!(
        "  Tests: {total} total, {passed} passed, {failed} failed, {inconclusive} inconclusive"
    );
    println!("  Duration: {:.1}s", duration as f64 / 1000.0);
    println!();

    // Category breakdown
    if let Some(cats) = value.get("categories").and_then(|v| v.as_object()) {
        println!("  Category Results:");
        for (cat_name, cat_data) in cats {
            let cat_score = cat_data
                .get("score")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let cat_total = cat_data
                .get("total")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let cat_passed = cat_data
                .get("passed")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let cat_failed = cat_data
                .get("failed")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let label = cat_name.replace('_', " ");
            let bar_len = (cat_score as usize) / 5;
            let bar = "#".repeat(bar_len);
            let empty = ".".repeat(20 - bar_len);
            println!(
                "    {label:<20} [{bar}{empty}] {cat_score}% ({cat_passed}/{cat_total} pass, {cat_failed} fail)"
            );
        }
        println!();
    }

    // Per-test results
    if let Some(results) = value.get("results").and_then(|v| v.as_array()) {
        let failures: Vec<_> = results
            .iter()
            .filter(|r| r.get("verdict").and_then(|v| v.as_str()) == Some("fail"))
            .collect();
        if !failures.is_empty() {
            println!("  Failed Tests:");
            for r in &failures {
                let sid = r.get("scenarioId").and_then(|v| v.as_str()).unwrap_or("?");
                let rname = r.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                let reasoning = r.get("reasoning").and_then(|v| v.as_str()).unwrap_or("");
                println!("    [FAIL] {sid}: {rname}");
                println!("           {reasoning}");
            }
            println!();
        }
    }

    // Obligation refs
    if let Some(refs) = value.get("obligationRefs").and_then(|v| v.as_array()) {
        let ref_strs: Vec<&str> = refs.iter().filter_map(|r| r.as_str()).collect();
        if !ref_strs.is_empty() {
            println!("  Obligation Coverage: {}", ref_strs.join(", "));
            println!();
        }
    }
}
