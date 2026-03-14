use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::types::Severity;

use super::format::{format_human, format_json, format_sarif, print_paged};

/// Run a headless (non-TUI) scan and print results to stdout.
/// Returns the exit code: 0 = pass, 1 = fail/error.
pub async fn run_headless_scan(
    ci: bool,
    json: bool,
    sarif: bool,
    no_tui: bool,
    threshold: u32,
    fail_on: Option<&str>,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    // Check engine is reachable
    match client.status().await {
        Ok(status) if status.ready => {}
        Ok(_) => {
            eprintln!("Error: Engine is not ready");
            return 1;
        }
        Err(e) => {
            eprintln!("Error: Cannot connect to engine at {engine_url}: {e}");
            eprintln!("Start the engine with: cd engine && npm run dev");
            return 1;
        }
    }

    // Determine project path
    let scan_path = path.map_or_else(
        || std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        String::from,
    );

    // Run scan
    let result = match client.scan(&scan_path).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Scan failed: {e}");
            return 1;
        }
    };

    // Format output (default: human-readable with pager)
    if json {
        println!("{}", format_json(&result));
    } else if sarif {
        println!("{}", format_sarif(&result));
    } else {
        let text = format_human(&result);
        print_paged(&text);
    }

    // Determine exit code
    if ci {
        let score = result.score.total_score.round() as u32;
        if score < threshold {
            eprintln!(
                "CI FAIL: Score {score} is below threshold {threshold}"
            );
            return 1;
        }

        // Check fail-on severity
        if let Some(level) = fail_on {
            let has_severity = result.findings.iter().any(|f| {
                matches!(
                    (level, &f.severity),
                    ("critical", Severity::Critical)
                        | ("high", Severity::Critical | Severity::High)
                        | ("medium", Severity::Critical | Severity::High | Severity::Medium)
                        | ("low", Severity::Critical | Severity::High | Severity::Medium | Severity::Low)
                )
            });
            if has_severity {
                eprintln!(
                    "CI FAIL: Found findings at severity '{level}' or above"
                );
                return 1;
            }
        }
    }

    0
}

/// US-S05-34: Compliance diff — compare scan against a base branch.
pub async fn run_scan_diff(
    base_branch: &str,
    json: bool,
    fail_on_regression: bool,
    comment: bool,
    path: Option<&str>,
    config: &TuiConfig,
) -> i32 {
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    let client = EngineClient::from_url(&engine_url);

    // Check engine
    match client.status().await {
        Ok(status) if status.ready => {}
        Ok(_) => { eprintln!("Error: Engine is not ready"); return 1; }
        Err(e) => {
            eprintln!("Error: Cannot connect to engine at {engine_url}: {e}");
            return 1;
        }
    }

    let scan_path = path.map_or_else(
        || std::env::current_dir().unwrap_or_default().to_string_lossy().to_string(),
        String::from,
    );

    // Get changed files via git
    let changed_files = get_changed_files(base_branch, &scan_path);
    if changed_files.is_empty() {
        if !json {
            println!("No changed files found between HEAD and {base_branch}.");
        }
        return 0;
    }

    if !json {
        eprintln!("Scanning diff against {base_branch} ({} files changed)...", changed_files.len());
    }

    // POST /scan/diff with changed files
    let body = serde_json::json!({
        "path": scan_path,
        "changedFiles": changed_files,
        "markdown": comment,
    });

    match client.post_json("/scan/diff", &body).await {
        Ok(result) => {
            if let Some(err) = result.get("error").and_then(|v| v.as_str()) {
                let msg = result.get("message").and_then(|v| v.as_str()).unwrap_or(err);
                eprintln!("Error: {msg}");
                return 1;
            }

            if json {
                println!("{}", serde_json::to_string_pretty(&result).unwrap_or_default());
            } else {
                print_diff_human(&result);
            }

            // Post PR comment if requested
            if comment {
                if let Some(md) = result.get("markdown").and_then(|v| v.as_str()) {
                    post_pr_comment(md);
                }
            }

            // Check regression
            if fail_on_regression {
                let regression = result.get("hasRegression").and_then(|v| v.as_bool()).unwrap_or(false);
                if regression {
                    eprintln!("CI FAIL: Compliance regression detected");
                    return 1;
                }
            }

            0
        }
        Err(e) => {
            eprintln!("Scan diff failed: {e}");
            1
        }
    }
}

