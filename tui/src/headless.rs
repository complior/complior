use crate::config::TuiConfig;
use crate::engine_client::EngineClient;
use crate::types::{ScanResult, Severity};

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

    // Format output
    if json {
        println!("{}", format_json(&result));
    } else if sarif {
        println!("{}", format_sarif(&result));
    } else if no_tui || ci {
        print!("{}", format_human(&result));
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

/// Run a headless fix (dry-run or apply).
pub async fn run_headless_fix(
    dry_run: bool,
    json: bool,
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
        _ => {
            eprintln!("Error: Cannot connect to engine at {engine_url}");
            return 1;
        }
    }

    // First scan to find fixable findings
    let scan_path = path.map_or_else(
        || std::env::current_dir()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        String::from,
    );

    let result = match client.scan(&scan_path).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Scan failed: {e}");
            return 1;
        }
    };

    let fixable: Vec<String> = result
        .findings
        .iter()
        .filter(|f| f.fix.is_some())
        .map(|f| f.check_id.clone())
        .collect();

    if fixable.is_empty() {
        if json {
            println!("{{\"dryRun\": {dry_run}, \"changes\": [], \"message\": \"No fixable findings\"}}");
        } else {
            println!("No fixable findings. Score: {:.0}/100", result.score.total_score);
        }
        return 0;
    }

    if dry_run {
        // Request dry-run from engine
        match client.fix_dry_run(&fixable).await {
            Ok(dr_result) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&dr_result).unwrap_or_default());
                } else {
                    println!("Dry-Run Fix Analysis (no files modified)");
                    println!("Fixable findings: {}", fixable.len());
                    if let Some(changes) = dr_result.get("changes").and_then(|v| v.as_array()) {
                        for change in changes {
                            let path = change.get("path").and_then(|v| v.as_str()).unwrap_or("?");
                            let action = change.get("action").and_then(|v| v.as_str()).unwrap_or("MODIFY");
                            println!("  {path:<40} [{action}]");
                        }
                    }
                    if let Some(predicted) = dr_result.get("predictedScore").and_then(|v| v.as_f64()) {
                        let delta = predicted - result.score.total_score;
                        println!("\nPredicted: {:.0} -> {predicted:.0} ({delta:+.0})", result.score.total_score);
                    }
                }
            }
            Err(_) => {
                // Offline estimate
                let impact: i32 = result.findings.iter()
                    .filter(|f| f.fix.is_some())
                    .map(|f| match f.severity {
                        Severity::Critical => 8, Severity::High => 5,
                        Severity::Medium => 3, Severity::Low => 1, Severity::Info => 0,
                    })
                    .sum();
                let predicted = (result.score.total_score + impact as f64).min(100.0);
                if json {
                    println!("{{\"dryRun\": true, \"fixable\": {}, \"currentScore\": {:.0}, \"predictedScore\": {:.0}}}", fixable.len(), result.score.total_score, predicted);
                } else {
                    println!("Dry-Run Fix Analysis (offline estimate)");
                    println!("Fixable: {} findings", fixable.len());
                    println!("Predicted: {:.0} -> {predicted:.0} (+{impact})", result.score.total_score);
                }
            }
        }
    } else {
        println!("Fix apply mode not yet supported in headless mode.");
        println!("Use --dry-run to preview, or use the interactive TUI.");
        return 1;
    }

    0
}

/// Print version info and exit.
pub fn run_version() {
    let version = env!("CARGO_PKG_VERSION");
    println!("complior {version}");
    println!("AI Act Compliance Scanner & Fixer");
    println!("https://complior.eu");
}

