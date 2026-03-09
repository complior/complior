use crate::cli::AgentAction;
use crate::config::TuiConfig;

use super::common::{ensure_engine, url_encode};

/// Walk up from project_path to find the complior repo root (containing engine/).
pub(crate) fn find_engine_root(project_path: &std::path::Path) -> Option<std::path::PathBuf> {
    let mut dir = project_path.to_path_buf();
    loop {
        if dir.join("engine").join("core").join("src").join("server.ts").exists() {
            return Some(dir);
        }
        if !dir.pop() {
            break;
        }
    }
    None
}

pub async fn run_agent_command(action: &AgentAction, config: &TuiConfig) -> i32 {
    match action {
        AgentAction::Init { json, force, path } => run_agent_init(*json, *force, path.as_deref(), config).await,
        AgentAction::List { json, path } => run_agent_list(*json, path.as_deref(), config).await,
        AgentAction::Show { name, json, path } => {
            run_agent_show(name, *json, path.as_deref(), config).await
        }
        AgentAction::Autonomy { json, path } => {
            run_agent_autonomy(*json, path.as_deref(), config).await
        }
        AgentAction::Validate { name, json, ci, strict, verbose, path } => {
            run_agent_validate(name.as_deref(), *json, *ci, *strict, *verbose, path.as_deref(), config).await
        }
        AgentAction::Completeness { name, json, path } => {
            run_agent_completeness(name, *json, path.as_deref(), config).await
        }
        AgentAction::Fria { name, json, organization, impact, mitigation, approval, path } => {
            run_agent_fria(name, *json, organization.as_deref(), impact.as_deref(), mitigation.as_deref(), approval.as_deref(), path.as_deref(), config).await
        }
        AgentAction::Notify { name, json, company_name, contact_name, contact_email, contact_phone, deployment_date, affected_roles, impact_description, path } => {
            run_agent_notify(name, *json, company_name.as_deref(), contact_name.as_deref(), contact_email.as_deref(), contact_phone.as_deref(), deployment_date.as_deref(), affected_roles.as_deref(), impact_description.as_deref(), path.as_deref(), config).await
        }
        AgentAction::Export { name, format, json, path } => {
            run_agent_export(name, format, *json, path.as_deref(), config).await
        }
        AgentAction::Registry { json, path } => {
            run_agent_registry(*json, path.as_deref(), config).await
        }
        AgentAction::Evidence { json, verify, path } => {
            run_agent_evidence(*json, *verify, path.as_deref(), config).await
        }
        AgentAction::Permissions { json, path } => {
            run_agent_permissions(*json, path.as_deref(), config).await
        }
        AgentAction::Policy { name, industry, json, organization, approver, path } => {
            run_agent_policy(name, industry, *json, organization.as_deref(), approver.as_deref(), path.as_deref(), config).await
        }
        AgentAction::Audit { agent, since, event_type, limit, json, path } => {
            run_agent_audit(agent.as_deref(), since.as_deref(), event_type.as_deref(), *limit, *json, path.as_deref(), config).await
        }
        AgentAction::Onboard { json, step, path } => {
            run_agent_onboard(*json, *step, path.as_deref(), config).await
        }
    }
}

