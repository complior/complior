#[cfg(test)]
mod tests {
    use crate::views::scan::*;
    use crate::views::scan::explain::explain_check;
    use crate::views::scan::render::owl_position;

    #[test]
    fn test_findings_filter_all() {
        use crate::types::Severity;
        let filter = FindingsFilter::All;
        assert!(filter.matches(Severity::Critical));
        assert!(filter.matches(Severity::High));
        assert!(filter.matches(Severity::Medium));
        assert!(filter.matches(Severity::Low));
        assert!(filter.matches(Severity::Info));
    }

    #[test]
    fn test_findings_filter_critical() {
        use crate::types::Severity;
        let filter = FindingsFilter::Critical;
        assert!(filter.matches(Severity::Critical));
        assert!(!filter.matches(Severity::High));
        assert!(!filter.matches(Severity::Medium));
        assert!(!filter.matches(Severity::Low));
        assert!(!filter.matches(Severity::Info));
    }

    #[test]
    fn test_findings_filter_from_key() {
        assert_eq!(FindingsFilter::from_key('c'), Some(FindingsFilter::Critical));
        assert_eq!(FindingsFilter::from_key('a'), Some(FindingsFilter::All));
        assert_eq!(FindingsFilter::from_key('h'), Some(FindingsFilter::High));
        assert_eq!(FindingsFilter::from_key('m'), Some(FindingsFilter::Medium));
        assert_eq!(FindingsFilter::from_key('l'), Some(FindingsFilter::Low));
        assert_eq!(FindingsFilter::from_key('x'), None);
    }

    #[test]
    fn test_layer_progress_default() {
        let state = ScanViewState::default();
        assert_eq!(state.layer_progress.len(), 5);
        for layer in &state.layer_progress {
            assert_eq!(layer.status, LayerStatus::Waiting);
        }
        assert!(!state.scanning);
        assert!(!state.detail_open);
    }

    #[test]
    fn t902_puzzle_header_all_locked() {
        let state = ScanViewState::default();
        // All waiting -- owl should be at position 0
        let pos = owl_position(&state.layer_progress);
        assert_eq!(pos, 0);
        for layer in &state.layer_progress {
            assert_eq!(layer.status, LayerStatus::Waiting);
        }
    }

    #[test]
    fn t902_puzzle_header_partial() {
        let mut state = ScanViewState::default();
        state.layer_progress[0].status = LayerStatus::Complete;
        state.layer_progress[1].status = LayerStatus::Complete;
        state.layer_progress[2].status = LayerStatus::Running;
        state.layer_progress[2].current = 3;
        state.layer_progress[2].total = 5;
        let pos = owl_position(&state.layer_progress);
        assert_eq!(pos, 2); // Owl at L3
    }

    #[test]
    fn t902_owl_position_running() {
        let mut state = ScanViewState::default();
        state.layer_progress[3].status = LayerStatus::Running;
        let pos = owl_position(&state.layer_progress);
        assert_eq!(pos, 3); // Owl at L4
    }

    #[test]
    fn test_explain_check_strips_layer_prefix() {
        // Bare key works
        let (desc, _, _) = explain_check("declaration-conformity");
        assert!(desc.contains("Declaration of Conformity"), "bare key should match");

        // With l2- prefix works
        let (desc2, _, _) = explain_check("l2-declaration-conformity");
        assert!(desc2.contains("Declaration of Conformity"), "l2- prefix should be stripped");

        // With l4- prefix works for pattern-based
        let (desc3, _, _) = explain_check("l4-bare-openai");
        assert!(desc3.contains("Bare API Call"), "l4- prefix should be stripped");

        // cross- prefix
        let (desc4, _, _) = explain_check("cross-doc-code-mismatch");
        assert!(desc4.contains("Documentation claims"), "cross- prefix should be stripped");

        // Unknown falls to default
        let (desc5, _, _) = explain_check("l2-unknown-check-xyz");
        assert!(desc5.contains("Compliance check"), "unknown should get default");
    }

