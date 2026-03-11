//! US-S05-33: Headless runner for `complior onboarding` commands.

use crate::cli::OnboardingAction;
use crate::config::TuiConfig;

use super::common::{ensure_engine, print_onboarding_status, print_onboarding_step_result};

/// Check if an API response contains an error field; print and return exit code 1 if so.
fn check_api_error(result: &serde_json::Value) -> Option<i32> {
    let err_msg = result.get("error").and_then(|v| v.as_str())?;
    let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err_msg);
    eprintln!("Error: {msg}");
    Some(1)
}

pub async fn run_onboarding(action: &OnboardingAction, config: &TuiConfig) -> i32 {
    let client = match ensure_engine(config).await {
        Ok(c) => c,
        Err(code) => return code,
    };

    match action {
        OnboardingAction::Start => {
            match client
                .post_json("/onboarding/guided/start", &serde_json::json!({}))
                .await
            {
                Ok(result) => {
                    if let Some(code) = check_api_error(&result) {
                        return code;
                    }
                    print_onboarding_status(&result, "complior onboarding step");
                    0
                }
                Err(e) => {
                    eprintln!("Error: {e}");
                    1
                }
            }
        }

        OnboardingAction::Status => {
            match client.get_json("/onboarding/guided/status").await {
                Ok(result) => {
                    if let Some(code) = check_api_error(&result) {
                        return code;
                    }
                    print_onboarding_status(&result, "complior onboarding step");
                    0
                }
                Err(e) => {
                    eprintln!("Error: {e}");
                    1
                }
            }
        }

        OnboardingAction::Step { number } => {
            if !(1..=5).contains(number) {
                eprintln!("Error: Step must be between 1 and 5");
                return 1;
            }

            let url = format!("/onboarding/guided/step/{number}");
            match client.post_json(&url, &serde_json::json!({})).await {
                Ok(result) => {
                    if let Some(code) = check_api_error(&result) {
                        return code;
                    }
                    print_onboarding_step_result(&result, *number, "complior onboarding step");
                    0
                }
                Err(e) => {
                    eprintln!("Error: {e}");
                    1
                }
            }
        }

        OnboardingAction::Reset => {
            match client
                .post_json("/onboarding/guided/reset", &serde_json::json!({}))
                .await
            {
                Ok(result) => {
                    if let Some(code) = check_api_error(&result) {
                        return code;
                    }
                    println!("Onboarding progress reset.");
                    println!("Run `complior onboarding start` to begin again.");
                    0
                }
                Err(e) => {
                    eprintln!("Error: {e}");
                    1
                }
            }
        }
    }
}

