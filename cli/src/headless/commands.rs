use std::io::IsTerminal;

use crate::config::TuiConfig;
use crate::engine_client::EngineClient;

/// Print version info and exit.
pub fn run_version() {
    let version = env!("CARGO_PKG_VERSION");
    let git_hash = env!("BUILD_GIT_HASH");
    let target = env!("BUILD_TARGET");
    println!("complior {version} ({git_hash}) target: {target}");
    println!("AI Act Compliance Scanner & Fixer");
    println!("https://complior.ai");
}

/// Run doctor diagnostics — 8 system health checks.
/// Returns 0 if critical checks (engine + Node.js) pass, 1 otherwise.
pub async fn run_doctor(config: &TuiConfig) -> i32 {
    println!("Complior Doctor — System Health Check");
    println!("=====================================");
    println!();

    let mut passed = 0u32;
    let total = 8u32;

    // 1. TUI binary
    let version = env!("CARGO_PKG_VERSION");
    print!("  TUI binary:     v{version}");
    println!("                            OK");
    passed += 1;

    // 2. Engine
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    print!("  Engine:         ");
    let client = EngineClient::from_url(&engine_url);
    match client.status().await {
        Ok(status) if status.ready => {
            let ver = status.version.unwrap_or_else(|| "unknown".into());
            println!("v{ver} ({engine_url})              OK");
            passed += 1;
        }
        Ok(_) => println!("NOT READY ({engine_url})           WARN"),
        Err(_) => println!("UNREACHABLE ({engine_url})         FAIL"),
    }

    // 3. Node.js
    print!("  Node.js:        ");
    match std::process::Command::new("node").arg("--version").output() {
        Ok(output) if output.status.success() => {
            let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
            // Check >= 18
            let major: u32 = ver
                .trim_start_matches('v')
                .split('.')
                .next()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0);
            if major >= 18 {
                println!("{ver} (required: >=18)              OK");
                passed += 1;
            } else {
                println!("{ver} (required: >=18)              FAIL");
            }
        }
        _ => println!("Not found                         FAIL  (install: https://nodejs.org)"),
    }

    // 4. Disk space
    print!("  Disk space:     ");
    let tmp = std::env::temp_dir();
    if tmp.exists() {
        println!("OK (temp dir accessible)");
        passed += 1;
    } else {
        println!("WARN (temp dir inaccessible)");
    }

    // 5. Config
    print!("  Config:         ");
    let cwd = std::env::current_dir().unwrap_or_default();
    if cwd.join(".complior").exists() {
        println!(".complior/ found                  OK");
        passed += 1;
    } else {
        println!(".complior/ not found              WARN  (run `complior init`)");
    }

    // 6. Network
    print!("  Network:        ");
    let net_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build();
    match net_client {
        Ok(c) => match c.head("https://github.com/complior/complior").send().await {
            Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
                println!("GitHub reachable                  OK");
                passed += 1;
            }
            _ => println!("GitHub unreachable                WARN  (offline mode OK)"),
        },
        Err(_) => println!("Cannot create HTTP client         WARN"),
    }

    // 7. MCP
    print!("  MCP:            ");
    let mcp_config = dirs::config_dir().map(|d| d.join("complior").join("mcp.json"));
    match mcp_config {
        Some(p) if p.exists() => {
            println!("Configured                        OK");
            passed += 1;
        }
        _ => println!("Not configured                    WARN  (optional)"),
    }

    // 8. SaaS Auth
    print!("  SaaS Auth:      ");
    if let Some(tokens) = crate::config::load_tokens() {
        if crate::config::is_authenticated() {
            let email = tokens.user_email.as_deref().unwrap_or("unknown");
            let org = tokens.org_name.as_deref().unwrap_or("unknown");
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            let mins_left = tokens.expires_at.saturating_sub(now) / 60;
            println!("{email} ({org})            OK");
            println!("                  Token expires in {mins_left} minutes");
            passed += 1;
        } else {
            println!("Token expired                     WARN  (run `complior login`)");
        }
    } else {
        println!("Not authenticated                 WARN  (run `complior login`)");
    }

    println!();
    println!("  Summary: {passed}/{total} checks passed");
    if passed >= 3 {
        println!("  Ready to scan!");
    }

    // Return non-zero if critical checks failed (engine + Node.js = 2 critical)
    i32::from(passed < 2)
}

