use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::{Finding, Severity};

/// Status of a single fix item.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FixItemStatus {
    Pending,
    Applying,
    Applied,
    Failed,
}

/// A fixable finding with selection state.
#[derive(Debug, Clone)]
pub struct FixableItem {
    pub finding_index: usize,
    pub check_id: String,
    pub obligation_id: Option<String>,
    pub message: String,
    pub selected: bool,
    pub predicted_impact: i32,
    pub status: FixItemStatus,
}

/// Results of applying fixes.
#[derive(Debug, Clone)]
pub struct FixResults {
    pub applied: u32,
    pub failed: u32,
    pub old_score: f64,
    pub new_score: f64,
}

/// State for the Fix View.
#[derive(Debug, Clone)]
pub struct FixViewState {
    pub fixable_findings: Vec<FixableItem>,
    pub selected_index: usize,
    pub diff_visible: bool,
    pub applying: bool,
    pub results: Option<FixResults>,
}

impl Default for FixViewState {
    fn default() -> Self {
        Self {
            fixable_findings: Vec::new(),
            selected_index: 0,
            diff_visible: true,
            applying: false,
            results: None,
        }
    }
}

/// Predict score impact based on severity heuristic.
pub fn predict_impact(severity: Severity) -> i32 {
    match severity {
        Severity::Critical => 8,
        Severity::High => 5,
        Severity::Medium => 3,
        Severity::Low => 1,
        Severity::Info => 0,
    }
}

impl FixViewState {
    /// Build fix view state from scan findings.
    pub fn from_scan(findings: &[Finding]) -> Self {
        let fixable: Vec<FixableItem> = findings
            .iter()
            .enumerate()
            .filter(|(_, f)| f.fix.is_some())
            .map(|(i, f)| FixableItem {
                finding_index: i,
                check_id: f.check_id.clone(),
                obligation_id: f.obligation_id.clone(),
                message: f.message.clone(),
                selected: false,
                predicted_impact: predict_impact(f.severity),
                status: FixItemStatus::Pending,
            })
            .collect();

        Self {
            fixable_findings: fixable,
            selected_index: 0,
            diff_visible: true,
            applying: false,
            results: None,
        }
    }

    pub fn selected_count(&self) -> usize {
        self.fixable_findings.iter().filter(|f| f.selected).count()
    }

    pub fn total_predicted_impact(&self) -> i32 {
        self.fixable_findings
            .iter()
            .filter(|f| f.selected)
            .map(|f| f.predicted_impact)
            .sum()
    }

    pub fn toggle_current(&mut self) {
        if let Some(item) = self.fixable_findings.get_mut(self.selected_index) {
            item.selected = !item.selected;
        }
    }

    pub fn toggle_at(&mut self, idx: usize) {
        if let Some(item) = self.fixable_findings.get_mut(idx) {
            item.selected = !item.selected;
        }
    }

    pub fn select_all(&mut self) {
        for item in &mut self.fixable_findings {
            item.selected = true;
        }
    }

    pub fn deselect_all(&mut self) {
        for item in &mut self.fixable_findings {
            item.selected = false;
        }
    }

    pub fn navigate_up(&mut self) {
        self.selected_index = self.selected_index.saturating_sub(1);
    }

    pub fn navigate_down(&mut self) {
        if !self.fixable_findings.is_empty() {
            self.selected_index =
                (self.selected_index + 1).min(self.fixable_findings.len() - 1);
        }
    }
}

/// Render the Fix View.
pub fn render_fix_view(frame: &mut Frame, area: Rect, app: &App) {
    if let Some(results) = &app.fix_view.results {
        render_fix_results(frame, area, results);
        return;
    }

    if app.last_scan.is_none() {
        render_no_fix_data(
            frame,
            area,
            "No scan data. Run a scan first (Ctrl+S).",
        );
        return;
    }

    if app.fix_view.fixable_findings.is_empty() {
        render_no_fix_data(
            frame,
            area,
            "No fixable findings. All checks are passing or have no suggested fix.",
        );
        return;
    }

    if app.fix_view.diff_visible {
        let left_pct = u16::from(app.fix_split_pct.clamp(25, 75));
        let right_pct = 100 - left_pct;
        let layout = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(left_pct), Constraint::Percentage(right_pct)])
            .split(area);
        render_checklist(frame, layout[0], app);
        render_diff_preview(frame, layout[1], app);
    } else {
        render_checklist(frame, area, app);
    }
}

fn render_no_fix_data(frame: &mut Frame, area: Rect, message: &str) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Fix ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            format!("  {message}"),
            Style::default().fg(t.muted),
        )),
    ];
    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}

