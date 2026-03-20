#[cfg(test)]
mod tests {
    use crate::views::report::*;
    use crate::views::report::generators::generate_report_markdown;
    use crate::types::{ScoreBreakdown, Zone};

    fn make_scan() -> crate::types::ScanResult {
        crate::types::ScanResult {
            score: ScoreBreakdown {
                total_score: 72.0,
                zone: Zone::Yellow,
                category_scores: vec![],
                critical_cap_applied: false,
                total_checks: 20,
                passed_checks: 14,
                failed_checks: 6,
                skipped_checks: 0,
                confidence_summary: None,
            },
            findings: vec![crate::types::Finding {
                check_id: "OBL-001".to_string(),
                r#type: crate::types::CheckResultType::Fail,
                message: "Missing AI disclosure".to_string(),
                severity: crate::types::Severity::Critical,
                obligation_id: Some("OBL-001".to_string()),
                article_reference: Some("Art. 50(1)".to_string()),
                fix: Some("Add disclosure".to_string()),
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
            }],
            project_path: "/test/project".to_string(),
            scanned_at: "2026-02-18".to_string(),
            duration: 1500,
            files_scanned: 42,
            deep_analysis: None,
            l5_cost: None,
            regulation_version: None,
            tier: None,
            external_tool_results: None,
            agent_summaries: None,
        }
    }

    #[test]
    fn test_generate_report_has_sections() {
        let scan = make_scan();
        let report = generate_report_markdown(&scan);
        assert!(report.contains("# Compliance Report"));
        assert!(report.contains("## Executive Summary"));
        assert!(report.contains("## Critical Findings"));
        assert!(report.contains("## All Findings"));
        assert!(report.contains("## Remediation Plan"));
    }

    #[test]
    fn test_zone_label() {
        assert_eq!(zone_label(Zone::Green), "GREEN (Compliant)");
        assert_eq!(zone_label(Zone::Yellow), "YELLOW (Partial)");
        assert_eq!(zone_label(Zone::Red), "RED (Non-compliant)");
    }

    #[test]
    fn test_report_view_no_scan() {
        crate::theme::init_theme("dark");
        let backend = ratatui::backend::TestBackend::new(80, 24);
        let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
        let app = crate::app::App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_report_view(frame, frame.area(), &app))
            .expect("render");
    }

    #[test]
    fn test_report_menu_shows_generators() {
        crate::theme::init_theme("dark");
        let backend = ratatui::backend::TestBackend::new(80, 30);
        let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
        let app = crate::app::App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_report_view(frame, frame.area(), &app))
            .expect("render");

        let buf = terminal.backend().buffer().clone();
        let mut buf_str = String::new();
        for y in 0..buf.area.height {
            for x in 0..buf.area.width {
                buf_str.push(buf[(x, y)].symbol().chars().next().unwrap_or(' '));
            }
            buf_str.push('\n');
        }

        assert!(buf_str.contains("Generate"), "Should show Generate section");
        assert!(buf_str.contains("Audit Package"), "Should list Audit Package generator");
        assert!(buf_str.contains("FRIA Draft"), "Should list FRIA Draft generator");
        assert!(buf_str.contains("Regulator"), "Should show Regulator section");
    }

    #[test]
    fn test_generators_count() {
        assert_eq!(GENERATORS.len(), 9);
        assert_eq!(GENERATORS[0].key, '1');
        assert_eq!(GENERATORS[8].key, '9');
    }
}