/// Run headless report generation.
pub async fn run_report(
    format: &str,
    output: Option<&str>,
    path: Option<&str>,
    share: bool,
    config: &TuiConfig,
) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    match client.status().await {
        Ok(status) if status.ready => {}
        _ => {
            eprintln!("Error: Cannot connect to engine at {engine_url}");
            return 1;
        }
    }

    let scan_path = super::common::resolve_project_path(path);

    // First scan, then generate report
    match client.scan(&scan_path).await {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Scan failed: {e}");
            return 1;
        }
    }

    // --share: generate offline HTML for sharing
    if share {
        match client
            .post_json("/report/share", &serde_json::json!({}))
            .await
        {
            Ok(resp) => {
                let out_path = resp
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("report.html");
                println!("Offline HTML report: {out_path}");
                return 0;
            }
            Err(e) => {
                eprintln!("HTML report generation failed: {e}");
                return 1;
            }
        }
    }

    // Human / JSON: GET /report/status → render or dump
    if format == "human" || format == "json" {
        match client.get_json("/report/status").await {
            Ok(resp) => {
                let text = if format == "human" {
                    super::format::report::format_report_human(&resp)
                } else {
                    serde_json::to_string_pretty(&resp).unwrap_or_default()
                };
                if let Some(dest) = output {
                    match std::fs::write(dest, &text) {
                        Ok(()) => {
                            eprintln!("Report saved to: {dest}");
                        }
                        Err(e) => {
                            eprintln!("Failed to write: {e}");
                            return 1;
                        }
                    }
                } else if format == "human" {
                    super::format::print_paged(&text);
                } else {
                    println!("{text}");
                }
                return 0;
            }
            Err(e) => {
                eprintln!("Report generation failed: {e}");
                return 1;
            }
        }
    }

    let format = match format {
        "markdown" => "md",
        other => other,
    };

    let endpoint = match format {
        "pdf" => "/report/status/pdf",
        "html" => "/report/share",
        _ => "/report/status/markdown",
    };

    // V1-M23 W-2: pass user's --output to engine via `outputPath` JSON body field.
    // Without this, engine writes to its default path (.complior/reports/...) and
    // the CLI prints a misleading "Report saved to: <user path>" message.
    let body = match output {
        Some(dest) => serde_json::json!({ "outputPath": dest }),
        None => serde_json::json!({}),
    };

    match client.post_json(endpoint, &body).await {
        Ok(resp) => {
            let engine_path = resp
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("report");
            if let Some(dest) = output {
                // Trust the engine's response path (it confirms what was actually written).
                println!("Report saved to: {engine_path}");
                // Sanity: warn if engine path doesn't match requested (shouldn't happen post-W-2).
                if engine_path != dest {
                    eprintln!("Warning: requested {dest} but engine reports {engine_path}");
                }
            } else {
                println!("Report generated: {engine_path}");
            }
            0
        }
        Err(e) => {
            eprintln!("Report generation failed: {e}");
            1
        }
    }
}

