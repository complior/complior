use crate::config::{self, TuiConfig};
use crate::saas_client::{SaasClient, TokenPollResult};

pub async fn run_login(config: &TuiConfig) -> Result<(), String> {
    let client = SaasClient::new(&config.project_api_url)?;

    // 1. Request device code
    let code = client.request_device_code().await?;

    println!("\n\u{1f517} Opening browser for authentication...");
    println!("   Visit: {}", code.verification_uri);
    println!("   Enter code: {}\n", code.user_code);

    // Best-effort browser open
    let _ = open::that(&code.verification_uri);

    print!("\u{231b} Waiting for browser confirmation... (press Ctrl+C to cancel)");

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

pub async fn run_logout(_config: &TuiConfig) -> Result<(), String> {
    config::clear_tokens()?;
    println!("\u{1f44b} Logged out. Tokens cleared from ~/.config/complior/credentials");
    Ok(())
}
