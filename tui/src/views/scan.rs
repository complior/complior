use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Gauge, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Severity;

/// Per-layer scanning progress.
#[derive(Debug, Clone)]
pub struct LayerProgress {
    pub name: &'static str,
    pub short: &'static str,
    pub current: u32,
    pub total: u32,
    pub status: LayerStatus,
}

/// Status of a single scan layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LayerStatus {
    Waiting,
    Running,
    Complete,
    Skipped,
}

/// Finding severity filter.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FindingsFilter {
    All,
    Critical,
    High,
    Medium,
    Low,
}

impl FindingsFilter {
    pub fn from_key(key: char) -> Option<Self> {
        match key {
            'a' => Some(Self::All),
            'c' => Some(Self::Critical),
            'h' => Some(Self::High),
            'm' => Some(Self::Medium),
            'l' => Some(Self::Low),
            _ => None,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::All => "All",
            Self::Critical => "Critical",
            Self::High => "High",
            Self::Medium => "Medium",
            Self::Low => "Low",
        }
    }

    pub fn matches(self, severity: Severity) -> bool {
        match self {
            Self::All => true,
            Self::Critical => matches!(severity, Severity::Critical),
            Self::High => matches!(severity, Severity::High),
            Self::Medium => matches!(severity, Severity::Medium),
            Self::Low => matches!(severity, Severity::Low | Severity::Info),
        }
    }
}

/// State for the Scan View.
#[derive(Debug, Clone)]
pub struct ScanViewState {
    pub layer_progress: [LayerProgress; 5],
    pub findings_filter: FindingsFilter,
    pub selected_finding: Option<usize>,
    pub detail_open: bool,
    pub scanning: bool,
}

impl Default for ScanViewState {
    fn default() -> Self {
        Self {
            layer_progress: [
                LayerProgress { name: "Files", short: "L1", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "Docs", short: "L2", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "Config", short: "L3", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "Patterns", short: "L4", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "LLM", short: "L5", current: 0, total: 0, status: LayerStatus::Waiting },
            ],
            findings_filter: FindingsFilter::All,
            selected_finding: None,
            detail_open: false,
            scanning: false,
        }
    }
}

impl ScanViewState {
    /// Navigate to previous finding.
    pub fn navigate_up(&mut self) {
        let current = self.selected_finding.unwrap_or(0);
        self.selected_finding = Some(current.saturating_sub(1));
    }

    /// Navigate to next finding.
    pub fn navigate_down(&mut self, max: usize) {
        if max == 0 {
            return;
        }
        let current = self.selected_finding.unwrap_or(0);
        self.selected_finding = Some((current + 1).min(max.saturating_sub(1)));
    }

    /// Populate layer progress from completed scan.
    pub fn set_complete(&mut self, files_scanned: u32) {
        self.layer_progress[0] = LayerProgress {
            name: "Files", short: "L1",
            current: files_scanned, total: files_scanned, status: LayerStatus::Complete,
        };
        self.layer_progress[1] = LayerProgress {
            name: "Docs", short: "L2",
            current: files_scanned / 3, total: files_scanned / 3, status: LayerStatus::Complete,
        };
        self.layer_progress[2] = LayerProgress {
            name: "Config", short: "L3",
            current: 5, total: 5, status: LayerStatus::Complete,
        };
        self.layer_progress[3] = LayerProgress {
            name: "Patterns", short: "L4",
            current: files_scanned, total: files_scanned, status: LayerStatus::Complete,
        };
        self.layer_progress[4] = LayerProgress {
            name: "LLM", short: "L5",
            current: 0, total: 0, status: LayerStatus::Skipped,
        };
        self.scanning = false;
    }
}

/// Render the full Scan View.
pub fn render_scan_view(frame: &mut Frame, area: Rect, app: &App) {
    if app.last_scan.is_none() && !app.scan_view.scanning {
        render_no_scan(frame, area);
        return;
    }

    if app.scan_view.detail_open {
        render_finding_detail(frame, area, app);
        return;
    }

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),  // Puzzle room header: locks + owl
            Constraint::Length(1),  // Scan status line
            Constraint::Length(7),  // Layer progress gauges
            Constraint::Length(1),  // Filter bar
            Constraint::Min(5),    // Findings list
        ])
        .split(area);

    render_puzzle_header(frame, chunks[0], &app.scan_view);
    render_scan_header(frame, chunks[1], app);
    render_layer_progress(frame, chunks[2], app);
    render_filter_bar(frame, chunks[3], app);
    render_findings_list(frame, chunks[4], app);
}