/// Initialize .complior/ configuration directory and auto-discover AI agents.
///
/// Creates the project marker directory (like `git init` creates `.git/`),
/// `project.toml` (TUI config), and `profile.json` (engine config).
/// If interactive (TTY + no --yes), asks onboarding questions via stdin.
/// Then starts the engine and runs agent discovery to auto-create passports.
pub async fn run_init(path: Option<&str>, yes: bool, force: bool, config: &TuiConfig) -> i32 {
    use super::common::{ensure_engine_for, resolve_project_path_buf};
    use super::format::colors::{
        bold, bold_red, bold_yellow, check_mark, cyan, diamond, dim, green, red,
    };
    use super::format::separator;
    use super::interactive;

    let base = resolve_project_path_buf(path);
    let complior_dir = base.join(".complior");
    let project_toml_path = complior_dir.join("project.toml");

    // Create .complior/ directory
    if let Err(e) = std::fs::create_dir_all(&complior_dir) {
        eprintln!("Failed to create .complior/: {e}");
        return 1;
    }

    // Create project.toml if missing
    if !project_toml_path.exists() {
        let toml_content =
            toml::to_string_pretty(&crate::config::default_project_toml()).unwrap_or_default();
        let _ = std::fs::write(&project_toml_path, toml_content);
    }

    // Create .env template with LLM provider examples
    let env_file_path = complior_dir.join(".env");
    if !env_file_path.exists() {
        let env_template = r#"# Complior LLM Configuration
# Uncomment ONE provider and set your API key.
# The key will be used for all LLM commands: eval --llm, fix --ai, scan --deep

# ── Provider API Keys ─────────────────────────────────
# Uncomment ONE provider and paste your key:

# OPENROUTER_API_KEY=sk-or-v1-your-key-here
# OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# ── Provider Priority (optional) ─────────────────────
# Force a specific provider (default: first available key)
# COMPLIOR_LLM_PROVIDER=openrouter

# ── Model Overrides (optional) ───────────────────────
# Override the default model for each task type.
# Format depends on provider:
#   OpenRouter:  anthropic/claude-sonnet-4.5, google/gemini-2.0-flash, etc.
#   OpenAI:      gpt-4o, gpt-4o-mini, etc.
#   Anthropic:   claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001, etc.

# scan --llm  (L5 document quality analysis)
# COMPLIOR_MODEL_CLASSIFY=anthropic/claude-haiku-4.5

# fix --ai  (document generation, enrichment)
# COMPLIOR_MODEL_DOCUMENT_GENERATION=anthropic/claude-sonnet-4.5

# eval --llm  (LLM judge for compliance tests)
# COMPLIOR_MODEL_QA=anthropic/claude-haiku-4.5

# Other tasks (chat, code generation, reports)
# COMPLIOR_MODEL_CHAT=anthropic/claude-sonnet-4.5
# COMPLIOR_MODEL_CODE=anthropic/claude-sonnet-4.5
# COMPLIOR_MODEL_REPORT=anthropic/claude-sonnet-4.5
"#;
        let _ = std::fs::write(&env_file_path, env_template);
    }

    // Ensure .env is in .gitignore
    let gitignore_path = complior_dir.join(".gitignore");
    if !gitignore_path.exists() {
        let _ = std::fs::write(&gitignore_path, ".env\n");
    } else if let Ok(content) = std::fs::read_to_string(&gitignore_path)
        && !content.lines().any(|l| l.trim() == ".env")
    {
        let _ = std::fs::write(&gitignore_path, format!("{content}\n.env\n"));
    }

    // Start engine for onboarding + agent discovery
    let client = if let Ok(c) = ensure_engine_for(config, &base).await {
        c
    } else {
        eprintln!("Warning: Could not start engine.");
        eprintln!("Run `complior init` again when engine is available.");
        return 0;
    };

    // Interactive onboarding: fetch questions, ask user, submit answers
    let is_interactive = !yes && std::io::stdin().is_terminal();
    let profile_path = complior_dir.join("profile.json");
    let profile_exists = profile_path.exists();

    // Collect profile data for unified summary
    let mut profile_role = String::from("deployer");
    let mut profile_risk = String::from("limited");
    let mut profile_obligations: usize = 15;
    let mut profile_storage = String::from("eu");
    let mut profile_created = false;

    if profile_exists {
        println!(
            "  .complior/ already initialized at {}",
            complior_dir.display()
        );
        // Try to read existing profile for summary
        if let Ok(content) = std::fs::read_to_string(&profile_path)
            && let Ok(profile) = serde_json::from_str::<serde_json::Value>(&content)
        {
            profile_role = profile
                .pointer("/organization/role")
                .and_then(|v| v.as_str())
                .unwrap_or("deployer")
                .to_string();
            profile_risk = profile
                .pointer("/computed/riskLevel")
                .and_then(|v| v.as_str())
                .unwrap_or("limited")
                .to_string();
            profile_obligations = profile
                .pointer("/computed/applicableObligations")
                .and_then(|v| v.as_array())
                .map_or(15, std::vec::Vec::len);
            profile_storage = profile
                .pointer("/data/storage")
                .and_then(|v| v.as_str())
                .unwrap_or("eu")
                .to_string();
        }
        profile_created = true;
    } else {
        println!("\n  {}", bold(&format!("{} Complior Setup", diamond())));
        println!("  {}", separator());

        if let Ok(questions_json) = client.get_json("/onboarding/questions").await {
            let answers = if is_interactive {
                interactive::run_interactive_onboarding(&questions_json)
            } else if yes {
                // V1-M28: prefer existing [onboarding_answers] from project.toml
                // over hardcoded question defaults
                if let Some(existing) =
                    interactive::load_onboarding_answers_from_toml(&project_toml_path)
                {
                    println!(
                        "\n  {} Using existing profile.toml answers (--yes)",
                        dim("*")
                    );
                    existing
                } else {
                    println!("\n  {} Using defaults (--yes)", dim("*"));
                    interactive::build_default_answers(&questions_json)
                }
            } else {
                interactive::build_default_answers(&questions_json)
            };

            let body = serde_json::json!({ "answers": answers });
            match client.post_json("/onboarding/complete", &body).await {
                Ok(result) => {
                    profile_created = true;
                    if let Some(profile) = result.get("profile") {
                        profile_role = profile
                            .pointer("/organization/role")
                            .and_then(|v| v.as_str())
                            .unwrap_or("deployer")
                            .to_string();
                        profile_risk = profile
                            .pointer("/computed/riskLevel")
                            .and_then(|v| v.as_str())
                            .unwrap_or("limited")
                            .to_string();
                        profile_obligations = profile
                            .pointer("/computed/applicableObligations")
                            .and_then(|v| v.as_array())
                            .map_or(15, std::vec::Vec::len);
                        profile_storage = profile
                            .pointer("/data/storage")
                            .and_then(|v| v.as_str())
                            .unwrap_or("eu")
                            .to_string();
                    }
                }
                Err(e) => {
                    eprintln!("  Warning: Could not save profile: {e}");
                    let default = serde_json::json!({
                        "jurisdiction": "EU",
                        "regulation": "eu-ai-act",
                        "scanLevels": ["L1", "L2", "L3", "L4"]
                    });
                    let _ = std::fs::write(
                        &profile_path,
                        serde_json::to_string_pretty(&default).unwrap_or_default(),
                    );
                }
            }
        } else {
            let default = serde_json::json!({
                "jurisdiction": "EU",
                "regulation": "eu-ai-act",
                "scanLevels": ["L1", "L2", "L3", "L4"]
            });
            let _ = std::fs::write(
                &profile_path,
                serde_json::to_string_pretty(&default).unwrap_or_default(),
            );
            profile_created = true;
        }
    }

    // Auto-discover AI agents and create passports (non-fatal on error)
    let mut body = serde_json::json!({
        "path": base.to_string_lossy(),
    });
    if force {
        body["force"] = serde_json::json!(true);
    }

    let mut agent_list: Vec<(String, String, String, f64)> = Vec::new();
    let mut skipped_count: usize = 0;

    match client.post_json("/passport/init", &body).await {
        Ok(result) => {
            let manifests = result.get("manifests").and_then(|v| v.as_array());
            let skipped = result.get("skipped").and_then(|v| v.as_array());
            skipped_count = skipped.map_or(0, std::vec::Vec::len);

            if let Some(agents) = manifests {
                for agent in agents {
                    let name = agent
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let framework = agent
                        .get("framework")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let autonomy = agent
                        .get("autonomy_level")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?")
                        .to_string();
                    let confidence = agent
                        .get("source")
                        .and_then(|s| s.get("confidence"))
                        .and_then(serde_json::Value::as_f64)
                        .unwrap_or(0.0);
                    agent_list.push((name, framework, autonomy, confidence));
                }
            }
        }
        Err(_) => {
            eprintln!("  Warning: Agent discovery failed. Run `complior passport init` later.");
        }
    }

    // ── Unified Summary ──────────────────────────────────────────
    println!("\n  {}", bold(&format!("{} Setup Complete", diamond())));
    println!("  {}\n", separator());

    // Profile section
    if profile_created {
        let risk_colored = match profile_risk.as_str() {
            "minimal" => green(&profile_risk),
            "limited" => bold_yellow(&profile_risk),
            "high" => red(&profile_risk),
            "unacceptable" => bold_red(&profile_risk),
            _ => profile_risk.clone(),
        };
        let storage_display = match profile_storage.as_str() {
            "eu" => "EU only",
            "us" => "US only",
            "mixed" => "Mixed / Multi-region",
            _ => &profile_storage,
        };

        println!("  {}      .complior/profile.json", dim("Profile"));
        println!("  {}         {}", dim("Role"), cyan(&profile_role));
        println!("  {}   {}", dim("Risk Level"), risk_colored);
        println!(
            "  {}  {} applicable",
            dim("Obligations"),
            bold(&profile_obligations.to_string())
        );
        println!("  {}         {}", dim("Data"), storage_display);
    }

    // Agents section
    let created_count = agent_list.len();
    if created_count > 0 {
        println!(
            "\n  {}       {} discovered",
            dim("Agents"),
            bold(&created_count.to_string())
        );
        println!("  {}", separator());
        for (i, (name, framework, autonomy, confidence)) in agent_list.iter().enumerate() {
            let conf_pct = (confidence * 100.0) as u32;
            let conf_colored = if conf_pct >= 80 {
                green(&format!("{conf_pct}%"))
            } else if conf_pct >= 50 {
                bold_yellow(&format!("{conf_pct}%"))
            } else {
                red(&format!("{conf_pct}%"))
            };
            println!(
                "    {}  {:<24} {:<12} {} confidence: {}",
                dim(&format!("{}.", i + 1)),
                name,
                framework,
                autonomy,
                conf_colored
            );
        }
        println!("  {}", separator());

        if agent_list.iter().any(|(_, _, _, c)| *c < 0.5) {
            println!(
                "\n  {} Low confidence — fill owner, disclosure, and lifecycle fields:",
                bold_yellow("⚠")
            );
            println!(
                "      {}",
                dim("complior passport show <name>  — view missing fields")
            );
            println!(
                "      {}",
                dim("Edit .complior/agents/<name>-manifest.json manually")
            );
        }

        println!("\n  {} Passports saved to .complior/agents/", check_mark());

        println!(
            "\n  {}  Passports created with score 0/100",
            bold_yellow("!")
        );
        println!(
            "     Run {} to populate compliance data",
            bold("complior scan")
        );
    } else if skipped_count > 0 {
        println!(
            "\n  {}       {} already have passports",
            dim("Agents"),
            bold(&skipped_count.to_string())
        );
        println!("\n  Next: {}", bold("complior scan"));
    } else {
        println!("\n  {}       {}", dim("Agents"), dim("none detected"));
        println!("\n  Next: {}", bold("complior scan"));
    }
    0
}

/// Check for updates.
pub async fn run_update() {
    println!("Checking for updates...");
    let current = env!("CARGO_PKG_VERSION");

    // Check GitHub API for latest release
    let client = reqwest::Client::new();
    if let Ok(resp) = client
        .get("https://api.github.com/repos/complior/complior/releases/latest")
        .header("User-Agent", "complior-update-check")
        .send()
        .await
        && let Ok(body) = resp.json::<serde_json::Value>().await
        && let Some(tag) = body.get("tag_name").and_then(|v| v.as_str())
    {
        let latest = tag.trim_start_matches('v');
        if latest == current {
            println!("Already up to date: v{current}");
        } else {
            println!("New version available: v{latest} (current: v{current})");
            println!("\nUpdate with:");
            println!("  curl -fsSL https://complior.ai/install.sh | sh");
            println!("  cargo install complior");
        }
        return;
    }
    println!("Could not check for updates. Current version: v{current}");
}
