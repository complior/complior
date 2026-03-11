//! US-S05-22: Compliance Debt Score headless runner.
//!
//! Calls `GET /debt` and renders the result as JSON or human-readable text.

use crate::config::TuiConfig;

use super::common::ensure_engine;

pub async fn run_debt(json: bool, trend: bool, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = if trend { "/debt?trend=true" } else { "/debt" };
    match client.get_json(url).await {
        Ok(result) => {
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&result).unwrap_or_default()
                );
                return 0;
            }

            let total = result
                .get("totalDebt")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let level = result
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let findings = result
                .get("findingsDebt")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let docs = result
                .get("documentationDebt")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let freshness = result
                .get("freshnessDebt")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);

            let level_icon = match level {
                "low" => "\u{2705}",
                "medium" => "\u{26a0}\u{fe0f}",
                "high" => "\u{1f534}",
                "critical" => "\u{1f6a8}",
                _ => "\u{2753}",
            };

            println!("\nCompliance Debt Score\n");
            println!(
                "  Total debt:     {total:.1} points  {level_icon} {}",
                level.to_uppercase()
            );
            println!("  Findings:       {findings:.1}");
            println!("  Documentation:  {docs:.1}");
            println!("  Freshness:      {freshness:.1}");

            if let Some(breakdown) = result.get("breakdown").and_then(|v| v.as_array()) {
                if !breakdown.is_empty() {
                    println!("\n  Breakdown:");
                    for item in breakdown {
                        let cat = item
                            .get("category")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let desc = item
                            .get("description")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let points = item
                            .get("points")
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0);
                        println!("    [{cat:<13}] {desc:<35} {points:>5.1} pts");
                    }
                }
            }

            if trend {
                if let Some(prev) = result.get("previousDebt").and_then(|v| v.as_f64()) {
                    let delta = total - prev;
                    let arrow = if delta < -0.5 {
                        "\u{2193}"
                    } else if delta > 0.5 {
                        "\u{2191}"
                    } else {
                        "\u{2192}"
                    };
                    println!("\n  Trend: {prev:.1} {arrow} {total:.1} ({delta:+.1})");
                } else {
                    println!("\n  Trend: no previous data");
                }
            }

            0
        }
        Err(e) => {
            eprintln!("Error: Debt calculation failed: {e}");
            1
        }
    }
}