async fn run_agent_init(json: bool, force: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    if !json {
        println!("Discovering AI agents in {}...", project_path.display());
    }

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    // Call engine to init passport
    let body = serde_json::json!({
        "path": project_path.to_string_lossy(),
        "force": force,
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
            let skipped = result.get("skipped").and_then(|v| v.as_array());
            let skipped_count = skipped.map(|s| s.len()).unwrap_or(0);

            // Show created passports
            if let Some(agents) = manifests {
                if !agents.is_empty() {
                    println!("\nCreated {} passport(s):\n", agents.len());

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
                }
            }

            // Show skipped passports
            if let Some(skip_list) = skipped {
                if !skip_list.is_empty() {
                    println!("\nSkipped {} existing passport(s):\n", skip_list.len());
                    for name in skip_list {
                        if let Some(n) = name.as_str() {
                            println!("  {n} (already exists, use --force to overwrite)");
                        }
                    }
                    println!();
                }
            }

            // Summary
            let created_count = manifests.map(|m| m.len()).unwrap_or(0);
            if created_count > 0 {
                println!("Agent Passport(s) generated successfully.");
                println!("Run `complior agent list` to view all passports.");
            } else if skipped_count > 0 {
                println!("All discovered agents already have passports.");
                println!("Run `complior agent init --force` to regenerate.");
            } else {
                println!("No AI agents detected in project.");
                println!("Ensure your project uses an AI SDK (OpenAI, Anthropic, LangChain, etc.).");
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

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!("/agent/list?path={}", url_encode(&project_path.to_string_lossy()));
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

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!(
        "/agent/show?path={}&name={}",
        url_encode(&project_path.to_string_lossy()),
        url_encode(name)
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

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!("/agent/autonomy?path={}", url_encode(&project_path.to_string_lossy()));
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

            // Per-agent breakdown
            if let Some(agents) = result.get("agents").and_then(|v| v.as_array()) {
                if !agents.is_empty() {
                    println!("\nAutonomy Analysis ({} agent(s))\n", agents.len());
                    println!(
                        "  {:<25} {:<8} {:<12} {:<8} {:<8} {:<8}",
                        "AGENT", "LEVEL", "TYPE", "GATES", "UNSUP.", "NO-LOG"
                    );
                    println!("  {}", "-".repeat(69));

                    for agent in agents {
                        let name = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let level = agent.get("level").and_then(|v| v.as_str()).unwrap_or("?");
                        let atype = agent.get("agentType").and_then(|v| v.as_str()).unwrap_or("?");
                        let evidence = agent.get("evidence");
                        let gates = evidence.and_then(|e| e.get("human_approval_gates")).and_then(|v| v.as_u64()).unwrap_or(0);
                        let unsup = evidence.and_then(|e| e.get("unsupervised_actions")).and_then(|v| v.as_u64()).unwrap_or(0);
                        let nolog = evidence.and_then(|e| e.get("no_logging_actions")).and_then(|v| v.as_u64()).unwrap_or(0);

                        println!(
                            "  {:<25} {:<8} {:<12} {:<8} {:<8} {:<8}",
                            name, level, atype, gates, unsup, nolog
                        );
                    }
                    println!();
                    return 0;
                }
            }

            // Fallback: project-level summary (no passports)
            let summary = result.get("summary").unwrap_or(&result);
            let level = summary
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let agent_type = summary
                .get("agentType")
                .and_then(|v| v.as_str())
                .unwrap_or("?");

            let evidence = summary.get("evidence");
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

            println!("\nAutonomy Analysis (project-level)\n");
            println!("  Level:               {level} ({agent_type})");
            println!("  Human approval gates: {human_gates}");
            println!("  Unsupervised actions: {unsupervised}");
            println!("  Logging gaps:         {no_logging}");
            println!("\n  Tip: Run `complior agent init` to see per-agent breakdown.");
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
    verbose: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    // Determine which passports to validate
    let names: Vec<String> = if let Some(n) = name {
        vec![n.to_string()]
    } else {
        // List all passports first
        let list_url = format!("/agent/list?path={}", url_encode(&project_path.to_string_lossy()));
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
            url_encode(&project_path.to_string_lossy()),
            url_encode(agent_name)
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

            // Per-field breakdown when --verbose
            if verbose {
                if let Some(completeness) = result.get("completeness") {
                    if let Some(fields) = completeness.get("fields").and_then(|v| v.as_array()) {
                        println!("    Fields:");
                        for field in fields {
                            let fname = field.get("field").and_then(|v| v.as_str()).unwrap_or("?");
                            let filled = field.get("filled").and_then(|v| v.as_bool()).unwrap_or(false);
                            let icon = if filled { "+" } else { "-" };
                            println!("      [{icon}] {fname}");
                        }
                    } else if let Some(missing) = completeness.get("missingFields").and_then(|v| v.as_array()) {
                        if !missing.is_empty() {
                            println!("    Missing fields:");
                            for field in missing {
                                let fname = field.get("field").and_then(|v| v.as_str()).unwrap_or("?");
                                let obligation = field.get("obligation").and_then(|v| v.as_str()).unwrap_or("");
                                println!("      [-] {fname} ({obligation})");
                            }
                        }
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

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!(
        "/agent/completeness?path={}&name={}",
        url_encode(&project_path.to_string_lossy()),
        url_encode(name)
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

// --- C.D01: FRIA generation ---

async fn run_agent_fria(
    name: &str,
    json: bool,
    organization: Option<&str>,
    impact: Option<&str>,
    mitigation: Option<&str>,
    approval: Option<&str>,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    if !json {
        println!("Generating FRIA for agent '{name}'...");
    }

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({
        "path": project_path.to_string_lossy(),
        "name": name,
    });

    if let Some(org) = organization {
        body["organization"] = serde_json::Value::String(org.to_string());
    }
    if let Some(imp) = impact {
        body["impact"] = serde_json::Value::String(imp.to_string());
    }
    if let Some(mit) = mitigation {
        body["mitigation"] = serde_json::Value::String(mit.to_string());
    }
    if let Some(app) = approval {
        body["approval"] = serde_json::Value::String(app.to_string());
    }

    match client.post_json("/agent/fria", &body).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let saved_path = result
                .get("savedPath")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let prefilled_count = result
                .get("prefilledFields")
                .and_then(|v| v.as_array())
                .map(|a| a.len())
                .unwrap_or(0);
            let empty_vec = vec![];
            let manual_fields = result
                .get("manualFields")
                .and_then(|v| v.as_array())
                .unwrap_or(&empty_vec);

            println!("\nFRIA generated: {name}");
            println!("  Saved: {saved_path}");
            println!("  Pre-filled: {prefilled_count} fields");
            println!("  Manual review needed ({} fields):", manual_fields.len());
            for field in manual_fields {
                if let Some(f) = field.as_str() {
                    println!("    - {f}");
                }
            }
            println!("\nReview and complete the FRIA document before submission.");
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to generate FRIA: {e}");
            1
        }
    }
}

// --- C.D02: Worker Notification ---

#[allow(clippy::too_many_arguments)]
async fn run_agent_notify(
    name: &str,
    json: bool,
    company_name: Option<&str>,
    contact_name: Option<&str>,
    contact_email: Option<&str>,
    contact_phone: Option<&str>,
    deployment_date: Option<&str>,
    affected_roles: Option<&str>,
    impact_description: Option<&str>,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    if !json {
        println!("Generating Worker Notification for agent '{name}'...");
    }

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({
        "path": project_path.to_string_lossy(),
        "name": name,
    });

    if let Some(v) = company_name {
        body["companyName"] = serde_json::Value::String(v.to_string());
    }
    if let Some(v) = contact_name {
        body["contactName"] = serde_json::Value::String(v.to_string());
    }
    if let Some(v) = contact_email {
        body["contactEmail"] = serde_json::Value::String(v.to_string());
    }
    if let Some(v) = contact_phone {
        body["contactPhone"] = serde_json::Value::String(v.to_string());
    }
    if let Some(v) = deployment_date {
        body["deploymentDate"] = serde_json::Value::String(v.to_string());
    }
    if let Some(v) = affected_roles {
        body["affectedRoles"] = serde_json::Value::String(v.to_string());
    }
    if let Some(v) = impact_description {
        body["impactDescription"] = serde_json::Value::String(v.to_string());
    }

    match client.post_json("/agent/notify", &body).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let saved_path = result
                .get("savedPath")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let prefilled_count = result
                .get("prefilledFields")
                .and_then(|v| v.as_array())
                .map(|a| a.len())
                .unwrap_or(0);
            let empty_vec = vec![];
            let manual_fields = result
                .get("manualFields")
                .and_then(|v| v.as_array())
                .unwrap_or(&empty_vec);

            println!("\nWorker Notification generated: {name}");
            println!("  Saved: {saved_path}");
            println!("  Pre-filled: {prefilled_count} fields");
            println!("  Manual review needed ({} fields):", manual_fields.len());
            for field in manual_fields {
                if let Some(f) = field.as_str() {
                    println!("    - {f}");
                }
            }
            println!("\nReview and distribute the notification to affected workers before deployment.");
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to generate Worker Notification: {e}");
            1
        }
    }
}

// --- C.S08: Passport export ---

async fn run_agent_export(
    name: &str,
    format: &str,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    if !json {
        println!("Exporting passport '{name}' as {format}...");
    }

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!(
        "/agent/export?path={}&name={}&format={}",
        url_encode(&project_path.to_string_lossy()),
        url_encode(name),
        url_encode(format)
    );
    match client.get_json(&url).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let saved_path = result
                .get("savedPath")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let valid = result
                .get("valid")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let export_format = result
                .get("format")
                .and_then(|v| v.as_str())
                .unwrap_or(format);

            println!("\nPassport exported: {name}");
            println!("  Format:   {export_format}");
            println!("  Valid:    {}", if valid { "yes" } else { "NO" });
            println!("  Saved to: {saved_path}");
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to export passport: {e}");
            1
        }
    }
}

// --- US-S05-13: Agent Registry ---

async fn run_agent_registry(json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!(
        "/agent/registry?path={}",
        url_encode(&project_path.to_string_lossy())
    );
    match client.get_json(&url).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let entries = result.as_array();
            match entries {
                Some(agents) if !agents.is_empty() => {
                    println!("Agent Compliance Registry ({} agent(s))\n", agents.len());
                    println!(
                        "  {:<20} {:<10} {:<7} {:<10} {:<7} {:<10} {:<6}",
                        "NAME", "RISK", "SCORE", "PASSPORT", "FRIA", "EVIDENCE", "GRADE"
                    );
                    println!("  {}", "-".repeat(70));

                    for agent in agents {
                        let name = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let risk = agent.get("riskClass").and_then(|v| v.as_str()).unwrap_or("?");
                        let score = agent.get("complianceScore").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let passport = agent.get("passportCompleteness").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let fria = agent.get("friaStatus").and_then(|v| v.as_str()).unwrap_or("?");
                        let ev_valid = agent
                            .get("evidenceChain")
                            .and_then(|e| e.get("valid"))
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        let ev_entries = agent
                            .get("evidenceChain")
                            .and_then(|e| e.get("entries"))
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0);
                        let evidence_str = if ev_entries == 0 {
                            "none".to_string()
                        } else if ev_valid {
                            format!("{ev_entries} ok")
                        } else {
                            format!("{ev_entries} BROKEN")
                        };
                        let grade = agent.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
                        let passport_str = format!("{passport:.0}%");

                        println!(
                            "  {:<20} {:<10} {:<7.0} {:<10} {:<7} {:<10} {:<6}",
                            name, risk, score, passport_str, fria, evidence_str, grade
                        );
                    }

                    // Show issues for agents with grade < A
                    let mut has_issues = false;
                    for agent in agents {
                        let grade = agent.get("grade").and_then(|v| v.as_str()).unwrap_or("A");
                        if grade == "A" {
                            continue;
                        }
                        let name = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        if let Some(issues) = agent.get("issues").and_then(|v| v.as_array()) {
                            if !issues.is_empty() {
                                if !has_issues {
                                    println!("\nIssues:\n");
                                    has_issues = true;
                                }
                                println!("  {name} (grade {grade}):");
                                for issue in issues {
                                    if let Some(msg) = issue.as_str() {
                                        println!("    - {msg}");
                                    }
                                }
                            }
                        }
                    }
                    println!();
                }
                _ => {
                    println!("No Agent Passports found.");
                    println!("Run `complior agent init` to generate one.");
                }
            }
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to get agent registry: {e}");
            1
        }
    }
}

// --- US-S05-14: Permissions matrix ---

async fn run_agent_permissions(json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let url = format!(
        "/agent/permissions?path={}",
        url_encode(&project_path.to_string_lossy())
    );
    match client.get_json(&url).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let agents = result.get("agents").and_then(|v| v.as_array());
            match agents {
                Some(agent_list) if !agent_list.is_empty() => {
                    println!("\nPermissions Matrix ({} agent(s))\n", agent_list.len());
                    println!(
                        "  {:<20} {:<30} {:<20} {:<20} {:<20}",
                        "AGENT", "TOOLS", "DATA_READ", "DATA_WRITE", "DENIED"
                    );
                    println!("  {}", "-".repeat(110));

                    // We need to rebuild the table from the matrix data
                    // Since Map doesn't serialize well to JSON, we read agents from the original passports
                    // The endpoint returns the PermissionsMatrix structure
                    if let Some(matrix) = result.get("matrix").and_then(|v| v.as_object()) {
                        for (agent_name, perms) in matrix {
                            let perms_obj = perms.as_object();
                            let granted: Vec<&str> = perms_obj
                                .map(|p| {
                                    p.iter()
                                        .filter(|(_, v)| v.as_bool().unwrap_or(false))
                                        .map(|(k, _)| k.as_str())
                                        .collect()
                                })
                                .unwrap_or_default();
                            let denied: Vec<&str> = perms_obj
                                .map(|p| {
                                    p.iter()
                                        .filter(|(_, v)| !v.as_bool().unwrap_or(true))
                                        .map(|(k, _)| k.as_str())
                                        .collect()
                                })
                                .unwrap_or_default();

                            println!(
                                "  {:<20} {:<30} {:<20} {:<20} {:<20}",
                                agent_name,
                                if granted.is_empty() { "-".to_string() } else { granted.join(", ") },
                                "-",
                                "-",
                                if denied.is_empty() { "-".to_string() } else { denied.join(", ") },
                            );
                        }
                    }
                }
                _ => {
                    println!("No agents found.");
                }
            }

            // Show conflicts
            if let Some(conflicts) = result.get("conflicts").and_then(|v| v.as_array()) {
                if !conflicts.is_empty() {
                    println!("\nConflicts ({}):\n", conflicts.len());
                    for conflict in conflicts {
                        let ctype = conflict.get("type").and_then(|v| v.as_str()).unwrap_or("?");
                        let desc = conflict.get("description").and_then(|v| v.as_str()).unwrap_or("?");
                        println!("  [{ctype}] {desc}");
                    }
                }
            }
            println!();
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to get permissions matrix: {e}");
            1
        }
    }
}

