use crate::config::{self, TuiConfig};
use crate::saas_client::{SaasClient, TokenPollResult};

pub async fn run_login(config: &TuiConfig) -> Result<(), String> {
    let client = SaasClient::new(&config.project_api_url)?;

    // 1. Request device code
    let code = client.request_device_code().await?;

    // Reconstruct verification URL using configured base URL (handles tunnels/proxies)
    let display_url = rewrite_verification_url(&code.verification_uri, &config.project_api_url);

    println!("\nTo login, visit this URL in your browser:\n");
    println!("  {}", display_url);
    println!("\n  Code: {}\n", code.user_code);
    print!("Waiting for confirmation... (Ctrl+C to cancel)");

    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(code.expires_in);
    let interval = std::time::Duration::from_secs(code.interval.max(5));

    loop {
        tokio::time::sleep(interval).await;

        if std::time::Instant::now() > deadline {
            println!();
            return Err("Device code expired. Run `complior login` again.".into());
        }

        match client.poll_token(&code.device_code).await? {
            TokenPollResult::Pending => {
                print!(".");
                use std::io::Write;
                let _ = std::io::stdout().flush();
            }
            TokenPollResult::Success { access_token, refresh_token, expires_in, user_email, org_name } => {
                let expires_at = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() + expires_in;

                config::save_tokens(
                    &access_token,
                    &refresh_token,
                    expires_at,
                    user_email.as_deref(),
                    org_name.as_deref(),
                )?;

                println!();
                let email_display = user_email.as_deref().unwrap_or("unknown");
                let org_display = org_name.as_deref().unwrap_or("unknown");
                println!("\u{2705} Authenticated as {email_display} ({org_display})");
                println!("   Token stored in ~/.config/complior/credentials");
                return Ok(());
            }
            TokenPollResult::Expired => {
                println!();
                return Err("Device code expired. Run `complior login` again.".into());
            }
        }
    }
}

/// Replace the host in `verification_uri` (from server) with the configured `base_url`.
/// This handles dev tunnels (Cloudflare, ngrok) where the server returns localhost
/// but the user needs the public URL.
fn rewrite_verification_url(verification_uri: &str, base_url: &str) -> String {
    // Extract the path from the server-provided URI (e.g. "/device" from "http://localhost:3001/device")
    if let Some(pos) = verification_uri.find("://") {
        let after_scheme = &verification_uri[pos + 3..];
        if let Some(slash) = after_scheme.find('/') {
            let path = &after_scheme[slash..]; // e.g. "/device"
            return format!("{}{}", base_url.trim_end_matches('/'), path);
        }
    }
    // Fallback: use base_url + "/device" if parsing fails
    format!("{}/device", base_url.trim_end_matches('/'))
}

pub async fn run_logout(_config: &TuiConfig) -> Result<(), String> {
    config::clear_tokens()?;
    println!("\u{1f44b} Logged out. Tokens cleared from ~/.config/complior/credentials");
    Ok(())
}
