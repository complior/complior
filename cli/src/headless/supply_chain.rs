use crate::config::TuiConfig;

use super::common::{ensure_engine, resolve_project_path};

pub async fn run_supply_chain(
    json: bool,
    models: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    if models {
        return run_models(json, path, config).await;
    }
    run_audit(json, path, config).await
}

async fn run_audit(json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let project_path = resolve_project_path(path);

    let body = serde_json::json!({ "path": project_path });

    if !json {
        eprintln!("Auditing supply chain for '{project_path}'...");
    }

    match client.post_json("/supply-chain", &body).await {
        Ok(value) => {
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&value).unwrap_or_default()
                );
            } else {
                print_supply_chain_human(&value);
            }
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

async fn run_models(json: bool, _path: Option<&str>, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.get_json("/supply-chain/models").await {
        Ok(value) => {
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&value).unwrap_or_default()
                );
            } else {
                print_models_human(&value);
            }
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

fn print_supply_chain_human(value: &serde_json::Value) {
    println!("\n=== Supply Chain Audit ===\n");

    if let Some(total) = value
        .get("totalDependencies")
        .and_then(serde_json::Value::as_u64)
    {
        println!("Total dependencies: {total}");
    }
    if let Some(ai) = value.get("aiSdkCount").and_then(serde_json::Value::as_u64) {
        println!("AI SDK packages:   {ai}");
    }
    if let Some(banned) = value.get("bannedCount").and_then(serde_json::Value::as_u64) {
        println!("Banned packages:   {banned}");
    }
    if let Some(score) = value.get("riskScore").and_then(serde_json::Value::as_u64) {
        let indicator = if score == 0 {
            "LOW"
        } else if score <= 20 {
            "MEDIUM"
        } else if score <= 50 {
            "HIGH"
        } else {
            "CRITICAL"
        };
        println!("Risk score:        {score}/100 ({indicator})");
    }

    // Print risks
    if let Some(risks) = value.get("risks").and_then(|v| v.as_array()) {
        if risks.is_empty() {
            println!("\nNo supply chain risks detected.");
        } else {
            println!("\n--- Risks ({}) ---\n", risks.len());
            for risk in risks {
                let severity = risk.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
                let desc = risk
                    .get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let article = risk
                    .get("articleRef")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let sev_tag = match severity {
                    "critical" => "CRITICAL",
                    "high" => "HIGH",
                    "medium" => "MEDIUM",
                    _ => "LOW",
                };
                println!("  [{sev_tag}] {desc} ({article})");
            }
        }
    }

    // Print detected models
    if let Some(models) = value.get("detectedModels").and_then(|v| v.as_array())
        && !models.is_empty()
    {
        println!("\n--- Detected Models ---\n");
        for m in models {
            if let Some(id) = m.as_str() {
                println!("  - {id}");
            }
        }
    }

    // Print registry cards
    if let Some(cards) = value.get("registryCards").and_then(|v| v.as_array())
        && !cards.is_empty()
    {
        println!("\n--- Registry Cards ---\n");
        for card in cards {
            let name = card.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let provider = card
                .get("provider")
                .and_then(|p| p.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let systemic = card.get("riskLevel").and_then(|v| v.as_str()) == Some("gpai_systemic");
            let license = card
                .get("assessments")
                .and_then(|a| a.get("eu-ai-act"))
                .and_then(|e| e.get("license"))
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let systemic_tag = if systemic { " [SYSTEMIC]" } else { "" };
            println!("  {name} ({provider}) — {license}{systemic_tag}");
        }
    }

    println!();
}

fn print_models_human(value: &serde_json::Value) {
    println!("\n=== Registry Cards ===\n");

    if let Some(models) = value.get("models").and_then(|v| v.as_array()) {
        if models.is_empty() {
            println!("No registry cards available.");
            return;
        }
        for card in models {
            let name = card.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let provider = card
                .get("provider")
                .and_then(|p| p.get("name"))
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let slug = card.get("slug").and_then(|v| v.as_str()).unwrap_or("?");
            let systemic = card.get("riskLevel").and_then(|v| v.as_str()) == Some("gpai_systemic");
            let assessment = card.get("assessments").and_then(|a| a.get("eu-ai-act"));
            let license = assessment
                .and_then(|e| e.get("license"))
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let cutoff = assessment
                .and_then(|e| e.get("training_cutoff"))
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            let systemic_tag = if systemic { " [SYSTEMIC RISK]" } else { "" };
            println!("  {name} ({slug})");
            println!("    Provider:   {provider}{systemic_tag}");
            println!("    License:    {license}");
            println!("    Cutoff:     {cutoff}");

            if let Some(jurisdictions) = card.get("jurisdictions").and_then(|v| v.as_array()) {
                let locs: Vec<&str> = jurisdictions.iter().filter_map(|r| r.as_str()).collect();
                if !locs.is_empty() {
                    println!("    Residency:  {}", locs.join(", "));
                }
            }

            if let Some(risk_reasoning) = assessment
                .and_then(|e| e.get("risk_reasoning"))
                .and_then(|v| v.as_str())
            {
                println!("    - {risk_reasoning}");
            }
            println!();
        }
    }

    if let Some(total) = value.get("total").and_then(serde_json::Value::as_u64) {
        println!("Total: {total} model(s)\n");
    }
}
