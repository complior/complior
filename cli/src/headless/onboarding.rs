//! US-S05-33: Headless runner for `complior onboarding` commands.

use crate::cli::OnboardingAction;
use crate::config::TuiConfig;

use super::common::ensure_engine;

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
                    print_status(&result);
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
                    print_status(&result);
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
                    print_step_result(&result, *number);
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

fn print_status(value: &serde_json::Value) {
    let progress = value.get("progress");
    let pct = progress
        .and_then(|p| p.get("percentage"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let completed_steps = progress
        .and_then(|p| p.get("completedSteps"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    println!();
    println!("Onboarding Wizard: {completed_steps}/5 steps ({pct}%)");
    println!("{}", "-".repeat(40));

    if let Some(state) = value.get("state") {
        if let Some(steps) = state.get("steps").and_then(|v| v.as_array()) {
            for step in steps {
                let num = step.get("step").and_then(|v| v.as_u64()).unwrap_or(0);
                let label = step
                    .get("label")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let status = step
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("pending");
                let icon = match status {
                    "completed" => "\u{2713}",
                    "in_progress" => "\u{25b6}",
                    "skipped" => "-",
                    _ => " ",
                };
                println!("  {icon} {num}. {label}");
            }
        }

        let current = state
            .get("currentStep")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let status = state
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("?");
        if status == "in_progress" && current > 0 {
            println!();
            println!("Next: complior onboarding step {current}");
        } else if status == "completed" {
            println!();
            println!("Onboarding complete!");
        }
    }

    println!();
}

fn print_step_result(value: &serde_json::Value, step: u32) {
    let name = super::common::ONBOARDING_STEP_NAMES
        .get(step as usize - 1)
        .unwrap_or(&"?");

    println!();
    println!("\u{2713} Step {step}: {name}");

    if let Some(data) = value.get("data") {
        match step {
            1 => {
                let lang = data
                    .get("language")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let fw = data
                    .get("framework")
                    .and_then(|v| v.as_str())
                    .unwrap_or("?");
                let ai = data
                    .get("aiLibraries")
                    .and_then(|v| v.as_array())
                    .map(|a| {
                        a.iter()
                            .filter_map(|v| v.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    })
                    .unwrap_or_default();
                println!("  Language:  {lang}");
                println!("  Framework: {fw}");
                if !ai.is_empty() {
                    println!("  AI SDKs:   {ai}");
                }
            }
            2 => {
                let score = data
                    .get("score")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let files = data
                    .get("filesScanned")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let findings = data
                    .get("totalFindings")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                println!("  Score:    {score}%");
                println!("  Files:    {files}");
                println!("  Findings: {findings}");
            }
            3 => {
                let count = data
                    .get("agentsFound")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                println!("  Agents discovered: {count}");
                if let Some(agents) = data.get("agents").and_then(|v| v.as_array()) {
                    for agent in agents {
                        let n = agent.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                        let lvl = agent
                            .get("autonomyLevel")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        println!("    - {n} ({lvl})");
                    }
                }
            }
            4 => {
                if let Some(fixes) = data.get("fixes").and_then(|v| v.as_array()) {
                    println!("  Suggested fixes: {}", fixes.len());
                    for fix in fixes {
                        let msg = fix.get("message").and_then(|v| v.as_str()).unwrap_or("?");
                        let sev = fix.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
                        println!("    [{sev}] {msg}");
                    }
                }
            }
            5 => {
                let doc_type = data
                    .get("documentType")
                    .and_then(|v| v.as_str())
                    .unwrap_or("none");
                if doc_type == "fria" {
                    let saved_path = data
                        .get("savedPath")
                        .and_then(|v| v.as_str())
                        .unwrap_or("?");
                    println!("  Generated: FRIA report");
                    println!("  Saved to:  {saved_path}");
                } else {
                    let msg = data
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("No document needed");
                    println!("  {msg}");
                }
            }
            _ => {}
        }
    }

    if let Some(progress) = value.get("progress") {
        let pct = progress
            .get("percentage")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let completed_steps = progress
            .get("completedSteps")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        println!("  Progress: {completed_steps}/5 ({pct}%)");

        if pct < 100 {
            let next = step + 1;
            if next <= 5 {
                println!();
                println!("Next: complior onboarding step {next}");
            }
        } else {
            println!();
            println!("Onboarding complete!");
        }
    }

    println!();
}
