use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::types::Severity;

use super::format::{format_human, format_json, format_sarif};

/// Run a headless (non-TUI) scan and print results to stdout.
/// Returns the exit code: 0 = pass, 1 = fail/error.
pub async fn run_headless_scan(
    ci: bool,
    json: bool,
    sarif: bool,
    no_tui: bool,
    threshold: u32,
    fail_on: Option<&str>,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    // Check engine is reachable
    match client.status().await {
        Ok(status) if status.ready => {}
        Ok(_) => {
            eprintln!("Error: Engine is not ready");
            return 1;
        }
        Err(e) => {
            eprintln!("Error: Cannot connect to engine at {engine_url}: {e}");
            eprintln!("Start the engine with: cd engine && npm run dev");
            return 1;
        }
    }

    // Determine project path
    let scan_path = path.map_or_else(
        || std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        String::from,
    );

    // Run scan
    let result = match client.scan(&scan_path).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Scan failed: {e}");
            return 1;
        }
    };

    // Format output
    if json {
        println!("{}", format_json(&result));
    } else if sarif {
        println!("{}", format_sarif(&result));
    } else if no_tui || ci {
        print!("{}", format_human(&result));
    }

    // Determine exit code
    if ci {
        let score = result.score.total_score.round() as u32;
        if score < threshold {
            eprintln!(
                "CI FAIL: Score {score} is below threshold {threshold}"
            );
            return 1;
        }

        // Check fail-on severity
        if let Some(level) = fail_on {
            let has_severity = result.findings.iter().any(|f| {
                matches!(
                    (level, &f.severity),
                    ("critical", Severity::Critical)
                        | ("high", Severity::Critical | Severity::High)
                        | ("medium", Severity::Critical | Severity::High | Severity::Medium)
                        | ("low", Severity::Critical | Severity::High | Severity::Medium | Severity::Low)
                )
            });
            if has_severity {
                eprintln!(
                    "CI FAIL: Found findings at severity '{level}' or above"
                );
                return 1;
            }
        }
    }

    0
}
