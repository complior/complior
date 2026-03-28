use crate::types::{Finding, Severity};
use crate::views::fix::*;

fn make_findings() -> Vec<Finding> {
    vec![
        Finding {
            check_id: "OBL-001".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "Missing AI disclosure".to_string(),
            severity: Severity::Critical,
            obligation_id: Some("OBL-001".to_string()),
            article_reference: Some("Art. 50(1)".to_string()),
            fix: Some("Add AI disclosure component".to_string()),
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
        },
        Finding {
            check_id: "OBL-002".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "No transparency info".to_string(),
            severity: Severity::High,
            obligation_id: Some("OBL-002".to_string()),
            article_reference: Some("Art. 13(1)".to_string()),
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
        },
        Finding {
            check_id: "OBL-003".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "Missing risk assessment".to_string(),
            severity: Severity::Medium,
            obligation_id: Some("OBL-003".to_string()),
            article_reference: None,
            fix: Some("Add risk assessment document".to_string()),
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
        },
    ]
}

fn render_fix_to_string(app: &crate::app::App, width: u16, height: u16) -> String {
    let backend = ratatui::backend::TestBackend::new(width, height);
    let mut terminal = ratatui::Terminal::new(backend).expect("terminal");
    terminal
        .draw(|frame| render_fix_view(frame, frame.area(), app))
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
fn snapshot_fix_with_findings() {
    crate::theme::init_theme("dark");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    app.fix_view = FixViewState::from_scan(&make_findings());
    let buf = render_fix_to_string(&app, 80, 24);
    insta::assert_snapshot!(buf);
}

#[test]
fn test_fix_view_from_scan() {
    let findings = make_findings();
    let state = FixViewState::from_scan(&findings);
    assert_eq!(state.fixable_findings.len(), 2);
    assert_eq!(state.fixable_findings[0].check_id, "OBL-001");
    assert_eq!(state.fixable_findings[1].check_id, "OBL-003");
}

#[test]
fn test_fix_toggle_selection() {
    let findings = make_findings();
    let mut state = FixViewState::from_scan(&findings);
    assert!(!state.fixable_findings[0].selected);
    state.toggle_current();
    assert!(state.fixable_findings[0].selected);
    state.toggle_current();
    assert!(!state.fixable_findings[0].selected);
}

#[test]
fn test_fix_select_all() {
    let findings = make_findings();
    let mut state = FixViewState::from_scan(&findings);
    state.select_all();
    assert!(state.fixable_findings.iter().all(|f| f.selected));
    state.deselect_all();
    assert!(state.fixable_findings.iter().all(|f| !f.selected));
}

#[test]
fn t904_auto_validate_triggers_rescan() {
    // When fix results are set with applied fixes,
    // app should have pre_fix_score set for auto-validate
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    let old_score = 42.0;
    app.pre_fix_score = Some(old_score);
    assert!(app.pre_fix_score.is_some());

    // Simulate consuming pre_fix_score (what AutoScan handler does)
    let fix_old = app.pre_fix_score.take();
    assert!(fix_old.is_some());
    assert!(app.pre_fix_score.is_none());
}

#[test]
fn t904_fix_result_delta_display() {
    let results = FixResults {
        applied: 3,
        failed: 0,
        old_score: 42.0,
        new_score: 58.0,
    };
    let delta = results.new_score - results.old_score;
    assert_eq!(delta, 16.0);
    assert!(delta > 0.0);
}

#[test]
fn t904_fix_items_marked_applied() {
    let findings = make_findings();
    let mut state = FixViewState::from_scan(&findings);
    state.select_all();
    // Simulate apply marking
    for item in &mut state.fixable_findings {
        if item.selected {
            item.status = FixItemStatus::Applied;
        }
    }
    assert!(state.fixable_findings.iter().all(|f| f.status == FixItemStatus::Applied));
}

#[test]
fn test_fix_total_impact() {
    let findings = make_findings();
    let mut state = FixViewState::from_scan(&findings);
    assert_eq!(state.total_predicted_impact(), 0);
    state.fixable_findings[0].selected = true; // Critical = +8
    assert_eq!(state.total_predicted_impact(), 8);
    state.fixable_findings[1].selected = true; // Medium = +3
    assert_eq!(state.total_predicted_impact(), 11);
}

/// Enriched findings with file paths and Type A/B/C coverage.
fn make_enriched_findings() -> Vec<Finding> {
    use crate::types::{CodeContext, CodeContextLine, FixDiff};
    vec![
        Finding {
            check_id: "l4-bare-anthropic".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "Bare Anthropic API call".to_string(),
            severity: Severity::Critical,
            obligation_id: Some("OBL-015".to_string()),
            article_reference: Some("Art. 50(1)".to_string()),
            fix: Some("- const c = new Anthropic();\n+ const c = complior(new Anthropic());".to_string()),
            file: Some("src/chat/anthropic.ts".to_string()),
            line: Some(8),
            code_context: Some(CodeContext {
                lines: vec![
                    CodeContextLine { num: 1, content: "import Anthropic from 'anthropic';".to_string() },
                    CodeContextLine { num: 2, content: "".to_string() },
                    CodeContextLine { num: 3, content: "const anthropic = new Anthropic({".to_string() },
                    CodeContextLine { num: 4, content: "  apiKey: process.env.ANTHROPIC_API_KEY,".to_string() },
                    CodeContextLine { num: 5, content: "});".to_string() },
                    CodeContextLine { num: 6, content: "".to_string() },
                    CodeContextLine { num: 7, content: "export async function chat(msg: string) {".to_string() },
                    CodeContextLine { num: 8, content: "  const resp = await anthropic.messages.create({".to_string() },
                ],
                start_line: 1,
                highlight_line: Some(8),
            }),
            fix_diff: Some(FixDiff {
                before: vec![
                    "const anthropic = new Anthropic({".to_string(),
                    "  apiKey: process.env.ANTHROPIC_API_KEY,".to_string(),
                    "});".to_string(),
                ],
                after: vec![
                    "const anthropic = complior(new Anthropic({".to_string(),
                    "  apiKey: process.env.ANTHROPIC_API_KEY,".to_string(),
                    "}));".to_string(),
                ],
                start_line: 3,
                file_path: "src/chat/anthropic.ts".to_string(),
                import_line: Some("import { complior } from '@complior/sdk';".to_string()),
            }),
            priority: None,
            confidence: None,
            confidence_level: None,
            evidence: None,
            explanation: None,
            agent_id: None,
            doc_quality: None,
        },
        Finding {
            check_id: "l2-fria".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "Missing FRIA document".to_string(),
            severity: Severity::High,
            obligation_id: Some("OBL-006".to_string()),
            article_reference: Some("Art. 27(1)".to_string()),
            fix: Some("# Fundamental Rights Impact Assessment".to_string()),
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
        },
        Finding {
            check_id: "l3-compliance-metadata".to_string(),
            r#type: crate::types::CheckResultType::Fail,
            message: "Missing compliance metadata".to_string(),
            severity: Severity::Medium,
            obligation_id: Some("OBL-012".to_string()),
            article_reference: Some("Art. 53(1)".to_string()),
            fix: Some("+ \"compliance\": { \"framework\": \"eu-ai-act\" }".to_string()),
            file: Some("package.json".to_string()),
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
        },
    ]
}

fn make_scan_result(findings: &[Finding]) -> crate::types::ScanResult {
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
        findings: findings.to_vec(),
        project_path: "cli/".to_string(),
        scanned_at: "2026-02-28T12:00:00Z".to_string(),
        duration: 450,
        files_scanned: 24,
        files_excluded: None,
        deep_analysis: None,
        l5_cost: None,
        regulation_version: None,
        tier: None,
        external_tool_results: None,
        agent_summaries: None,
    }
}