// --- US-S05-15: Policy generation ---

async fn run_agent_policy(
    name: &str,
    industry: &str,
    json: bool,
    organization: Option<&str>,
    approver: Option<&str>,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let valid_industries = ["hr", "finance", "healthcare", "education", "legal"];
    if !valid_industries.contains(&industry) {
        eprintln!(
            "Error: Invalid industry '{}'. Must be one of: {}",
            industry,
            valid_industries.join(", ")
        );
        return 1;
    }

    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    if !json {
        println!("Generating {industry} AI usage policy for agent '{name}'...");
    }

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut body = serde_json::json!({
        "path": project_path.to_string_lossy(),
        "name": name,
        "industry": industry,
    });

    if let Some(org) = organization {
        body["organization"] = serde_json::Value::String(org.to_string());
    }
    if let Some(app) = approver {
        body["approver"] = serde_json::Value::String(app.to_string());
    }

    match client.post_json("/agent/policy", &body).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let saved_path = result
                .get("savedPath")
                .and_then(|v| v.as_str())
                .unwrap_or("?");
            let prefilled_count = result
                .get("prefilledFields")
                .and_then(|v| v.as_array())
                .map(|a| a.len())
                .unwrap_or(0);
            let empty_vec = vec![];
            let manual_fields = result
                .get("manualFields")
                .and_then(|v| v.as_array())
                .unwrap_or(&empty_vec);

            println!("\nAI Usage Policy generated: {name} ({industry})");
            println!("  Saved: {saved_path}");
            println!("  Pre-filled: {prefilled_count} fields");
            println!("  Manual review needed ({} fields):", manual_fields.len());
            for field in manual_fields {
                if let Some(f) = field.as_str() {
                    println!("    - {f}");
                }
            }
            println!("\nReview and complete the policy document before adoption.");
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to generate policy: {e}");
            1
        }
    }
}

