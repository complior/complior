use crate::config::{self, TuiConfig};
use crate::engine_client::EngineClient;

fn resolve_engine(config: &TuiConfig) -> EngineClient {
    let url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    EngineClient::from_url(&url)
}

pub async fn run_sync(
    passport: bool,
    scan: bool,
    docs: bool,
    audit: bool,
    evidence: bool,
    registry: bool,
    config: &TuiConfig,
) -> i32 {
    // Check authentication
    let tokens = if let Some(t) = config::load_tokens() {
        t
    } else {
        eprintln!("Error: Not authenticated. Run `complior login` first.");
        return 1;
    };

    if !config::is_authenticated() {
        eprintln!("Error: Session expired. Run `complior login` again.");
        return 1;
    }

    if config.project_api_url.is_empty() {
        eprintln!(
            "Error: SaaS URL not configured. Set PROJECT_API_URL env var or run `complior login`."
        );
        return 1;
    }

    let sync_all = !passport && !scan && !docs && !audit && !evidence && !registry;
    let engine = resolve_engine(config);

    // Check engine connection
    match engine.status().await {
        Ok(s) if s.ready => {}
        _ => {
            eprintln!("Error: Cannot connect to engine. Start with `complior daemon start`.");
            return 1;
        }
    }

    println!(
        "\u{1f504} Syncing with SaaS ({})...\n",
        config.project_api_url
    );
    let mut errors = 0;

    // Sync passports
    if sync_all || passport {
        print!("  Passports: ");
        match engine
            .post_json(
                "/sync/passport",
                &serde_json::json!({
                    "token": tokens.access_token,
                    "saasUrl": config.project_api_url,
                }),
            )
            .await
        {
            Ok(result) => {
                let synced = result
                    .get("synced")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                let created = result
                    .get("created")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                let updated = result
                    .get("updated")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                let conflicts = result
                    .get("conflicts")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);

                if synced > 0 {
                    println!(
                        "\u{2705} {synced} synced ({created} created, {updated} updated, {conflicts} conflicts)"
                    );
                } else {
                    println!("\u{2139}\u{fe0f}  No passports to sync");
                }

                // Show details
                if let Some(results) = result.get("results").and_then(|v| v.as_array()) {
                    for r in results {
                        let name = r.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let action = r.get("action").and_then(|v| v.as_str()).unwrap_or("?");
                        if action == "error" {
                            let err_msg = r
                                .get("error")
                                .and_then(|v| v.as_str())
                                .unwrap_or("unknown error");
                            println!("    \u{2717} {name} \u{2192} {err_msg}");
                        } else {
                            println!("    \u{2714} {name} \u{2192} {action}");
                        }
                    }
                }
            }
            Err(e) => {
                println!("\u{274c} Failed: {e}");
                errors += 1;
            }
        }
    }

    // Sync FRIA assessments (after passports, before scans — FRIA needs AITool)
    if sync_all || docs {
        print!("  FRIA: ");
        match engine
            .post_json(
                "/sync/fria",
                &serde_json::json!({
                    "token": tokens.access_token,
                    "saasUrl": config.project_api_url,
                }),
            )
            .await
        {
            Ok(result) => {
                let synced = result
                    .get("synced")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                let created = result
                    .get("created")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                let updated = result
                    .get("updated")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);

                if synced > 0 {
                    println!("\u{2705} {synced} synced ({created} created, {updated} updated)");
                    if let Some(results) = result.get("results").and_then(|v| v.as_array()) {
                        for r in results {
                            let name = r.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                            let action = r.get("action").and_then(|v| v.as_str()).unwrap_or("?");
                            if action == "error" {
                                let err_msg = r
                                    .get("error")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("unknown error");
                                println!("    \u{2717} {name} \u{2192} {err_msg}");
                            } else {
                                println!("    \u{2714} {name} \u{2192} {action}");
                            }
                        }
                    }
                } else {
                    println!("\u{2139}\u{fe0f}  No FRIA reports to sync");
                }
            }
            Err(e) => {
                println!("\u{274c} Failed: {e}");
                errors += 1;
            }
        }
    }

    // Sync scans
    if sync_all || scan {
        print!("  Scans: ");
        match engine
            .post_json(
                "/sync/scan",
                &serde_json::json!({
                    "token": tokens.access_token,
                    "saasUrl": config.project_api_url,
                }),
            )
            .await
        {
            Ok(result) => {
                let processed = result
                    .get("processed")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                println!("\u{2705} {processed} tools processed");
            }
            Err(e) => {
                println!("\u{274c} Failed: {e}");
                errors += 1;
            }
        }
    }

    // Sync documents
    if sync_all || docs {
        print!("  Documents: ");
        match engine
            .post_json(
                "/sync/documents",
                &serde_json::json!({
                    "token": tokens.access_token,
                    "saasUrl": config.project_api_url,
                }),
            )
            .await
        {
            Ok(result) => {
                let synced = result
                    .get("synced")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                let created = result
                    .get("created")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                let updated = result
                    .get("updated")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                println!("\u{2705} {synced} synced ({created} created, {updated} updated)");
            }
            Err(e) => {
                println!("\u{274c} Failed: {e}");
                errors += 1;
            }
        }
    }

    // Sync audit trail
    if sync_all || audit {
        print!("  Audit trail: ");
        match engine
            .post_json(
                "/sync/audit",
                &serde_json::json!({
                    "token": tokens.access_token,
                    "saasUrl": config.project_api_url,
                }),
            )
            .await
        {
            Ok(result) => {
                let synced = result
                    .get("synced")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                if synced > 0 {
                    println!("\u{2705} {synced} entries synced");
                } else {
                    println!("\u{2139}\u{fe0f}  No audit entries to sync");
                }
            }
            Err(e) => {
                println!("\u{274c} Failed: {e}");
                errors += 1;
            }
        }
    }

    // Sync evidence chain
    if sync_all || evidence {
        print!("  Evidence chain: ");
        match engine
            .post_json(
                "/sync/evidence",
                &serde_json::json!({
                    "token": tokens.access_token,
                    "saasUrl": config.project_api_url,
                }),
            )
            .await
        {
            Ok(_result) => {
                println!("\u{2705} synced");
            }
            Err(e) => {
                println!("\u{274c} Failed: {e}");
                errors += 1;
            }
        }
    }

    // Sync agent registry
    if sync_all || registry {
        print!("  Agent registry: ");
        match engine
            .post_json(
                "/sync/registry",
                &serde_json::json!({
                    "token": tokens.access_token,
                    "saasUrl": config.project_api_url,
                }),
            )
            .await
        {
            Ok(result) => {
                let synced = result
                    .get("synced")
                    .and_then(serde_json::Value::as_i64)
                    .unwrap_or(0);
                if synced > 0 {
                    println!("\u{2705} {synced} entries synced");
                } else {
                    println!("\u{2139}\u{fe0f}  No registry entries to sync");
                }
            }
            Err(e) => {
                println!("\u{274c} Failed: {e}");
                errors += 1;
            }
        }
    }

    println!();
    if errors > 0 {
        println!("  \u{26a0}\u{fe0f}  {errors} error(s) during sync");
        1
    } else {
        println!("  \u{2705} Sync complete!");
        0
    }
}