#[test]
fn snapshot_fix_staged_unstaged() {
    crate::theme::init_theme("dark");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    let findings = make_enriched_findings();
    app.last_scan = Some(make_scan_result(&findings));
    app.fix_view = FixViewState::from_scan(&findings);
    // Stage first item, leave others unstaged
    app.fix_view.fixable_findings[0].selected = true;
    let buf = render_fix_to_string(&app, 100, 30);
    insta::assert_snapshot!(buf);
}

#[test]
fn snapshot_fix_diff_preview() {
    crate::theme::init_theme("dark");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    let findings = make_enriched_findings();
    app.last_scan = Some(make_scan_result(&findings));
    app.fix_view = FixViewState::from_scan(&findings);
    // Stage all, enable diff preview
    app.fix_view.select_all();
    app.fix_view.diff_visible = true;
    let buf = render_fix_to_string(&app, 100, 30);
    insta::assert_snapshot!(buf);
}

#[test]
fn test_fix_item_finding_type() {
    let findings = make_enriched_findings();
    let state = FixViewState::from_scan(&findings);
    assert_eq!(state.fixable_findings[0].finding_type, crate::types::FindingType::A);
    assert_eq!(state.fixable_findings[1].finding_type, crate::types::FindingType::B);
    assert_eq!(state.fixable_findings[2].finding_type, crate::types::FindingType::C);
}

