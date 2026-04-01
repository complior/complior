use crate::config::TuiConfig;
use super::common::ensure_engine;

pub async fn run_proxy_command(action: &crate::cli::ProxyAction, config: &TuiConfig) -> i32 {
    match action {
        crate::cli::ProxyAction::Start { command, args } => {
            run_proxy_start(command, args, config).await
        }
        crate::cli::ProxyAction::Stop => run_proxy_stop(config).await,
        crate::cli::ProxyAction::Status => run_proxy_status(config).await,
    }
}

async fn run_proxy_start(command: &str, args: &[String], config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    let body = serde_json::json!({
        "upstream": {
            "command": command,
            "args": args,
        },
        "logCalls": true,
        "enrichPassport": true,
    });

    match client.post_json("/proxy/start", &body).await {
        Ok(result) => {
            if result.get("success").and_then(serde_json::Value::as_bool) == Some(true) {
                println!("MCP Compliance Proxy started");
                println!("  Upstream: {} {}", command, args.join(" "));
                println!("  Logging: enabled");
                0
            } else {
                let error = result.get("error").and_then(|v| v.as_str()).unwrap_or("Unknown error");
                eprintln!("Error starting proxy: {error}");
                1
            }
        }
        Err(e) => { eprintln!("Error: {e}"); 1 }
    }
}

async fn run_proxy_stop(config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.post_json("/proxy/stop", &serde_json::json!({})).await {
        Ok(result) => {
            if result.get("success").and_then(serde_json::Value::as_bool) == Some(true) {
                println!("MCP Compliance Proxy stopped");
                0
            } else {
                eprintln!("Proxy was not running");
                1
            }
        }
        Err(e) => { eprintln!("Error: {e}"); 1 }
    }
}

async fn run_proxy_status(config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match client.get_json("/proxy/health").await {
        Ok(result) => {
            let running = result.get("isRunning").and_then(serde_json::Value::as_bool).unwrap_or(false);
            if running {
                println!("MCP Compliance Proxy: RUNNING");
                if let Some(started) = result.get("startedAt").and_then(|v| v.as_str()) {
                    println!("  Started: {started}");
                }
                if let Some(total) = result.get("totalCalls").and_then(serde_json::Value::as_u64) {
                    println!("  Total calls: {total}");
                }
                if let Some(successful) = result.get("successfulCalls").and_then(serde_json::Value::as_u64) {
                    println!("  Successful: {successful}");
                }
                if let Some(failed) = result.get("failedCalls").and_then(serde_json::Value::as_u64) {
                    println!("  Failed: {failed}");
                }
                if let Some(tools) = result.get("uniqueTools").and_then(|v| v.as_array()) {
                    let tool_names: Vec<&str> = tools.iter().filter_map(|t| t.as_str()).collect();
                    println!("  Tools observed: {}", tool_names.join(", "));
                }
            } else {
                println!("MCP Compliance Proxy: NOT RUNNING");
            }
            0
        }
        Err(e) => { eprintln!("Error: {e}"); 1 }
    }
}
