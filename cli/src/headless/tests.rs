#[cfg(test)]
mod tests {
    use crate::headless::format::{format_human, format_json, format_sarif, sarif_level};
    use crate::types::{CategoryScore, Finding, ScanResult, ScoreBreakdown, Severity, Zone};

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
                confidence_summary: None,
            },
            findings: vec![
                Finding {
                    check_id: "OBL-015".into(),
                    r#type: crate::types::CheckResultType::Fail,
                    message: "Missing AI disclosure notice".into(),
                    severity: Severity::High,
                    obligation_id: Some("OBL-015".into()),
                    article_reference: Some("Art. 50".into()),
                    fix: Some("Add disclosure".into()),
                    file: None,
                    line: None,
                    code_context: None,
                    fix_diff: None,
                    priority: None,
                    confidence: None,
                    confidence_level: None,
                    evidence: None,
                    explanation: None,
                },
                Finding {
                    check_id: "OBL-022".into(),
                    r#type: crate::types::CheckResultType::Fail,
                    message: "No risk assessment document".into(),
                    severity: Severity::Medium,
                    obligation_id: None,
                    article_reference: None,
                    fix: None,
                    file: None,
                    line: None,
                    code_context: None,
                    fix_diff: None,
                    priority: None,
                    confidence: None,
                    confidence_level: None,
                    evidence: None,
                    explanation: None,
                },
            ],
            project_path: "/tmp/test-project".into(),
            scanned_at: "2026-02-19T12:00:00Z".into(),
            duration: 1234,
            files_scanned: 42,
            deep_analysis: None,
            l5_cost: None,
            regulation_version: None,
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
        // Header
        assert!(text.contains("Complior — EU AI Act Compliance Scan"));
        assert!(text.contains("72/100"));
        assert!(text.contains("Yellow"));
        // Severity breakdown
        assert!(text.contains("HIGH"));
        assert!(text.contains("MEDIUM"));
        // Issues table with human-readable labels
        assert!(text.contains("Issues"));
        // Suggested fixes (only OBL-015 has fix)
        assert!(text.contains("How to Fix"));
        assert!(text.contains("Add disclosure"));
        // Footer
        assert!(text.contains("Status:"));
    }

    #[test]
    fn format_human_no_findings() {
        let mut result = mock_scan_result();
        result.findings.clear();
        result.score.failed_checks = 0;
        result.score.total_score = 85.0;
        let text = format_human(&result);
        assert!(text.contains("COMPLIANT"));
        assert!(!text.contains("Failed Checks"));
    }

    #[test]
    fn format_human_collapses_duplicates() {
        let mut result = mock_scan_result();
        // Add 10 findings with same check_id
        result.findings.clear();
        for i in 0..10 {
            result.findings.push(Finding {
                check_id: "repeat-check".into(),
                r#type: crate::types::CheckResultType::Fail,
                message: format!("Instance {i}"),
                severity: Severity::Low,
                obligation_id: None,
                article_reference: None,
                fix: Some(format!("Fix {i}")),
                file: None,
                line: None,
                code_context: None,
                fix_diff: None,
                priority: None,
                confidence: None,
                confidence_level: None,
                evidence: None,
                explanation: None,
            });
        }
        let text = format_human(&result);
        // Should show first 3 + "... and 7 more"
        assert!(text.contains("... and 7 more"));
        // Suggested fixes collapsed to 1 entry with (x10)
        assert!(text.contains("(x10)"));
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