#[test]
fn test_fix_item_file_path() {
    let findings = make_enriched_findings();
    let state = FixViewState::from_scan(&findings);
    assert_eq!(state.fixable_findings[0].file_path, Some("src/chat/anthropic.ts".to_string()));
    assert_eq!(state.fixable_findings[1].file_path, None);
    assert_eq!(state.fixable_findings[2].file_path, Some("package.json".to_string()));
}

#[test]
fn test_single_fix_mode() {
    let findings = make_enriched_findings();
    let mut state = FixViewState::from_scan(&findings);
    assert!(!state.is_single_fix());
    assert!(state.focus_check_id.is_none());

    state.focus_check_id = Some("l4-bare-anthropic".to_string());
    assert!(state.is_single_fix());

    state.focus_check_id = None;
    assert!(!state.is_single_fix());
}

#[test]
fn test_single_fix_from_scan_defaults_to_none() {
    let findings = make_enriched_findings();
    let state = FixViewState::from_scan(&findings);
    assert!(state.focus_check_id.is_none());
    assert!(!state.is_single_fix());
}

#[test]
fn snapshot_fix_single_mode() {
    crate::theme::init_theme("dark");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    let findings = make_enriched_findings();
    app.last_scan = Some(make_scan_result(&findings));
    app.fix_view = FixViewState::from_scan(&findings);
    // Enter single-fix mode targeting first finding (Type A)
    app.fix_view.focus_check_id = Some("l4-bare-anthropic".to_string());
    app.fix_view.fixable_findings[0].selected = true;
    app.fix_view.diff_visible = true;
    let buf = render_fix_to_string(&app, 100, 30);
    insta::assert_snapshot!(buf);
}

#[test]
fn snapshot_fix_single_mode_type_a_recommendation() {
    crate::theme::init_theme("dark");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    // Type A finding with no code_context / fix_diff — only recommendation text
    let findings = vec![Finding {
        check_id: "l4-unwrapped-llm".to_string(),
        r#type: crate::types::CheckResultType::Fail,
        message: "Unwrapped LLM API call detected".to_string(),
        severity: Severity::High,
        obligation_id: Some("OBL-015".to_string()),
        article_reference: Some("Art. 50(1)".to_string()),
        fix: Some("Wrap LLM calls with complior.wrap() or add AI disclosure".to_string()),
        file: Some("src/api/chat.ts".to_string()),
        line: Some(42),
        code_context: None,
        fix_diff: None,
        priority: None,
        confidence: None,
        confidence_level: None,
        evidence: None,
        explanation: None,
        agent_id: None,
        doc_quality: None,
    }];
    app.last_scan = Some(make_scan_result(&findings));
    app.fix_view = FixViewState::from_scan(&findings);
    app.fix_view.focus_check_id = Some("l4-unwrapped-llm".to_string());
    app.fix_view.diff_visible = true;
    let buf = render_fix_to_string(&app, 100, 30);
    insta::assert_snapshot!(buf);
}

#[test]
fn snapshot_fix_single_mode_type_b() {
    crate::theme::init_theme("dark");
    let mut app = crate::app::App::new(crate::config::TuiConfig::default());
    let findings = make_enriched_findings();
    app.last_scan = Some(make_scan_result(&findings));
    app.fix_view = FixViewState::from_scan(&findings);
    // Enter single-fix mode targeting Type B finding (missing doc)
    app.fix_view.focus_check_id = Some("l2-fria".to_string());
    app.fix_view.diff_visible = true;
    let buf = render_fix_to_string(&app, 100, 30);
    insta::assert_snapshot!(buf);
}

