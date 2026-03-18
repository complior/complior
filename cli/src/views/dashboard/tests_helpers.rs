use ratatui::backend::TestBackend;
use ratatui::Terminal;

use super::*;

/// Helper: render app, return buffer content as a single string.
pub(super) fn render_to_string(app: &App, width: u16, height: u16) -> String {
    let backend = TestBackend::new(width, height);
    let mut terminal = Terminal::new(backend).expect("terminal");
    terminal
        .draw(|frame| render_dashboard(frame, app))
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

pub(super) fn make_scan_result(score: f64, zone: crate::types::Zone) -> crate::types::ScanResult {
    crate::types::ScanResult {
        score: crate::types::ScoreBreakdown {
            total_score: score,
            zone,
            category_scores: vec![],
            critical_cap_applied: false,
            total_checks: 20,
            passed_checks: 15,
            failed_checks: 5,
            skipped_checks: 0,
            confidence_summary: None,
        },
        findings: vec![crate::types::Finding {
            check_id: "CHK-001".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "Missing AI disclosure".to_string(),
            severity: crate::types::Severity::High,
            obligation_id: None,
            article_reference: None,
            fix: Some("Add disclosure notice".to_string()),
            file: None,
            line: None,
            code_context: None,
            fix_diff: None,
            priority: None,
            confidence: None,
            confidence_level: None,
            evidence: None,
            explanation: None,
        }],
        project_path: ".".to_string(),
        scanned_at: "2026-02-19".to_string(),
        duration: 1200,
        files_scanned: 42,
        deep_analysis: None,
        l5_cost: None,
        regulation_version: None,
        tier: None,
        external_tool_results: None,
    }
}
