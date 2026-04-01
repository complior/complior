use crate::cli::ToolsAction;
use crate::config::TuiConfig;
use crate::engine_client::EngineClient;

pub async fn run_tools_command(action: &ToolsAction, config: &TuiConfig) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    match action {
        ToolsAction::Status => run_tools_status(&client).await,
        ToolsAction::Update => run_tools_update(&client).await,
    }
}

async fn run_tools_status(client: &EngineClient) -> i32 {
    match client.get_json("/tools/status").await {
        Ok(result) => {
            let uv_available = result
                .get("uvAvailable")
                .and_then(serde_json::Value::as_bool)
                .unwrap_or(false);

            println!();
            println!("  External Security Tools");
            println!("  {}", "─".repeat(50));
            println!(
                "  uv:  {}",
                if uv_available {
                    "installed"
                } else {
                    "NOT FOUND — install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
                }
            );
            println!();

            if let Some(tools) = result.get("tools").and_then(|v| v.as_array()) {
                for tool in tools {
                    let name = tool.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                    let installed = tool
                        .get("installed")
                        .and_then(serde_json::Value::as_bool)
                        .unwrap_or(false);
                    let expected = tool
                        .get("expectedVersion")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?");
                    let version = tool.get("version").and_then(|v| v.as_str());
                    let error = tool.get("error").and_then(|v| v.as_str());

                    let status = if installed {
                        format!("v{}", version.unwrap_or(expected))
                    } else if let Some(err) = error {
                        format!("NOT INSTALLED ({err})")
                    } else {
                        "NOT INSTALLED".to_string()
                    };

                    let indicator = if installed { "✓" } else { "✗" };
                    println!("  {indicator} {name:<20} {status}");
                }
            }
            println!();
            println!("  Run `complior tools update` to install/update all tools.");
            println!();
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}

async fn run_tools_update(client: &EngineClient) -> i32 {
    eprintln!("Installing/updating external security tools...");

    match client
        .post_json("/tools/update", &serde_json::json!({}))
        .await
    {
        Ok(result) => {
            if let Some(tools) = result.get("tools").and_then(|v| v.as_array()) {
                println!();
                for tool in tools {
                    let name = tool.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                    let installed = tool
                        .get("installed")
                        .and_then(serde_json::Value::as_bool)
                        .unwrap_or(false);
                    let version = tool.get("version").and_then(|v| v.as_str());
                    let error = tool.get("error").and_then(|v| v.as_str());

                    if installed {
                        println!("  ✓ {name} v{}", version.unwrap_or("?"));
                    } else if let Some(err) = error {
                        println!("  ✗ {name}: {err}");
                    } else {
                        println!("  ✗ {name}: install failed");
                    }
                }
                println!();

                let ok_count = tools
                    .iter()
                    .filter(|t| {
                        t.get("installed")
                            .and_then(serde_json::Value::as_bool)
                            .unwrap_or(false)
                    })
                    .count();
                println!("  {ok_count}/{} tools ready.", tools.len());
                println!();
            }
            0
        }
        Err(e) => {
            eprintln!("Error: {e}");
            1
        }
    }
}
