//! US-S05-25: Compliance Simulation headless runner.
//!
//! Calls `POST /simulate` and renders the result as JSON or human-readable text.

use crate::config::TuiConfig;

use super::common::ensure_engine;

pub async fn run_simulate(
    fix: &[String],
    add_doc: &[String],
    complete_passport: &[String],
    json: bool,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    // Build actions array
    let mut actions = Vec::new();
    for check_id in fix {
        actions.push(serde_json::json!({"type": "fix", "target": check_id}));
    }
    for doc_type in add_doc {
        actions.push(serde_json::json!({"type": "add-doc", "target": doc_type}));
    }
    for field in complete_passport {
        actions.push(serde_json::json!({"type": "complete-passport", "target": field}));
    }

    if actions.is_empty() {
        eprintln!("Error: No simulation actions specified.");
        eprintln!("Use --fix CHECK_ID, --add-doc TYPE, or --complete-passport FIELD");
        return 1;
    }

    let body = serde_json::json!({ "actions": actions });

    match client.post_json("/simulate", &body).await {
        Ok(result) => {
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&result).unwrap_or_default()
                );
                return 0;
            }

            let current = result
                .get("currentScore")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let projected = result
                .get("projectedScore")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let delta = result
                .get("delta")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);

            println!("\nCompliance Simulation\n");
            println!("  Current score:    {current:.0}");
            println!("  Projected score:  {projected:.0}");
            let sign = if delta >= 0.0 { "+" } else { "" };
            println!("  Delta:            {sign}{delta:.1}");
            println!();

            if let Some(actions) = result.get("actions").and_then(|v| v.as_array()) {
                for action in actions {
                    let desc = action
                        .get("description")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?");
                    let impact = action
                        .get("scoreImpact")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0);
                    let icon = if impact > 0.0 { "\u{2713}" } else { "\u{2022}" };
                    println!("  {icon} {desc}");
                }
            }

            0
        }
        Err(e) => {
            eprintln!("Error: Simulation failed: {e}");
            1
        }
    }
}
