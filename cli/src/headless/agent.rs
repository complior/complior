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
        AgentAction::Autonomy { json, path } => {
            run_agent_autonomy(*json, path.as_deref(), config).await
        }
        AgentAction::Validate { name, json, ci, strict, path } => {
            run_agent_validate(name.as_deref(), *json, *ci, *strict, path.as_deref(), config).await
        }
        AgentAction::Completeness { name, json, path } => {
            run_agent_completeness(name, *json, path.as_deref(), config).await
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

// --- C.S02: Autonomy analysis ---

async fn run_agent_autonomy(json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    if !json {
        println!("Analyzing autonomy in {}...", project_path.display());
    }

    let client = EngineClient::new(config);

    match client.status().await {
        Ok(status) if status.ready => {}
        _ => {
            eprintln!("Error: Engine not running. Start with: complior daemon");
            return 1;
        }
    }

    let url = format!("/agent/autonomy?path={}", project_path.to_string_lossy());
    match client.get_json(&url).await {
        Ok(result) => {
            // Check for engine error response
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let level = result
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let agent_type = result
                .get("agentType")
                .and_then(|v| v.as_str())
                .unwrap_or("?");

            let evidence = result.get("evidence");
            let human_gates = evidence
                .and_then(|e| e.get("human_approval_gates"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let unsupervised = evidence
                .and_then(|e| e.get("unsupervised_actions"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let no_logging = evidence
                .and_then(|e| e.get("no_logging_actions"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            println!("\nAutonomy Analysis\n");
            println!("  Level:               {level} ({agent_type})");
            println!("  Human approval gates: {human_gates}");
            println!("  Unsupervised actions: {unsupervised}");
            println!("  Logging gaps:         {no_logging}");
            0
        }
        Err(e) => {
            eprintln!("Error: Autonomy analysis failed: {e}");
            1
        }
    }
}

// --- C.S07: Passport validation ---

async fn run_agent_validate(
    name: Option<&str>,
    json: bool,
    ci: bool,
    strict: bool,
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

    // Determine which passports to validate
    let names: Vec<String> = if let Some(n) = name {
        vec![n.to_string()]
    } else {
        // List all passports first
        let list_url = format!("/agent/list?path={}", project_path.to_string_lossy());
        match client.get_json(&list_url).await {
            Ok(list) => {
                if let Some(err_msg) = list.get("error").and_then(|v| v.as_str()) {
                    let msg = list.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                    eprintln!("Error: {msg}");
                    return 1;
                }
                list.as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.get("name").and_then(|n| n.as_str()).map(String::from))
                            .collect()
                    })
                    .unwrap_or_default()
            }
            Err(e) => {
                eprintln!("Error: Failed to list passports: {e}");
                return 1;
            }
        }
    };

    if names.is_empty() {
        if json {
            println!("[]");
        } else {
            println!("No Agent Passports found.");
            println!("Run `complior agent init` to generate one.");
        }
        return 0;
    }

    let mut all_results = Vec::new();
    let mut any_invalid = false;
    let mut any_warnings = false;

    for agent_name in &names {
        let url = format!(
            "/agent/validate?path={}&name={}",
            project_path.to_string_lossy(),
            agent_name
        );
        match client.get_json(&url).await {
            Ok(result) => {
                // Check for engine error response
                if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                    let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                    eprintln!("Error: {msg}");
                    any_invalid = true;
                    continue;
                }

                let valid = result.get("valid").and_then(|v| v.as_bool()).unwrap_or(false);
                let has_warnings = result
                    .get("warnings")
                    .and_then(|v| v.as_array())
                    .map(|arr| !arr.is_empty())
                    .unwrap_or(false);

                if !valid {
                    any_invalid = true;
                }
                if has_warnings {
                    any_warnings = true;
                }
                all_results.push((agent_name.clone(), result));
            }
            Err(e) => {
                eprintln!("Error: Failed to validate {agent_name}: {e}");
                any_invalid = true;
            }
        }
    }

    if json {
        let json_results: Vec<&serde_json::Value> =
            all_results.iter().map(|(_, r)| r).collect();
        println!("{}", serde_json::to_string_pretty(&json_results).unwrap_or_default());
    } else {
        for (agent_name, result) in &all_results {
            let valid = result.get("valid").and_then(|v| v.as_bool()).unwrap_or(false);
            let schema_valid = result
                .get("schemaValid")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let sig_valid = result
                .get("signatureValid")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let completeness_score = result
                .get("completeness")
                .and_then(|c| c.get("score"))
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);

            let status_icon = if valid { "PASS" } else { "FAIL" };
            let schema_icon = if schema_valid { "pass" } else { "fail" };
            let sig_icon = if sig_valid { "pass" } else { "fail" };

            println!("\n  {agent_name}: {status_icon}");
            println!("    Schema:       {schema_icon}");
            println!("    Signature:    {sig_icon}");
            println!("    Completeness: {completeness_score:.0}%");

            // Show errors
            if let Some(errors) = result.get("errors").and_then(|v| v.as_array()) {
                for err in errors {
                    let field = err.get("field").and_then(|v| v.as_str()).unwrap_or("?");
                    let msg = err.get("message").and_then(|v| v.as_str()).unwrap_or("?");
                    println!("    ERROR [{field}]: {msg}");
                }
            }

            // Show warnings
            if let Some(warnings) = result.get("warnings").and_then(|v| v.as_array()) {
                for w in warnings {
                    if let Some(msg) = w.as_str() {
                        println!("    WARN: {msg}");
                    }
                }
            }
        }
        println!();
    }

    // CI exit codes
    if ci {
        if any_invalid {
            return 1;
        }
        if strict && any_warnings {
            return 1;
        }
    }

    0
}

// --- C.S09: Completeness score ---

async fn run_agent_completeness(
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
        "/agent/completeness?path={}&name={}",
        project_path.to_string_lossy(),
        name
    );
    match client.get_json(&url).await {
        Ok(result) => {
            // Check for engine error response
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let score = result
                .get("score")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let filled = result
                .get("filledCount")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let total = result
                .get("totalRequired")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            // Score bar
            let bar_width = 30;
            let filled_chars = ((score / 100.0) * bar_width as f64).round() as usize;
            let empty_chars = bar_width - filled_chars;
            let bar = format!(
                "[{}{}] {:.0}%",
                "#".repeat(filled_chars),
                "-".repeat(empty_chars),
                score
            );

            println!("\nPassport Completeness: {name}\n");
            println!("  Score: {bar}");
            println!("  Fields: {filled}/{total} required fields filled\n");

            // Missing fields table
            if let Some(missing) = result.get("missingFields").and_then(|v| v.as_array()) {
                if !missing.is_empty() {
                    println!(
                        "  {:<40} {:<10} {:<12} {}",
                        "MISSING FIELD", "OBLIG.", "ARTICLE", "DESCRIPTION"
                    );
                    println!("  {}", "-".repeat(90));

                    for field in missing {
                        let fname = field
                            .get("field")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let obligation = field
                            .get("obligation")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let article = field
                            .get("article")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let desc = field
                            .get("description")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");

                        println!("  {:<40} {:<10} {:<12} {}", fname, obligation, article, desc);
                    }
                } else {
                    println!("  All required fields are filled.");
                }
            }
            println!();
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to get completeness: {e}");
            1
        }
    }
}