/// Run doctor diagnostics.
pub async fn run_doctor(config: &TuiConfig) {
    println!("Complior Doctor");
    println!("===============");
    println!();

    // Check engine
    let engine_url = config
        .engine_url_override
        .clone()
        .unwrap_or_else(|| config.engine_url());
    print!("Engine ({engine_url}): ");
    let client = EngineClient::from_url(&engine_url);
    match client.status().await {
        Ok(status) if status.ready => {
            let ver = status.version.unwrap_or_else(|| "unknown".into());
            println!("OK (v{ver})");
        }
        Ok(_) => println!("NOT READY"),
        Err(e) => println!("UNREACHABLE ({e})"),
    }

    // Check config
    print!("Config: ");
    let config_path = dirs::config_dir()
        .map(|d| d.join("complior").join("tui.toml"));
    match config_path {
        Some(p) if p.exists() => println!("OK ({})", p.display()),
        Some(p) => println!("Missing ({})", p.display()),
        None => println!("No config dir found"),
    }

    // Check project path
    let cwd = std::env::current_dir().unwrap_or_default();
    print!("Project ({}): ", cwd.display());
    if cwd.join("package.json").exists() || cwd.join("Cargo.toml").exists() {
        println!("OK");
    } else {
        println!("No package.json or Cargo.toml found");
    }

    println!();
    println!("All checks complete.");
}

/// Format scan result as JSON.
pub fn format_json(result: &ScanResult) -> String {
    serde_json::to_string_pretty(result).unwrap_or_else(|e| format!("{{\"error\": \"{e}\"}}"))
}

/// Format scan result as SARIF v2.1.0.
#[allow(clippy::cast_precision_loss)]
pub fn format_sarif(result: &ScanResult) -> String {
    let rules: Vec<serde_json::Value> = result
        .findings
        .iter()
        .map(|f| {
            serde_json::json!({
                "id": f.check_id,
                "shortDescription": { "text": f.message },
                "defaultConfiguration": {
                    "level": sarif_level(&f.severity)
                }
            })
        })
        .collect();

    let results: Vec<serde_json::Value> = result
        .findings
        .iter()
        .map(|f| {
            serde_json::json!({
                "ruleId": f.check_id,
                "message": { "text": f.message },
                "level": sarif_level(&f.severity),
                "properties": {
                    "severity": format!("{:?}", f.severity).to_lowercase(),
                    "type": f.r#type
                }
            })
        })
        .collect();

    let sarif = serde_json::json!({
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "complior",
                    "version": env!("CARGO_PKG_VERSION"),
                    "informationUri": "https://complior.eu",
                    "rules": rules
                }
            },
            "results": results,
            "properties": {
                "complianceScore": result.score.total_score,
                "zone": format!("{:?}", result.score.zone).to_lowercase(),
                "totalChecks": result.score.total_checks,
                "passedChecks": result.score.passed_checks,
                "failedChecks": result.score.failed_checks
            }
        }]
    });

    serde_json::to_string_pretty(&sarif).unwrap_or_else(|e| format!("{{\"error\": \"{e}\"}}"))
}

/// Format scan result as human-readable text.
#[allow(clippy::cast_precision_loss)]
pub fn format_human(result: &ScanResult) -> String {
    let score = result.score.total_score;
    let zone = format!("{:?}", result.score.zone);

    let mut out = String::new();
    out.push_str(&format!("Score: {score:.0}/100 ({zone})\n"));
    out.push_str(&format!(
        "Checks: {} total, {} passed, {} failed, {} skipped\n",
        result.score.total_checks,
        result.score.passed_checks,
        result.score.failed_checks,
        result.score.skipped_checks
    ));
    out.push_str(&format!(
        "Files scanned: {} in {}ms\n",
        result.files_scanned, result.duration
    ));

    if !result.findings.is_empty() {
        out.push('\n');
        out.push_str(&format!("Findings ({}):\n", result.findings.len()));

        let critical = result.findings.iter().filter(|f| f.severity == Severity::Critical).count();
        let high = result.findings.iter().filter(|f| f.severity == Severity::High).count();
        let medium = result.findings.iter().filter(|f| f.severity == Severity::Medium).count();
        let low = result.findings.iter().filter(|f| f.severity == Severity::Low).count();

        if critical > 0 { out.push_str(&format!("  CRITICAL: {critical}\n")); }
        if high > 0 { out.push_str(&format!("  HIGH: {high}\n")); }
        if medium > 0 { out.push_str(&format!("  MEDIUM: {medium}\n")); }
        if low > 0 { out.push_str(&format!("  LOW: {low}\n")); }

        out.push('\n');
        for f in &result.findings {
            let sev = format!("{:?}", f.severity).to_uppercase();
            out.push_str(&format!("  [{sev}] {}: {}\n", f.check_id, f.message));
        }
    } else {
        out.push_str("\nNo findings. Great job!\n");
    }

    out
}