/// Puzzle room header: locks per layer + owl position.
/// ```text
///   [X] L1 Files    [~] L2 Docs    [.] L3 Config   [ ] L4 Code   [ ] L5 LLM
///   ████ 95%         ███░ 60%       ██░░ 40%        ░░░░ ---      ░░░░ ---
///                                    ^
/// ```
fn render_puzzle_header(frame: &mut Frame, area: Rect, scan_view: &ScanViewState) {
    let t = theme::theme();
    if area.height < 2 {
        return;
    }

    // Line 1: Lock icons per layer
    let mut lock_spans: Vec<Span<'_>> = vec![Span::raw(" ")];
    for layer in &scan_view.layer_progress {
        let (icon, color) = match layer.status {
            LayerStatus::Complete => ("[X]", t.zone_green),
            LayerStatus::Running => ("[~]", t.zone_yellow),
            LayerStatus::Waiting => ("[ ]", t.muted),
            LayerStatus::Skipped => ("[-]", t.muted),
        };
        lock_spans.push(Span::styled(icon, Style::default().fg(color)));
        lock_spans.push(Span::styled(
            format!(" {} {:<8} ", layer.short, layer.name),
            Style::default().fg(t.fg),
        ));
    }

    // Line 2: Mini progress bars (5 chars each)
    let mut bar_spans: Vec<Span<'_>> = vec![Span::raw("  ")];
    for layer in &scan_view.layer_progress {
        let (ratio, label) = match layer.status {
            LayerStatus::Complete => (1.0, "100%".to_string()),
            LayerStatus::Running if layer.total > 0 => {
                let r = layer.current as f64 / layer.total as f64;
                #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
                let pct = (r * 100.0) as u32;
                (r, format!("{pct}%"))
            }
            _ => (0.0, "---".to_string()),
        };
        let filled = (ratio * 4.0).round() as usize;
        let empty = 4_usize.saturating_sub(filled);
        let bar_color = if ratio >= 0.8 {
            t.zone_green
        } else if ratio >= 0.5 {
            t.zone_yellow
        } else if ratio > 0.0 {
            t.zone_red
        } else {
            t.muted
        };
        bar_spans.push(Span::styled(
            "█".repeat(filled),
            Style::default().fg(bar_color),
        ));
        bar_spans.push(Span::styled(
            "░".repeat(empty),
            Style::default().fg(t.muted),
        ));
        bar_spans.push(Span::styled(
            format!(" {label:<6}    "),
            Style::default().fg(t.muted),
        ));
    }

    // Line 3: Owl position indicator
    let owl_idx = owl_position(&scan_view.layer_progress);
    let mut owl_spans: Vec<Span<'_>> = vec![Span::raw("  ")];
    for (i, layer) in scan_view.layer_progress.iter().enumerate() {
        let col_width = 3 + 1 + layer.short.len() + 1 + 8 + 1; // "[X] L1 Files    "
        if i == owl_idx && layer.status == LayerStatus::Running {
            let pad = col_width / 2;
            owl_spans.push(Span::raw(" ".repeat(pad.saturating_sub(1))));
            owl_spans.push(Span::styled("^", Style::default().fg(t.accent)));
            owl_spans.push(Span::raw(" ".repeat(col_width.saturating_sub(pad))));
        } else {
            owl_spans.push(Span::raw(" ".repeat(col_width)));
        }
    }

    let lines = vec![
        Line::from(lock_spans),
        Line::from(bar_spans),
        Line::from(owl_spans),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

/// Find the index of the currently running layer (for owl position).
fn owl_position(layers: &[LayerProgress; 5]) -> usize {
    layers
        .iter()
        .position(|l| l.status == LayerStatus::Running)
        .unwrap_or(0)
}

fn render_no_scan(frame: &mut Frame, area: Rect) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Scan ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            "  No scan results.",
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  Press ", Style::default().fg(t.muted)),
            Span::styled("Ctrl+S", Style::default().fg(t.accent)),
            Span::styled(" to scan your project.", Style::default().fg(t.muted)),
        ]),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  Or use ", Style::default().fg(t.muted)),
            Span::styled("/scan", Style::default().fg(t.accent)),
            Span::styled(" command in Chat view.", Style::default().fg(t.muted)),
        ]),
    ];

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}

