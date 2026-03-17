#[cfg(test)]
mod tests {
    use crate::headless::format::{format_human, format_json, format_sarif, sarif_level};
    use crate::types::{
        CategoryScore, Finding, FindingExplanation, ScanResult, ScoreBreakdown, Severity, Zone,
    };

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
                    r#type: crate::types::CheckResultType::Fail,
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
                },
                Finding {
                    check_id: "l4-bare-llm".into(),
                    r#type: crate::types::CheckResultType::Fail,
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

    fn make_finding(check_id: &str, typ: crate::types::CheckResultType, message: &str, severity: Severity) -> Finding {
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
        assert_eq!(results[0]["ruleId"], "fria");
        assert_eq!(results[0]["level"], "error"); // High = error
        assert_eq!(results[1]["level"], "warning"); // Medium = warning
    }

    #[test]
    fn format_human_output() {
        let result = mock_scan_result();
        let text = format_human(&result);
        // Header shows project name
        assert!(text.contains("Complior — test-project"));
        assert!(text.contains("72/100"));
        assert!(text.contains("yellow"));
        // Severity summary
        assert!(text.contains("Findings:"));
        assert!(text.contains("1 high"));
        assert!(text.contains("1 medium"));
        // Fixable summary
        assert!(text.contains("Fixable:"));
        // Deadline countdown
        assert!(text.contains("EU AI Act enforcement"));
        // Category breakdown
        assert!(text.contains("Transparency"));
        assert!(text.contains("80%"));
        // What's Missing section with split
        assert!(text.contains("What's Missing"));
        assert!(text.contains("Documents needed"));
        assert!(text.contains("Code & config issues"));
        // Severity labels
        assert!(text.contains("HIGH"));
        assert!(text.contains("MEDIUM"));
        // Fix type badges
        assert!(text.contains("[B]"));
        assert!(text.contains("[A]"));
        // Obligation ID
        assert!(text.contains("Obligation: OBL-015"));
        // Fix suggestion inline
        assert!(text.contains("Create docs/FRIA.md"));
        // Fix Roadmap
        assert!(text.contains("Fix Roadmap"));
        assert!(text.contains("score gain"));
        // Next steps
        assert!(text.contains("Next steps:"));
        assert!(text.contains("complior scan --deep"));
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
        assert!(!text.contains("What's Missing"));
    }

    #[test]
    fn format_human_collapses_duplicates() {
        let mut result = mock_scan_result();
        // Add 10 findings with same check_id (type A — code issue)
        result.findings.clear();
        for i in 0..10 {
            result.findings.push(Finding {
                check_id: "l4-bare-llm".into(),
                r#type: crate::types::CheckResultType::Fail,
                message: format!("Instance {i}"),
                severity: Severity::Low,
                obligation_id: None,
                article_reference: None,
                fix: Some(format!("Fix {i}")),
                file: Some(format!("src/file{i}.ts")),
                line: Some(i + 1),
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
        // Auto-fixable count in footer
        assert!(text.contains("auto-fix"));
    }

    #[test]
    fn format_human_critical_cap_warning() {
        let mut result = mock_scan_result();
        result.score.critical_cap_applied = true;
        let text = format_human(&result);
        assert!(text.contains("Score capped"));
        assert!(text.contains("critical violations"));
    }

    #[test]
    fn format_human_explanation_penalty_deadline() {
        let mut result = mock_scan_result();
        result.findings = vec![Finding {
            check_id: "fria".into(),
            r#type: crate::types::CheckResultType::Fail,
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
            explanation: Some(FindingExplanation {
                article: "Art. 27".into(),
                penalty: "€15M or 3% of annual global turnover".into(),
                deadline: "2026-08-02".into(),
                business_impact: "Fundamental rights impact assessment required for high-risk AI. Without a FRIA, deployment may be unlawful.".into(),
            }),
        }];
        let text = format_human(&result);
        // Compact penalty shown
        assert!(text.contains("€15M / 3% turnover"));
        // Deadline formatted
        assert!(text.contains("Aug 2026"));
        // Business impact shown
        assert!(text.contains("Impact: Fundamental rights impact assessment"));
        // Fix suggestion
        assert!(text.contains("-> Create docs/FRIA.md"));
        // Documents needed section
        assert!(text.contains("Documents needed (1)"));
    }

    #[test]
    fn format_human_passed_with_mechanisms() {
        let mut result = mock_scan_result();
        result.findings = vec![Finding {
            check_id: "l4-disclosure".into(),
            r#type: crate::types::CheckResultType::Pass,
            message: "AI disclosure found in src/compliance/disclosure.tsx:3 (Art. 50)".into(),
            severity: Severity::Info,
            obligation_id: None,
            article_reference: Some("Art. 50(1)".into()),
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
        }];
        result.score.failed_checks = 0;
        result.score.passed_checks = 1;
        result.score.total_score = 100.0;
        let text = format_human(&result);
        // What's in Place section
        assert!(text.contains("What's in Place"));
        assert!(text.contains("1 mechanisms"));
        assert!(text.contains("AI Disclosure in Code"));
        assert!(text.contains("src/compliance/disclosure.tsx:3"));
    }

    #[test]
    fn format_human_category_breakdown() {
        let mut result = mock_scan_result();
        result.score.category_scores = vec![
            CategoryScore {
                category: "prohibited_practices".into(),
                weight: 0.2,
                score: 100.0,
                obligation_count: 1,
                passed_count: 1,
            },
            CategoryScore {
                category: "documentation".into(),
                weight: 0.3,
                score: 40.0,
                obligation_count: 5,
                passed_count: 2,
            },
        ];
        let text = format_human(&result);
        assert!(text.contains("Category Breakdown"));
        assert!(text.contains("Prohibited Practices"));
        assert!(text.contains("100%"));
        assert!(text.contains("Documentation"));
        assert!(text.contains("40%"));
        assert!(text.contains("(1/1)"));
        assert!(text.contains("(2/5)"));
    }

    #[test]
    fn sarif_level_mapping() {
        assert_eq!(sarif_level(&Severity::Critical), "error");
        assert_eq!(sarif_level(&Severity::High), "error");
        assert_eq!(sarif_level(&Severity::Medium), "warning");
        assert_eq!(sarif_level(&Severity::Low), "note");
        assert_eq!(sarif_level(&Severity::Info), "note");
    }

    // ── New tests for personalized scan output ──────────────────

    #[test]
    fn project_name_extraction() {
        use crate::headless::format::project_name;
        assert_eq!(project_name("/home/user/projects/acme-ai-support"), "acme-ai-support");
        assert_eq!(project_name("/tmp/test-project"), "test-project");
        assert_eq!(project_name("single"), "single");
        assert_eq!(project_name("/trailing/slash/"), "slash");
    }

    #[test]
    fn parse_sdk_message() {
        use crate::headless::format::parse_sdk;
        let sdk = parse_sdk("AI SDK detected: OpenAI (openai@^4.20.0) in npm").unwrap();
        assert_eq!(sdk.name, "OpenAI");
        assert_eq!(sdk.version, "4.20.0");

        let sdk2 = parse_sdk("AI SDK detected: Anthropic (anthropic@~0.10.0) in npm").unwrap();
        assert_eq!(sdk2.name, "Anthropic");
        assert_eq!(sdk2.version, "0.10.0");

        let sdk3 = parse_sdk("AI SDK detected: Vercel AI SDK (ai@3.0.0) in npm").unwrap();
        assert_eq!(sdk3.name, "Vercel AI SDK");
        assert_eq!(sdk3.version, "3.0.0");

        assert!(parse_sdk("not an sdk message").is_none());
    }

    #[test]
    fn parse_mechanism_location_message() {
        use crate::headless::format::parse_mechanism_location;
        assert_eq!(
            parse_mechanism_location("AI disclosure found in src/compliance/disclosure.tsx:3 (Art. 14)", "l4-disclosure"),
            "src/compliance/disclosure.tsx:3"
        );
        assert_eq!(
            parse_mechanism_location("Kill switch found in src/safety/kill.ts:20", "l4-kill-switch"),
            "src/safety/kill.ts:20"
        );
        assert_eq!(
            parse_mechanism_location("No secrets detected", "l4-nhi-clean"),
            "clean"
        );
        assert_eq!(
            parse_mechanism_location("Something without location marker", "l4-logging"),
            ""
        );
    }

    #[test]
    fn format_human_ai_stack() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding("l3-ai-sdk-detected", crate::types::CheckResultType::Pass,
                "AI SDK detected: OpenAI (openai@^4.20.0) in npm", Severity::Info),
            make_finding("l3-ai-sdk-detected", crate::types::CheckResultType::Pass,
                "AI SDK detected: Anthropic (anthropic@~0.10.0) in npm", Severity::Info),
            make_finding("l3-ai-sdk-detected", crate::types::CheckResultType::Pass,
                "AI SDK detected: Vercel AI SDK (ai@3.0.0) in npm", Severity::Info),
        ];
        let text = format_human(&result);
        assert!(text.contains("Your AI Stack"));
        assert!(text.contains("OpenAI v4.20.0"));
        assert!(text.contains("Anthropic v0.10.0"));
        assert!(text.contains("Vercel AI SDK v3.0.0"));
        assert!(text.contains("42 files scanned"));
    }

    #[test]
    fn format_human_ai_stack_empty() {
        let mut result = mock_scan_result();
        result.findings.clear();
        let text = format_human(&result);
        assert!(text.contains("Your AI Stack"));
        assert!(text.contains("No AI SDKs detected in dependencies"));
    }

    #[test]
    fn format_human_whats_in_place() {
        let mut result = mock_scan_result();
        result.findings = vec![
            {
                let mut f = make_finding("l4-disclosure", crate::types::CheckResultType::Pass,
                    "AI disclosure found in src/compliance/disclosure.tsx:3 (Art. 50)", Severity::Info);
                f.article_reference = Some("Art. 50(1)".into());
                f
            },
            {
                let mut f = make_finding("l4-kill-switch", crate::types::CheckResultType::Pass,
                    "Kill switch found in src/compliance/kill-switch.ts:2 (Art. 14)", Severity::Info);
                f.article_reference = Some("Art. 14".into());
                f
            },
            make_finding("l4-nhi-clean", crate::types::CheckResultType::Pass,
                "No hardcoded secrets detected", Severity::Info),
        ];
        result.score.failed_checks = 0;
        result.score.passed_checks = 3;
        let text = format_human(&result);
        assert!(text.contains("What's in Place"));
        assert!(text.contains("3 mechanisms"));
        assert!(text.contains("AI Disclosure in Code"));
        assert!(text.contains("src/compliance/disclosure.tsx:3"));
        assert!(text.contains("Kill Switch / Feature Flag"));
        assert!(text.contains("src/compliance/kill-switch.ts:2"));
        assert!(text.contains("Secrets Scan"));
        assert!(text.contains("clean"));
    }

    #[test]
    fn format_human_doc_code_split() {
        let mut result = mock_scan_result();
        result.findings = vec![
            // Type B — missing doc
            {
                let mut f = make_finding("fria", crate::types::CheckResultType::Fail,
                    "Missing FRIA", Severity::High);
                f.fix = Some("Create docs/FRIA.md".into());
                f
            },
            // Type B — missing doc
            {
                let mut f = make_finding("art5-screening", crate::types::CheckResultType::Fail,
                    "Missing Art. 5 screening", Severity::High);
                f.fix = Some("Create docs/ART5-SCREENING.md".into());
                f
            },
            // Type A — code issue
            {
                let mut f = make_finding("l4-bare-llm", crate::types::CheckResultType::Fail,
                    "Bare LLM call", Severity::Medium);
                f.fix = Some("Wrap with complior(client)".into());
                f.file = Some("src/chat/anthropic.ts".into());
                f.line = Some(8);
                f
            },
            // Type C — config issue
            {
                let mut f = make_finding("l3-missing-bias-testing", crate::types::CheckResultType::Fail,
                    "No bias testing", Severity::Medium);
                f.fix = Some("Add bias testing framework".into());
                f
            },
        ];
        let text = format_human(&result);
        // Doc/code split
        assert!(text.contains("Documents needed (2)"));
        assert!(text.contains("Code & config issues (2)"));
        // Check order: docs first, then code
        let docs_pos = text.find("Documents needed").unwrap();
        let code_pos = text.find("Code & config issues").unwrap();
        assert!(docs_pos < code_pos);
    }

    #[test]
    fn compact_penalty_helper() {
        use crate::headless::format::compact_penalty;
        assert_eq!(
            compact_penalty("€15M or 3% of annual global turnover"),
            "€15M / 3% turnover"
        );
        assert_eq!(
            compact_penalty("€35M or 7% of annual global turnover"),
            "€35M / 7% turnover"
        );
        // Pass-through for non-standard format
        assert_eq!(compact_penalty("€10M fine"), "€10M fine");
    }

    // ── Tests for enhanced scan output (severity summary, roadmap, deep hint) ──

    #[test]
    fn format_human_severity_summary() {
        let mut result = mock_scan_result();
        result.findings = vec![
            make_finding("fria", crate::types::CheckResultType::Fail, "Missing FRIA", Severity::Critical),
            make_finding("risk-management", crate::types::CheckResultType::Fail, "Missing risk mgmt", Severity::High),
            make_finding("risk-management", crate::types::CheckResultType::Fail, "Missing risk mgmt 2", Severity::High),
            {
                let mut f = make_finding("l4-bare-llm", crate::types::CheckResultType::Fail, "Bare LLM", Severity::Medium);
                f.fix = Some("Wrap it".into());
                f
            },
        ];
        let text = format_human(&result);
        assert!(text.contains("1 critical"));
        assert!(text.contains("2 high"));
        assert!(text.contains("1 medium"));
        // Fixable breakdown
        assert!(text.contains("0 auto-fixable"));
        assert!(text.contains("1 with suggestions"));
        assert!(text.contains("3 manual"));
    }

    #[test]
    fn format_human_fix_roadmap() {
        let mut result = mock_scan_result();
        result.findings = vec![
            {
                let mut f = make_finding("fria", crate::types::CheckResultType::Fail, "Missing FRIA", Severity::High);
                f.fix = Some("Create docs/FRIA.md".into());
                f
            },
            {
                let mut f = make_finding("l4-bare-llm", crate::types::CheckResultType::Fail, "Bare LLM", Severity::Medium);
                f.fix = Some("Wrap with complior()".into());
                f.file = Some("src/chat.ts".into());
                f.line = Some(10);
                f
            },
        ];
        let text = format_human(&result);
        // Fix Roadmap section
        assert!(text.contains("Fix Roadmap"));
        assert!(text.contains("by score impact"));
        // High severity = +5 points
        assert!(text.contains("+5"));
        // Medium severity = +3 points
        assert!(text.contains("+3"));
        // Estimated total
        assert!(text.contains("Est. score gain: +8 points"));
    }

    #[test]
    fn format_human_fix_roadmap_with_auto_fix() {
        let mut result = mock_scan_result();
        result.findings = vec![{
            let mut f = make_finding("l4-bare-llm", crate::types::CheckResultType::Fail, "Bare LLM", Severity::Medium);
            f.fix = Some("Wrap with complior()".into());
            f.fix_diff = Some(crate::types::FixDiff {
                before: vec!["old code".into()],
                after: vec!["new code".into()],
                start_line: 10,
                file_path: "src/chat.ts".into(),
                import_line: None,
            });
            f
        }];
        let text = format_human(&result);
        // Auto-fix indicator in roadmap
        assert!(text.contains("[auto]"));
        // Auto-fix indicator in finding (=> instead of ->)
        assert!(text.contains("=> Wrap with complior()"));
    }

    #[test]
    fn format_human_deep_scan_hint_absent_when_deep() {
        let mut result = mock_scan_result();
        result.deep_analysis = Some(true);
        let text = format_human(&result);
        // Should NOT suggest --deep when already deep
        assert!(!text.contains("complior scan --deep"));
    }

    #[test]
    fn format_human_deep_scan_hint_present_when_shallow() {
        let result = mock_scan_result();
        // deep_analysis is None by default
        let text = format_human(&result);
        assert!(text.contains("complior scan --deep"));
    }

    #[test]
    fn format_human_fix_type_badges() {
        let mut result = mock_scan_result();
        result.findings = vec![
            // Type B — missing doc
            make_finding("fria", crate::types::CheckResultType::Fail, "Missing FRIA", Severity::High),
            // Type A — code issue
            {
                let mut f = make_finding("l4-bare-llm", crate::types::CheckResultType::Fail, "Bare LLM", Severity::Medium);
                f.file = Some("src/chat.ts".into());
                f
            },
            // Type C — config issue
            make_finding("l3-missing-bias-testing", crate::types::CheckResultType::Fail, "No bias testing", Severity::Medium),
        ];
        let text = format_human(&result);
        assert!(text.contains("[B]"));  // Missing doc
        assert!(text.contains("[A]"));  // Code fix
        assert!(text.contains("[C]"));  // Config change
    }

    #[test]
    fn format_human_obligation_id_shown() {
        let mut result = mock_scan_result();
        result.findings = vec![{
            let mut f = make_finding("fria", crate::types::CheckResultType::Fail, "Missing FRIA", Severity::High);
            f.obligation_id = Some("OBL-015".into());
            f
        }];
        let text = format_human(&result);
        assert!(text.contains("Obligation: OBL-015"));
    }

    #[test]
    fn format_human_next_steps_section() {
        let mut result = mock_scan_result();
        result.findings = vec![{
            let mut f = make_finding("fria", crate::types::CheckResultType::Fail, "Missing FRIA", Severity::High);
            f.fix = Some("Create docs/FRIA.md".into());
            f
        }];
        let text = format_human(&result);
        assert!(text.contains("Next steps:"));
        assert!(text.contains("complior fix"));
        assert!(text.contains("complior scan --json"));
    }
}
