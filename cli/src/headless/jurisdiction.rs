use crate::config::TuiConfig;
use super::common::ensure_engine;

pub async fn run_jurisdiction_command(action: &crate::cli::JurisdictionAction, config: &TuiConfig) -> i32 {
    match action {
        crate::cli::JurisdictionAction::List { json } => run_jurisdiction_list(*json, config).await,
        crate::cli::JurisdictionAction::Show { code, json } => run_jurisdiction_show(code, *json, config).await,
    }
}

async fn run_jurisdiction_list(json_output: bool, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.get_json("/jurisdictions").await {
        Ok(result) => {
            if let Some(err) = result.get("error") {
                eprintln!("Error: {err}");
                return 1;
            }
            if json_output {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else if let Some(jurisdictions) = result.get("jurisdictions").and_then(|v| v.as_array()) {
                println!("EU/EEA AI Act Jurisdictions ({} countries)\n", jurisdictions.len());
                println!("{:<6} {:<20} {:<50}", "Code", "Country", "Market Surveillance Authority");
                println!("{}", "-".repeat(76));
                for j in jurisdictions {
                    let code = j.get("country_code").and_then(|v| v.as_str()).unwrap_or("");
                    let name = j.get("country_name").and_then(|v| v.as_str()).unwrap_or("");
                    let msa = j.get("msa_name").and_then(|v| v.as_str()).unwrap_or("");
                    println!("{code:<6} {name:<20} {msa:<50}");
                }
            }
            0
        }
        Err(e) => { eprintln!("Error: {e}"); 1 }
    }
}

async fn run_jurisdiction_show(code: &str, json_output: bool, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!("/jurisdictions/{}", code.to_lowercase());
    match client.get_json(&url).await {
        Ok(result) => {
            if let Some(err) = result.get("error") {
                eprintln!("Error: {err}");
                return 1;
            }
            if json_output {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else {
                let name = result.get("country_name").and_then(|v| v.as_str()).unwrap_or("Unknown");
                let msa = result.get("msa_name").and_then(|v| v.as_str()).unwrap_or("");
                let msa_url = result.get("msa_url").and_then(|v| v.as_str()).unwrap_or("");
                let contact = result.get("msa_contact").and_then(|v| v.as_str()).unwrap_or("");
                let enforcement = result.get("enforcement_date").and_then(|v| v.as_str()).unwrap_or("");
                let lang = result.get("language").and_then(|v| v.as_str()).unwrap_or("");

                println!("{} ({})", name, code.to_uppercase());
                println!();
                println!("Market Surveillance Authority:");
                println!("  Name:     {msa}");
                println!("  URL:      {msa_url}");
                println!("  Contact:  {contact}");
                println!();
                println!("Enforcement: {enforcement}");
                println!("Language:    {lang}");

                if let Some(reqs) = result.get("local_requirements").and_then(|v| v.as_array()) {
                    println!();
                    println!("Local Requirements:");
                    for req in reqs {
                        if let Some(r) = req.as_str() {
                            println!("  - {r}");
                        }
                    }
                }

                if let Some(notes) = result.get("notes").and_then(|v| v.as_str())
                    && !notes.is_empty() {
                        println!();
                        println!("Notes: {notes}");
                    }
            }
            0
        }
        Err(e) => { eprintln!("Error: {e}"); 1 }
    }
}
