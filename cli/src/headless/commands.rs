use crate::config::TuiConfig;
use crate::engine_client::EngineClient;

/// Print version info and exit.
pub fn run_version() {
    let version = env!("CARGO_PKG_VERSION");
    println!("complior {version}");
    println!("AI Act Compliance Scanner & Fixer");
    println!("https://complior.eu");
}

/// Run doctor diagnostics — 8 system health checks.
pub async fn run_doctor(config: &TuiConfig) {
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
            let major: u32 = ver.trim_start_matches('v').split('.').next()
                .and_then(|s| s.parse().ok()).unwrap_or(0);
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
        Ok(c) => match c.head("https://github.com/a3ka/complior").send().await {
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
}

/// Run headless report generation.
pub async fn run_report(format: &str, output: Option<&str>, path: Option<&str>, config: &TuiConfig) -> i32 {
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

    let scan_path = path.map_or_else(
        || std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        String::from,
    );

    // First scan, then generate report
    match client.scan(&scan_path).await {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Scan failed: {e}");
            return 1;
        }
    }

    let endpoint = match format {
        "pdf" => "/report/pdf",
        _ => "/report/markdown",
    };

    match client.post_json(endpoint, &serde_json::json!({})).await {
        Ok(resp) => {
            let out_path = resp.get("path").and_then(|v| v.as_str()).unwrap_or("report");
            if let Some(dest) = output {
                println!("Report saved to: {dest}");
            } else {
                println!("Report generated: {out_path}");
            }
            0
        }
        Err(e) => {
            eprintln!("Report generation failed: {e}");
            1
        }
    }
}

/// Initialize .complior/ configuration directory.
pub fn run_init(path: Option<&str>) {
    let base = path.map_or_else(
        || std::env::current_dir().unwrap_or_default(),
        std::path::PathBuf::from,
    );
    let complior_dir = base.join(".complior");

    if complior_dir.exists() {
        println!(".complior/ already exists at {}", complior_dir.display());
        return;
    }

    match std::fs::create_dir_all(&complior_dir) {
        Ok(()) => {
            // Create default profile
            let profile = complior_dir.join("profile.json");
            let default = serde_json::json!({
                "jurisdiction": "EU",
                "regulation": "eu-ai-act",
                "scanLevels": ["L1", "L2", "L3", "L4"]
            });
            let _ = std::fs::write(&profile, serde_json::to_string_pretty(&default).unwrap_or_default());
            println!("Initialized .complior/ at {}", complior_dir.display());
            println!("  Created: profile.json");
            println!("\nRun `complior scan` to check compliance.");
        }
        Err(e) => {
            eprintln!("Failed to create .complior/: {e}");
        }
    }
}

/// Check for updates.
pub async fn run_update() {
    println!("Checking for updates...");
    let current = env!("CARGO_PKG_VERSION");

    // Check GitHub API for latest release
    let client = reqwest::Client::new();
    match client
        .get("https://api.github.com/repos/a3ka/complior/releases/latest")
        .header("User-Agent", "complior-update-check")
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                if let Some(tag) = body.get("tag_name").and_then(|v| v.as_str()) {
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
            }
        }
        Err(_) => {}
    }
    println!("Could not check for updates. Current version: v{current}");
}