    fn render_scan_to_string(app: &crate::app::App, width: u16, height: u16) -> String {
        let backend = ratatui::backend::TestBackend::new(width, height);
        let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
        terminal
            .draw(|frame| render_scan_view(frame, frame.area(), app))
            .expect("render");
        let buf = terminal.backend().buffer().clone();
        let mut output = String::new();
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                output.push_str(buf[(x, y)].symbol());
            }
            output.push('\n');
        }
        output
    }

    #[test]
    fn snapshot_scan_no_results() {
        crate::theme::init_theme("dark");
        let app = crate::app::App::new(crate::config::TuiConfig::default());
        let buf = render_scan_to_string(&app, 80, 24);
        insta::assert_snapshot!(buf);
    }

    #[test]
    fn test_scan_view_no_results() {
        crate::theme::init_theme("dark");
        let backend = ratatui::backend::TestBackend::new(80, 24);
        let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
        let app = crate::app::App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_scan_view(frame, frame.area(), &app))
            .expect("render");
    }

    /// Build a mixed set of findings (Type A, B, C) for snapshot tests.
    fn make_scan_findings() -> Vec<crate::types::Finding> {
        use crate::types::{CodeContext, CodeContextLine, Finding, FixDiff, Severity};
        vec![
            // Type A: Code fix with code_context + fix_diff
            Finding {
                check_id: "l4-bare-anthropic".to_string(),
                r#type: crate::types::CheckResultType::Fail,
                message: "Bare Anthropic API call without compliance wrapper".to_string(),
                severity: Severity::Critical,
                obligation_id: Some("OBL-015".to_string()),
                article_reference: Some("Art. 50(1)".to_string()),
                fix: Some("- const c = new Anthropic();\n+ const c = complior(new Anthropic());".to_string()),
                file: Some("src/chat/anthropic.ts".to_string()),
                line: Some(8),
                code_context: Some(CodeContext {
                    lines: vec![
                        CodeContextLine { num: 6, content: "import Anthropic from 'anthropic';".to_string() },
                        CodeContextLine { num: 7, content: "".to_string() },
                        CodeContextLine { num: 8, content: "const c = new Anthropic();".to_string() },
                        CodeContextLine { num: 9, content: "const resp = await c.messages.create({".to_string() },
                        CodeContextLine { num: 10, content: "  model: 'claude-3',".to_string() },
                    ],
                    start_line: 6,
                    highlight_line: Some(8),
                }),
                fix_diff: Some(FixDiff {
                    before: vec!["const c = new Anthropic();".to_string()],
                    after: vec!["const c = complior(new Anthropic());".to_string()],
                    start_line: 8,
                    file_path: "src/chat/anthropic.ts".to_string(),
                    import_line: None,
                }),
                priority: None,
                confidence: None,
                confidence_level: None,
                evidence: None,
                explanation: None,
            },
            // Type B: Missing file (no code_context)
            Finding {
                check_id: "l2-fria".to_string(),
                r#type: crate::types::CheckResultType::Fail,
                message: "Missing FRIA document".to_string(),
                severity: Severity::High,
                obligation_id: Some("OBL-006".to_string()),
                article_reference: Some("Art. 27(1)".to_string()),
                fix: Some("# Fundamental Rights Impact Assessment\n\n## 1. Purpose\n...".to_string()),
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
            // Type C: Config change
            Finding {
                check_id: "l3-compliance-metadata".to_string(),
                r#type: crate::types::CheckResultType::Fail,
                message: "Missing compliance metadata in package.json".to_string(),
                severity: Severity::Medium,
                obligation_id: Some("OBL-012".to_string()),
                article_reference: Some("Art. 53(1)".to_string()),
                fix: Some("+ \"compliance\": {\n+   \"framework\": \"eu-ai-act\"\n+ }".to_string()),
                file: Some("package.json".to_string()),
                line: None,
                code_context: None,
                fix_diff: None,
                priority: None,
                confidence: None,
                confidence_level: None,
                evidence: None,
                explanation: None,
            },
            // Type B: Missing file, no fix
            Finding {
                check_id: "l2-monitoring-policy".to_string(),
                r#type: crate::types::CheckResultType::Fail,
                message: "Missing post-market monitoring policy".to_string(),
                severity: Severity::High,
                obligation_id: Some("OBL-009".to_string()),
                article_reference: Some("Art. 72(1)".to_string()),
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
        ]
    }

    fn make_scan_result() -> crate::types::ScanResult {
        crate::types::ScanResult {
            score: crate::types::ScoreBreakdown {
                total_score: 32.0,
                zone: crate::types::Zone::Red,
                category_scores: vec![],
                critical_cap_applied: false,
                total_checks: 20,
                passed_checks: 8,
                failed_checks: 12,
                skipped_checks: 0,
                confidence_summary: None,
            },
            findings: make_scan_findings(),
            project_path: "cli/".to_string(),
            scanned_at: "2026-02-28T12:00:00Z".to_string(),
            duration: 450,
            files_scanned: 24,
            deep_analysis: None,
            l5_cost: None,
            regulation_version: None,
        }
    }

    #[test]
    fn snapshot_scan_split_layout() {
        crate::theme::init_theme("dark");
        let mut app = crate::app::App::new(crate::config::TuiConfig::default());
        app.last_scan = Some(make_scan_result());
        app.scan_view.set_complete(24);
        app.scan_view.selected_finding = Some(0);
        let buf = render_scan_to_string(&app, 100, 30);
        insta::assert_snapshot!(buf);
    }

    #[test]
    fn snapshot_scan_detail_open() {
        crate::theme::init_theme("dark");
        let mut app = crate::app::App::new(crate::config::TuiConfig::default());
        app.last_scan = Some(make_scan_result());
        app.scan_view.set_complete(24);
        app.scan_view.selected_finding = Some(0);
        app.scan_view.detail_open = true;
        let buf = render_scan_to_string(&app, 100, 30);
        insta::assert_snapshot!(buf);
    }

    #[test]
    fn test_finding_type_classification() {
        let findings = make_scan_findings();
        assert_eq!(findings[0].finding_type(), crate::types::FindingType::A); // l4-
        assert_eq!(findings[1].finding_type(), crate::types::FindingType::B); // l2-
        assert_eq!(findings[2].finding_type(), crate::types::FindingType::C); // l3-
        assert_eq!(findings[3].finding_type(), crate::types::FindingType::B); // l2-
    }

    #[test]
    fn test_finding_predicted_impact() {
        let findings = make_scan_findings();
        assert_eq!(findings[0].predicted_impact(), 8); // Critical
        assert_eq!(findings[1].predicted_impact(), 5); // High
        assert_eq!(findings[2].predicted_impact(), 3); // Medium
        assert_eq!(findings[3].predicted_impact(), 5); // High
    }

    #[test]
    fn test_finding_file_line_label() {
        let findings = make_scan_findings();
        assert_eq!(findings[0].file_line_label(), Some("src/chat/anthropic.ts:8".to_string()));
        assert_eq!(findings[1].file_line_label(), None); // no file
        assert_eq!(findings[2].file_line_label(), Some("package.json".to_string())); // file but no line
    }

    #[test]
    fn test_scan_split_resize() {
        let mut state = ScanViewState::default();
        assert_eq!(state.scan_split_pct, 45);
        state.scan_split_pct = state.scan_split_pct.saturating_sub(5).max(25);
        assert_eq!(state.scan_split_pct, 40);
        state.scan_split_pct = (state.scan_split_pct + 5).min(75);
        assert_eq!(state.scan_split_pct, 45);
        // Clamp at min
        state.scan_split_pct = 25;
        state.scan_split_pct = state.scan_split_pct.saturating_sub(5).max(25);
        assert_eq!(state.scan_split_pct, 25);
    }

    #[test]
    fn test_progress_collapsed_on_complete() {
        let mut state = ScanViewState::default();
        assert!(!state.progress_collapsed);
        state.set_complete(10);
        assert!(state.progress_collapsed);
    }
}
