use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Gauge, Paragraph, Block, Borders, Wrap};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

use super::{LayerProgress, LayerStatus, ScanViewState};

/// Collapsed progress summary -- single line after scan complete.
pub(super) fn render_progress_summary(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let complete_count = app.scan_view.layer_progress.iter()
        .filter(|l| l.status == LayerStatus::Complete)
        .count();
    let skipped_count = app.scan_view.layer_progress.iter()
        .filter(|l| l.status == LayerStatus::Skipped)
        .count();

    let mut spans = vec![
        Span::styled(" Layers: ", Style::default().fg(t.muted)),
    ];
    for layer in &app.scan_view.layer_progress {
        let (icon, color) = match layer.status {
            LayerStatus::Complete => ("[X]", t.zone_green),
            LayerStatus::Running => ("[~]", t.zone_yellow),
            LayerStatus::Waiting => ("[ ]", t.muted),
            LayerStatus::Skipped => ("[-]", t.muted),
        };
        spans.push(Span::styled(icon, Style::default().fg(color)));
        spans.push(Span::styled(
            format!("{}:{} ", layer.short, layer.name),
            Style::default().fg(t.muted),
        ));
    }
    spans.push(Span::styled(
        format!("  ({complete_count}/5 complete, {skipped_count} skipped)"),
        Style::default().fg(t.muted),
    ));

    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

/// Puzzle room header: locks per layer + owl position.
/// ```text
///   [X] L1 Files    [~] L2 Docs    [.] L3 Config   [ ] L4 Code   [ ] L5 LLM
///   ████ 95%         ███░ 60%       ██░░ 40%        ░░░░ ---      ░░░░ ---
///                                    ^
/// ```
pub(super) fn render_puzzle_header(frame: &mut Frame, area: Rect, scan_view: &ScanViewState) {
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
            "\u{2588}".repeat(filled),
            Style::default().fg(bar_color),
        ));
        bar_spans.push(Span::styled(
            "\u{2591}".repeat(empty),
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

    // Line 4: Legend tooltip
    let legend_spans = vec![
        Span::styled(
            " L1=Files  L2=Docs  L3=Config  L4=Patterns  L5=LLM",
            Style::default().fg(t.muted),
        ),
    ];

    let lines = vec![
        Line::from(lock_spans),
        Line::from(bar_spans),
        Line::from(owl_spans),
        Line::from(legend_spans),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

/// Find the index of the currently running layer (for owl position).
pub(super) fn owl_position(layers: &[LayerProgress; 5]) -> usize {
    layers
        .iter()
        .position(|l| l.status == LayerStatus::Running)
        .unwrap_or(0)
}

pub(super) fn render_no_scan(frame: &mut Frame, area: Rect, scan_error: Option<&str>) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Scan ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines = vec![
        Line::raw(""),
    ];

    if let Some(err) = scan_error {
        lines.push(Line::from(Span::styled(
            format!("  {err}"),
            Style::default().fg(t.zone_red).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::raw(""));
        lines.push(Line::from(vec![
            Span::styled("  Press ", Style::default().fg(t.muted)),
            Span::styled("Ctrl+S", Style::default().fg(t.accent)),
            Span::styled(" to retry.", Style::default().fg(t.muted)),
        ]));
    } else {
        lines.push(Line::from(Span::styled(
            "  No scan results.",
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::raw(""));
        lines.push(Line::from(vec![
            Span::styled("  Press ", Style::default().fg(t.muted)),
            Span::styled("Ctrl+S", Style::default().fg(t.accent)),
            Span::styled(" to scan your project.", Style::default().fg(t.muted)),
        ]));
        lines.push(Line::raw(""));
        lines.push(Line::from(vec![
            Span::styled("  Or use ", Style::default().fg(t.muted)),
            Span::styled("/scan", Style::default().fg(t.accent)),
            Span::styled(" command in Chat view.", Style::default().fg(t.muted)),
        ]));
    }

    frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
}

pub(super) fn render_scan_header(frame: &mut Frame, area: Rect, app: &App) {
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

pub(super) fn render_layer_progress(frame: &mut Frame, area: Rect, app: &App) {
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