fn render_scan_header(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let line = if let Some(scan) = &app.last_scan {
        Line::from(vec![
            Span::styled(" Scan complete: ", Style::default().fg(t.fg)),
            Span::styled(
                format!("{:.0}/100", scan.score.total_score),
                Style::default()
                    .fg(theme::zone_color(scan.score.zone))
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(
                    " ({:.1}s, {} files)",
                    scan.duration as f64 / 1000.0,
                    scan.files_scanned
                ),
                Style::default().fg(t.muted),
            ),
        ])
    } else {
        Line::from(vec![
            Span::styled(" Scanning: ", Style::default().fg(t.accent)),
            Span::styled(
                app.project_path.to_string_lossy().to_string(),
                Style::default().fg(t.fg),
            ),
            Span::styled(
                format!(" {}", app.spinner.frame()),
                Style::default().fg(t.accent),
            ),
        ])
    };

    frame.render_widget(Paragraph::new(line), area);
}

fn render_layer_progress(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let constraints: Vec<Constraint> = (0..5)
        .map(|_| Constraint::Length(1))
        .chain(std::iter::once(Constraint::Min(0)))
        .collect();

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints(constraints)
        .split(area);

    for (i, layer) in app.scan_view.layer_progress.iter().enumerate() {
        if i >= 5 {
            break;
        }

        let (ratio, label, color) = match layer.status {
            LayerStatus::Complete => {
                let l = format!(
                    " {} {:<10} 100%  {}/{}",
                    layer.short, layer.name, layer.current, layer.total
                );
                (1.0, l, t.zone_green)
            }
            LayerStatus::Running => {
                let r = if layer.total > 0 {
                    layer.current as f64 / layer.total as f64
                } else {
                    0.0
                };
                #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
                let pct = (r * 100.0) as u32;
                let l = format!(
                    " {} {:<10} {:>3}%  {}/{}",
                    layer.short, layer.name, pct, layer.current, layer.total
                );
                (r, l, t.zone_yellow)
            }
            LayerStatus::Waiting => (
                0.0,
                format!(" {} {:<10} waiting...", layer.short, layer.name),
                t.muted,
            ),
            LayerStatus::Skipped => (
                0.0,
                format!(" {} {:<10} skipped", layer.short, layer.name),
                t.muted,
            ),
        };

        let gauge = Gauge::default()
            .gauge_style(Style::default().fg(color))
            .ratio(ratio.clamp(0.0, 1.0))
            .label(label);

        frame.render_widget(gauge, chunks[i]);
    }
}

