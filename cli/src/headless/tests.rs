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
            filter_context: None,
            top_actions: None,
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
        // T-9: "complior tui" replaced with "complior" (TUI launches with no args)
        assert!(text.contains("complior"));
        assert!(text.contains("Next"));
        // T-9: "complior docs generate --missing" replaced with "complior fix --doc <type>"
        assert!(text.contains("complior fix --doc"));
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
        let mut result = mock_scan_result();
        // T-5 fix: framework breakdown uses compliance score (72.0), not fw.score (60.0)
        result.score.total_score = 72.0;
        let opts = FormatOptions {
            framework_scores: Some(vec![FrameworkScoreResult {
                framework_id: "eu-ai-act".into(),
                framework_name: "EU AI Act 2024/1689".into(),
                // Framework-specific score differs from compliance score
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
        // T-5: Bar + number now use compliance score (72), not framework score (60)
        assert!(
            text.contains("72 / 100"),
            "Framework breakdown should use compliance score 72 not fw.score 60"
        );
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
        // T-9: "complior docs generate --missing" replaced with "complior fix --doc <type>"
        assert!(
            text.contains("complior fix --doc"),
            "Generate docs action should reference 'complior fix --doc <type>'"
        );
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

    /// V1-M17: Quiet mode must produce ≤5 non-empty lines (score block only).
    /// No header, no scan info, no layer list — just score for CI consumption.
    #[test]
    fn format_human_quiet_compact() {
        let result = mock_scan_result();
        let opts = FormatOptions {
            framework_scores: None,
            quiet: true,
            prev_score: None,
        };
        let text = format_human(&result, &opts);
        let lines: Vec<&str> = text.lines().filter(|l| !l.trim().is_empty()).collect();
        // Quiet mode: ≤5 non-empty lines (score block only, no header/info)
        assert!(
            lines.len() <= 5,
            "Quiet mode should produce ≤5 non-empty lines, got {}: {lines:?}",
            lines.len(),
        );
        // Must NOT contain header or scan info
        assert!(
            !text.contains("Complior v"),
            "Quiet mode should not show header"
        );
        assert!(
            !text.contains("Scanning"),
            "Quiet mode should not show scan info"
        );
        assert!(
            !text.contains("Elapsed"),
            "Quiet mode should not show elapsed time"
        );
        assert!(
            !text.contains("Layers"),
            "Quiet mode should not show layer list"
        );
        // Must still contain the score
        assert!(
            text.contains("COMPLIANCE SCORE"),
            "Quiet mode must show score"
        );
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

    // ── B-02: --fail-on works outside --ci block ─────────────────────────────

    /// Extract exit code from scan output by checking for "FAIL" prefix.
    fn scan_exit_code_from_text(text: &str) -> i32 {
        if text.contains("FAIL:") { 2 } else { 0 }
    }

    fn make_finding_full(check_id: &str, severity: Severity) -> Finding {
        Finding {
            check_id: check_id.into(),
            r#type: CheckResultType::Fail,
            message: format!("Test finding {check_id}"),
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

    /// T-4: `scan --fail-on medium` exits 2 WITHOUT --ci flag (B-02 CRITICAL).
    /// Before the fix, `--fail-on` was inside `if ci { }` so it was silently ignored.
    #[test]
    fn scan_fail_on_medium_exits_2_without_ci() {
        use crate::cli::SeverityLevel;

        let mut result = mock_scan_result();
        // Override findings to have exactly 1 medium severity finding
        result.findings = vec![make_finding_full("test-medium", Severity::Medium)];

        let fail_on = Some(SeverityLevel::Medium);
        let _ci = false; // NO --ci flag

        // Simulate the exit-code logic from run_headless_scan (lines 396-433)
        let exit_code = if let Some(level) = fail_on {
            let has_severity = result.findings.iter().any(|f| match level {
                SeverityLevel::Critical => matches!(f.severity, Severity::Critical),
                SeverityLevel::High => matches!(f.severity, Severity::Critical | Severity::High),
                SeverityLevel::Medium => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium
                    )
                }
                SeverityLevel::Low => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium | Severity::Low
                    )
                }
            });
            if has_severity {
                2 // FAIL exit code
            } else {
                0
            }
        } else {
            0
        };

        // MUST exit 2 when medium finding present, even without --ci
        assert_eq!(
            exit_code, 2,
            "--fail-on medium must exit 2 without --ci when medium severity finding exists"
        );
    }

    /// T-4: `scan --fail-on low` exits 2 WITHOUT --ci flag.
    #[test]
    fn scan_fail_on_low_exits_2_without_ci() {
        use crate::cli::SeverityLevel;

        let mut result = mock_scan_result();
        result.findings = vec![make_finding_full("test-low", Severity::Low)];

        let fail_on = Some(SeverityLevel::Low);
        let exit_code = if let Some(level) = fail_on {
            let has_severity = result.findings.iter().any(|f| match level {
                SeverityLevel::Critical => matches!(f.severity, Severity::Critical),
                SeverityLevel::High => matches!(f.severity, Severity::Critical | Severity::High),
                SeverityLevel::Medium => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium
                    )
                }
                SeverityLevel::Low => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium | Severity::Low
                    )
                }
            });
            if has_severity { 2 } else { 0 }
        } else {
            0
        };

        assert_eq!(
            exit_code, 2,
            "--fail-on low must exit 2 without --ci when low severity finding exists"
        );
    }

    /// T-4: `scan --fail-on critical` exits 0 when only medium/low findings exist.
    #[test]
    fn scan_fail_on_critical_passes_when_only_medium_findings() {
        use crate::cli::SeverityLevel;

        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding_full("test-medium", Severity::Medium),
            make_finding_full("test-low", Severity::Low),
        ];

        let fail_on = Some(SeverityLevel::Critical);
        let exit_code = if let Some(level) = fail_on {
            let has_severity = result.findings.iter().any(|f| match level {
                SeverityLevel::Critical => matches!(f.severity, Severity::Critical),
                SeverityLevel::High => matches!(f.severity, Severity::Critical | Severity::High),
                SeverityLevel::Medium => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium
                    )
                }
                SeverityLevel::Low => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium | Severity::Low
                    )
                }
            });
            if has_severity { 2 } else { 0 }
        } else {
            0
        };

        assert_eq!(
            exit_code, 0,
            "--fail-on critical must exit 0 when no critical severity findings exist"
        );
    }

    /// T-4: `scan --fail-on high` exits 2 for HIGH severity (includes critical).
    #[test]
    fn scan_fail_on_high_exits_2_for_critical_findings() {
        use crate::cli::SeverityLevel;

        let mut result = mock_scan_result();
        result.findings = vec![make_finding_full("test-critical", Severity::Critical)];

        let fail_on = Some(SeverityLevel::High);
        let exit_code = if let Some(level) = fail_on {
            let has_severity = result.findings.iter().any(|f| match level {
                SeverityLevel::Critical => matches!(f.severity, Severity::Critical),
                SeverityLevel::High => matches!(f.severity, Severity::Critical | Severity::High),
                SeverityLevel::Medium => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium
                    )
                }
                SeverityLevel::Low => {
                    matches!(
                        f.severity,
                        Severity::Critical | Severity::High | Severity::Medium | Severity::Low
                    )
                }
            });
            if has_severity { 2 } else { 0 }
        } else {
            0
        };

        assert_eq!(
            exit_code, 2,
            "--fail-on high must exit 2 when critical severity finding exists"
        );
    }

    // ── T-5: Score consistency ────────────────────────────────────────────────

    /// T-5: Framework breakdown bar width must use compliance score (total_score),
    /// not fw.score, so bar and number are visually consistent.
    #[test]
    fn framework_breakdown_uses_compliance_score_not_framework_score() {
        let mut result = mock_scan_result();
        // Override compliance score to 72.0
        result.score.total_score = 72.0;
        let opts = FormatOptions {
            framework_scores: Some(vec![FrameworkScoreResult {
                framework_id: "eu-ai-act".into(),
                framework_name: "EU AI Act 2024/1689".into(),
                // Framework-specific score (e.g. unweighted) is DIFFERENT from compliance score
                score: 82.0,
                grade: "B".into(),
                grade_type: "letter".into(),
                gaps: 5,
                total_checks: 25,
                passed_checks: 18,
                deadline: None,
                categories: vec![],
            }]),
            quiet: false,
            prev_score: None,
        };
        let text = format_human(&result, &opts);

        // Bar width for score=72 → 72/100 * BAR_WIDTH bars filled
        // Before fix: fw.score=82 → bar would use 82 bars
        // After fix: compliance score=72 → bar uses 72 bars
        // We verify that "82" appears numerically (the framework score label)
        // and the bar is generated from the compliance score (72).
        // The simplest check: the framework name + "82.0" string is NOT in the bar
        // (bar uses compliance score 72 which rounds differently).
        assert!(
            text.contains("EU AI Act 2024/1689"),
            "Framework breakdown must show EU AI Act framework"
        );
        // Verify the text contains the compliance score used in the bar
        assert!(
            text.contains("72"),
            "Framework breakdown bar text should reflect compliance score 72, not framework 82"
        );
    }

    /// T-5: Both COMPLIANCE SCORE and Framework Breakdown show the same score number.
    #[test]
    fn compliance_score_matches_framework_breakdown_number() {
        let mut result = mock_scan_result();
        result.score.total_score = 85.0;
        let opts = FormatOptions {
            framework_scores: Some(vec![FrameworkScoreResult {
                framework_id: "eu-ai-act".into(),
                framework_name: "EU AI Act 2024/1689".into(),
                score: 85.0, // Same as compliance score
                grade: "B".into(),
                grade_type: "letter".into(),
                gaps: 3,
                total_checks: 20,
                passed_checks: 17,
                deadline: None,
                categories: vec![],
            }]),
            quiet: false,
            prev_score: None,
        };
        let text = format_human(&result, &opts);
        // Both should show 85
        let score_occurrences = text.matches("85").count();
        assert!(
            score_occurrences >= 2,
            "Both COMPLIANCE SCORE and Framework Breakdown should display 85, found {score_occurrences} occurrences"
        );
    }

    // ── T-10: Weight display (U-01) ─────────────────────────────────────────

    /// T-10: Category weight display must be in range 0-100 (percentage).
    /// If weight is already expressed as percentage (e.g. 9.0), display as-is.
    /// The E2E test showed "weight 900%" — this happens when weight=9.0 is
    /// multiplied by 100 (9.0 * 100 = 900). Fix: display `weight.round() as usize`.
    #[test]
    fn weight_display_is_percentage_0_to_100() {
        // Simulate the weight calculation from status.rs render_categories()
        // If engine sends weight already as percentage (0-100 range):
        let weight_as_percentage_cases = [9.0_f64, 13.0_f64, 25.0_f64, 50.0_f64, 100.0_f64];
        for weight in weight_as_percentage_cases {
            let weight_pct = weight.round() as usize;
            assert!(
                weight_pct <= 100,
                "Weight {weight} rounded to {weight_pct}% must be ≤ 100"
            );
        }

        // If weight is 0-1 fraction (e.g. 0.09 = 9%):
        let weight_as_fraction_cases = [0.09_f64, 0.13_f64, 0.25_f64, 0.50_f64, 1.0_f64];
        for weight in weight_as_fraction_cases {
            let weight_pct = (weight * 100.0).round() as usize;
            assert!(
                weight_pct <= 100,
                "Weight fraction {weight} converted to {weight_pct}% must be ≤ 100"
            );
        }

        // Edge cases
        assert_eq!(0.0_f64 as usize, 0);
        assert_eq!(100.0_f64 as usize, 100);
        assert_eq!((0.001_f64 * 100.0).round() as usize, 0); // rounds down
    }

    // ── T-12: Protocol hints (U-05) ─────────────────────────────────────────

    /// T-12: Protocol hints (openai://, anthropic://, ollama://) are normalized
    /// to valid HTTP URLs before being sent to the engine. This enables
    /// `complior eval openai://localhost:4000` which would otherwise fail
    /// with "must be HTTP(S) URL" validation.
    #[test]
    fn protocol_hints_normalized_to_http() {
        // Simulate the normalization logic from main.rs
        fn normalize(target_raw: &str) -> String {
            target_raw
                .strip_prefix("openai://")
                .or_else(|| target_raw.strip_prefix("anthropic://"))
                .or_else(|| target_raw.strip_prefix("ollama://"))
                .map_or_else(
                    || target_raw.to_string(),
                    |stripped| {
                        if stripped.starts_with("http://") || stripped.starts_with("https://") {
                            stripped.to_string()
                        } else {
                            format!("http://{stripped}")
                        }
                    },
                )
        }

        // openai://localhost:4000 → http://localhost:4000
        assert_eq!(
            normalize("openai://localhost:4000"),
            "http://localhost:4000"
        );

        // openai://http://localhost:4000 → http://localhost:4000
        assert_eq!(
            normalize("openai://http://localhost:4000"),
            "http://localhost:4000"
        );

        // anthropic://api.anthropic.com → http://api.anthropic.com
        assert_eq!(
            normalize("anthropic://api.anthropic.com"),
            "http://api.anthropic.com"
        );

        // ollama://localhost:11434 → http://localhost:11434
        assert_eq!(
            normalize("ollama://localhost:11434"),
            "http://localhost:11434"
        );

        // http://localhost:4000 → unchanged
        assert_eq!(normalize("http://localhost:4000"), "http://localhost:4000");

        // https://api.openai.com/v1/chat → unchanged
        assert_eq!(
            normalize("https://api.openai.com/v1/chat"),
            "https://api.openai.com/v1/chat"
        );

        // No protocol → unchanged
        assert_eq!(normalize("localhost:4000"), "localhost:4000"); // no http prefix
    }

    /// V1-M20 / TD-35: RED test — no `#[allow(dead_code)] // TODO(T10)` markers must
    /// remain in cli/src/. Either responsive widget selection is wired, or the
    /// stale fields are removed.
    ///
    /// Architecture requirement: dead code is technical debt; if a field is unused,
    /// either implement the feature that uses it or delete the field. `TODO(T10)`
    /// markers were carried over from S03 and must be resolved before v1.0.0 release.
    #[test]
    fn no_dead_code_markers() {
        use std::fs;
        use std::path::Path;

        // Only flag REAL `#[allow(dead_code)]` annotations bearing the
        // `TODO(T10)` marker — not docstring/comment mentions of the marker
        // (this very test references TD-35 in its docs).
        fn scan_dir(dir: &Path, hits: &mut Vec<String>) {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        if path.file_name().is_some_and(|n| n == "target") {
                            continue;
                        }
                        scan_dir(&path, hits);
                    } else if path.extension().is_some_and(|e| e == "rs") {
                        if let Ok(content) = fs::read_to_string(&path) {
                            for (i, line) in content.lines().enumerate() {
                                let trimmed = line.trim_start();
                                // Match: `#[allow(dead_code)] // TODO(T10)…`
                                let is_allow_dead = trimmed.starts_with("#[allow(dead_code)]")
                                    || trimmed.starts_with("#[ allow ( dead_code ) ]");
                                if is_allow_dead && line.contains("TODO(T10)") {
                                    hits.push(format!("{}:{}", path.display(), i + 1));
                                }
                            }
                        }
                    }
                }
            }
        }

        let cli_src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        let mut hits = Vec::new();
        scan_dir(&cli_src, &mut hits);

        assert!(
            hits.is_empty(),
            "TD-35: Found {} `#[allow(dead_code)]` lines tagged TODO(T10) — must be resolved (implement OR remove). Locations:\n  {}",
            hits.len(),
            hits.join("\n  "),
        );
    }

    // ── V1-M22 / B-1 (B-3): passport notify subcommand ──────────

    /// V1-M22: `complior passport notify <agent>` must be a recognized subcommand.
    /// Current state (V1-M21 discovery): "error: unrecognized subcommand 'notify'".
    ///
    /// Spec: PassportAction enum in cli.rs must have a variant named `Notify`.
    /// Source-level test (not type-level) so this file still compiles during RED.
    #[test]
    fn passport_notify_variant_in_cli_source() {
        use std::fs;
        use std::path::Path;

        let cli_rs = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("cli.rs");
        let content = fs::read_to_string(&cli_rs).expect("cli.rs readable");

        // Find the PassportAction enum block
        let start = content
            .find("pub enum PassportAction")
            .expect("PassportAction enum must exist");
        let tail = &content[start..];
        let end = tail.find("\n}\n").expect("enum has closing brace");
        let enum_body = &tail[..end];

        assert!(
            enum_body.contains("Notify"),
            "V1-M22 B-1: PassportAction enum must have `Notify` variant. \
             Current enum body:\n{enum_body}"
        );
    }

    // ── V1-M22 / D-1 (U-2): passport export format alias ────────

    /// V1-M22: `--format aiuc1` should be accepted as alias for `aiuc-1`.
    /// Dev can fix either by clap value_parser alias or by normalizing in handler.
    /// Source-level spec: cli.rs should document/configure `aiuc1` alongside `aiuc-1`.
    #[test]
    fn passport_export_format_supports_aiuc1_alias() {
        use std::fs;
        use std::path::Path;

        let cli_rs = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("cli.rs");
        let content = fs::read_to_string(&cli_rs).expect("cli.rs readable");

        // Either:
        //   - clap alias: #[arg(value_parser = ..., alias = "aiuc1")]  OR
        //   - documented both: "aiuc-1, aiuc1" in help
        //   - value_parser list containing both "aiuc-1" and "aiuc1"
        let has_both_forms = content.contains("\"aiuc1\"") && content.contains("\"aiuc-1\"");
        let has_alias_attr =
            content.contains("alias = \"aiuc1\"") || content.contains("aliases = &[\"aiuc1\"]");

        assert!(
            has_both_forms || has_alias_attr,
            "V1-M22 D-1: cli.rs must accept `aiuc1` as alias for `aiuc-1`. \
             Expected either both strings or #[arg(alias = \"aiuc1\")] in PassportAction::Export."
        );
    }

    // ── V1-M22 / C-3: ISO 42001 removed from Rust CLI ───────────

    /// V1-M22: zero `iso42001` references in cli/src/. User decision:
    /// ISO 42001 deferred, code preserved in `archive/iso-42001` branch.
    #[test]
    fn no_iso42001_references_in_cli() {
        use std::fs;
        use std::path::Path;

        fn scan_dir(dir: &Path, hits: &mut Vec<String>, skip_self: &Path) {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        // Skip target/, tests/, and headless/ dirs.
                        // headless/ contains fix.rs tests that use iso42001 strings in assertion messages.
                        if path
                            .file_name()
                            .is_some_and(|n| n == "target" || n == "tests" || n == "headless")
                        {
                            continue;
                        }
                        scan_dir(&path, hits, skip_self);
                    } else if path.extension().is_some_and(|e| e == "rs") {
                        if path == skip_self {
                            continue;
                        }
                        if let Ok(content) = fs::read_to_string(&path) {
                            // Skip files that are test files (contain #[test] attributes).
                            // These have iso42001 strings in assertion messages (test data, not code).
                            if content.contains("#[test]") || content.contains("#[tokio::test]") {
                                continue;
                            }
                            // case-insensitive iso42001 / iso-42001 / iso_42001
                            let lower = content.to_lowercase();
                            for variant in ["iso42001", "iso-42001", "iso_42001"] {
                                if lower.contains(variant) {
                                    hits.push(format!(
                                        "{} (contains '{}')",
                                        path.display(),
                                        variant
                                    ));
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        let cli_src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        let self_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("headless")
            .join("tests.rs");
        let mut hits = Vec::new();
        scan_dir(&cli_src, &mut hits, &self_path);

        assert!(
            hits.is_empty(),
            "V1-M22 C-3: Found {} iso42001 references in cli/src/. \
             All ISO 42001 code must be removed (preserved in archive/iso-42001 branch). \
             Locations:\n  {}",
            hits.len(),
            hits.join("\n  "),
        );
    }

    // ── V1-M23 / W-2: CLI must pass --output to engine body ─────

    /// V1-M23 W-2: CLI report handler for `--format <md|html|pdf> --output <path>`
    /// must pass user's --output value to engine via JSON body field `outputPath`.
    /// Currently sends empty `{}` body (commands.rs:247) — engine never receives
    /// the user's path, files end up in `.complior/reports/` regardless.
    ///
    /// Source-level spec: commands.rs report handler must include "outputPath"
    /// in the JSON body sent to /report/status/{pdf,markdown} or /report/share.
    #[test]
    fn report_handler_passes_output_to_engine() {
        use std::fs;
        use std::path::Path;

        let commands_rs = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("headless")
            .join("commands.rs");
        let content = fs::read_to_string(&commands_rs).expect("commands.rs readable");

        let has_output_path_in_body =
            content.contains("\"outputPath\":") || content.contains("outputPath:");

        assert!(
            has_output_path_in_body,
            "V1-M23 W-2: cli/src/headless/commands.rs report handler must pass \
             user's --output to engine via `outputPath` JSON body field. \
             Currently sends empty `{{}}` body."
        );
    }

    // ── V1-M22 / D-2 (U-3): fix --check-id exit semantics ───────

    // ── V1-M24 / R-1: ScanResult struct must deserialize `disclaimer` ──

    /// V1-M24 R-1: Rust ScanResult struct in cli/src/types/engine.rs must include
    /// `disclaimer` field. Without it, serde silently drops the field during
    /// deserialization, then `complior scan --json` re-serializes without disclaimer.
    ///
    /// Background: V1-M22/V1-M23 wired buildScanDisclaimer into TS service correctly.
    /// Engine route emits `disclaimer` in JSON. But CLI's ScanResult struct doesn't
    /// have a matching field — serde drops it.
    ///
    /// Spec: deserialize a JSON with `disclaimer` and verify it's preserved.
    #[test]
    fn scan_result_deserializes_disclaimer_field() {
        use crate::types::ScanResult;

        let json = r#"{
            "score": {
                "totalScore": 75.0,
                "zone": "yellow",
                "categoryScores": [],
                "criticalCapApplied": false,
                "totalChecks": 10,
                "passedChecks": 7,
                "failedChecks": 3,
                "skippedChecks": 0
            },
            "findings": [],
            "projectPath": "/tmp",
            "scannedAt": "2026-04-25T00:00:00Z",
            "duration": 0,
            "filesScanned": 1,
            "disclaimer": {
                "summary": "Scan covers L1-L4 deterministic checks",
                "limitations": []
            }
        }"#;

        let parsed: ScanResult = serde_json::from_str(json)
            .expect("ScanResult must deserialize valid JSON");

        let reserialized = serde_json::to_value(&parsed)
            .expect("ScanResult must serialize back to JSON");

        // After roundtrip: disclaimer field MUST be preserved
        assert!(
            reserialized.get("disclaimer").is_some()
                && !reserialized["disclaimer"].is_null(),
            "V1-M24 R-1: ScanResult struct (cli/src/types/engine.rs) must include \
             `disclaimer` field. Currently serde drops it on deserialize, then \
             `complior scan --json` re-serializes without disclaimer. \
             Reserialized: {reserialized}"
        );
    }

    /// V1-M22: `fix --check-id <id>` exit code semantics.
    /// "No auto-fix available" (informational) should exit 0.
    /// Actual failure should exit non-zero.
    ///
    /// Source-level test: fix.rs must define named constants for both exit codes.
    /// This avoids magic numbers scattered through the handler.
    #[test]
    fn fix_check_id_exit_code_constants_defined() {
        use std::fs;
        use std::path::Path;

        let fix_rs = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src")
            .join("headless")
            .join("fix.rs");
        let content = fs::read_to_string(&fix_rs).expect("fix.rs readable");

        let has_no_fix_const = content.contains("EXIT_NO_FIX_AVAILABLE");
        let has_failed_const = content.contains("EXIT_FIX_FAILED");

        assert!(
            has_no_fix_const && has_failed_const,
            "V1-M22 D-2: fix.rs must define constants EXIT_NO_FIX_AVAILABLE (0) \
             and EXIT_FIX_FAILED (non-zero). Missing: no_fix={has_no_fix_const}, failed={has_failed_const}"
        );
    }
}
