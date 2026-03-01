mod apply;
mod diff_preview;
mod render;
#[cfg(test)]
#[path = "tests.rs"]
mod tests;

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Finding;

// Re-export public API (same paths as before the split).
pub use apply::apply_fix_to_file;

/// Status of a single fix item.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FixItemStatus {
    Pending,
    Applied,
    Failed,
}

/// A fixable finding with selection state.
#[derive(Debug, Clone)]
pub struct FixableItem {
    pub finding_index: usize,
    pub check_id: String,
    pub obligation_id: Option<String>,
    pub article_reference: Option<String>,
    pub message: String,
    pub selected: bool,
    pub predicted_impact: i32,
    pub status: FixItemStatus,
    pub finding_type: crate::types::FindingType,
    pub file_path: Option<String>,
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
    /// When set, Fix view shows only this finding (single-fix mode from Scan).
    pub focus_check_id: Option<String>,
}

impl Default for FixViewState {
    fn default() -> Self {
        Self {
            fixable_findings: Vec::new(),
            selected_index: 0,
            diff_visible: true,
            applying: false,
            results: None,
            focus_check_id: None,
        }
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
                article_reference: f.article_reference.clone(),
                message: f.message.clone(),
                selected: false,
                predicted_impact: f.predicted_impact(),
                status: FixItemStatus::Pending,
                finding_type: f.finding_type(),
                file_path: f.file.clone(),
            })
            .collect();

        Self {
            fixable_findings: fixable,
            selected_index: 0,
            diff_visible: true,
            applying: false,
            results: None,
            focus_check_id: None,
        }
    }

    pub fn is_single_fix(&self) -> bool {
        self.focus_check_id.is_some()
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
        render::render_checklist(frame, layout[0], app);
        diff_preview::render_diff_preview(frame, layout[1], app);
    } else {
        render::render_checklist(frame, area, app);
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

fn render_fix_results(frame: &mut Frame, area: Rect, results: &FixResults) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Fix Results ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.zone_green));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let delta = results.new_score - results.old_score;
    let delta_color = if delta > 0.0 { t.zone_green } else { t.zone_red };
    let new_color = if results.new_score < 50.0 { t.zone_red }
        else if results.new_score < 80.0 { t.zone_yellow }
        else { t.zone_green };
    let old_color = if results.old_score < 50.0 { t.zone_red }
        else if results.old_score < 80.0 { t.zone_yellow }
        else { t.zone_green };

    let w = inner.width.saturating_sub(4) as usize;

    let mut lines = vec![Line::raw("")];

    // Success header
    if results.failed == 0 {
        lines.push(Line::from(Span::styled(
            "  All fixes applied successfully!",
            Style::default().fg(t.zone_green).add_modifier(Modifier::BOLD),
        )));
    } else {
        lines.push(Line::from(Span::styled(
            format!("  {} fixes applied, {} failed", results.applied, results.failed),
            Style::default().fg(t.zone_yellow).add_modifier(Modifier::BOLD),
        )));
    }
    lines.push(Line::raw(""));

    // Visual score comparison: Before -> After
    lines.push(Line::from(Span::styled(
        "  Score Improvement",
        Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));

    // Before gauge
    let old_ratio = (results.old_score / 100.0).clamp(0.0, 1.0);
    let old_filled = (old_ratio * (w.min(40) as f64)) as usize;
    let old_empty = w.min(40).saturating_sub(old_filled);
    lines.push(Line::from(vec![
        Span::styled("  Before: ", Style::default().fg(t.muted)),
        Span::styled("\u{2588}".repeat(old_filled), Style::default().fg(old_color)),
        Span::styled("\u{2591}".repeat(old_empty), Style::default().fg(t.muted)),
        Span::styled(
            format!(" {:.0}/100", results.old_score),
            Style::default().fg(old_color).add_modifier(Modifier::BOLD),
        ),
    ]));

    // After gauge
    let new_ratio = (results.new_score / 100.0).clamp(0.0, 1.0);
    let new_filled = (new_ratio * (w.min(40) as f64)) as usize;
    let new_empty = w.min(40).saturating_sub(new_filled);
    lines.push(Line::from(vec![
        Span::styled("  After:  ", Style::default().fg(t.muted)),
        Span::styled("\u{2588}".repeat(new_filled), Style::default().fg(new_color)),
        Span::styled("\u{2591}".repeat(new_empty), Style::default().fg(t.muted)),
        Span::styled(
            format!(" {:.0}/100", results.new_score),
            Style::default().fg(new_color).add_modifier(Modifier::BOLD),
        ),
    ]));

    // Delta highlight
    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  Change: ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{:+.0} points", delta),
            Style::default().fg(delta_color).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("  ({} fixes applied)", results.applied),
            Style::default().fg(t.muted),
        ),
    ]));

    lines.push(Line::raw(""));

    // Zone assessment
    let zone_label = if results.new_score >= 80.0 {
        ("GREEN \u{2014} Compliant", t.zone_green)
    } else if results.new_score >= 50.0 {
        ("YELLOW \u{2014} Partial Compliance", t.zone_yellow)
    } else {
        ("RED \u{2014} Non-Compliant", t.zone_red)
    };
    lines.push(Line::from(vec![
        Span::styled("  Status: ", Style::default().fg(t.muted)),
        Span::styled(
            zone_label.0,
            Style::default().fg(zone_label.1).add_modifier(Modifier::BOLD),
        ),
    ]));

    lines.push(Line::raw(""));

    // Next steps
    lines.push(Line::from(Span::styled(
        "  Recommended Next Steps",
        Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));

    if results.new_score < 50.0 {
        lines.push(Line::from(vec![
            Span::styled("  1. ", Style::default().fg(t.accent)),
            Span::styled("Run scan (S) to find remaining critical issues", Style::default().fg(t.fg)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  2. ", Style::default().fg(t.accent)),
            Span::styled("Focus on CRITICAL and HIGH severity findings", Style::default().fg(t.fg)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  3. ", Style::default().fg(t.accent)),
            Span::styled("Create required documentation (FRIA, transparency)", Style::default().fg(t.fg)),
        ]));
    } else if results.new_score < 80.0 {
        lines.push(Line::from(vec![
            Span::styled("  1. ", Style::default().fg(t.accent)),
            Span::styled("Run scan (S) to verify improvements", Style::default().fg(t.fg)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  2. ", Style::default().fg(t.accent)),
            Span::styled("Address remaining HIGH severity findings", Style::default().fg(t.fg)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  3. ", Style::default().fg(t.accent)),
            Span::styled("Export compliance report (R, then e)", Style::default().fg(t.fg)),
        ]));
    } else {
        lines.push(Line::from(vec![
            Span::styled("  1. ", Style::default().fg(t.accent)),
            Span::styled("Export compliance report (R, then e)", Style::default().fg(t.fg)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  2. ", Style::default().fg(t.accent)),
            Span::styled("Enable watch mode (w) for continuous monitoring", Style::default().fg(t.fg)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  3. ", Style::default().fg(t.accent)),
            Span::styled("Set up Agent Passport (P) for AI system identity", Style::default().fg(t.fg)),
        ]));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        format!("  {}", "\u{2500}".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::from(vec![
        Span::styled("  [Enter] ", Style::default().fg(t.accent)),
        Span::styled("Continue  ", Style::default().fg(t.fg)),
        Span::styled("[S] ", Style::default().fg(t.accent)),
        Span::styled("Scan View  ", Style::default().fg(t.fg)),
        Span::styled("[Esc] ", Style::default().fg(t.accent)),
        Span::styled("Back", Style::default().fg(t.fg)),
    ]));

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}
