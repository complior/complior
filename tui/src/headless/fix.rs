use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::types::Severity;

/// Run a headless fix (dry-run or apply).
pub async fn run_headless_fix(
    dry_run: bool,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
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
        println!("Fix apply mode not yet supported in headless mode.");
        println!("Use --dry-run to preview, or use the interactive TUI.");
        return 1;
    }

    0
}
