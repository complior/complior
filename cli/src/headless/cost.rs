//! US-S05-27: Compliance Cost Estimator headless runner.
//!
//! Calls `GET /cost-estimate` and renders the result as JSON or human-readable text.

use crate::config::TuiConfig;

use super::common::{ensure_engine, url_encode};

pub async fn run_cost(
    hourly_rate: u32,
    agent: Option<&str>,
    json: bool,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut url = format!("/cost-estimate?hourlyRate={hourly_rate}");
    if let Some(name) = agent {
        url.push_str(&format!("&agent={}", url_encode(name)));
    }

    match client.get_json(&url).await {
        Ok(result) => {
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&result).unwrap_or_default()
                );
                return 0;
            }

            // Human-readable output
            let total = result
                .get("totalCost")
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(0.0);
            let remediation = result
                .get("remediationCost")
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(0.0);
            let documentation = result
                .get("documentationCost")
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(0.0);
            let fine = result
                .get("potentialFine")
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(0.0);
            let roi = result
                .get("roi")
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(0.0);
            let currency = result
                .get("currency")
                .and_then(|v| v.as_str())
                .unwrap_or("EUR");

            println!("\nCompliance Cost Estimate\n");
            println!("  Hourly rate:      {currency} {hourly_rate}");
            println!("  Remediation:      {currency} {remediation:.0}");
            println!("  Documentation:    {currency} {documentation:.0}");
            println!("  ────────────────────────");
            println!("  Total cost:       {currency} {total:.0}");
            println!();
            println!("  Potential fine:   {currency} {fine:.0}");
            println!("  ROI:              {roi:.1}x");
            println!();

            if let Some(breakdown) = result.get("breakdown").and_then(|v| v.as_array())
                && !breakdown.is_empty()
            {
                println!("  Breakdown:");
                for item in breakdown {
                    let cat = item.get("category").and_then(|v| v.as_str()).unwrap_or("?");
                    let name = item.get("item").and_then(|v| v.as_str()).unwrap_or("?");
                    let hours = item
                        .get("effortHours")
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(0.0);
                    let cost = item
                        .get("cost")
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(0.0);
                    println!("    [{cat:<15}] {name:<30} {hours:>3.0}h  {currency} {cost:.0}");
                }
            }

            0
        }
        Err(e) => {
            eprintln!("Error: Cost estimation failed: {e}");
            1
        }
    }
}
