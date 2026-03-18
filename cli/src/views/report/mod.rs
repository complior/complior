pub(crate) mod generators;
mod tests;

pub use generators::export_report;
pub(crate) use generators::{zone_label, GENERATORS};

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::Zone;

/// Export status.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ExportStatus {
    None,
    Done(String),
    Error(String),
}

/// State for the Report View.
#[derive(Debug, Clone)]
pub struct ReportViewState {
    pub scroll_offset: u16,
    pub export_status: ExportStatus,
    /// Index of selected generator in GENERATORS (0..8).
    pub selected_generator: usize,
    /// Whether viewing a generated report detail (vs the menu).
    pub viewing_report: bool,
}

impl Default for ReportViewState {
    fn default() -> Self {
        Self {
            scroll_offset: 0,
            export_status: ExportStatus::None,
            selected_generator: 0,
            viewing_report: false,
        }
    }
}

/// Render the Report View — menu-driven interface with 9 generators.
pub fn render_report_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    // If viewing a generated report, show the detail view
    if app.report_view.viewing_report {
        render_report_detail_view(frame, area, app);
        return;
    }

    let block = Block::default()
        .title(" Reports & Exports ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Three sections: Generate | Recent | Regulator
    let sections = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(14),    // Generate (9 generators + headers)
            Constraint::Length(5),  // Recent reports
            Constraint::Length(6),  // Regulator info
        ])
        .split(inner);

    // ── Generate Section ─────────────────────────────────────────────
    {
        let mut lines: Vec<Line<'_>> = Vec::new();

        lines.push(Line::from(Span::styled(
            "  Generate",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            format!("  {}", "─".repeat(sections[0].width.saturating_sub(4) as usize)),
            Style::default().fg(t.border),
        )));
        lines.push(Line::raw(""));

        for (i, rg) in GENERATORS.iter().enumerate() {
            let is_selected = i == app.report_view.selected_generator;
            let prefix = if is_selected { "> " } else { "  " };
            let key_style = if is_selected {
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(t.accent)
            };
            let name_style = if is_selected {
                Style::default().fg(t.fg).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(t.fg)
            };

            lines.push(Line::from(vec![
                Span::styled(prefix, Style::default().fg(if is_selected { t.accent } else { t.fg })),
                Span::styled(format!("[{}] ", rg.key), key_style),
                Span::styled(
                    format!("{:<22}", rg.name),
                    name_style,
                ),
                Span::styled(rg.description, Style::default().fg(t.muted)),
                Span::styled(
                    format!("  {}", rg.duration),
                    Style::default().fg(t.muted),
                ),
            ]));
        }

        frame.render_widget(Paragraph::new(lines), sections[0]);
    }

    // ── Recent Reports Section ───────────────────────────────────────
    {
        let mut lines: Vec<Line<'_>> = Vec::new();

        lines.push(Line::from(Span::styled(
            "  Recent",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            format!("  {}", "─".repeat(sections[1].width.saturating_sub(4) as usize)),
            Style::default().fg(t.border),
        )));

        // Export status or empty state
        match &app.report_view.export_status {
            ExportStatus::Done(path) => {
                lines.push(Line::from(vec![
                    Span::styled("  ✓ ", Style::default().fg(t.zone_green)),
                    Span::styled(path.clone(), Style::default().fg(t.fg)),
                ]));
            }
            ExportStatus::Error(err) => {
                lines.push(Line::from(vec![
                    Span::styled("  ✗ ", Style::default().fg(t.zone_red)),
                    Span::styled(err.clone(), Style::default().fg(t.zone_red)),
                ]));
            }
            ExportStatus::None => {
                lines.push(Line::from(Span::styled(
                    "  (no reports generated yet)",
                    Style::default().fg(t.muted),
                )));
            }
        }

        frame.render_widget(Paragraph::new(lines), sections[1]);
    }

    // ── Regulator Section ────────────────────────────────────────────
    {
        let mut lines: Vec<Line<'_>> = Vec::new();

        lines.push(Line::from(Span::styled(
            "  Regulator",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            format!("  {}", "─".repeat(sections[2].width.saturating_sub(4) as usize)),
            Style::default().fg(t.border),
        )));

        lines.push(Line::from(vec![
            Span::styled("  Country: ", Style::default().fg(t.muted)),
            Span::styled("DE", Style::default().fg(t.fg)),
            Span::styled("  Sector: ", Style::default().fg(t.muted)),
            Span::styled("technology", Style::default().fg(t.fg)),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  [r] ", Style::default().fg(t.accent)),
            Span::styled("Full regulator details", Style::default().fg(t.fg)),
        ]));

        frame.render_widget(Paragraph::new(lines), sections[2]);
    }
}