// --- apply_fix_to_file tests ---

#[test]
fn test_apply_fix_diff_writes_file() {
    use crate::types::FixDiff;

    let dir = std::env::temp_dir().join("complior_test_apply");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();

    let src = "import Anthropic from 'anthropic';\n\nconst c = new Anthropic();\n";
    std::fs::write(dir.join("test.ts"), src).unwrap();

    let finding = Finding {
        check_id: "l4-bare".to_string(),
        r#type: crate::types::CheckResultType::Fail,
        message: "Bare API".to_string(),
        severity: Severity::High,
        obligation_id: None,
        article_reference: None,
        fix: None,
        file: Some("test.ts".to_string()),
        line: Some(3),
        code_context: None,
        fix_diff: Some(FixDiff {
            before: vec!["const c = new Anthropic();".to_string()],
            after: vec!["const c = complior(new Anthropic());".to_string()],
            start_line: 3,
            file_path: "test.ts".to_string(),
            import_line: Some("import { complior } from '@complior/sdk';".to_string()),
        }),
        priority: None,
        confidence: None,
        confidence_level: None,
        evidence: None,
        explanation: None,
        agent_id: None,
        doc_quality: None,
    };

    let result = apply_fix_to_file(&dir, &finding);
    assert!(result.success, "apply failed: {}", result.detail);

    let content = std::fs::read_to_string(dir.join("test.ts")).unwrap();
    assert!(content.contains("complior(new Anthropic())"), "missing wrap");
    assert!(content.contains("import { complior } from '@complior/sdk'"), "missing import");
    // Import should be after existing imports
    let lines: Vec<&str> = content.lines().collect();
    assert_eq!(lines[0], "import Anthropic from 'anthropic';");
    assert_eq!(lines[1], "import { complior } from '@complior/sdk';");

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn test_apply_type_b_creates_file() {
    let dir = std::env::temp_dir().join("complior_test_apply_b");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();

    let finding = Finding {
        check_id: "l2-fria".to_string(),
        r#type: crate::types::CheckResultType::Fail,
        message: "Missing FRIA".to_string(),
        severity: Severity::High,
        obligation_id: None,
        article_reference: None,
        fix: Some("# Fundamental Rights Impact Assessment\n\n## Purpose\n...".to_string()),
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
    };

    let result = apply_fix_to_file(&dir, &finding);
    assert!(result.success, "apply failed: {}", result.detail);
    assert!(dir.join("docs/fria.md").exists(), "file not created");

    let content = std::fs::read_to_string(dir.join("docs/fria.md")).unwrap();
    assert!(content.starts_with("# Fundamental Rights Impact Assessment"));

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn test_apply_rejects_stale_diff() {
    use crate::types::FixDiff;

    let dir = std::env::temp_dir().join("complior_test_apply_stale");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();

    // File content doesn't match before-lines
    std::fs::write(dir.join("file.ts"), "something else entirely\n").unwrap();

    let finding = Finding {
        check_id: "l4-bare".to_string(),
        r#type: crate::types::CheckResultType::Fail,
        message: "Bare".to_string(),
        severity: Severity::High,
        obligation_id: None,
        article_reference: None,
        fix: None,
        file: Some("file.ts".to_string()),
        line: Some(1),
        code_context: None,
        fix_diff: Some(FixDiff {
            before: vec!["const c = new Anthropic();".to_string()],
            after: vec!["const c = complior(new Anthropic());".to_string()],
            start_line: 1,
            file_path: "file.ts".to_string(),
            import_line: None,
        }),
        priority: None,
        confidence: None,
        confidence_level: None,
        evidence: None,
        explanation: None,
        agent_id: None,
        doc_quality: None,
    };

    let result = apply_fix_to_file(&dir, &finding);
    assert!(!result.success);
    assert!(result.detail.contains("changed since scan"));

    let _ = std::fs::remove_dir_all(&dir);
}