fn render_filter_bar(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let active = app.scan_view.findings_filter;
    let filters = [
        ('a', FindingsFilter::All, "All"),
        ('c', FindingsFilter::Critical, "Critical"),
        ('h', FindingsFilter::High, "High"),
        ('m', FindingsFilter::Medium, "Medium"),
        ('l', FindingsFilter::Low, "Low"),
    ];

    let count = app.last_scan.as_ref().map_or(0, |s| s.findings.len());

    let mut spans = vec![Span::styled(
        format!(" Findings ({count})  "),
        Style::default().fg(t.fg),
    )];

    for (key, filter, label) in &filters {
        if *filter == active {
            spans.push(Span::styled(
                format!("[{label}]"),
                Style::default()
                    .fg(t.accent)
                    .add_modifier(Modifier::BOLD),
            ));
        } else {
            spans.push(Span::styled(
                format!(" {key}:{label} "),
                Style::default().fg(t.muted),
            ));
        }
    }

    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

fn render_findings_list(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .borders(Borders::TOP)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(scan) = &app.last_scan else {
        return;
    };

    let filtered: Vec<_> = scan
        .findings
        .iter()
        .filter(|f| app.scan_view.findings_filter.matches(f.severity))
        .collect();

    if filtered.is_empty() {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " No findings match filter.",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    let selected = app.scan_view.selected_finding.unwrap_or(0);
    let lines: Vec<Line<'_>> = filtered
        .iter()
        .enumerate()
        .map(|(i, f)| {
            let marker = match f.severity {
                Severity::Critical | Severity::High => "*",
                Severity::Medium | Severity::Low => "-",
                Severity::Info => "i",
            };
            let sev_color = theme::severity_color(f.severity);
            let is_selected = i == selected;
            let obl = f.obligation_id.as_deref().unwrap_or("");
            let art = f.article_reference.as_deref().unwrap_or("");
            let prefix = if is_selected { "> " } else { "  " };
            let suffix = if is_selected { " <" } else { "" };

            Line::from(vec![
                Span::styled(prefix, Style::default().fg(t.accent)),
                Span::styled(
                    marker,
                    Style::default()
                        .fg(sev_color)
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(format!(" {obl:<10}"), Style::default().fg(t.fg)),
                Span::styled(format!("{art:<12}"), Style::default().fg(t.muted)),
                Span::styled(f.message.clone(), Style::default().fg(t.fg)),
                Span::styled(
                    format!("  {:?}", f.severity).to_uppercase(),
                    Style::default().fg(sev_color),
                ),
                Span::styled(suffix.to_string(), Style::default().fg(t.accent)),
            ])
        })
        .collect();

    let visible_height = inner.height as usize;
    let scroll = selected.saturating_sub(visible_height.saturating_sub(1));

    let paragraph =
        Paragraph::new(lines).scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, inner);
}

fn render_finding_detail(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Finding Detail ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(scan) = &app.last_scan else {
        return;
    };

    let filtered: Vec<_> = scan
        .findings
        .iter()
        .filter(|f| app.scan_view.findings_filter.matches(f.severity))
        .collect();

    let idx = app.scan_view.selected_finding.unwrap_or(0);
    let Some(finding) = filtered.get(idx) else {
        return;
    };

    let sev_color = theme::severity_color(finding.severity);
    let obl = finding.obligation_id.as_deref().unwrap_or("N/A");
    let art = finding.article_reference.as_deref().unwrap_or("N/A");

    let mut lines = vec![
        Line::raw(""),
        Line::from(vec![
            Span::styled("  ", Style::default()),
            Span::styled(
                format!("{obl}: {}", finding.message),
                Style::default()
                    .fg(t.fg)
                    .add_modifier(Modifier::BOLD),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Article: ", Style::default().fg(t.muted)),
            Span::styled(art.to_string(), Style::default().fg(t.fg)),
        ]),
        Line::from(vec![
            Span::styled("  Severity: ", Style::default().fg(t.muted)),
            Span::styled(
                format!("{:?}", finding.severity).to_uppercase(),
                Style::default()
                    .fg(sev_color)
                    .add_modifier(Modifier::BOLD),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Type: ", Style::default().fg(t.muted)),
            Span::styled(finding.r#type.clone(), Style::default().fg(t.fg)),
        ]),
        Line::raw(""),
    ];

    if let Some(fix) = &finding.fix {
        lines.push(Line::from(Span::styled(
            "  Suggested Fix:",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )));
        for fix_line in fix.lines() {
            lines.push(Line::from(Span::styled(
                format!("  {fix_line}"),
                Style::default().fg(t.fg),
            )));
        }
        lines.push(Line::raw(""));
    }

    lines.push(Line::raw(""));
    lines.push(Line::from(vec![
        Span::styled("  [f] ", Style::default().fg(t.accent)),
        Span::styled("Go to Fix View  ", Style::default().fg(t.muted)),
        Span::styled("[Esc] ", Style::default().fg(t.accent)),
        Span::styled("Back", Style::default().fg(t.muted)),
    ]));

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_findings_filter_all() {
        let filter = FindingsFilter::All;
        assert!(filter.matches(Severity::Critical));
        assert!(filter.matches(Severity::High));
        assert!(filter.matches(Severity::Medium));
        assert!(filter.matches(Severity::Low));
        assert!(filter.matches(Severity::Info));
    }

    #[test]
    fn test_findings_filter_critical() {
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
        // All waiting — owl should be at position 0
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
}