// --- US-S05-14: Audit trail ---

#[allow(clippy::too_many_arguments)]
async fn run_agent_audit(
    agent: Option<&str>,
    since: Option<&str>,
    event_type: Option<&str>,
    limit: u32,
    json: bool,
    _path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let mut params = vec![format!("limit={limit}")];
    if let Some(a) = agent {
        params.push(format!("agent={}", url_encode(a)));
    }
    if let Some(s) = since {
        params.push(format!("since={}", url_encode(s)));
    }
    if let Some(t) = event_type {
        params.push(format!("type={}", url_encode(t)));
    }

    let url = format!("/agent/audit?{}", params.join("&"));
    match client.get_json(&url).await {
        Ok(result) => {
            if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                return 0;
            }

            let entries = result.as_array();
            match entries {
                Some(list) if !list.is_empty() => {
                    println!("\nAudit Trail ({} entries)\n", list.len());
                    for entry in list {
                        let ts = entry.get("timestamp").and_then(|v| v.as_str()).unwrap_or("?");
                        let event = entry.get("eventType").and_then(|v| v.as_str()).unwrap_or("?");
                        let name = entry.get("agentName").and_then(|v| v.as_str()).unwrap_or("-");
                        let payload = entry.get("payload");
                        let payload_summary = payload
                            .map(|p| {
                                serde_json::to_string(p).unwrap_or_default()
                            })
                            .unwrap_or_default();
                        let short_payload = if payload_summary.len() > 60 {
                            format!("{}...", &payload_summary[..57])
                        } else {
                            payload_summary
                        };

                        println!("  [{ts}] {event} (agent: {name}) — {short_payload}");
                    }
                    println!();
                }
                _ => {
                    println!("No audit entries found.");
                }
            }
            0
        }
        Err(e) => {
            eprintln!("Error: Failed to get audit trail: {e}");
            1
        }
    }
}

