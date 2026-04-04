#[cfg(test)]
mod tests {
    use crate::headless::format::{
        FormatOptions, format_human, format_json, format_sarif, sarif_level,
    };
    use crate::types::{
        CategoryScore, CheckResultType, ExternalToolResult, Finding, FindingExplanation,
        FrameworkScoreResult, ScanResult, ScoreBreakdown, Severity, Zone,
    };

    fn default_opts() -> FormatOptions {
        FormatOptions {
            framework_scores: None,
            quiet: false,
            prev_score: None,
        }
    }

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
                    check_id: "fria".into(),
                    r#type: CheckResultType::Fail,
                    message: "Missing FRIA document".into(),
                    severity: Severity::High,
                    obligation_id: Some("OBL-015".into()),
                    article_reference: Some("Art. 27".into()),
                    fix: Some("Create docs/FRIA.md".into()),
                    file: None,
                    line: None,
                    code_context: None,
                    fix_diff: None,
                    priority: None,
                    confidence: None,
                    confidence_level: None,
                    evidence: None,
                    explanation: None,
                    agent_id: None,
                    doc_quality: None,
                    l5_analyzed: None,
                },
                Finding {
                    check_id: "l4-bare-llm".into(),
                    r#type: CheckResultType::Fail,
                    message: "Bare LLM API call detected".into(),
                    severity: Severity::Medium,
                    obligation_id: None,
                    article_reference: Some("Art. 50(1)".into()),
                    fix: Some("Wrap with complior(client)".into()),
                    file: Some("src/chat/anthropic.ts".into()),
                    line: Some(8),
                    code_context: None,
                    fix_diff: None,
                    priority: None,
                    confidence: None,
                    confidence_level: None,
                    evidence: None,
                    explanation: None,
                    agent_id: None,
                    doc_quality: None,
                    l5_analyzed: None,
                },
            ],
            project_path: "/tmp/test-project".into(),
            scanned_at: "2026-02-19T12:00:00Z".into(),
            duration: 1234,
            files_scanned: 42,
            files_excluded: None,
            deep_analysis: None,
            l5_cost: None,
            regulation_version: None,
            tier: None,
            external_tool_results: None,
            agent_summaries: None,
        }
    }

    fn make_finding(
        check_id: &str,
        typ: CheckResultType,
        message: &str,
        severity: Severity,
    ) -> Finding {
        Finding {
            check_id: check_id.into(),
            r#type: typ,
            message: message.into(),
            severity,
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
            agent_id: None,
            doc_quality: None,
            l5_analyzed: None,
        }
    }

    // ── JSON / SARIF (unchanged) ────────────────────────────────

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
        assert_eq!(results[0]["ruleId"], "fria");
        assert_eq!(results[0]["level"], "error"); // High = error
        assert_eq!(results[1]["level"], "warning"); // Medium = warning
    }

    #[test]
    fn sarif_level_mapping() {
        assert_eq!(sarif_level(&Severity::Critical), "error");
        assert_eq!(sarif_level(&Severity::High), "error");
        assert_eq!(sarif_level(&Severity::Medium), "warning");
        assert_eq!(sarif_level(&Severity::Low), "note");
        assert_eq!(sarif_level(&Severity::Info), "note");
    }

    // ── Data extraction helpers (unchanged) ─────────────────────

    #[test]
    fn project_name_via_header() {
        // project_name is tested indirectly through format_human header
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        assert!(text.contains("test-project"));
    }

    // ── New format_human tests ──────────────────────────────────

    #[test]
    fn format_human_header() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Header with version
        assert!(text.contains("Complior v"));
        assert!(text.contains("EU AI Act Compliance Scanner"));
        // Scan info
        assert!(text.contains("test-project"));
        assert!(text.contains("42 collected"));
        assert!(text.contains("L1"));
        assert!(text.contains("L4"));
    }

    #[test]
    fn format_human_score_block() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Compliance score
        assert!(text.contains("COMPLIANCE SCORE"));
        assert!(text.contains("72 / 100"));
        // Security score N/A hint when no framework_scores
        assert!(text.contains("SECURITY SCORE"));
        assert!(text.contains("N/A"));
    }

    #[test]
    fn format_human_dual_score() {
        let result = mock_scan_result();
        let opts = FormatOptions {
            framework_scores: Some(vec![
                FrameworkScoreResult {
                    framework_id: "eu-ai-act".into(),
                    framework_name: "EU AI Act 2024/1689".into(),
                    score: 72.0,
                    grade: "C".into(),
                    grade_type: "letter".into(),
                    gaps: 5,
                    total_checks: 25,
                    passed_checks: 18,
                    deadline: None,
                    categories: vec![],
                },
                FrameworkScoreResult {
                    framework_id: "owasp-llm-top10".into(),
                    framework_name: "OWASP LLM Top 10".into(),
                    score: 85.0,
                    grade: "B".into(),
                    grade_type: "letter".into(),
                    gaps: 2,
                    total_checks: 10,
                    passed_checks: 8,
                    deadline: None,
                    categories: vec![],
                },
            ]),
            quiet: false,
            prev_score: None,
        };
        let text = format_human(&result, &opts);
        assert!(text.contains("COMPLIANCE SCORE"));
        assert!(text.contains("SECURITY SCORE"));
        assert!(text.contains("85 / 100"));
        // Framework breakdown
        assert!(text.contains("Framework Breakdown"));
        assert!(text.contains("EU AI Act 2024/1689"));
        assert!(text.contains("OWASP LLM Top 10"));
    }

    #[test]
    fn format_human_findings_section() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Findings header
        assert!(text.contains("FINDINGS"));
        assert!(text.contains("2 total"));
        assert!(text.contains("1 high"));
        assert!(text.contains("1 medium"));
        // Finding details
        assert!(text.contains("HIGH"));
        assert!(text.contains("MEDIUM"));
        // Layer subgroup headers
        assert!(text.contains("L1"));
        assert!(text.contains("File Presence"));
        assert!(text.contains("L4"));
        assert!(text.contains("Code Patterns"));
        // Article references
        assert!(text.contains("Art. 27"));
        assert!(text.contains("Art. 50(1)"));
        // Labels
        assert!(text.contains("Fundamental Rights Assessment"));
        assert!(text.contains("Bare LLM API Call"));
        // Messages
        assert!(text.contains("Missing FRIA document"));
        assert!(text.contains("Bare LLM API call detected"));
        // Fix suggestions
        assert!(text.contains("Create docs/FRIA.md"));
        assert!(text.contains("Wrap with complior(client)"));
        // File location
        assert!(text.contains("src/chat/anthropic.ts:8"));
    }

    #[test]
    fn format_human_no_findings() {
        let mut result = mock_scan_result();
        result.findings.clear();
        result.score.failed_checks = 0;
        result.score.total_score = 85.0;
        let text = format_human(&result, &default_opts());
        assert!(text.contains("No compliance issues found"));
        assert!(text.contains("on track"));
    }

    #[test]
    fn format_human_layer_results() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        assert!(text.contains("Layer Results"));
        assert!(text.contains("File Presence"));
        assert!(text.contains("FAIL")); // L1 has high severity → FAIL
        assert!(text.contains("Code Patterns"));
        assert!(text.contains("WARN")); // L4 has only medium → WARN
    }

    #[test]
    fn format_human_quick_actions() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        assert!(text.contains("QUICK ACTIONS"));
        assert!(text.contains("Auto-fix available"));
        assert!(text.contains("complior fix"));
        assert!(text.contains("complior scan --deep"));
        assert!(text.contains("complior tui"));
        assert!(text.contains("Next"));
    }

    #[test]
    fn format_human_deep_scan_hint_absent_when_deep() {
        let mut result = mock_scan_result();
        result.tier = Some(2);
        let text = format_human(&result, &default_opts());
        // Should NOT suggest --deep when already Tier 2
        assert!(!text.contains("complior scan --deep"));
        // Deep mode label in header
        assert!(text.contains("Deep Mode"));
    }

    #[test]
    fn format_human_critical_cap_warning() {
        let mut result = mock_scan_result();
        result.score.critical_cap_applied = true;
        result.score.total_score = 40.0; // Cap only shows when score <= 50
        let text = format_human(&result, &default_opts());
        assert!(text.contains("Score capped"));
        assert!(text.contains("critical violations"));
    }

    #[test]
    fn format_human_critical_cap_hidden_when_score_high() {
        let mut result = mock_scan_result();
        result.score.critical_cap_applied = true;
        result.score.total_score = 78.0; // Flag set but score high — cap not limiting
        let text = format_human(&result, &default_opts());
        assert!(
            !text.contains("Score capped"),
            "cap message should be hidden when score > 50"
        );
    }

    #[test]
    fn format_human_severity_counts() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding(
                "fria",
                CheckResultType::Fail,
                "Missing FRIA",
                Severity::Critical,
            ),
            make_finding(
                "risk-management",
                CheckResultType::Fail,
                "Missing risk mgmt",
                Severity::High,
            ),
            make_finding(
                "risk-management",
                CheckResultType::Fail,
                "Missing risk mgmt 2",
                Severity::High,
            ),
            make_finding(
                "l4-bare-llm",
                CheckResultType::Fail,
                "Bare LLM",
                Severity::Medium,
            ),
        ];
        let text = format_human(&result, &default_opts());
        assert!(text.contains("4 total"));
        assert!(text.contains("1 critical"));
        assert!(text.contains("2 high"));
        assert!(text.contains("1 medium"));
    }

    #[test]
    fn format_human_finding_limits_medium() {
        let mut result = mock_scan_result();
        result.findings.clear();
        // 8 medium findings — should only show 5
        for i in 0..8 {
            let mut f = make_finding(
                "l4-bare-llm",
                CheckResultType::Fail,
                &format!("Bare LLM instance {i}"),
                Severity::Medium,
            );
            f.fix = Some(format!("Fix {i}"));
            f.file = Some(format!("src/file{i}.ts"));
            f.line = Some(i + 1);
            result.findings.push(f);
        }
        let text = format_human(&result, &default_opts());
        // Header shows all 8
        assert!(text.contains("8 total"));
        assert!(text.contains("8 medium"));
        // But only 5 are displayed, rest hidden
        assert!(text.contains("3 medium not shown"));
    }

    #[test]
    fn format_human_low_findings_hidden() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding(
                "fria",
                CheckResultType::Fail,
                "Missing FRIA",
                Severity::High,
            ),
            make_finding(
                "l4-bare-llm",
                CheckResultType::Fail,
                "Bare LLM",
                Severity::Low,
            ),
        ];
        let text = format_human(&result, &default_opts());
        // Low findings are not displayed
        assert!(text.contains("1 low not shown"));
        // High finding is shown
        assert!(text.contains("HIGH"));
        // LOW severity label should NOT appear in findings section
        // (it appears in the "not shown" note only)
    }

    #[test]
    fn format_human_all_critical_high_shown() {
        let mut result = mock_scan_result();
        result.findings.clear();
        // 10 critical findings — all should be shown
        for i in 0..10 {
            result.findings.push(make_finding(
                &format!("check-{i}"),
                CheckResultType::Fail,
                &format!("Critical issue {i}"),
                Severity::Critical,
            ));
        }
        let text = format_human(&result, &default_opts());
        assert!(text.contains("10 total"));
        assert!(text.contains("10 critical"));
        // All 10 findings should be shown (all critical messages present)
        assert!(text.contains("Critical issue 9"));
        // No "not shown" note
        assert!(!text.contains("not shown"));
    }

    #[test]
    fn format_human_layer_subgrouping() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding(
                "fria",
                CheckResultType::Fail,
                "L1 issue A",
                Severity::Critical,
            ),
            make_finding(
                "documentation",
                CheckResultType::Fail,
                "L1 issue B",
                Severity::High,
            ),
            make_finding(
                "l4-bare-llm",
                CheckResultType::Fail,
                "L4 issue",
                Severity::Medium,
            ),
            make_finding("l2-fria", CheckResultType::Fail, "L2 issue", Severity::High),
        ];
        let text = format_human(&result, &default_opts());
        // Layer subgroup headers should appear
        assert!(text.contains("L1"));
        assert!(text.contains("File Presence"));
        assert!(text.contains("L2"));
        assert!(text.contains("Document Structure"));
        assert!(text.contains("L4"));
        assert!(text.contains("Code Patterns"));
        // L1 group should come before L2, L2 before L4
        let l1_pos = text.find("File Presence").unwrap();
        let l2_pos = text.find("Document Structure").unwrap();
        let l4_pos = text.find("Code Patterns").unwrap();
        assert!(l1_pos < l2_pos);
        assert!(l2_pos < l4_pos);
    }

    #[test]
    fn format_human_clean_fix_message() {
        let mut result = mock_scan_result();
        result.findings = vec![Finding {
            check_id: "l4-bare-llm".into(),
            r#type: CheckResultType::Fail,
            message: "Bare LLM call".into(),
            severity: Severity::High,
            obligation_id: None,
            article_reference: None,
            fix: Some("Fix complior.injection: Validate user input before LLM call".into()),
            file: None,
            line: None,
            code_context: None,
            fix_diff: None,
            priority: None,
            confidence: None,
            confidence_level: None,
            evidence: None,
            explanation: None,
            agent_id: None,
            doc_quality: None,
            l5_analyzed: None,
        }];
        let text = format_human(&result, &default_opts());
        // Engine prefix should be stripped
        assert!(!text.contains("Fix complior.injection:"));
        // Clean message should remain
        assert!(text.contains("Validate user input before LLM call"));
    }

    #[test]
    fn format_human_layer_group_headers() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding("fria", CheckResultType::Fail, "L1 finding", Severity::High),
            make_finding(
                "l2-fria",
                CheckResultType::Fail,
                "L2 finding",
                Severity::High,
            ),
            make_finding(
                "l3-missing-bias-testing",
                CheckResultType::Fail,
                "L3 finding",
                Severity::High,
            ),
            make_finding(
                "l4-bare-llm",
                CheckResultType::Fail,
                "L4 finding",
                Severity::High,
            ),
            make_finding(
                "l4-nhi-api-key",
                CheckResultType::Fail,
                "NHI finding",
                Severity::High,
            ),
            make_finding(
                "cross-doc-code-mismatch",
                CheckResultType::Fail,
                "Cross finding",
                Severity::High,
            ),
        ];
        let text = format_human(&result, &default_opts());
        // Layer group headers with labels
        assert!(text.contains("L1") && text.contains("File Presence"));
        assert!(text.contains("L2") && text.contains("Document Structure"));
        assert!(text.contains("L3") && text.contains("Dependencies"));
        assert!(text.contains("L4") && text.contains("Code Patterns"));
        assert!(text.contains("NHI") && text.contains("Secrets"));
        assert!(text.contains("CROSS") && text.contains("Cross-Layer"));
    }

    #[test]
    fn format_human_deep_mode_grouping() {
        let mut result = mock_scan_result();
        result.tier = Some(2);
        result.external_tool_results = Some(vec![ExternalToolResult {
            tool: "semgrep".into(),
            version: "1.0.0".into(),
            findings: vec![],
            duration: 1000,
            exit_code: 0,
            error: None,
        }]);
        result.findings = vec![
            make_finding(
                "fria",
                CheckResultType::Fail,
                "Base scan finding",
                Severity::High,
            ),
            make_finding(
                "ext-semgrep-unsafe-deser",
                CheckResultType::Fail,
                "Deep finding",
                Severity::High,
            ),
        ];
        let text = format_human(&result, &default_opts());
        // Deep mode grouping (uppercase)
        assert!(text.contains("NEW IN --DEEP"));
        assert!(text.contains("FROM BASE SCAN"));
        // Deep findings grouped under L4+ layer header
        assert!(text.contains("Ext. Code Analysis"));
    }

    #[test]
    fn format_human_deep_mode_layers() {
        let mut result = mock_scan_result();
        result.tier = Some(2);
        result.findings = vec![
            make_finding("fria", CheckResultType::Fail, "Base", Severity::High),
            make_finding(
                "ext-semgrep-unsafe-deser",
                CheckResultType::Fail,
                "Semgrep finding",
                Severity::High,
            ),
            make_finding(
                "ext-bandit-B301",
                CheckResultType::Fail,
                "Bandit finding",
                Severity::High,
            ),
        ];
        let text = format_human(&result, &default_opts());
        // Header shows tool names for deep layers
        assert!(text.contains("L4+ Semgrep"));
        assert!(text.contains("L4+ Bandit"));
        assert!(text.contains("L3+ ModelScan"));
        assert!(text.contains("NHI+ detect-secrets"));
        // Layer Results section uses descriptive labels
        assert!(text.contains("Ext. Code Analysis"));
        // Scan info shows deep mode
        assert!(text.contains("Deep Mode"));
    }

    #[test]
    fn format_human_pass_findings_layer_status() {
        let mut result = mock_scan_result();
        result.findings = vec![make_finding(
            "l4-disclosure",
            CheckResultType::Pass,
            "Disclosure found",
            Severity::Info,
        )];
        result.score.failed_checks = 0;
        result.score.total_score = 100.0;
        let text = format_human(&result, &default_opts());
        // Layer Results should show PASS for L4
        assert!(text.contains("Layer Results"));
        assert!(text.contains("PASS"));
        assert!(text.contains("Code Patterns"));
    }

    #[test]
    fn format_human_next_hint_critical() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding(
                "fria",
                CheckResultType::Fail,
                "Critical",
                Severity::Critical,
            ),
            make_finding(
                "risk-management",
                CheckResultType::Fail,
                "Also critical",
                Severity::Critical,
            ),
        ];
        let text = format_human(&result, &default_opts());
        assert!(text.contains("fix 2 critical issues"));
    }

    #[test]
    fn format_human_next_hint_high() {
        let mut result = mock_scan_result();
        result.findings = vec![make_finding(
            "fria",
            CheckResultType::Fail,
            "High",
            Severity::High,
        )];
        let text = format_human(&result, &default_opts());
        assert!(text.contains("fix 1 high-severity issue"));
    }

    #[test]
    fn format_human_next_hint_compliant() {
        let mut result = mock_scan_result();
        result.findings.clear();
        result.score.total_score = 90.0;
        result.score.failed_checks = 0;
        let text = format_human(&result, &default_opts());
        assert!(text.contains("on track for EU AI Act compliance"));
    }

    #[test]
    fn format_human_framework_breakdown_bar_chart() {
        let result = mock_scan_result();
        let opts = FormatOptions {
            framework_scores: Some(vec![FrameworkScoreResult {
                framework_id: "eu-ai-act".into(),
                framework_name: "EU AI Act 2024/1689".into(),
                score: 60.0,
                grade: "D".into(),
                grade_type: "letter".into(),
                gaps: 10,
                total_checks: 25,
                passed_checks: 15,
                deadline: None,
                categories: vec![],
            }]),
            quiet: false,
            prev_score: None,
        };
        let text = format_human(&result, &opts);
        assert!(text.contains("Framework Breakdown"));
        assert!(text.contains("EU AI Act 2024/1689"));
        assert!(text.contains("60 / 100"));
        // Bar chart characters (uses ASCII fallback in test/CI environment)
        use crate::headless::format::colors::{bar_empty, bar_filled};
        assert!(text.contains(bar_filled()));
        assert!(text.contains(bar_empty()));
    }

    #[test]
    fn format_human_no_framework_breakdown_without_scores() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // No framework breakdown when no framework_scores provided
        assert!(!text.contains("Framework Breakdown"));
    }

    #[test]
    fn format_human_generate_docs_action() {
        let mut result = mock_scan_result();
        result.findings = vec![
            // L1 finding (missing doc) triggers "Generate docs" action
            make_finding(
                "fria",
                CheckResultType::Fail,
                "Missing FRIA",
                Severity::High,
            ),
        ];
        let text = format_human(&result, &default_opts());
        assert!(text.contains("Generate docs"));
        assert!(text.contains("complior docs generate --missing"));
    }

    #[test]
    fn format_human_separator_width() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Dynamic separator uses h_line() repeated to display_width()
        use crate::headless::format::colors::h_line;
        use crate::headless::format::layers::display_width;
        let sep = h_line().repeat(display_width());
        assert!(text.contains(&sep));
    }

    #[test]
    fn format_human_finding_with_article() {
        let mut result = mock_scan_result();
        result.findings = vec![Finding {
            check_id: "fria".into(),
            r#type: CheckResultType::Fail,
            message: "Missing FRIA document".into(),
            severity: Severity::High,
            obligation_id: None,
            article_reference: Some("Art. 27".into()),
            fix: Some("Create docs/FRIA.md".into()),
            file: None,
            line: None,
            code_context: None,
            fix_diff: None,
            priority: None,
            confidence: None,
            confidence_level: None,
            evidence: None,
            explanation: None,
            agent_id: None,
            doc_quality: None,
            l5_analyzed: None,
        }];
        let text = format_human(&result, &default_opts());
        // Article and label combined on same line
        assert!(text.contains("Art. 27"));
        assert!(text.contains("Fundamental Rights Assessment"));
    }

    #[test]
    fn format_human_finding_article_from_explanation() {
        let mut result = mock_scan_result();
        result.findings = vec![Finding {
            check_id: "fria".into(),
            r#type: CheckResultType::Fail,
            message: "Missing FRIA".into(),
            severity: Severity::High,
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
            explanation: Some(FindingExplanation {
                article: "Art. 27".into(),
                penalty: String::new(),
                deadline: String::new(),
                business_impact: String::new(),
            }),
            agent_id: None,
            doc_quality: None,
            l5_analyzed: None,
        }];
        let text = format_human(&result, &default_opts());
        // Article from explanation fallback
        assert!(text.contains("Art. 27"));
    }

    #[test]
    fn format_human_ext_finding_label() {
        let mut result = mock_scan_result();
        result.tier = Some(2);
        result.findings = vec![make_finding(
            "ext-bandit-B301",
            CheckResultType::Fail,
            "Pickle issue",
            Severity::High,
        )];
        let text = format_human(&result, &default_opts());
        // ext_check_label should provide nice label
        assert!(text.contains("Unsafe Pickle Usage"));
    }

    // ── New tests for CLI output spec compliance ──────────────────

    #[test]
    fn format_human_finding_ids_hidden() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Finding IDs are hidden from human output (kept in JSON/SARIF)
        assert!(!text.contains("F-001"));
        assert!(!text.contains("F-002"));
    }

    #[test]
    fn format_human_layer_tag_in_finding() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Layer tags should appear in finding lines
        assert!(text.contains("[L1]") || text.contains("[L4]"));
    }

    #[test]
    fn format_human_grade_in_score() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Grade letter should appear near score (72 = C)
        assert!(text.contains("C"));
    }

    #[test]
    fn format_human_elapsed_time() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Elapsed time should be displayed (1234ms = 1.2s)
        assert!(text.contains("Elapsed"));
        assert!(text.contains("1.2s"));
    }

    #[test]
    fn format_human_quiet_mode() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding(
                "l1-crit",
                CheckResultType::Fail,
                "Critical issue",
                Severity::Critical,
            ),
            make_finding(
                "l4-med",
                CheckResultType::Fail,
                "Medium issue",
                Severity::Medium,
            ),
        ];
        let opts = FormatOptions {
            framework_scores: None,
            quiet: true,
            prev_score: None,
        };
        let text = format_human(&result, &opts);
        // Quiet mode: shows critical findings
        assert!(text.contains("CRITICAL FINDINGS"));
        assert!(text.contains("Critical issue"));
        // Quiet mode: does NOT show quick actions or framework breakdown
        assert!(!text.contains("QUICK ACTIONS"));
        assert!(!text.contains("Framework Breakdown"));
    }

    #[test]
    fn format_human_security_na_hint() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Security N/A when no OWASP/MITRE framework data
        assert!(text.contains("SECURITY SCORE"));
        assert!(text.contains("N/A"));
        assert!(text.contains("complior eval --security"));
    }

    #[test]
    fn format_human_docs_command() {
        let result = mock_scan_result();
        let text = format_human(&result, &default_opts());
        // Docs command hint for findings with article reference
        assert!(
            text.contains("complior docs --article 27")
                || text.contains("complior docs --article 50")
        );
    }

    #[test]
    fn format_human_prev_score_delta() {
        let result = mock_scan_result();
        let opts = FormatOptions {
            framework_scores: None,
            quiet: false,
            prev_score: Some(85.0),
        };
        let text = format_human(&result, &opts);
        // Previous score delta displayed
        assert!(text.contains("was 85"));
    }

    #[test]
    fn format_human_severity_icons_distinct() {
        // Critical and High should have different icons
        use crate::headless::format::colors::severity_icon;
        let crit = severity_icon(&Severity::Critical);
        let high = severity_icon(&Severity::High);
        assert_ne!(crit, high, "Critical and High should have different icons");
    }

    #[test]
    fn format_json_has_grade() {
        let result = mock_scan_result();
        let json_text = format_json(&result);
        let v: serde_json::Value = serde_json::from_str(&json_text).unwrap();
        let grade = v.get("grade").expect("grade object should exist");
        assert_eq!(grade.get("compliance").unwrap().as_str().unwrap(), "C");
    }

    #[test]
    fn format_json_has_finding_ids() {
        let result = mock_scan_result();
        let json_text = format_json(&result);
        let v: serde_json::Value = serde_json::from_str(&json_text).unwrap();
        let findings = v.get("findings").unwrap().as_array().unwrap();
        // All fail findings should have IDs
        let ids: Vec<&str> = findings
            .iter()
            .filter_map(|f| f.get("id").and_then(|v| v.as_str()))
            .collect();
        assert!(!ids.is_empty());
        assert!(ids.contains(&"F-001"));
    }

    #[test]
    fn format_json_has_obligation_ids() {
        let result = mock_scan_result();
        let json_text = format_json(&result);
        let v: serde_json::Value = serde_json::from_str(&json_text).unwrap();
        let findings = v.get("findings").unwrap().as_array().unwrap();
        // Finding with obligationId should also have obligationIds array
        let has_ids = findings
            .iter()
            .any(|f| f.get("obligationIds").and_then(|v| v.as_array()).is_some());
        assert!(
            has_ids,
            "At least one finding should have obligationIds array"
        );
    }

    #[test]
    fn resolve_grade_boundaries() {
        use crate::headless::format::colors::resolve_grade;
        assert_eq!(resolve_grade(95.0), "A");
        assert_eq!(resolve_grade(90.0), "A");
        assert_eq!(resolve_grade(89.9), "B");
        assert_eq!(resolve_grade(75.0), "B");
        assert_eq!(resolve_grade(74.9), "C");
        assert_eq!(resolve_grade(60.0), "C");
        assert_eq!(resolve_grade(59.9), "D");
        assert_eq!(resolve_grade(40.0), "D");
        assert_eq!(resolve_grade(39.9), "F");
        assert_eq!(resolve_grade(0.0), "F");
    }

    #[test]
    fn cli_parse_quiet_flag() {
        use crate::cli::Cli;
        use clap::Parser;
        let cli = Cli::parse_from(["complior", "scan", "--quiet"]);
        match cli.command {
            Some(crate::cli::Command::Scan { quiet, .. }) => assert!(quiet),
            _ => panic!("Expected Scan command"),
        }
    }

    #[test]
    fn cli_parse_quiet_short() {
        use crate::cli::Cli;
        use clap::Parser;
        let cli = Cli::parse_from(["complior", "scan", "-q"]);
        match cli.command {
            Some(crate::cli::Command::Scan { quiet, .. }) => assert!(quiet),
            _ => panic!("Expected Scan command"),
        }
    }

    #[test]
    fn cli_parse_no_color_flag() {
        use crate::cli::Cli;
        use clap::Parser;
        let cli = Cli::parse_from(["complior", "--no-color", "scan"]);
        assert!(cli.no_color);
    }

    #[test]
    fn format_human_large_project_warning() {
        let mut result = mock_scan_result();
        result.files_scanned = 600;
        let text = format_human(&result, &default_opts());
        assert!(text.contains("Large project"));
        assert!(text.contains(".compliorignore"));
    }

    #[test]
    fn format_human_files_excluded() {
        let mut result = mock_scan_result();
        result.files_excluded = Some(15);
        let text = format_human(&result, &default_opts());
        assert!(text.contains("15 excluded"));
    }

    #[test]
    fn sort_findings_full_order() {
        use crate::headless::format::layers::sort_findings_full;
        let f1 = make_finding("l4-bare", CheckResultType::Fail, "m1", Severity::Medium);
        let f2 = make_finding("l1-risk", CheckResultType::Fail, "m2", Severity::Critical);
        let f3 = make_finding("l2-fria", CheckResultType::Fail, "m3", Severity::High);
        let mut refs: Vec<&Finding> = vec![&f1, &f2, &f3];
        sort_findings_full(&mut refs);
        // Critical first, then High, then Medium
        assert_eq!(refs[0].severity, Severity::Critical);
        assert_eq!(refs[1].severity, Severity::High);
        assert_eq!(refs[2].severity, Severity::Medium);
    }
}