/// Map Severity to SARIF level string.
fn sarif_level(severity: &Severity) -> &'static str {
    match severity {
        Severity::Critical | Severity::High => "error",
        Severity::Medium => "warning",
        Severity::Low | Severity::Info => "note",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{CategoryScore, Finding, ScoreBreakdown, Zone};

    fn mock_scan_result() -> ScanResult {
        ScanResult {
            score: ScoreBreakdown {
                total_score: 72.0,
                zone: Zone::Yellow,
                category_scores: vec![CategoryScore {
                    category: "transparency".into(),
                    weight: 0.3,
                    score: 80.0,
                    obligation_count: 5,
                    passed_count: 4,
                }],
                critical_cap_applied: false,
                total_checks: 25,
                passed_checks: 18,
                failed_checks: 5,
                skipped_checks: 2,
            },
            findings: vec![
                Finding {
                    check_id: "OBL-015".into(),
                    r#type: "obligation".into(),
                    message: "Missing AI disclosure notice".into(),
                    severity: Severity::High,
                    obligation_id: Some("OBL-015".into()),
                    article_reference: Some("Art. 50".into()),
                    fix: Some("Add disclosure".into()),
                },
                Finding {
                    check_id: "OBL-022".into(),
                    r#type: "obligation".into(),
                    message: "No risk assessment document".into(),
                    severity: Severity::Medium,
                    obligation_id: None,
                    article_reference: None,
                    fix: None,
                },
            ],
            project_path: "/tmp/test-project".into(),
            scanned_at: "2026-02-19T12:00:00Z".into(),
            duration: 1234,
            files_scanned: 42,
        }
    }

    #[test]
    fn format_json_output() {
        let result = mock_scan_result();
        let json = format_json(&result);
        let parsed: serde_json::Value = serde_json::from_str(&json).expect("valid JSON");
        assert_eq!(parsed["score"]["totalScore"], 72.0);
        assert_eq!(parsed["findings"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn format_sarif_output() {
        let result = mock_scan_result();
        let sarif = format_sarif(&result);
        let parsed: serde_json::Value = serde_json::from_str(&sarif).expect("valid SARIF JSON");
        assert_eq!(parsed["version"], "2.1.0");
        let runs = parsed["runs"].as_array().unwrap();
        assert_eq!(runs.len(), 1);
        let results = runs[0]["results"].as_array().unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0]["ruleId"], "OBL-015");
        assert_eq!(results[0]["level"], "error"); // High = error
        assert_eq!(results[1]["level"], "warning"); // Medium = warning
    }

    #[test]
    fn format_human_output() {
        let result = mock_scan_result();
        let text = format_human(&result);
        assert!(text.contains("Score: 72/100"));
        assert!(text.contains("Yellow"));
        assert!(text.contains("Findings (2)"));
        assert!(text.contains("[HIGH] OBL-015"));
        assert!(text.contains("[MEDIUM] OBL-022"));
    }

    #[test]
    fn format_human_no_findings() {
        let mut result = mock_scan_result();
        result.findings.clear();
        let text = format_human(&result);
        assert!(text.contains("No findings. Great job!"));
    }

    #[test]
    fn sarif_level_mapping() {
        assert_eq!(sarif_level(&Severity::Critical), "error");
        assert_eq!(sarif_level(&Severity::High), "error");
        assert_eq!(sarif_level(&Severity::Medium), "warning");
        assert_eq!(sarif_level(&Severity::Low), "note");
        assert_eq!(sarif_level(&Severity::Info), "note");
    }
}