// --- C.R20: Evidence chain ---

async fn run_agent_evidence(json: bool, verify: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = path
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    if verify {
        let url = format!("/agent/evidence/verify?path={}", url_encode(&project_path.to_string_lossy()));
        match client.get_json(&url).await {
            Ok(result) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                    return 0;
                }

                let valid = result.get("valid").and_then(|v| v.as_bool()).unwrap_or(false);
                if valid {
                    println!("Chain integrity: VALID");
                } else {
                    let broken_at = result
                        .get("brokenAt")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    println!("Chain integrity: BROKEN at entry {broken_at}");
                    return 1;
                }
                0
            }
            Err(e) => {
                eprintln!("Error: Failed to verify evidence chain: {e}");
                1
            }
        }
    } else {
        let url = format!("/agent/evidence?path={}", url_encode(&project_path.to_string_lossy()));
        match client.get_json(&url).await {
            Ok(result) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                    return 0;
                }

                let total = result
                    .get("totalEntries")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let scans = result
                    .get("scanCount")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let findings = result
                    .get("uniqueFindings")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let valid = result
                    .get("chainValid")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let first = result
                    .get("firstEntry")
                    .and_then(|v| v.as_str())
                    .unwrap_or("-");
                let last = result
                    .get("lastEntry")
                    .and_then(|v| v.as_str())
                    .unwrap_or("-");

                println!("\nEvidence Chain Summary\n");
                println!("  Total entries:    {total}");
                println!("  Scan count:       {scans}");
                println!("  Unique findings:  {findings}");
                println!("  Chain valid:      {}", if valid { "yes" } else { "NO" });
                println!("  First entry:      {first}");
                println!("  Last entry:       {last}");
                0
            }
            Err(e) => {
                eprintln!("Error: Failed to get evidence summary: {e}");
                1
            }
        }
    }
}