fn get_changed_files(base_branch: &str, project_path: &str) -> Vec<String> {
    let output = std::process::Command::new("git")
        .args(["diff", "--name-only", &format!("{base_branch}...HEAD")])
        .current_dir(project_path)
        .output();

    match output {
        Ok(o) if o.status.success() => {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .filter(|l| !l.is_empty())
                .map(String::from)
                .collect()
        }
        Ok(o) => {
            // Fallback: try without merge-base syntax
            let fallback = std::process::Command::new("git")
                .args(["diff", "--name-only", base_branch])
                .current_dir(project_path)
                .output();
            match fallback {
                Ok(f) if f.status.success() => {
                    String::from_utf8_lossy(&f.stdout)
                        .lines()
                        .filter(|l| !l.is_empty())
                        .map(String::from)
                        .collect()
                }
                _ => {
                    eprintln!("Warning: git diff failed: {}", String::from_utf8_lossy(&o.stderr).trim());
                    vec![]
                }
            }
        }
        Err(e) => {
            eprintln!("Warning: Could not run git: {e}");
            vec![]
        }
    }
}

fn print_diff_human(value: &serde_json::Value) {
    let before = value.get("scoreBefore").and_then(|v| v.as_u64()).unwrap_or(0);
    let after = value.get("scoreAfter").and_then(|v| v.as_u64()).unwrap_or(0);
    let delta = value.get("scoreDelta").and_then(|v| v.as_i64()).unwrap_or(0);
    let new_count = value.get("newFindings").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
    let resolved_count = value.get("resolvedFindings").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
    let unchanged = value.get("unchangedCount").and_then(|v| v.as_u64()).unwrap_or(0);
    let regression = value.get("hasRegression").and_then(|v| v.as_bool()).unwrap_or(false);

    let delta_str = if delta > 0 { format!("+{delta}") } else { format!("{delta}") };

    println!();
    println!("  Compliance Diff");
    println!("  ---------------");
    println!("  Score: {before}% -> {after}% ({delta_str}%)");
    println!("  New findings:      {new_count}");
    println!("  Resolved:          {resolved_count}");
    println!("  Unchanged:         {unchanged}");
    if regression {
        println!("  Status:            REGRESSION DETECTED");
    } else {
        println!("  Status:            OK");
    }
    println!();

    if let Some(findings) = value.get("newFindings").and_then(|v| v.as_array()) {
        if !findings.is_empty() {
            println!("  New Findings:");
            for f in findings {
                let sev = f.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
                let msg = f.get("message").and_then(|v| v.as_str()).unwrap_or("?");
                let file = f.get("file").and_then(|v| v.as_str()).unwrap_or("-");
                println!("    [{sev}] {msg} ({file})");
            }
            println!();
        }
    }

    if let Some(findings) = value.get("resolvedFindings").and_then(|v| v.as_array()) {
        if !findings.is_empty() {
            println!("  Resolved Findings:");
            for f in findings {
                let sev = f.get("severity").and_then(|v| v.as_str()).unwrap_or("?");
                let msg = f.get("message").and_then(|v| v.as_str()).unwrap_or("?");
                println!("    [{sev}] {msg}");
            }
            println!();
        }
    }
}

fn post_pr_comment(markdown: &str) {
    let output = std::process::Command::new("gh")
        .args(["pr", "comment", "--body", markdown])
        .output();

    match output {
        Ok(o) if o.status.success() => {
            eprintln!("PR comment posted successfully.");
        }
        Ok(o) => {
            eprintln!("Warning: Failed to post PR comment: {}", String::from_utf8_lossy(&o.stderr).trim());
        }
        Err(_) => {
            eprintln!("Warning: `gh` CLI not found. Install GitHub CLI to post PR comments.");
        }
    }
}
