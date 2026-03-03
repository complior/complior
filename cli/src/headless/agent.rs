use crate::cli::AgentAction;
use crate::config::TuiConfig;
use crate::engine_client::EngineClient;

pub async fn run_agent_command(action: &AgentAction, config: &TuiConfig) -> i32 {
    match action {
        AgentAction::Init { json, path } => run_agent_init(*json, path.as_deref(), config).await,
        AgentAction::List { json, path } => run_agent_list(*json, path.as_deref(), config).await,
        AgentAction::Show { name, json, path } => {
            run_agent_show(name, *json, path.as_deref(), config).await
        }
    }
}

async fn run_agent_init(json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    if !json {
        println!("Discovering AI agents in {}...", project_path.display());
    }

    let client = EngineClient::new(config);

    // Check engine is running
    match client.status().await {
        Ok(status) if status.ready => {}
        _ => {
            eprintln!("Error: Engine not running. Start with: complior daemon");
            return 1;
        }
    }

    // Call engine to init passport
    let body = serde_json::json!({
        "path": project_path.to_string_lossy(),
    });

    match client.post_json("/agent/init", &body).await {
        Ok(result) => {
            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            // Human-readable output
            let manifests = result.get("manifests").and_then(|v| v.as_array());
            let saved_paths = result.get("savedPaths").and_then(|v| v.as_array());

            match manifests {
                Some(agents) if !agents.is_empty() => {
                    println!("\nDiscovered {} agent(s):\n", agents.len());

                    for (i, agent) in agents.iter().enumerate() {
                        let name = agent
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        let autonomy = agent
                            .get("autonomy_level")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let agent_type = agent
                            .get("type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let framework = agent
                            .get("framework")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        let risk_class = agent
                            .get("compliance")
                            .and_then(|c| c.get("eu_ai_act"))
                            .and_then(|e| e.get("risk_class"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let score = agent
                            .get("compliance")
                            .and_then(|c| c.get("complior_score"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0);
                        let confidence = agent
                            .get("source")
                            .and_then(|s| s.get("confidence"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0);

                        println!("  {}. {}", i + 1, name);
                        println!("     Framework:   {framework}");
                        println!("     Autonomy:    {autonomy} ({agent_type})");
                        println!("     Risk class:  {risk_class}");
                        println!("     Score:       {score:.0}/100");
                        println!(
                            "     Confidence:  {:.0}%",
                            confidence * 100.0
                        );

                        if let Some(paths) = saved_paths {
                            if let Some(path) = paths.get(i).and_then(|v| v.as_str()) {
                                println!("     Saved to:    {path}");
                            }
                        }
                        println!();
                    }

                    println!("Agent Passport(s) generated successfully.");
                    println!("Run `complior agent list` to view all passports.");
                }
                _ => {
                    println!("No AI agents detected in project.");
                    println!("Ensure your project uses an AI SDK (OpenAI, Anthropic, LangChain, etc.).");
                }
            }
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to initialize passport: {e}");
            1
        }
    }
}

async fn run_agent_list(json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let client = EngineClient::new(config);

    match client.status().await {
        Ok(status) if status.ready => {}
        _ => {
            eprintln!("Error: Engine not running. Start with: complior daemon");
            return 1;
        }
    }

    let url = format!("/agent/list?path={}", project_path.to_string_lossy());
    match client
        .get_json(&url)
        .await
    {
        Ok(result) => {
            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let manifests = result.as_array();
            match manifests {
                Some(agents) if !agents.is_empty() => {
                    println!("Agent Passports ({}):\n", agents.len());
                    println!(
                        "  {:<20} {:<8} {:<12} {:<10} {:<8} {:<10}",
                        "NAME", "LEVEL", "TYPE", "RISK", "SCORE", "STATUS"
                    );
                    println!("  {}", "-".repeat(68));

                    for agent in agents {
                        let name = agent
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let level = agent
                            .get("autonomy_level")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let agent_type = agent
                            .get("type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let risk = agent
                            .get("compliance")
                            .and_then(|c| c.get("eu_ai_act"))
                            .and_then(|e| e.get("risk_class"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let score = agent
                            .get("compliance")
                            .and_then(|c| c.get("complior_score"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0);
                        let status = agent
                            .get("lifecycle")
                            .and_then(|l| l.get("status"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");

                        println!(
                            "  {:<20} {:<8} {:<12} {:<10} {:<8.0} {:<10}",
                            name, level, agent_type, risk, score, status
                        );
                    }
                }
                _ => {
                    println!("No Agent Passports found.");
                    println!("Run `complior agent init` to generate one.");
                }
            }
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to list passports: {e}");
            1
        }
    }
}

async fn run_agent_show(
    name: &str,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let client = EngineClient::new(config);

    match client.status().await {
        Ok(status) if status.ready => {}
        _ => {
            eprintln!("Error: Engine not running. Start with: complior daemon");
            return 1;
        }
    }

    let url = format!(
        "/agent/show?path={}&name={}",
        project_path.to_string_lossy(),
        name
    );
    match client.get_json(&url).await {
        Ok(result) => {
            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            // Human-readable output
            let agent_name = result.get("name").and_then(|v| v.as_str()).unwrap_or("?");
            let display = result
                .get("display_name")
                .and_then(|v| v.as_str())
                .unwrap_or(agent_name);
            let agent_id = result
                .get("agent_id")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let version = result.get("version").and_then(|v| v.as_str()).unwrap_or("?");
            let framework = result
                .get("framework")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let level = result
                .get("autonomy_level")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let agent_type = result.get("type").and_then(|v| v.as_str()).unwrap_or("?");

            println!("Agent Passport: {display}\n");
            println!("  ID:           {agent_id}");
            println!("  Version:      {version}");
            println!("  Framework:    {framework}");
            println!("  Autonomy:     {level} ({agent_type})");

            // Compliance
            if let Some(compliance) = result.get("compliance") {
                let risk = compliance
                    .get("eu_ai_act")
                    .and_then(|e| e.get("risk_class"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let score = compliance
                    .get("complior_score")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                println!("  Risk class:   {risk}");
                println!("  Score:        {score:.0}/100");
            }

            // Permissions
            if let Some(perms) = result.get("permissions") {
                if let Some(tools) = perms.get("tools").and_then(|v| v.as_array()) {
                    if !tools.is_empty() {
                        let tool_names: Vec<&str> = tools
                            .iter()
                            .filter_map(|v| v.as_str())
                            .collect();
                        println!("  Tools:        {}", tool_names.join(", "));
                    }
                }
            }

            // Source
            if let Some(source) = result.get("source") {
                let confidence = source
                    .get("confidence")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                let mode = source.get("mode").and_then(|v| v.as_str()).unwrap_or("?");
                println!("  Source mode:  {mode}");
                println!("  Confidence:   {:.0}%", confidence * 100.0);
            }

            // Signature
            if let Some(sig) = result.get("signature") {
                let algo = sig.get("algorithm").and_then(|v| v.as_str()).unwrap_or("?");
                let signed_at = sig
                    .get("signed_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                println!("  Signed:       {signed_at} ({algo})");
            }

            0
        }
        Err(e) => {
            eprintln!("Error: Passport not found: {e}");
            1
        }
    }
}