// --- US-S05-33: Guided onboarding ---

async fn run_agent_onboard(json: bool, step: Option<u32>, _path: Option<&str>, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    // If specific step requested, POST that step
    if let Some(step_num) = step {
        if !(1..=5).contains(&step_num) {
            eprintln!("Error: Step must be between 1 and 5");
            return 1;
        }

        let url = format!("/onboarding/guided/step/{step_num}");
        match client.post_json(&url, &serde_json::json!({})).await {
            Ok(result) => {
                if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                    let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                    eprintln!("Error: {msg}");
                    return 1;
                }

                if json {
                    println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                } else {
                    print_onboarding_step_result(&result, step_num);
                }
                0
            }
            Err(e) => { eprintln!("Error: {e}"); 1 }
        }
    } else {
        // Start or show status
        let start_url = "/onboarding/guided/start";
        match client.post_json(start_url, &serde_json::json!({})).await {
            Ok(result) => {
                if let Some(err_msg) = result.get("error").and_then(|v| v.as_str()) {
                    let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
                    eprintln!("Error: {msg}");
                    return 1;
                }

                if json {
                    println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                } else {
                    print_onboarding_status(&result);
                }
                0
            }
            Err(e) => { eprintln!("Error: {e}"); 1 }
        }
    }
}

fn print_onboarding_status(value: &serde_json::Value) {
    let progress = value.get("progress");
    let pct = progress.and_then(|p| p.get("percentage")).and_then(|v| v.as_u64()).unwrap_or(0);
    let completed = progress.and_then(|p| p.get("completedSteps")).and_then(|v| v.as_u64()).unwrap_or(0);

    println!();
    println!("  Guided Onboarding: {completed}/5 steps ({pct}%)");
    println!("  -----------------------------------");

    if let Some(state) = value.get("state") {
        if let Some(steps) = state.get("steps").and_then(|v| v.as_array()) {
            for step in steps {
                let num = step.get("step").and_then(|v| v.as_u64()).unwrap_or(0);
                let label = step.get("label").and_then(|v| v.as_str()).unwrap_or("?");
                let status = step.get("status").and_then(|v| v.as_str()).unwrap_or("?");
                let icon = match status {
                    "completed" => "V",
                    "in_progress" => ">",
                    "skipped" => "-",
                    _ => " ",
                };
                println!("  [{icon}] Step {num}: {label} ({status})");
            }
        }

        let current = state.get("currentStep").and_then(|v| v.as_u64()).unwrap_or(0);
        let status = state.get("status").and_then(|v| v.as_str()).unwrap_or("?");
        if status == "in_progress" && current > 0 {
            println!();
            println!("  Next: complior agent onboard --step {current}");
        } else if status == "completed" {
            println!();
            println!("  Onboarding complete! Run `complior cert readiness <agent>` to check certification readiness.");
        }
    }
    println!();
}

