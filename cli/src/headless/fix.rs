use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::types::Severity;

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

    // First scan to find fixable findings
    let scan_path = path.map_or_else(
        || std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        String::from,
    );

    let result = match client.scan(&scan_path).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Scan failed: {e}");
            return 1;
        }
    };

    let fixable: Vec<String> = result
        .findings
        .iter()
        .filter(|f| f.fix.is_some())
        .map(|f| f.check_id.clone())
        .collect();

    if fixable.is_empty() {
        if json {
            println!("{{\"dryRun\": {dry_run}, \"changes\": [], \"message\": \"No fixable findings\"}}");
        } else {
            println!("No fixable findings. Score: {:.0}/100", result.score.total_score);
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
                    println!("Dry-Run Fix Analysis (no files modified)");
                    println!("Fixable findings: {}", fixable.len());
                    if let Some(changes) = dr_result.get("changes").and_then(|v| v.as_array()) {
                        for change in changes {
                            let path = change.get("path").and_then(|v| v.as_str()).unwrap_or("?");
                            let action = change.get("action").and_then(|v| v.as_str()).unwrap_or("MODIFY");
                            println!("  {path:<40} [{action}]");
                        }
                    }
                    if let Some(predicted) = dr_result.get("predictedScore").and_then(|v| v.as_f64()) {
                        let delta = predicted - result.score.total_score;
                        println!("\nPredicted: {:.0} -> {predicted:.0} ({delta:+.0})", result.score.total_score);
                    }
                }
            }
            Err(_) => {
                // Offline estimate
                let impact: i32 = result.findings.iter()
                    .filter(|f| f.fix.is_some())
                    .map(|f| match f.severity {
                        Severity::Critical => 8, Severity::High => 5,
                        Severity::Medium => 3, Severity::Low => 1, Severity::Info => 0,
                    })
                    .sum();
                let predicted = (result.score.total_score + impact as f64).min(100.0);
                if json {
                    println!("{{\"dryRun\": true, \"fixable\": {}, \"currentScore\": {:.0}, \"predictedScore\": {:.0}}}", fixable.len(), result.score.total_score, predicted);
                } else {
                    println!("Dry-Run Fix Analysis (offline estimate)");
                    println!("Fixable: {} findings", fixable.len());
                    println!("Predicted: {:.0} -> {predicted:.0} (+{impact})", result.score.total_score);
                }
            }
        }
    } else {
        // Apply all fixes via engine
        let body = serde_json::json!({ "useAi": use_ai });
        if use_ai && !json {
            println!("AI-enriched mode: documents will be enhanced with LLM-generated content");
            println!();
        }
        match client.post_json("/fix/apply-all", &body).await {
            Ok(resp) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&resp).unwrap_or_default());
                } else {
                    let results = resp.get("results").and_then(|v| v.as_array());
                    let summary = resp.get("summary");
                    let score_before = summary.and_then(|s| s.get("scoreBefore")).and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let score_after = summary.and_then(|s| s.get("scoreAfter")).and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let applied_count = summary.and_then(|s| s.get("applied")).and_then(|v| v.as_u64()).unwrap_or(0);
                    let failed_count = summary.and_then(|s| s.get("failed")).and_then(|v| v.as_u64()).unwrap_or(0);

                    println!("Fix Apply Results");
                    println!("=================");

                    if let Some(results) = results {
                        for r in results {
                            let check_id = r.get("plan").and_then(|p| p.get("checkId")).and_then(|v| v.as_str()).unwrap_or("?");
                            let fix_type = r.get("plan").and_then(|p| p.get("fixType")).and_then(|v| v.as_str()).unwrap_or("?");
                            let applied = r.get("applied").and_then(|v| v.as_bool()).unwrap_or(false);
                            let r_before = r.get("scoreBefore").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let r_after = r.get("scoreAfter").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let status = if applied { "OK" } else { "FAIL" };

                            // Collect file paths from actions
                            let files: Vec<&str> = r.get("plan")
                                .and_then(|p| p.get("actions"))
                                .and_then(|v| v.as_array())
                                .map(|actions| actions.iter()
                                    .filter_map(|a| a.get("path").and_then(|v| v.as_str()))
                                    .collect())
                                .unwrap_or_default();

                            println!("  [{status}] {check_id} ({fix_type})");
                            for file in &files {
                                println!("       -> {file}");
                            }
                            println!("       Score: {r_before:.0} -> {r_after:.0}");
                        }
                    } else {
                        println!("  No results returned");
                    }

                    println!();
                    println!("Applied: {applied_count}, Failed: {failed_count}");
                    let delta = score_after - score_before;
                    println!("Score: {score_before:.0} -> {score_after:.0} ({delta:+.0})");
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
