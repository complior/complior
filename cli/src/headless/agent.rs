use crate::cli::AgentAction;
use crate::config::TuiConfig;

use super::common::{ensure_engine, resolve_project_path_buf, url_encode};

/// Find the engine root directory.
/// Priority: COMPLIOR_ENGINE_DIR env var → walk up from project_path.
pub fn find_engine_root(project_path: &std::path::Path) -> Option<std::path::PathBuf> {
    // 1. Check env var (set by npm wrapper's bin/run.js)
    if let Ok(dir) = std::env::var("COMPLIOR_ENGINE_DIR") {
        let p = std::path::PathBuf::from(&dir);
        if p.join("src").join("server.ts").exists() {
            return Some(p);
        }
    }

    // 2. Walk up from project_path to find repo root
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

/// Treat placeholder values as empty for display purposes.
fn is_empty_val(s: &str) -> bool {
    matches!(s.trim(), "" | "-" | "unknown")
}

/// Color a letter grade: A/B = green, C = yellow, D/F = red.
fn grade_color(grade: &str) -> String {
    use super::format::colors::{green, yellow, red};
    match grade {
        "A" | "A+" | "B" | "B+" => green(grade),
        "C" | "C+" => yellow(grade),
        _ => red(grade),
    }
}

pub async fn run_agent_command(action: &AgentAction, config: &TuiConfig) -> i32 {
    match action {
        AgentAction::Rename { old_name, new_name, json, path } => run_agent_rename(old_name, new_name, *json, path.as_deref(), config).await,
        AgentAction::Init { json, force, path } => run_agent_init(*json, *force, path.as_deref(), config).await,
        AgentAction::List { json, verbose, path } => run_agent_list(*json, *verbose, path.as_deref(), config).await,
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
        AgentAction::TestGen { name, path, json } => {
            run_agent_test_gen(name, path.as_deref(), *json, config).await
        }
        AgentAction::Diff { name, path, json } => {
            run_agent_diff(name, path.as_deref(), *json, config).await
        }
        AgentAction::Audit { agent, since, event_type, limit, json, path } => {
            run_agent_audit(agent.as_deref(), since.as_deref(), event_type.as_deref(), *limit, *json, path.as_deref(), config).await
        }
        AgentAction::Import { from, file, json, path } => {
            run_agent_import(from, file, *json, path, config).await
        }
        AgentAction::AuditPackage { output, json, path } => {
            run_agent_audit_package(output.as_deref(), *json, path.as_deref(), config).await
        }
    }
}

async fn run_agent_rename(old_name: &str, new_name: &str, json: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = resolve_project_path_buf(path);
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let body = serde_json::json!({
        "path": project_path.to_string_lossy(),
        "oldName": old_name,
        "newName": new_name,
    });

    match client.post_json("/agent/rename", &body).await {
        Ok(result) => {
            if let Some(err) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err);
                eprintln!("Error: {msg}");
                return 1;
            }
            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else {
                println!("Renamed passport: '{old_name}' → '{new_name}'");
            }
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

async fn run_agent_init(json: bool, force: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    let project_path = resolve_project_path_buf(path);

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
            let skipped_count = skipped.map_or(0, std::vec::Vec::len);

            // Show created passports
            if let Some(agents) = manifests
                && !agents.is_empty() {
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
                            .and_then(serde_json::Value::as_f64);
                        let confidence = agent
                            .get("source")
                            .and_then(|s| s.get("confidence"))
                            .and_then(serde_json::Value::as_f64)
                            .unwrap_or(0.0);

                        println!("  {}. {}", i + 1, name);
                        println!("     Framework:   {framework}");
                        println!("     Autonomy:    {autonomy} ({agent_type})");
                        println!("     Risk class:  {risk_class}");
                        match score {
                            Some(s) if s > 0.0 => println!("     Score:       {s:.0}/100"),
                            _ => println!("     Score:       \u{2014} (run `complior scan` first)"),
                        }
                        println!(
                            "     Confidence:  {:.0}%",
                            confidence * 100.0
                        );

                        if let Some(paths) = saved_paths
                            && let Some(path) = paths.get(i).and_then(|v| v.as_str()) {
                                println!("     Saved to:    {path}");
                            }
                        println!();
                    }
                }

            // Show skipped passports
            if let Some(skip_list) = skipped
                && !skip_list.is_empty() {
                    println!("\nSkipped {} existing passport(s):\n", skip_list.len());
                    for name in skip_list {
                        if let Some(n) = name.as_str() {
                            println!("  {n} (already exists, use --force to overwrite)");
                        }
                    }
                    println!();
                }

            // Summary
            let created_count = manifests.map_or(0, std::vec::Vec::len);
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

async fn run_agent_list(json: bool, verbose: bool, path: Option<&str>, config: &TuiConfig) -> i32 {
    use super::format::colors::{bold, dim, score_color};
    use super::format::{separator, plural};

    let project_path = resolve_project_path_buf(path);

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
                    println!("\n  {}\n", bold(&format!(
                        "◆ Agent Passports  ·  {} agent{}",
                        agents.len(), plural(agents.len()),
                    )));
                    println!("  {}", separator());

                    if verbose {
                        println!(
                            "  {:<20} {:<8} {:<12} {:<10} {:<8} {:<10} {:<12} {:<14} {:<12} {:<6}",
                            "NAME", "LEVEL", "TYPE", "RISK", "SCORE", "STATUS",
                            "FRAMEWORK", "MODEL", "OWNER", "FILES",
                        );
                        println!("  {}", "-".repeat(112));
                    } else {
                        println!(
                            "  {:<20} {:<8} {:<12} {:<10} {:<8} {:<10}",
                            "NAME", "LEVEL", "TYPE", "RISK", "SCORE", "STATUS"
                        );
                        println!("  {}", "-".repeat(68));
                    }

                    for agent in agents {
                        let name = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let level = agent.get("autonomy_level").and_then(|v| v.as_str()).unwrap_or("?");
                        let agent_type = agent.get("type").and_then(|v| v.as_str()).unwrap_or("?");
                        let risk = agent.get("compliance")
                            .and_then(|c| c.get("eu_ai_act"))
                            .and_then(|e| e.get("risk_class"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let score = agent.get("compliance")
                            .and_then(|c| c.get("complior_score"))
                            .and_then(serde_json::Value::as_f64)
                            .unwrap_or(0.0);
                        let status = agent.get("lifecycle")
                            .and_then(|l| l.get("status"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");

                        let score_str = format!("{score:.0}");

                        if verbose {
                            let framework = agent.get("framework").and_then(|v| v.as_str()).unwrap_or("-");
                            let model_id = agent.get("model")
                                .and_then(|m| m.get("model_id"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("-");
                            let owner = agent.get("owner")
                                .and_then(|o| o.get("team"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("-");
                            let files = agent.get("source_files")
                                .and_then(|v| v.as_array())
                                .map_or(0, std::vec::Vec::len);

                            println!(
                                "  {:<20} {:<8} {:<12} {:<10} {:<8} {:<10} {:<12} {:<14} {:<12} {:<6}",
                                name, level, agent_type, risk,
                                score_color(score, &score_str),
                                status, framework, model_id, owner, files,
                            );
                        } else {
                            println!(
                                "  {:<20} {:<8} {:<12} {:<10} {:<8} {:<10}",
                                name, level, agent_type, risk,
                                score_color(score, &score_str),
                                status,
                            );
                        }
                    }
                    println!();
                    println!("  {}", dim("Run `complior agent show <name>` for details"));
                }
                _ => {
                    println!("\n  No Agent Passports found.");
                    println!("  Run {} to generate one.\n", dim("complior agent init"));
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
    use super::format::colors::{bold, dim, green, yellow, red, score_color, cyan};
    use super::format::separator;

    let project_path = resolve_project_path_buf(path);

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
            let display = result.get("display_name").and_then(|v| v.as_str()).unwrap_or(agent_name);
            let agent_id = result.get("agent_id").and_then(|v| v.as_str()).unwrap_or("?");
            let version = result.get("version").and_then(|v| v.as_str()).unwrap_or("?");
            let framework = result.get("framework").and_then(|v| v.as_str()).unwrap_or("?");
            let level = result.get("autonomy_level").and_then(|v| v.as_str()).unwrap_or("?");
            let agent_type = result.get("type").and_then(|v| v.as_str()).unwrap_or("?");

            println!("\n  {}", bold(&format!("◆ Agent Passport  ·  {display}")));
            println!("  {}\n", separator());
            println!("  {}       {}", dim("ID"), agent_id);
            println!("  {}  {}", dim("Version"), version);
            println!("  {} {}", dim("Framework"), framework);
            println!("  {} {level} ({agent_type})", dim("Autonomy"));

            // Compliance
            if let Some(compliance) = result.get("compliance") {
                let risk = compliance.get("eu_ai_act")
                    .and_then(|e| e.get("risk_class"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let score = compliance.get("complior_score")
                    .and_then(serde_json::Value::as_f64)
                    .unwrap_or(0.0);

                println!("\n  {}", bold("COMPLIANCE"));
                println!("  {}\n", separator());
                let risk_colored = match risk {
                    "high" | "prohibited" => red(risk),
                    "limited" => yellow(risk),
                    "minimal" => green(risk),
                    _ => risk.to_string(),
                };
                let score_str = format!("{score:.0}/100");
                println!("    {}   {}", dim("Risk class:"), risk_colored);
                println!("    {}       {}", dim("Score:"), score_color(score, &score_str));

                // Extended compliance status
                let fria = compliance.get("fria_completed").and_then(serde_json::Value::as_bool);
                let notif = compliance.get("worker_notification_sent").and_then(serde_json::Value::as_bool);
                let policy = compliance.get("policy_generated").and_then(serde_json::Value::as_bool);
                if fria.is_some() || notif.is_some() || policy.is_some() {
                    let status_label = |v: Option<bool>| match v {
                        Some(true) => green("completed"),
                        Some(false) => yellow("pending"),
                        None => dim("-"),
                    };
                    println!("    {}        {}", dim("FRIA:"), status_label(fria));
                    println!("    {} {}", dim("Notification:"), status_label(notif));
                    println!("    {}      {}", dim("Policy:"), status_label(policy));
                }

                // Eval results
                if let Some(eval) = compliance.get("eval") {
                    let eval_score = eval.get("eval_score").and_then(serde_json::Value::as_f64).unwrap_or(0.0);
                    let eval_grade = eval.get("eval_grade").and_then(|v| v.as_str()).unwrap_or("?");
                    let eval_tier = eval.get("eval_tier").and_then(|v| v.as_str()).unwrap_or("?");
                    let eval_target = eval.get("eval_target").and_then(|v| v.as_str()).unwrap_or("?");
                    let eval_date = eval.get("eval_date").and_then(|v| v.as_str()).unwrap_or("?");
                    let total = eval.get("eval_tests_total").and_then(serde_json::Value::as_u64).unwrap_or(0);
                    let passed = eval.get("eval_tests_passed").and_then(serde_json::Value::as_u64).unwrap_or(0);
                    let failed = eval.get("eval_tests_failed").and_then(serde_json::Value::as_u64).unwrap_or(0);
                    let errors = total.saturating_sub(passed).saturating_sub(failed);

                    println!("\n  {}", bold("EVAL RESULTS"));
                    println!("  {}\n", separator());

                    let score_str = format!("{eval_score:.0}/100");
                    println!("    {}       {} ({})", dim("Grade:"), grade_color(eval_grade), score_color(eval_score, &score_str));
                    println!("    {}        {}", dim("Tier:"), eval_tier);
                    println!("    {}      {}", dim("Target:"), eval_target);
                    let date_display = &eval_date[..10.min(eval_date.len())];
                    println!("    {}        {}", dim("Date:"), date_display);

                    // Tests line
                    let tests_str = format!("{passed}/{total} passed");
                    let pct = if total > 0 { passed as f64 / total as f64 * 100.0 } else { 0.0 };
                    let details = if errors > 0 {
                        format!("  ({failed} failed, {errors} errors)")
                    } else {
                        format!("  ({failed} failed)")
                    };
                    println!("    {}       {}{}", dim("Tests:"), score_color(pct, &tests_str), dim(&details));

                    // Security (optional)
                    if let Some(sec_score) = eval.get("eval_security_score").and_then(serde_json::Value::as_f64) {
                        let sec_grade = eval.get("eval_security_grade").and_then(|v| v.as_str()).unwrap_or("?");
                        let sec_str = format!("{sec_score:.0}/100");
                        println!("    {}    {} ({})", dim("Security:"), grade_color(sec_grade), score_color(sec_score, &sec_str));
                    }

                    // Categories
                    if let Some(cats) = eval.get("eval_categories").and_then(serde_json::Value::as_array)
                        && !cats.is_empty() {
                            println!("\n    {}", dim("Categories:"));
                            for cat in cats {
                                let name = cat.get("category").and_then(|v| v.as_str()).unwrap_or("?");
                                let sc = cat.get("score").and_then(serde_json::Value::as_f64).unwrap_or(0.0);
                                let gr = cat.get("grade").and_then(|v| v.as_str()).unwrap_or("?");
                                let sc_str = format!("{sc:.0}/100");
                                println!("      {:<20}  {}  {}", dim(name), score_color(sc, &sc_str), grade_color(gr));
                            }
                        }

                    // Critical gaps
                    if let Some(gaps) = eval.get("eval_critical_gaps").and_then(serde_json::Value::as_array)
                        && !gaps.is_empty() {
                            let gap_names: Vec<&str> = gaps.iter().filter_map(serde_json::Value::as_str).collect();
                            println!("\n    {} {}", dim("Critical gaps:"), red(&gap_names.join(", ")));
                        }
                }
            }

            // Owner
            if let Some(owner) = result.get("owner") {
                let team = owner.get("team").and_then(|v| v.as_str()).unwrap_or("-");
                let contact = owner.get("contact").and_then(|v| v.as_str()).unwrap_or("-");
                let person = owner.get("responsible_person").and_then(|v| v.as_str()).unwrap_or("-");
                if !is_empty_val(team) || !is_empty_val(contact) || !is_empty_val(person) {
                    println!("\n  {}", bold("OWNER"));
                    println!("  {}\n", separator());
                    if !is_empty_val(team) { println!("    {}        {}", dim("Team:"), team); }
                    if !is_empty_val(contact) { println!("    {}     {}", dim("Contact:"), contact); }
                    if !is_empty_val(person) { println!("    {}  {}", dim("Responsible:"), person); }
                }
            }

            // Model
            if let Some(model) = result.get("model") {
                let provider = model.get("provider").and_then(|v| v.as_str()).unwrap_or("-");
                let model_id = model.get("model_id").and_then(|v| v.as_str()).unwrap_or("-");
                let deployment = model.get("deployment").and_then(|v| v.as_str()).unwrap_or("-");
                let residency = model.get("data_residency").and_then(|v| v.as_str()).unwrap_or("-");
                if !is_empty_val(provider) || !is_empty_val(model_id) || !is_empty_val(deployment) || !is_empty_val(residency) {
                    println!("\n  {}", bold("MODEL"));
                    println!("  {}\n", separator());
                    if !is_empty_val(provider) { println!("    {}    {}", dim("Provider:"), provider); }
                    if !is_empty_val(model_id) { println!("    {}    {}", dim("Model ID:"), model_id); }
                    if !is_empty_val(deployment) { println!("    {}  {}", dim("Deployment:"), deployment); }
                    if !is_empty_val(residency) { println!("    {}   {}", dim("Residency:"), residency); }
                }
            }

            // Constraints
            if let Some(constraints) = result.get("constraints") {
                let rpm = constraints.get("rate_limits")
                    .and_then(|r| r.get("max_actions_per_minute"))
                    .and_then(serde_json::Value::as_u64);
                let budget = constraints.get("budget")
                    .and_then(|b| b.get("max_cost_per_session_usd"))
                    .and_then(serde_json::Value::as_f64);
                let prohibited = constraints.get("prohibited_actions")
                    .and_then(|v| v.as_array())
                    .map_or(0, std::vec::Vec::len);

                println!("\n  {}", bold("CONSTRAINTS"));
                println!("  {}\n", separator());
                if let Some(r) = rpm {
                    println!("    {}  {}/min", dim("Rate limit:"), r);
                }
                if let Some(b) = budget {
                    println!("    {}      ${:.2}/session", dim("Budget:"), b);
                }
                if prohibited > 0 {
                    println!("    {}  {prohibited} action(s)", dim("Prohibited:"));
                }
            }

            // Permissions
            if let Some(perms) = result.get("permissions")
                && let Some(tools) = perms.get("tools").and_then(|v| v.as_array())
                    && !tools.is_empty() {
                        let tool_names: Vec<&str> = tools.iter().filter_map(|v| v.as_str()).collect();
                        println!("\n  {}", bold("PERMISSIONS"));
                        println!("  {}\n", separator());
                        println!("    {}       {}", dim("Tools:"), tool_names.join(", "));
                    }

            // Disclosure
            if let Some(disclosure) = result.get("disclosure") {
                let user_facing = disclosure.get("user_facing").and_then(serde_json::Value::as_bool);
                let marked = disclosure.get("ai_marking")
                    .and_then(|a| a.get("responses_marked"))
                    .and_then(serde_json::Value::as_bool);
                let text = disclosure.get("disclosure_text").and_then(|v| v.as_str()).unwrap_or("");
                if user_facing.is_some() || marked.is_some() || !text.is_empty() {
                    println!("\n  {}", bold("DISCLOSURE"));
                    println!("  {}\n", separator());
                    if let Some(uf) = user_facing {
                        println!("    {} {}", dim("User-facing:"), if uf { green("yes") } else { yellow("no") });
                    }
                    if let Some(m) = marked {
                        println!("    {}  {}", dim("AI marking:"), if m { green("yes") } else { yellow("no") });
                    }
                    if !text.is_empty() {
                        let truncated = if text.len() > 60 { &text[..57] } else { text };
                        let suffix = if text.len() > 60 { "..." } else { "" };
                        println!("    {}        {}{}", dim("Text:"), truncated, suffix);
                    }
                }
            }

            // Lifecycle
            if let Some(lifecycle) = result.get("lifecycle") {
                let status = lifecycle.get("status").and_then(|v| v.as_str()).unwrap_or("-");
                let deployed = lifecycle.get("deployed_since").and_then(|v| v.as_str()).unwrap_or("-");
                let next_review = lifecycle.get("next_review").and_then(|v| v.as_str()).unwrap_or("-");
                let freq = lifecycle.get("review_frequency_days").and_then(serde_json::Value::as_u64);
                if !is_empty_val(status) || !is_empty_val(deployed) || !is_empty_val(next_review) || freq.is_some() {
                    println!("\n  {}", bold("LIFECYCLE"));
                    println!("  {}\n", separator());
                    if !is_empty_val(status) {
                        let status_colored = match status {
                            "active" => green(status),
                            "draft" | "review" => yellow(status),
                            "suspended" | "retired" => red(status),
                            _ => status.to_string(),
                        };
                        println!("    {}      {}", dim("Status:"), status_colored);
                    }
                    if !is_empty_val(deployed) { println!("    {}    {}", dim("Deployed:"), deployed); }
                    if !is_empty_val(next_review) { println!("    {} {}", dim("Next review:"), next_review); }
                    if let Some(f) = freq {
                        println!("    {}   every {f}d", dim("Frequency:"));
                    }
                }
            }

            // Source
            if let Some(source) = result.get("source") {
                let confidence = source.get("confidence").and_then(serde_json::Value::as_f64).unwrap_or(0.0);
                let mode = source.get("mode").and_then(|v| v.as_str()).unwrap_or("?");
                println!("\n  {}", bold("SOURCE"));
                println!("  {}\n", separator());
                println!("    {}        {}", dim("Mode:"), mode);
                println!("    {}  {:.0}%", dim("Confidence:"), confidence * 100.0);
            }

            // Signature
            if let Some(sig) = result.get("signature") {
                let algo = sig.get("algorithm").and_then(|v| v.as_str()).unwrap_or("?");
                let signed_at = sig.get("signed_at").and_then(|v| v.as_str()).unwrap_or("?");
                println!("\n  {}", bold("SIGNATURE"));
                println!("  {}\n", separator());
                println!("    {}   {}", dim("Signed at:"), signed_at);
                println!("    {}   {}", dim("Algorithm:"), algo);
            }

            // Source files
            if let Some(files) = result.get("source_files").and_then(|v| v.as_array())
                && !files.is_empty() {
                    println!("\n  {}", bold("SOURCE FILES"));
                    println!("  {}\n", separator());
                    for f in files {
                        if let Some(p) = f.as_str() {
                            println!("    {}", cyan(p));
                        }
                    }
                }

            println!();
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
    let project_path = resolve_project_path_buf(path);

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
            if let Some(agents) = result.get("agents").and_then(|v| v.as_array())
                && !agents.is_empty() {
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
                        let gates = evidence.and_then(|e| e.get("human_approval_gates")).and_then(serde_json::Value::as_u64).unwrap_or(0);
                        let unsup = evidence.and_then(|e| e.get("unsupervised_actions")).and_then(serde_json::Value::as_u64).unwrap_or(0);
                        let nolog = evidence.and_then(|e| e.get("no_logging_actions")).and_then(serde_json::Value::as_u64).unwrap_or(0);

                        println!(
                            "  {name:<25} {level:<8} {atype:<12} {gates:<8} {unsup:<8} {nolog:<8}"
                        );
                    }
                    println!();
                    return 0;
                }

            // Fallback: project-level summary (no passports)
            let summary = result.get("summary").unwrap_or(&result);
            let level = summary
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("not assessed");
            let agent_type = summary
                .get("agentType")
                .and_then(|v| v.as_str())
                .unwrap_or("general-purpose");

            let evidence = summary.get("evidence");
            let human_gates = evidence
                .and_then(|e| e.get("human_approval_gates"))
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let unsupervised = evidence
                .and_then(|e| e.get("unsupervised_actions"))
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let no_logging = evidence
                .and_then(|e| e.get("no_logging_actions"))
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);

            println!("\nAutonomy Analysis (project-level)\n");
            if level == "not assessed" {
                println!("  No agent configuration detected in this project.");
                println!("  Run `complior agent init` to discover and register agents.\n");
            } else {
                println!("  Level:               {level} ({agent_type})");
                println!("  Human approval gates: {human_gates}");
                println!("  Unsupervised actions: {unsupervised}");
                println!("  Logging gaps:         {no_logging}");
                println!("\n  Tip: Run `complior agent init` to see per-agent breakdown.");
            }
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
    let project_path = resolve_project_path_buf(path);

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

                let valid = result.get("valid").and_then(serde_json::Value::as_bool).unwrap_or(false);
                let has_warnings = result
                    .get("warnings")
                    .and_then(|v| v.as_array())
                    .is_some_and(|arr| !arr.is_empty());

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
            let valid = result.get("valid").and_then(serde_json::Value::as_bool).unwrap_or(false);
            let schema_valid = result
                .get("schemaValid")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false);
            let sig_valid = result
                .get("signatureValid")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false);
            let completeness_score = result
                .get("completeness")
                .and_then(|c| c.get("score"))
                .and_then(serde_json::Value::as_f64)
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
            if verbose
                && let Some(completeness) = result.get("completeness") {
                    if let Some(fields) = completeness.get("fields").and_then(|v| v.as_array()) {
                        println!("    Fields:");
                        for field in fields {
                            let fname = field.get("field").and_then(|v| v.as_str()).unwrap_or("?");
                            let filled = field.get("filled").and_then(serde_json::Value::as_bool).unwrap_or(false);
                            let icon = if filled { "+" } else { "-" };
                            println!("      [{icon}] {fname}");
                        }
                    } else if let Some(missing) = completeness.get("missingFields").and_then(|v| v.as_array())
                        && !missing.is_empty() {
                            println!("    Missing fields:");
                            for field in missing {
                                let fname = field.get("field").and_then(|v| v.as_str()).unwrap_or("?");
                                let obligation = field.get("obligation").and_then(|v| v.as_str()).unwrap_or("");
                                println!("      [-] {fname} ({obligation})");
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
    let project_path = resolve_project_path_buf(path);

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
                .and_then(serde_json::Value::as_f64)
                .unwrap_or(0.0);
            let filled = result
                .get("filledCount")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0);
            let total = result
                .get("totalRequired")
                .and_then(serde_json::Value::as_u64)
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
                if missing.is_empty() {
                    println!("  All required fields are filled.");
                } else {
                    println!(
                        "  {:<40} {:<10} {:<12} DESCRIPTION",
                        "MISSING FIELD", "OBLIG.", "ARTICLE"
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

                        println!("  {fname:<40} {obligation:<10} {article:<12} {desc}");
                    }
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
    let project_path = resolve_project_path_buf(path);

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
                .map_or(0, std::vec::Vec::len);
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
    let project_path = resolve_project_path_buf(path);

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
                .map_or(0, std::vec::Vec::len);
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
    let project_path = resolve_project_path_buf(path);

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
                .and_then(serde_json::Value::as_bool)
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
    let project_path = resolve_project_path_buf(path);

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
                        let score = agent.get("complianceScore").and_then(serde_json::Value::as_f64).unwrap_or(0.0);
                        let passport = agent.get("passportCompleteness").and_then(serde_json::Value::as_f64).unwrap_or(0.0);
                        let fria = agent.get("friaStatus").and_then(|v| v.as_str()).unwrap_or("?");
                        let ev_valid = agent
                            .get("evidenceChain")
                            .and_then(|e| e.get("valid"))
                            .and_then(serde_json::Value::as_bool)
                            .unwrap_or(false);
                        let ev_entries = agent
                            .get("evidenceChain")
                            .and_then(|e| e.get("entries"))
                            .and_then(serde_json::Value::as_u64)
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
                            "  {name:<20} {risk:<10} {score:<7.0} {passport_str:<10} {fria:<7} {evidence_str:<10} {grade:<6}"
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
                        if let Some(issues) = agent.get("issues").and_then(|v| v.as_array())
                            && !issues.is_empty() {
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
    let project_path = resolve_project_path_buf(path);

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
            if let Some(conflicts) = result.get("conflicts").and_then(|v| v.as_array())
                && !conflicts.is_empty() {
                    println!("\nConflicts ({}):\n", conflicts.len());
                    for conflict in conflicts {
                        let ctype = conflict.get("type").and_then(|v| v.as_str()).unwrap_or("?");
                        let desc = conflict.get("description").and_then(|v| v.as_str()).unwrap_or("?");
                        println!("  [{ctype}] {desc}");
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

    let project_path = resolve_project_path_buf(path);

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
                .map_or(0, std::vec::Vec::len);
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
    let project_path = resolve_project_path_buf(path);

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

                let valid = result.get("valid").and_then(serde_json::Value::as_bool).unwrap_or(false);
                if valid {
                    println!("Chain integrity: VALID");
                } else {
                    let broken_at = result
                        .get("brokenAt")
                        .and_then(serde_json::Value::as_u64)
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
                    .and_then(serde_json::Value::as_u64)
                    .unwrap_or(0);
                let scans = result
                    .get("scanCount")
                    .and_then(serde_json::Value::as_u64)
                    .unwrap_or(0);
                let findings = result
                    .get("uniqueFindings")
                    .and_then(serde_json::Value::as_u64)
                    .unwrap_or(0);
                let valid = result
                    .get("chainValid")
                    .and_then(serde_json::Value::as_bool)
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

// --- US-S05-24: Test suite generation ---

async fn run_agent_test_gen(
    name: &str,
    path: Option<&str>,
    json: bool,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let project_path = super::common::resolve_project_path(path);
    let body = serde_json::json!({
        "name": name,
        "path": project_path,
    });

    match client.post_json("/agent/test-gen", &body).await {
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

            let filename = result.get("filename").and_then(|v| v.as_str()).unwrap_or("?");
            let test_count = result.get("testCount").and_then(serde_json::Value::as_u64).unwrap_or(0);

            println!("\nGenerated compliance test suite for: {name}\n");
            println!("  Tests:    {test_count}");
            println!("  File:     {filename}");
            println!("\nRun: npx vitest run {filename}");
            0
        }
        Err(e) => {
            eprintln!("Error: Test generation failed: {e}");
            1
        }
    }
}

// --- US-S05-24: Passport diff ---

async fn run_agent_diff(
    name: &str,
    path: Option<&str>,
    json: bool,
    config: &TuiConfig,
) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let project_path = super::common::resolve_project_path(path);
    let url = format!(
        "/agent/diff?name={}&path={}",
        url_encode(name),
        url_encode(&project_path)
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

            let total = result.get("totalChanges").and_then(serde_json::Value::as_u64).unwrap_or(0);
            let added = result.get("added").and_then(serde_json::Value::as_u64).unwrap_or(0);
            let removed = result.get("removed").and_then(serde_json::Value::as_u64).unwrap_or(0);
            let modified = result.get("modified").and_then(serde_json::Value::as_u64).unwrap_or(0);
            let breaking = result.get("hasBreakingChanges").and_then(serde_json::Value::as_bool).unwrap_or(false);

            println!("\nPassport Diff: {name}\n");
            println!("  Total changes:    {total}");
            println!("  Added:            {added}");
            println!("  Removed:          {removed}");
            println!("  Modified:         {modified}");
            if breaking {
                println!("  WARNING: BREAKING CHANGES detected");
            }

            if let Some(changes) = result.get("changes").and_then(|v| v.as_array())
                && !changes.is_empty() {
                    println!();
                    for change in changes {
                        let path = change.get("path").and_then(|v| v.as_str()).unwrap_or("?");
                        let change_type = change.get("changeType").and_then(|v| v.as_str()).unwrap_or("?");
                        let severity = change.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
                        let icon = match change_type {
                            "added" => "+",
                            "removed" => "-",
                            "modified" => "~",
                            _ => "?",
                        };
                        println!("  {icon} {path} [{severity}]");
                    }
                }

            0
        }
        Err(e) => {
            eprintln!("Error: Passport diff failed: {e}");
            1
        }
    }
}

// --- US-S06-11: Passport import from A2A format ---

async fn run_agent_import(
    from: &str,
    file: &str,
    json: bool,
    path: &Option<String>,
    config: &TuiConfig,
) -> i32 {
    let _project_path = resolve_project_path_buf(path.as_deref());

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    // Read the input file
    let file_content = match std::fs::read_to_string(file) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error reading file {file}: {e}");
            return 1;
        }
    };

    let data: serde_json::Value = match serde_json::from_str(&file_content) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Error parsing JSON from {file}: {e}");
            return 1;
        }
    };

    let mut body = serde_json::json!({
        "format": from,
        "data": data,
    });
    if let Some(p) = path {
        body["path"] = serde_json::Value::String(p.clone());
    }

    match client.post_json("/agent/import", &body).await {
        Ok(result) => {
            if let Some(err) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else {
                println!("Passport imported successfully from {from} format");
                if let Some(imported) = result.get("fieldsImported").and_then(|v| v.as_array()) {
                    println!("  Fields imported: {}", imported.len());
                    for field in imported {
                        if let Some(f) = field.as_str() {
                            println!("    + {f}");
                        }
                    }
                }
                if let Some(missing) = result.get("fieldsMissing").and_then(|v| v.as_array()) {
                    println!("  Fields missing: {}", missing.len());
                    for field in missing {
                        if let Some(f) = field.as_str() {
                            println!("    - {f}");
                        }
                    }
                }
                if let Some(passport) = result.get("passport") {
                    let name = passport.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                    println!("\n  Passport name: {name}");
                    println!("  Run `complior agent show {name}` to view details.");
                }
            }
            0
        }
        Err(e) => {
            eprintln!("Error importing passport: {e}");
            1
        }
    }
}

// --- US-S06-12: Audit package export ---

async fn run_agent_audit_package(
    output: Option<&str>,
    json: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let project_path = resolve_project_path_buf(path);

    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    if json {
        // Get metadata only
        let url = format!(
            "/agent/audit-package/meta?path={}",
            url_encode(&project_path.to_string_lossy())
        );
        match client.get_json(&url).await {
            Ok(result) => {
                if let Some(err) = result.get("error").and_then(|v| v.as_str()) {
                    let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err);
                    eprintln!("Error: {msg}");
                    return 1;
                }
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
                0
            }
            Err(e) => {
                eprintln!("Error: {e}");
                1
            }
        }
    } else {
        // Download the binary archive
        let url = format!(
            "/agent/audit-package?path={}",
            url_encode(&project_path.to_string_lossy())
        );
        let output_path = output.unwrap_or("complior-audit.tar.gz");

        match client.get_bytes(&url).await {
            Ok(bytes) => {
                match std::fs::write(output_path, &bytes) {
                    Ok(()) => {
                        let size_kb = bytes.len() as f64 / 1024.0;
                        println!("Audit package saved to: {output_path}");
                        println!("  Size: {:.1} KB ({} bytes)", size_kb, bytes.len());
                        println!("\nExtract with: tar xzf {output_path}");
                        0
                    }
                    Err(e) => {
                        eprintln!("Error writing file {output_path}: {e}");
                        1
                    }
                }
            }
            Err(e) => {
                eprintln!("Error downloading audit package: {e}");
                1
            }
        }
    }
}