fn print_onboarding_step_result(value: &serde_json::Value, step: u32) {
    let step_names = ["Detect Project", "First Scan", "Generate Passport", "Top-3 Fixes", "Generate Document"];
    let name = step_names.get(step as usize - 1).unwrap_or(&"?");

    println!();
    println!("  Step {step}: {name} — completed");

    if let Some(data) = value.get("data") {
        match step {
            1 => {
                let lang = data.get("language").and_then(|v| v.as_str()).unwrap_or("?");
                let fw = data.get("framework").and_then(|v| v.as_str()).unwrap_or("?");
                let ai = data.get("aiLibraries").and_then(|v| v.as_array())
                    .map(|a| a.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "))
                    .unwrap_or_default();
                println!("    Language:  {lang}");
                println!("    Framework: {fw}");
                if !ai.is_empty() { println!("    AI SDKs:   {ai}"); }
            }
            2 => {
                let score = data.get("score").and_then(|v| v.as_u64()).unwrap_or(0);
                let files = data.get("filesScanned").and_then(|v| v.as_u64()).unwrap_or(0);
                let findings = data.get("totalFindings").and_then(|v| v.as_u64()).unwrap_or(0);
                println!("    Score:    {score}%");
                println!("    Files:    {files}");
                println!("    Findings: {findings}");
            }
            3 => {
                let count = data.get("agentsFound").and_then(|v| v.as_u64()).unwrap_or(0);
                println!("    Agents discovered: {count}");
                if let Some(agents) = data.get("agents").and_then(|v| v.as_array()) {
                    for agent in agents {
                        let n = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let lvl = agent.get("autonomyLevel").and_then(|v| v.as_str()).unwrap_or("?");
                        println!("      - {n} ({lvl})");
                    }
                }
            }
            4 => {
                if let Some(fixes) = data.get("fixes").and_then(|v| v.as_array()) {
                    println!("    Suggested fixes: {}", fixes.len());
                    for fix in fixes {
                        let msg = fix.get("message").and_then(|v| v.as_str()).unwrap_or("?");
                        let sev = fix.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
                        println!("      [{sev}] {msg}");
                    }
                }
            }
            5 => {
                let doc_type = data.get("documentType").and_then(|v| v.as_str()).unwrap_or("none");
                if doc_type == "fria" {
                    let saved_path = data.get("savedPath").and_then(|v| v.as_str()).unwrap_or("?");
                    println!("    Generated: FRIA report");
                    println!("    Saved to:  {saved_path}");
                } else {
                    let msg = data.get("message").and_then(|v| v.as_str()).unwrap_or("No document needed");
                    println!("    {msg}");
                }
            }
            _ => {}
        }
    }

    if let Some(progress) = value.get("progress") {
        let pct = progress.get("percentage").and_then(|v| v.as_u64()).unwrap_or(0);
        let completed = progress.get("completedSteps").and_then(|v| v.as_u64()).unwrap_or(0);
        println!("    Progress: {completed}/5 ({pct}%)");
    }
    println!();
}