/// Render the Report detail view — scrollable report content (invoked when viewing_report is true).
fn render_report_detail_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Compliance Report ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let Some(scan) = &app.last_scan else {
        let lines = vec![
            Line::raw(""),
            Line::from(Span::styled(
                "  No scan data. Press Ctrl+S to scan first.",
                Style::default().fg(t.muted),
            )),
        ];
        frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
        return;
    };

    let w = inner.width.saturating_sub(4) as usize;
    let mut lines: Vec<Line<'_>> = Vec::new();

    // ── Executive Summary ───────────────────────────────────────────
    let zone = zone_label(scan.score.zone);
    let score_color = match scan.score.zone {
        Zone::Green => t.zone_green,
        Zone::Yellow => t.zone_yellow,
        Zone::Red => t.zone_red,
    };

    lines.push(Line::from(Span::styled(
        "  Executive Summary",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "═".repeat(w)),
        Style::default().fg(t.accent),
    )));
    lines.push(Line::raw(""));

    // Score gauge
    let ratio = (scan.score.total_score / 100.0).clamp(0.0, 1.0);
    let filled = (ratio * (w.min(50) as f64)) as usize;
    let empty = w.min(50).saturating_sub(filled);
    lines.push(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled("█".repeat(filled), Style::default().fg(score_color)),
        Span::styled("░".repeat(empty), Style::default().fg(t.muted)),
        Span::styled(
            format!("  {:.0}/100", scan.score.total_score),
            Style::default().fg(score_color).add_modifier(Modifier::BOLD),
        ),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Status: ", Style::default().fg(t.muted)),
        Span::styled(zone, Style::default().fg(score_color).add_modifier(Modifier::BOLD)),
    ]));
    lines.push(Line::raw(""));

    // Key metrics
    lines.push(Line::from(vec![
        Span::styled("  Project:    ", Style::default().fg(t.muted)),
        Span::styled(scan.project_path.clone(), Style::default().fg(t.fg)),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Scanned:    ", Style::default().fg(t.muted)),
        Span::styled(scan.scanned_at.clone(), Style::default().fg(t.fg)),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Duration:   ", Style::default().fg(t.muted)),
        Span::styled(
            format!("{:.1}s", scan.duration as f64 / 1000.0),
            Style::default().fg(t.fg),
        ),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Files:      ", Style::default().fg(t.muted)),
        Span::styled(format!("{}", scan.files_scanned), Style::default().fg(t.fg)),
    ]));
    lines.push(Line::from(vec![
        Span::styled("  Checks:     ", Style::default().fg(t.muted)),
        Span::styled(format!("{}", scan.score.passed_checks), Style::default().fg(t.zone_green)),
        Span::styled(" passed  ", Style::default().fg(t.muted)),
        Span::styled(format!("{}", scan.score.failed_checks), Style::default().fg(t.zone_red)),
        Span::styled(" failed  ", Style::default().fg(t.muted)),
        Span::styled(format!("{}", scan.score.skipped_checks), Style::default().fg(t.muted)),
        Span::styled(" skipped", Style::default().fg(t.muted)),
    ]));
    lines.push(Line::raw(""));

    // ── All Findings ────────────────────────────────────────────────
    lines.push(Line::from(Span::styled(
        format!("  All Findings ({})", scan.findings.len()),
        Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", "═".repeat(w)),
        Style::default().fg(t.border),
    )));
    lines.push(Line::raw(""));

    if scan.findings.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No findings. All checks passed.",
            Style::default().fg(t.zone_green),
        )));
    } else {
        for (i, f) in scan.findings.iter().enumerate() {
            let sev_color = theme::severity_color(f.severity);
            let sev_label = f.severity.label().to_string();
            lines.push(Line::from(vec![
                Span::styled(format!("  {:<3}", i + 1), Style::default().fg(t.muted)),
                Span::styled(format!("{:<14}", f.check_id), Style::default().fg(t.fg)),
                Span::styled(format!("{:<10}", sev_label), Style::default().fg(sev_color)),
                Span::styled(f.message.clone(), Style::default().fg(t.fg)),
            ]));
        }
    }
    lines.push(Line::raw(""));

    // ── Footer ──────────────────────────────────────────────────────
    lines.push(Line::from(vec![
        Span::styled("  [e] ", Style::default().fg(t.accent)),
        Span::styled("Export as Markdown  ", Style::default().fg(t.fg)),
        Span::styled("[Esc] ", Style::default().fg(t.accent)),
        Span::styled("Back to menu  ", Style::default().fg(t.fg)),
        Span::styled("[j/k] ", Style::default().fg(t.accent)),
        Span::styled("Scroll", Style::default().fg(t.fg)),
    ]));

    let scroll = app.report_view.scroll_offset;
    let paragraph = Paragraph::new(lines)
        .wrap(Wrap { trim: false })
        .scroll((scroll, 0));
    frame.render_widget(paragraph, inner);
}