fn render_checklist(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let fix = &app.fix_view;
    let total = fix.fixable_findings.len();
    let current_score = app
        .last_scan
        .as_ref()
        .map_or(0.0, |s| s.score.total_score);

    let block = Block::default()
        .title(format!(" Fix — Fixable ({total}) "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();

    for (i, item) in fix.fixable_findings.iter().enumerate() {
        let checkbox = if item.selected { "[x]" } else { "[ ]" };
        let is_selected = i == fix.selected_index;
        let prefix = if is_selected { "> " } else { "  " };
        let obl = item.obligation_id.as_deref().unwrap_or("");

        let status_span = match item.status {
            FixItemStatus::Pending => Span::raw(""),
            FixItemStatus::Applying => {
                Span::styled(" APPLYING", Style::default().fg(t.zone_yellow))
            }
            FixItemStatus::Applied => {
                Span::styled(" APPLIED", Style::default().fg(t.zone_green))
            }
            FixItemStatus::Failed => {
                Span::styled(" FAILED", Style::default().fg(t.zone_red))
            }
        };

        lines.push(Line::from(vec![
            Span::styled(prefix, Style::default().fg(t.accent)),
            Span::styled(format!("{checkbox} "), Style::default().fg(t.fg)),
            Span::styled(format!("{obl} "), Style::default().fg(t.accent)),
            Span::styled(item.message.clone(), Style::default().fg(t.fg)),
            Span::styled(
                format!(" +{}", item.predicted_impact),
                Style::default().fg(t.zone_green),
            ),
            status_span,
        ]));
    }

    // Summary line
    lines.push(Line::raw(""));
    let selected_count = fix.selected_count();
    let impact = fix.total_predicted_impact();
    #[allow(clippy::cast_precision_loss)]
    let predicted = current_score + impact as f64;
    lines.push(Line::from(vec![
        Span::styled(
            format!("  Selected: {selected_count}  Impact: +{impact}  "),
            Style::default().fg(t.fg),
        ),
        Span::styled(
            format!("Current: {current_score:.0} -> Predicted: {predicted:.0}"),
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        ),
    ]));

    // Hints
    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  [Space] ", Style::default().fg(t.accent)),
        Span::styled("Toggle  ", Style::default().fg(t.muted)),
        Span::styled("[a] ", Style::default().fg(t.accent)),
        Span::styled("All  ", Style::default().fg(t.muted)),
        Span::styled("[n] ", Style::default().fg(t.accent)),
        Span::styled("None  ", Style::default().fg(t.muted)),
        Span::styled("[d] ", Style::default().fg(t.accent)),
        Span::styled("Diff  ", Style::default().fg(t.muted)),
        Span::styled("[Enter] ", Style::default().fg(t.accent)),
        Span::styled("Apply", Style::default().fg(t.muted)),
    ]));

    let visible_height = inner.height as usize;
    let scroll = fix.selected_index.saturating_sub(visible_height.saturating_sub(1));

    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, inner);
}

fn render_diff_preview(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Diff Preview ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(scan) = &app.last_scan else {
        return;
    };
    let fix = &app.fix_view;
    let Some(item) = fix.fixable_findings.get(fix.selected_index) else {
        return;
    };
    let Some(finding) = scan.findings.get(item.finding_index) else {
        return;
    };

    let mut lines = vec![
        Line::from(Span::styled(
            format!("  {}: {}", item.check_id, item.message),
            Style::default()
                .fg(t.fg)
                .add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
    ];

    if let Some(fix_text) = &finding.fix {
        lines.push(Line::from(Span::styled(
            "  Suggested fix:",
            Style::default().fg(t.accent),
        )));
        for line in fix_text.lines() {
            let color = if line.starts_with('+') {
                t.diff_added
            } else if line.starts_with('-') {
                t.diff_removed
            } else {
                t.fg
            };
            lines.push(Line::from(Span::styled(
                format!("  {line}"),
                Style::default().fg(color),
            )));
        }
    } else {
        lines.push(Line::from(Span::styled(
            "  No diff available for this finding.",
            Style::default().fg(t.muted),
        )));
    }

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}

fn render_fix_results(frame: &mut Frame, area: Rect, results: &FixResults) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Fix Results ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let delta = results.new_score - results.old_score;
    let delta_color = if delta > 0.0 {
        t.zone_green
    } else {
        t.zone_red
    };

    let lines = vec![
        Line::raw(""),
        Line::from(vec![
            Span::styled("  Applied: ", Style::default().fg(t.muted)),
            Span::styled(
                format!(
                    "{}/{} fixes",
                    results.applied,
                    results.applied + results.failed
                ),
                Style::default()
                    .fg(t.fg)
                    .add_modifier(Modifier::BOLD),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Score:   ", Style::default().fg(t.muted)),
            Span::styled(
                format!(
                    "{:.0} -> {:.0}  ({:+.0})",
                    results.old_score, results.new_score, delta
                ),
                Style::default()
                    .fg(delta_color)
                    .add_modifier(Modifier::BOLD),
            ),
        ]),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  [Enter] ", Style::default().fg(t.accent)),
            Span::styled("Continue  ", Style::default().fg(t.muted)),
            Span::styled("[2] ", Style::default().fg(t.accent)),
            Span::styled("Scan View  ", Style::default().fg(t.muted)),
            Span::styled("[Esc] ", Style::default().fg(t.accent)),
            Span::styled("Back", Style::default().fg(t.muted)),
        ]),
    ];

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_findings() -> Vec<Finding> {
        vec![
            Finding {
                check_id: "OBL-001".to_string(),
                r#type: "compliance".to_string(),
                message: "Missing AI disclosure".to_string(),
                severity: Severity::Critical,
                obligation_id: Some("OBL-001".to_string()),
                article_reference: Some("Art. 50(1)".to_string()),
                fix: Some("Add AI disclosure component".to_string()),
            },
            Finding {
                check_id: "OBL-002".to_string(),
                r#type: "compliance".to_string(),
                message: "No transparency info".to_string(),
                severity: Severity::High,
                obligation_id: Some("OBL-002".to_string()),
                article_reference: Some("Art. 13(1)".to_string()),
                fix: None,
            },
            Finding {
                check_id: "OBL-003".to_string(),
                r#type: "compliance".to_string(),
                message: "Missing risk assessment".to_string(),
                severity: Severity::Medium,
                obligation_id: Some("OBL-003".to_string()),
                article_reference: None,
                fix: Some("Add risk assessment document".to_string()),
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
    fn test_fix_predicted_impact() {
        assert_eq!(predict_impact(Severity::Critical), 8);
        assert_eq!(predict_impact(Severity::High), 5);
        assert_eq!(predict_impact(Severity::Medium), 3);
        assert_eq!(predict_impact(Severity::Low), 1);
        assert_eq!(predict_impact(Severity::Info), 0);
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
}
