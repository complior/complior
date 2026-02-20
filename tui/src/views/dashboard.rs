use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::layout::{Breakpoint, compute_layout};
use crate::theme;
use crate::types::{Overlay, Panel, ViewState};

use super::chat::render_chat;
use super::file_browser::render_file_browser;
use super::sidebar::render_sidebar;
use super::terminal::render_terminal;

/// Top-level render entry point — dispatches to view-specific renderer.
pub fn render_dashboard(frame: &mut Frame, app: &App) {
    let area = frame.area();

    // T08: Splash screen — full-screen owl during startup fade-in
    if let Some(opacity) = app.animation.splash_opacity() {
        render_splash_screen(frame, area, opacity);
        return;
    }

    // T08: Owl header (2 lines)
    let owl_height: u16 = 2;
    let owl_area = Rect {
        x: area.x,
        y: area.y,
        width: area.width,
        height: owl_height.min(area.height),
    };
    render_owl_header(frame, owl_area);

    // Reserve 2 lines for owl header + 2 lines for footer
    let suggestion_height: u16 = if app.idle_suggestions.current.is_some() { 2 } else { 0 };
    let footer_height: u16 = 2;
    let overhead = owl_height + footer_height + suggestion_height;
    let body_area = Rect {
        x: area.x,
        y: area.y + owl_height,
        width: area.width,
        height: area.height.saturating_sub(overhead),
    };

    // Dispatch to the active view
    match app.view_state {
        ViewState::Dashboard => render_dashboard_view(frame, body_area, app),
        ViewState::Chat => render_chat_full_view(frame, body_area, app),
        ViewState::Scan => super::scan::render_scan_view(frame, body_area, app),
        ViewState::Fix => super::fix::render_fix_view(frame, body_area, app),
        ViewState::Timeline => super::timeline::render_timeline_view(frame, body_area, app),
        ViewState::Report => super::report::render_report_view(frame, body_area, app),
    }

    // T08: Idle suggestion area (above footer)
    if let Some(ref suggestion) = app.idle_suggestions.current {
        let suggestion_area = Rect {
            x: area.x,
            y: area.y + area.height.saturating_sub(footer_height + suggestion_height),
            width: area.width,
            height: suggestion_height,
        };
        crate::components::suggestions::render_suggestion(frame, suggestion_area, suggestion);
    }

    // 2-line footer at bottom
    render_view_footer(frame, app);

    // Overlay on top of everything
    render_overlay(frame, app);
}

/// Full-screen splash with owl mascot, fades in during startup (500ms).
fn render_splash_screen(frame: &mut Frame, area: Rect, _opacity: f64) {
    let t = theme::theme();

    // Block-art owl (10 lines)
    let owl_lines = [
        "       ▄▄           ▄▄",
        "      ████▄▄▄▄▄▄▄▄████",
        "      █  ▄████▄▄████▄  █",
        "      █  ██◉◉████◉◉██  █",
        "      █  ▀████▀▀████▀  █",
        "      █      ▄▼▄      █",
        "      ██   ▀▀▀▀▀   ██",
        "       ██▀█▀█▀█▀█▀██",
        "        █▀█     █▀█",
        "        ▀▄▀     ▀▄▀",
    ];

    let owl_height = owl_lines.len() as u16;
    let title_height = 2;
    let total = owl_height + title_height + 1;

    if area.height < total {
        // Too small — just show text
        let line = Line::from(Span::styled(
            "c o m p l i o r",
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        ));
        let y = area.y + area.height / 2;
        let splash_area = Rect { x: area.x, y, width: area.width, height: 1 };
        frame.render_widget(Paragraph::new(line).alignment(ratatui::layout::Alignment::Center), splash_area);
        return;
    }

    let start_y = area.y + (area.height.saturating_sub(total)) / 2;

    // Render owl lines
    for (i, line_str) in owl_lines.iter().enumerate() {
        let line = Line::from(Span::styled(*line_str, Style::default().fg(t.accent)));
        let y = start_y + i as u16;
        let line_area = Rect { x: area.x, y, width: area.width, height: 1 };
        frame.render_widget(
            Paragraph::new(line).alignment(ratatui::layout::Alignment::Center),
            line_area,
        );
    }

    // Title: "c o m p l i o r"
    let title_y = start_y + owl_height + 1;
    let title = Line::from(Span::styled(
        "c o m p l i o r",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    ));
    let title_area = Rect { x: area.x, y: title_y, width: area.width, height: 1 };
    frame.render_widget(
        Paragraph::new(title).alignment(ratatui::layout::Alignment::Center),
        title_area,
    );

    // Subtitle
    let sub_y = title_y + 1;
    let subtitle = Line::from(Span::styled(
        "AI Compliance · Made Simple",
        Style::default().fg(t.muted),
    ));
    let sub_area = Rect { x: area.x, y: sub_y, width: area.width, height: 1 };
    frame.render_widget(
        Paragraph::new(subtitle).alignment(ratatui::layout::Alignment::Center),
        sub_area,
    );
}

/// Owl ASCII header — 2 lines at top of every view.
fn render_owl_header(frame: &mut Frame, area: Rect) {
    let t = theme::theme();
    if area.height < 2 {
        return;
    }
    let lines = vec![
        Line::from(vec![
            Span::styled("(o)(o)", Style::default().fg(t.accent)),
            Span::raw("  "),
        ]),
        Line::from(vec![
            Span::styled(" \\__/ ", Style::default().fg(t.accent)),
            Span::styled(" complior v1.0", Style::default().fg(t.muted)),
        ]),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

/// Dashboard view — responsive multi-panel layout (T803).
fn render_dashboard_view(frame: &mut Frame, body_area: Rect, app: &App) {
    let bp = Breakpoint::from_width(body_area.width);

    match bp {
        Breakpoint::Tiny => {
            // Minimal: single-line score summary
            render_tiny_dashboard(frame, body_area, app);
        }
        Breakpoint::Small => {
            // No sidebar, just content
            render_dashboard_content(frame, body_area, app);
        }
        Breakpoint::Medium => {
            // Sidebar if visible (20 cols)
            if app.sidebar_visible {
                let rl = compute_layout(body_area, Some(true));
                render_dashboard_content(frame, rl.main_area, app);
                if let Some(sb) = rl.sidebar_area {
                    render_sidebar(frame, sb, app);
                }
            } else {
                render_dashboard_content(frame, body_area, app);
            }
        }
        Breakpoint::Large => {
            // 3-column: main + sidebar (20) + detail (30)
            if app.sidebar_visible {
                let rl = compute_layout(body_area, Some(true));
                render_dashboard_content(frame, rl.main_area, app);
                if let Some(sb) = rl.sidebar_area {
                    render_sidebar(frame, sb, app);
                }
                if let Some(detail) = rl.detail_area {
                    render_detail_panel(frame, detail, app);
                }
            } else {
                render_dashboard_content(frame, body_area, app);
            }
        }
    }
}

/// Tiny terminal mode — minimal summary.
fn render_tiny_dashboard(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let score_text = if let Some(scan) = &app.last_scan {
        let s = scan.score.total_score;
        format!("Score: {s:.0}/100 | {} findings | {} files", scan.findings.len(), scan.files_scanned)
    } else {
        "No scan data. Press Ctrl+S or :scan".to_string()
    };

    let lines = vec![
        Line::from(Span::styled(score_text, Style::default().fg(t.fg))),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

/// Detail panel for Large breakpoint (rightmost column).
fn render_detail_panel(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let block = Block::default()
        .title(" Detail ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = if let Some(scan) = &app.last_scan {
        let mut l = vec![
            Line::from(Span::styled(
                format!(" Checks: {}/{}", scan.score.passed_checks, scan.score.total_checks),
                Style::default().fg(t.fg),
            )),
            Line::from(Span::styled(
                format!(" Failed: {}", scan.score.failed_checks),
                Style::default().fg(t.zone_red),
            )),
            Line::from(Span::styled(
                format!(" Categories: {}", scan.score.category_scores.len()),
                Style::default().fg(t.fg),
            )),
        ];
        if scan.score.critical_cap_applied {
            l.push(Line::from(Span::styled(
                " Critical cap applied",
                Style::default().fg(t.zone_red),
            )));
        }
        l
    } else {
        vec![Line::from(Span::styled(
            " Run a scan to see details",
            Style::default().fg(t.muted),
        ))]
    };
    frame.render_widget(Paragraph::new(lines), inner);
}

/// Chat full-width view — full chat + optional sidebar.
fn render_chat_full_view(frame: &mut Frame, body_area: Rect, app: &App) {
    if app.sidebar_visible {
        let main_layout = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Min(40), Constraint::Length(28)])
            .split(body_area);

        super::chat::render_chat_view(frame, main_layout[0], app);
        render_sidebar(frame, main_layout[1], app);
    } else {
        super::chat::render_chat_view(frame, body_area, app);
    }
}

/// Dashboard content area — multi-panel layout with chat, files, terminal.
fn render_dashboard_content(frame: &mut Frame, area: Rect, app: &App) {
    if app.last_scan.is_some() {
        let v_split = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(60), Constraint::Percentage(40)])
            .split(area);

        render_top_panels(frame, v_split[0], app);
        render_bottom_widgets(frame, v_split[1], app);
    } else {
        render_content_panels(frame, area, app);
    }
}

/// Top panels: chat + files/code/terminal.
fn render_top_panels(frame: &mut Frame, area: Rect, app: &App) {
    let show_files = app.files_panel_visible;
    let show_term = app.terminal_visible;

    let chunks = match (show_files, show_term) {
        (true, true) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(40),
                Constraint::Percentage(35),
                Constraint::Percentage(25),
            ])
            .split(area),
        (true, false) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
            .split(area),
        (false, true) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
            .split(area),
        (false, false) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(100)])
            .split(area),
    };

    render_chat(frame, chunks[0], app, app.active_panel == Panel::Chat);

    if show_files && chunks.len() > 1 {
        if app.code_content.is_some() {
            super::code_viewer::render_code_viewer(
                frame,
                chunks[1],
                app,
                app.active_panel == Panel::CodeViewer,
            );
        } else {
            render_file_browser(
                frame,
                chunks[1],
                app,
                app.active_panel == Panel::FileBrowser,
            );
        }
    }

    if show_term {
        let term_idx = if show_files { 2 } else { 1 };
        if term_idx < chunks.len() {
            render_terminal(
                frame,
                chunks[term_idx],
                app,
                app.active_panel == Panel::Terminal,
            );
        }
    }
}

/// Bottom dashboard widgets: 2x2 grid.
///
/// ```text
/// ┌───────────────────┬────────────────────┐
/// │  Score Gauge      │  Deadline Countdown │
/// ├───────────────────┼────────────────────┤
/// │  Activity Log     │  Score Sparkline   │
/// └───────────────────┴────────────────────┘
/// ```
fn render_bottom_widgets(frame: &mut Frame, area: Rect, app: &App) {
    use crate::components::zoom::ZoomedWidget;

    // T702: If a widget is zoomed, render it full-screen
    if let Some(zoomed) = app.zoom.zoomed {
        match zoomed {
            ZoomedWidget::ScoreGauge => render_score_gauge(frame, area, app),
            ZoomedWidget::DeadlineCountdown => render_deadline_countdown(frame, area),
            ZoomedWidget::ActivityLog => render_activity_log(frame, area, app),
            ZoomedWidget::ScoreSparkline => render_score_history_line(frame, area, app),
            ZoomedWidget::FindingsList => render_activity_log(frame, area, app),
        }
        return;
    }

    let v_split = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    // Top row: Score Gauge | Deadline Countdown
    let top_row = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(v_split[0]);

    render_score_gauge(frame, top_row[0], app);
    render_deadline_countdown(frame, top_row[1]);

    // Bottom row: Activity Log | Score Sparkline
    let bottom_row = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(v_split[1]);

    render_activity_log(frame, bottom_row[0], app);
    render_score_history_line(frame, bottom_row[1], app);
}

/// Score gauge widget — colored by threshold, with zone label + animation support.
fn render_score_gauge(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    if let Some(scan) = &app.last_scan {
        let real_score = scan.score.total_score;
        // T08: Use animated counter value if available
        let display_score = app
            .animation
            .counter_value()
            .map(|v| v as f64)
            .unwrap_or(real_score);
        let (color, zone_label) = score_zone_info(display_score, &t);

        let ratio = (display_score / 100.0).clamp(0.0, 1.0);
        let gauge = ratatui::widgets::Gauge::default()
            .block(
                Block::default()
                    .title(" Compliance Score ")
                    .title_style(theme::title_style())
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(t.border)),
            )
            .gauge_style(Style::default().fg(color))
            .ratio(ratio)
            .label(format!("{display_score:.0}/100 — {zone_label}"));

        frame.render_widget(gauge, area);
    }
}

/// Deadline countdown widget — computes days from now, colors by urgency.
fn render_deadline_countdown(frame: &mut Frame, area: Rect) {
    let t = theme::theme();

    let block = Block::default()
        .title(" EU AI Act Deadlines ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let deadlines = [
        ("2025-02-02", "Art. 5 — Prohibited AI practices"),
        ("2025-08-02", "Art. 50 — Transparency obligations"),
        ("2026-08-02", "Art. 6 — High-risk AI classification"),
    ];

    let now = current_epoch_days();

    let lines: Vec<Line<'_>> = deadlines
        .iter()
        .map(|(date_str, desc)| {
            let deadline_days = parse_epoch_days(date_str);
            let diff = deadline_days - now;
            let (label, color) = deadline_label(diff, &t);
            Line::from(vec![
                Span::styled(format!(" {label:<14}"), Style::default().fg(color)),
                Span::styled(*desc, Style::default().fg(t.fg)),
            ])
        })
        .collect();

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Activity log widget — last 10 items.
fn render_activity_log(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Activity Log ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if app.activity_log.is_empty() {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " No activity yet",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    let lines: Vec<Line<'_>> = app
        .activity_log
        .iter()
        .rev()
        .take(inner.height as usize)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|entry| {
            let icon_color = match entry.kind {
                crate::types::ActivityKind::Scan => t.zone_green,
                crate::types::ActivityKind::Fix => t.zone_yellow,
                crate::types::ActivityKind::Chat => t.accent,
                crate::types::ActivityKind::Watch => t.zone_yellow,
                crate::types::ActivityKind::FileOpen => t.muted,
            };
            Line::from(vec![
                Span::styled(
                    format!(" [{}] ", entry.timestamp),
                    Style::default().fg(t.muted),
                ),
                Span::styled(
                    format!("{} ", entry.kind.icon()),
                    Style::default().fg(icon_color).add_modifier(Modifier::BOLD),
                ),
                Span::styled(&*entry.detail, Style::default().fg(t.fg)),
            ])
        })
        .collect();

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Score history text sparkline.
fn render_score_history_line(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Score History ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if app.score_history.is_empty() {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " No history yet — run /scan",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    // Text sparkline using block characters
    let sparkline_chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    let sparkline: String = app
        .score_history
        .iter()
        .map(|&score| {
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            let idx = ((score / 100.0) * 7.0).clamp(0.0, 7.0) as usize;
            sparkline_chars[idx]
        })
        .collect();

    let last_score = app.score_history.last().copied().unwrap_or(0.0);
    let color = if last_score < 50.0 {
        t.zone_red
    } else if last_score < 80.0 {
        t.zone_yellow
    } else {
        t.zone_green
    };

    let lines = vec![
        Line::from(Span::styled(
            format!(" {sparkline}"),
            Style::default().fg(color),
        )),
        Line::from(Span::styled(
            format!(
                " Latest: {last_score:.0}/100  ({} scans)",
                app.score_history.len()
            ),
            Style::default().fg(t.muted),
        )),
    ];

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Original content panels layout (no scan data).
fn render_content_panels(frame: &mut Frame, area: Rect, app: &App) {
    let show_files = app.files_panel_visible;
    let show_term = app.terminal_visible;

    let left_chunks = match (show_files, show_term) {
        (true, true) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(40),
                Constraint::Percentage(35),
                Constraint::Percentage(25),
            ])
            .split(area),
        (true, false) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
            .split(area),
        (false, true) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(70), Constraint::Percentage(30)])
            .split(area),
        (false, false) => Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(100)])
            .split(area),
    };

    render_chat(frame, left_chunks[0], app, app.active_panel == Panel::Chat);

    if show_files && left_chunks.len() > 1 {
        if app.code_content.is_some() {
            super::code_viewer::render_code_viewer(
                frame,
                left_chunks[1],
                app,
                app.active_panel == Panel::CodeViewer,
            );
        } else {
            render_file_browser(
                frame,
                left_chunks[1],
                app,
                app.active_panel == Panel::FileBrowser,
            );
        }
    }

    if show_term {
        let term_idx = if show_files { 2 } else { 1 };
        if term_idx < left_chunks.len() {
            render_terminal(
                frame,
                left_chunks[term_idx],
                app,
                app.active_panel == Panel::Terminal,
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Footer: Line 1 = status bar (6 indicators), Line 2 = dynamic hints
// ═══════════════════════════════════════════════════════════════════════

/// 2-line footer: Line 1 = 6-indicator status bar; Line 2 = view-specific hints.
fn render_view_footer(frame: &mut Frame, app: &App) {
    let t = theme::theme();
    let area = frame.area();

    // ── Line 1: Status bar with 6 indicators ──
    let line1_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(2),
        width: area.width,
        height: 1,
    };

    let mut spans: Vec<Span<'_>> = Vec::new();

    // Indicator 1: Model + Provider
    if crate::providers::is_configured(&app.provider_config) {
        let model_name =
            crate::providers::display_model_name(&app.provider_config.active_model);
        spans.push(Span::styled(
            format!(" {model_name} "),
            Style::default().fg(t.accent),
        ));
    } else {
        spans.push(Span::styled(" no model ", Style::default().fg(t.muted)));
    }

    // Indicator 2: Score badge [75]
    if let Some(scan) = &app.last_scan {
        let score = scan.score.total_score;
        let (color, _) = score_zone_info(score, &t);
        spans.push(Span::styled(
            format!("[{score:.0}]"),
            Style::default().fg(color).add_modifier(Modifier::BOLD),
        ));
    }

    spans.push(Span::raw(" "));

    // Indicator 3: View [N Name]
    spans.push(Span::styled(
        format!("[{} {}]", app.view_state.index() + 1, app.view_state.short_name()),
        Style::default().fg(t.fg),
    ));

    spans.push(Span::raw(" "));

    // Indicator 4: Watch [W]
    if app.watch_active {
        spans.push(Span::styled(
            "[W]",
            Style::default()
                .fg(t.zone_green)
                .add_modifier(Modifier::BOLD),
        ));
    }

    spans.push(Span::raw(" "));

    // Indicator 5: Context usage [ctx:N%]
    let ctx_pct = (app.messages.len() as u32).saturating_mul(100) / 32;
    let ctx_color = if ctx_pct > 80 {
        t.zone_red
    } else if ctx_pct > 50 {
        t.zone_yellow
    } else {
        t.muted
    };
    spans.push(Span::styled(
        format!("[ctx:{ctx_pct}%]"),
        Style::default().fg(ctx_color),
    ));

    spans.push(Span::raw(" "));

    // Indicator 6: Cost [$0.xxx] — always visible, defaults to $0.000
    let cost = if let Some((prompt, completion)) = app.last_token_usage {
        // Rough cost estimate: $0.003/1k prompt + $0.015/1k completion (Claude-class)
        f64::from(prompt) * 0.000_003 + f64::from(completion) * 0.000_015
    } else {
        0.0
    };
    spans.push(Span::styled(
        format!("[${cost:.3}]"),
        Style::default().fg(t.muted),
    ));

    // Show elapsed time if operation in progress
    if let Some(secs) = app.elapsed_secs() {
        spans.push(Span::styled(
            format!(" {secs}s "),
            Style::default().fg(t.muted),
        ));
        spans.push(Span::styled(
            app.spinner.frame(),
            Style::default().fg(t.accent),
        ));
    }

    // Engine status indicator
    let engine_indicator = match app.engine_status {
        crate::types::EngineConnectionStatus::Connected => {
            Span::styled(" ●", Style::default().fg(t.zone_green))
        }
        crate::types::EngineConnectionStatus::Connecting => {
            Span::styled(" ○", Style::default().fg(t.zone_yellow))
        }
        _ => Span::styled(" ✗", Style::default().fg(t.zone_red)),
    };
    spans.push(engine_indicator);

    frame.render_widget(Paragraph::new(Line::from(spans)), line1_area);

    // ── Line 2: Input mode + view-specific hints ──
    let line2_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(1),
        width: area.width,
        height: 1,
    };

    let mode_str = if app.colon_mode {
        " COLON "
    } else {
        match app.input_mode {
            crate::types::InputMode::Normal => " NORMAL ",
            crate::types::InputMode::Insert => " INSERT ",
            crate::types::InputMode::Command => " CMD ",
            crate::types::InputMode::Visual => " VISUAL ",
        }
    };

    let hint_text = footer_hints_for_view(app.view_state);

    let mut hint_spans: Vec<Span<'_>> = vec![
        Span::styled(mode_str, theme::status_bar_style()),
        Span::raw(" "),
    ];

    if app.colon_mode {
        // Show `:input` + autocomplete hint
        hint_spans.push(Span::styled(":", Style::default().fg(t.accent)));
        hint_spans.push(Span::styled(&*app.input, Style::default().fg(t.fg)));
        hint_spans.push(Span::styled("▌", Style::default().fg(t.accent)));
        // Autocomplete hint
        if let Some(hint) = crate::components::command_palette::complete_colon_command(&app.input) {
            if hint != app.input {
                let remaining = &hint[app.input.len()..];
                hint_spans.push(Span::styled(remaining, Style::default().fg(t.muted)));
            }
        }
        hint_spans.push(Span::styled(
            "  Tab:complete Enter:run Esc:cancel",
            Style::default().fg(t.muted),
        ));
    } else {
        // Parse hint text into styled spans (key:desc pairs)
        for part in hint_text.split(' ') {
            if let Some((key, desc)) = part.split_once(':') {
                hint_spans.push(Span::styled(key, Style::default().fg(t.accent)));
                hint_spans.push(Span::styled(
                    format!(":{desc} "),
                    Style::default().fg(t.muted),
                ));
            } else if !part.is_empty() {
                hint_spans.push(Span::styled(
                    format!("{part} "),
                    Style::default().fg(t.muted),
                ));
            }
        }
    }

    frame.render_widget(Paragraph::new(Line::from(hint_spans)), line2_area);
}

/// View-specific footer hints (line 2).
pub fn footer_hints_for_view(view: ViewState) -> &'static str {
    match view {
        ViewState::Dashboard => "1-6:view Tab:mode e:zoom i:ins /:cmd ::colon ^Z:undo U:history ?:help",
        ViewState::Scan => "a:All c:Crit h:High m:Med l:Low Enter:detail f:fix x:explain d:dismiss o:open j/k:nav",
        ViewState::Fix => "Space:toggle a:all n:none d:diff </>:resize Enter:apply j/k:nav",
        ViewState::Chat => "Tab:complete @OBL:ref !cmd Enter:send",
        ViewState::Timeline => "j/k:scroll",
        ViewState::Report => "e:export j/k:scroll",
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Overlays
// ═══════════════════════════════════════════════════════════════════════

fn render_overlay(frame: &mut Frame, app: &App) {
    match &app.overlay {
        Overlay::None => {}
        Overlay::CommandPalette => {
            crate::components::command_palette::render_command_palette(
                frame,
                &app.overlay_filter,
            );
        }
        Overlay::FilePicker => {
            crate::components::file_picker::render_file_picker(
                frame,
                &app.overlay_filter,
                &app.file_tree,
            );
        }
        Overlay::Help => render_help_overlay(frame, app),
        Overlay::GettingStarted => render_getting_started_overlay(frame),
        Overlay::ProviderSetup => {
            crate::components::provider_setup::render_provider_setup(frame, app);
        }
        Overlay::ModelSelector => {
            crate::components::model_selector::render_model_selector(frame, app);
        }
        Overlay::ThemePicker => {
            if let Some(state) = &app.theme_picker {
                crate::theme_picker::render_theme_picker(frame, state);
            }
        }
        Overlay::Onboarding => {
            if let Some(wizard) = &app.onboarding {
                crate::views::onboarding::render_onboarding(frame, wizard);
            }
        }
        Overlay::ConfirmDialog => {
            if let Some(dialog) = &app.confirm_dialog {
                crate::components::confirm_dialog::render_confirm_dialog(frame, dialog);
            }
        }
        Overlay::DismissModal => {
            // Render dismiss reason picker as a simple centered overlay
            if let Some(modal) = &app.dismiss_modal {
                render_dismiss_modal(frame, modal);
            }
        }
        Overlay::UndoHistory => {
            crate::components::undo_history::render_undo_history(frame, &app.undo_history);
        }
    }

    // Always render toasts on top of everything
    crate::components::toast::render_toasts(frame, frame.area(), &app.toasts);
}

/// Scrollable help overlay — shows view-specific section first, then global shortcuts.
fn render_help_overlay(frame: &mut Frame, app: &App) {
    use ratatui::widgets::Clear;

    let t = theme::theme();
    let area = centered_rect(60, 70, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Keyboard Shortcuts ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let mut lines: Vec<Line<'_>> = Vec::new();

    // View-specific section first
    let view_section = help_section_for_view(app.view_state, &t);
    if !view_section.is_empty() {
        lines.push(Line::from(Span::styled(
            format!(" {} View", app.view_state.short_name()),
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )));
        lines.extend(view_section);
        lines.push(Line::raw(""));
    }

    // Global section
    lines.push(Line::from(Span::styled(
        " General",
        Style::default()
            .fg(t.accent)
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(shortcut_line("  Ctrl+C", "Quit", &t));
    lines.push(shortcut_line("  1-6", "Switch view", &t));
    lines.push(shortcut_line("  Tab", "Toggle mode (Scan/Fix/Watch)", &t));
    lines.push(shortcut_line("  w", "Toggle watch mode", &t));
    lines.push(shortcut_line("  Alt+1..5", "Jump to panel", &t));
    lines.push(shortcut_line("  i", "Insert mode", &t));
    lines.push(shortcut_line("  Esc", "Normal mode", &t));
    lines.push(shortcut_line("  /", "Command mode", &t));
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        " Navigation",
        Style::default()
            .fg(t.accent)
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(shortcut_line("  j/k", "Scroll up/down", &t));
    lines.push(shortcut_line("  Ctrl+D/U", "Half-page down/up", &t));
    lines.push(shortcut_line("  g/G", "Top/bottom", &t));
    lines.push(shortcut_line("  Up/Down", "History (insert mode)", &t));
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        " Features",
        Style::default()
            .fg(t.accent)
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(shortcut_line("  Ctrl+P", "Command palette", &t));
    lines.push(shortcut_line("  Ctrl+B", "Toggle sidebar", &t));
    lines.push(shortcut_line("  Ctrl+T", "Toggle terminal", &t));
    lines.push(shortcut_line("  Ctrl+S", "Start scan", &t));
    lines.push(shortcut_line("  @", "File picker", &t));
    lines.push(shortcut_line("  @OBL-", "Obligation reference", &t));
    lines.push(shortcut_line("  !cmd", "Run shell command", &t));
    lines.push(shortcut_line("  V", "Visual select", &t));
    lines.push(shortcut_line("  Ctrl+K", "Send selection to AI", &t));
    lines.push(shortcut_line("  M", "Switch model", &t));
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        " j/k to scroll, Esc to close",
        Style::default().fg(t.muted),
    )));

    // Apply scroll
    let scroll = app.help_scroll.min(lines.len().saturating_sub(1));
    let paragraph = Paragraph::new(lines)
        .scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, inner);
}

/// View-specific help lines.
fn help_section_for_view<'a>(view: ViewState, t: &'a theme::ThemeColors) -> Vec<Line<'a>> {
    match view {
        ViewState::Dashboard => vec![
            shortcut_line("  1-6", "Switch view", t),
            shortcut_line("  Tab", "Toggle mode", t),
            shortcut_line("  e", "Zoom/expand widget", t),
            shortcut_line("  w", "Toggle watch", t),
            shortcut_line("  ^B", "Toggle sidebar", t),
        ],
        ViewState::Scan => vec![
            shortcut_line("  a", "Show all findings", t),
            shortcut_line("  c/h/m/l", "Filter by severity", t),
            shortcut_line("  Enter", "Open/close detail", t),
            shortcut_line("  f", "Fix selected finding", t),
            shortcut_line("  x", "Explain finding", t),
            shortcut_line("  d", "Dismiss finding", t),
            shortcut_line("  o", "Open related file", t),
            shortcut_line("  j/k", "Navigate findings", t),
        ],
        ViewState::Fix => vec![
            shortcut_line("  Space", "Toggle current fix", t),
            shortcut_line("  a", "Select all fixes", t),
            shortcut_line("  n", "Deselect all", t),
            shortcut_line("  d", "Toggle diff preview", t),
            shortcut_line("  </> ", "Resize split panel", t),
            shortcut_line("  Enter", "Apply selected fixes", t),
        ],
        ViewState::Chat => vec![
            shortcut_line("  Tab", "Autocomplete (@OBL-, /cmd)", t),
            shortcut_line("  @OBL-xxx", "Reference obligation", t),
            shortcut_line("  !cmd", "Run shell command", t),
            shortcut_line("  Enter", "Send message", t),
        ],
        ViewState::Timeline => vec![
            shortcut_line("  j/k", "Scroll timeline", t),
        ],
        ViewState::Report => vec![
            shortcut_line("  e", "Export report", t),
            shortcut_line("  j/k", "Scroll report", t),
        ],
    }
}

fn render_getting_started_overlay(frame: &mut Frame) {
    use ratatui::widgets::Clear;

    let t = theme::theme();
    let area = centered_rect(50, 50, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Welcome to Complior ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            "  Getting Started",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  1. ", Style::default().fg(t.accent)),
            Span::raw("Type /scan to scan your project"),
        ]),
        Line::from(vec![
            Span::styled("  2. ", Style::default().fg(t.accent)),
            Span::raw("Ask AI about compliance issues"),
        ]),
        Line::from(vec![
            Span::styled("  3. ", Style::default().fg(t.accent)),
            Span::raw("Use 1-6 to switch views"),
        ]),
        Line::from(vec![
            Span::styled("  4. ", Style::default().fg(t.accent)),
            Span::raw("Press ? for all keyboard shortcuts"),
        ]),
        Line::raw(""),
        Line::from(Span::styled(
            "  Press any key to start",
            Style::default().fg(t.muted),
        )),
    ];

    let paragraph = Paragraph::new(lines);
    frame.render_widget(paragraph, inner);
}

fn shortcut_line<'a>(key: &'a str, desc: &'a str, t: &theme::ThemeColors) -> Line<'a> {
    Line::from(vec![
        Span::styled(
            format!("{key:<16}"),
            Style::default().fg(t.accent),
        ),
        Span::styled(desc, Style::default().fg(t.fg)),
    ])
}

fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
    let v = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(area);
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(v[1])[1]
}

/// Render dismiss reason picker modal.
fn render_dismiss_modal(frame: &mut Frame, modal: &crate::components::quick_actions::DismissModal) {
    use ratatui::widgets::Clear;

    let t = theme::theme();
    let area = centered_rect(40, 30, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Dismiss Finding ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let reasons = crate::components::quick_actions::DismissReason::all();
    let lines: Vec<Line<'_>> = reasons
        .iter()
        .enumerate()
        .map(|(i, reason)| {
            let marker = if i == modal.cursor { "> " } else { "  " };
            let color = if i == modal.cursor { t.accent } else { t.fg };
            Line::from(Span::styled(
                format!("{marker}{reason:?}"),
                Style::default().fg(color),
            ))
        })
        .collect();

    let mut all_lines = vec![
        Line::from(Span::styled(
            " Select reason:",
            Style::default().fg(t.muted),
        )),
        Line::raw(""),
    ];
    all_lines.extend(lines);
    all_lines.push(Line::raw(""));
    all_lines.push(Line::from(Span::styled(
        " Enter:confirm  Esc:cancel",
        Style::default().fg(t.muted),
    )));

    frame.render_widget(Paragraph::new(all_lines), inner);
}

// ═══════════════════════════════════════════════════════════════════════
// Date helpers for deadline countdown
// ═══════════════════════════════════════════════════════════════════════

/// Approximate current epoch days from system time.
fn current_epoch_days() -> i64 {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    (secs / 86400) as i64
}

/// Parse "YYYY-MM-DD" into approximate epoch days.
fn parse_epoch_days(date: &str) -> i64 {
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return 0;
    }
    let y: i64 = parts[0].parse().unwrap_or(2025);
    let m: i64 = parts[1].parse().unwrap_or(1);
    let d: i64 = parts[2].parse().unwrap_or(1);
    // Approximate: 365.25 * year + 30.44 * month + day from epoch
    // More accurate: days from 1970-01-01
    let days = (y - 1970) * 365 + (y - 1969) / 4 - (y - 1901) / 100 + (y - 1601) / 400
        + (m - 1) * 30 + (m + 1) / 2 - if m > 2 { 2 } else { 0 }
        + d - 1;
    days
}

/// Format deadline diff into human-readable label with urgency color.
fn deadline_label(days_diff: i64, t: &theme::ThemeColors) -> (String, ratatui::style::Color) {
    if days_diff < 0 {
        let abs = -days_diff;
        (format!("{abs}d overdue"), t.zone_red)
    } else if days_diff < 90 {
        (format!("{days_diff}d left"), t.zone_yellow)
    } else {
        (format!("{days_diff}d left"), t.zone_green)
    }
}

/// Score → (color, zone label).
fn score_zone_info(score: f64, t: &theme::ThemeColors) -> (ratatui::style::Color, &'static str) {
    if score < 50.0 {
        (t.zone_red, "RED — Non-Compliant")
    } else if score < 80.0 {
        (t.zone_yellow, "YELLOW — Partial")
    } else {
        (t.zone_green, "GREEN — Compliant")
    }
}

#[cfg(test)]
mod tests {
    use ratatui::backend::TestBackend;
    use ratatui::Terminal;

    use super::*;

    #[test]
    fn snapshot_dashboard_default() {
        crate::theme::init_theme("dark");
        let app = App::new(crate::config::TuiConfig::default());
        let buf = render_to_string(&app, 120, 40);
        insta::assert_snapshot!(buf);
    }

    #[test]
    fn test_dashboard_renders_without_panic() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("render");
    }

    #[test]
    fn test_view_state_from_key() {
        assert_eq!(ViewState::from_key(1), Some(ViewState::Dashboard));
        assert_eq!(ViewState::from_key(2), Some(ViewState::Scan));
        assert_eq!(ViewState::from_key(3), Some(ViewState::Fix));
        assert_eq!(ViewState::from_key(4), Some(ViewState::Chat));
        assert_eq!(ViewState::from_key(5), Some(ViewState::Timeline));
        assert_eq!(ViewState::from_key(6), Some(ViewState::Report));
        assert_eq!(ViewState::from_key(0), None);
        assert_eq!(ViewState::from_key(7), None);
    }

    #[test]
    fn test_mode_cycling() {
        use crate::types::Mode;
        assert_eq!(Mode::Scan.next(), Mode::Fix);
        assert_eq!(Mode::Fix.next(), Mode::Watch);
        assert_eq!(Mode::Watch.next(), Mode::Scan);
        assert_eq!(Mode::Scan.label(), "SCAN");
        assert_eq!(Mode::Fix.label(), "FIX");
        assert_eq!(Mode::Watch.label(), "WATCH");
    }

    #[test]
    fn test_view_switching_action() {
        use crate::input::Action;
        let mut app = App::new(crate::config::TuiConfig::default());
        assert_eq!(app.view_state, ViewState::Dashboard);

        app.apply_action(Action::SwitchView(ViewState::Chat));
        assert_eq!(app.view_state, ViewState::Chat);

        app.apply_action(Action::SwitchView(ViewState::Scan));
        assert_eq!(app.view_state, ViewState::Scan);
    }

    #[test]
    fn test_initial_state() {
        use crate::types::Mode;
        let app = App::new(crate::config::TuiConfig::default());
        assert_eq!(app.view_state, ViewState::Dashboard);
        assert_eq!(app.mode, Mode::Scan);
    }

    #[test]
    fn test_score_color_thresholds() {
        crate::theme::init_theme("dark");
        let t = crate::theme::theme();
        let score_low: f64 = 30.0;
        let color_low = if score_low < 50.0 {
            t.zone_red
        } else if score_low < 80.0 {
            t.zone_yellow
        } else {
            t.zone_green
        };
        assert_eq!(color_low, t.zone_red);

        let score_mid: f64 = 65.0;
        let color_mid = if score_mid < 50.0 {
            t.zone_red
        } else if score_mid < 80.0 {
            t.zone_yellow
        } else {
            t.zone_green
        };
        assert_eq!(color_mid, t.zone_yellow);

        let score_high: f64 = 90.0;
        let color_high = if score_high < 50.0 {
            t.zone_red
        } else if score_high < 80.0 {
            t.zone_yellow
        } else {
            t.zone_green
        };
        assert_eq!(color_high, t.zone_green);
    }

    #[test]
    fn test_dashboard_with_no_scan() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let app = App::new(crate::config::TuiConfig::default());
        assert!(app.last_scan.is_none());

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("render");
    }

    #[test]
    fn test_dashboard_with_scan_data() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.last_scan = Some(crate::types::ScanResult {
            score: crate::types::ScoreBreakdown {
                total_score: 75.0,
                zone: crate::types::Zone::Yellow,
                category_scores: vec![],
                critical_cap_applied: false,
                total_checks: 10,
                passed_checks: 7,
                failed_checks: 3,
                skipped_checks: 0,
            },
            findings: vec![crate::types::Finding {
                check_id: "test-1".to_string(),
                r#type: "compliance".to_string(),
                message: "Missing privacy notice".to_string(),
                severity: crate::types::Severity::High,
                obligation_id: None,
                article_reference: None,
                fix: None,
            }],
            project_path: ".".to_string(),
            scanned_at: "2025-01-01".to_string(),
            duration: 1000,
            files_scanned: 5,
        });
        app.score_history = vec![60.0, 65.0, 75.0];

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("render");
    }

    // ── New T501 tests ──

    #[test]
    fn test_dashboard_2x2_grid_no_panic() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        // With scan data to trigger the 2x2 grid
        app.last_scan = Some(crate::types::ScanResult {
            score: crate::types::ScoreBreakdown {
                total_score: 85.0,
                zone: crate::types::Zone::Green,
                category_scores: vec![],
                critical_cap_applied: false,
                total_checks: 20,
                passed_checks: 17,
                failed_checks: 3,
                skipped_checks: 0,
            },
            findings: vec![],
            project_path: ".".to_string(),
            scanned_at: "2026-01-01".to_string(),
            duration: 500,
            files_scanned: 10,
        });
        app.score_history = vec![50.0, 60.0, 70.0, 80.0, 85.0];

        // Add some activity entries
        app.push_activity(crate::types::ActivityKind::Scan, "85/100");
        app.push_activity(crate::types::ActivityKind::Chat, "AI response");
        app.push_activity(crate::types::ActivityKind::FileOpen, "src/main.rs");

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("2x2 grid render should not panic");
    }

    #[test]
    fn test_deadline_countdown_colors() {
        crate::theme::init_theme("dark");
        let t = crate::theme::theme();

        // Past deadline → red
        let (label, color) = deadline_label(-30, &t);
        assert!(label.contains("overdue"));
        assert_eq!(color, t.zone_red);

        // Within 90 days → yellow
        let (label, color) = deadline_label(45, &t);
        assert!(label.contains("left"));
        assert_eq!(color, t.zone_yellow);

        // Far future → green
        let (label, color) = deadline_label(200, &t);
        assert!(label.contains("left"));
        assert_eq!(color, t.zone_green);
    }

    // ── New T504 tests ──

    #[test]
    fn test_status_bar_score_badge() {
        crate::theme::init_theme("dark");
        let t = crate::theme::theme();

        let (color, label) = score_zone_info(30.0, &t);
        assert_eq!(color, t.zone_red);
        assert!(label.contains("RED"));

        let (color, label) = score_zone_info(65.0, &t);
        assert_eq!(color, t.zone_yellow);
        assert!(label.contains("YELLOW"));

        let (color, label) = score_zone_info(90.0, &t);
        assert_eq!(color, t.zone_green);
        assert!(label.contains("GREEN"));
    }

    #[test]
    fn test_status_bar_watch_indicator() {
        let mut app = App::new(crate::config::TuiConfig::default());
        assert!(!app.watch_active);

        app.watch_active = true;
        assert!(app.watch_active);
    }

    // ── New T505 tests ──

    #[test]
    fn test_footer_hints_per_view() {
        let dashboard_hints = footer_hints_for_view(ViewState::Dashboard);
        assert!(dashboard_hints.contains("1-6:view"));
        assert!(dashboard_hints.contains("::colon"));
        assert!(dashboard_hints.contains("?:help"));

        let scan_hints = footer_hints_for_view(ViewState::Scan);
        assert!(scan_hints.contains("a:All"));
        assert!(scan_hints.contains("j/k:nav"));

        let fix_hints = footer_hints_for_view(ViewState::Fix);
        assert!(fix_hints.contains("Space:toggle"));

        let chat_hints = footer_hints_for_view(ViewState::Chat);
        assert!(chat_hints.contains("@OBL:ref"));

        let timeline_hints = footer_hints_for_view(ViewState::Timeline);
        assert!(timeline_hints.contains("j/k:scroll"));

        let report_hints = footer_hints_for_view(ViewState::Report);
        assert!(report_hints.contains("e:export"));
    }

    #[test]
    fn test_theme_picker_overlay_renders() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.theme_picker = Some(crate::theme_picker::ThemePickerState::new());
        app.overlay = Overlay::ThemePicker;

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("theme picker overlay should render");
    }

    #[test]
    fn test_onboarding_overlay_renders() {
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");
        let mut app = App::new(crate::config::TuiConfig::default());

        app.onboarding = Some(crate::views::onboarding::OnboardingWizard::new());
        app.overlay = Overlay::Onboarding;

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("onboarding overlay should render");
    }

    #[test]
    fn test_help_overlay_scroll() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::Help;
        app.help_scroll = 0;

        // Scroll down
        app.help_scroll += 5;
        assert_eq!(app.help_scroll, 5);

        // Scroll up
        app.help_scroll = app.help_scroll.saturating_sub(3);
        assert_eq!(app.help_scroll, 2);

        // Render with scroll should not panic
        crate::theme::init_theme("dark");
        let backend = TestBackend::new(120, 40);
        let mut terminal = Terminal::new(backend).expect("terminal");

        terminal
            .draw(|frame| render_dashboard(frame, &app))
            .expect("help overlay with scroll should render");
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sprint T05 — E2E Tests (render → inspect buffer)
    // ═══════════════════════════════════════════════════════════════════

    /// Helper: render app, return buffer content as a single string.
    fn render_to_string(app: &App, width: u16, height: u16) -> String {
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

    fn make_scan_result(score: f64, zone: crate::types::Zone) -> crate::types::ScanResult {
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
            },
            findings: vec![crate::types::Finding {
                check_id: "CHK-001".to_string(),
                r#type: "compliance".to_string(),
                message: "Missing AI disclosure".to_string(),
                severity: crate::types::Severity::High,
                obligation_id: None,
                article_reference: None,
                fix: Some("Add disclosure notice".to_string()),
            }],
            project_path: ".".to_string(),
            scanned_at: "2026-02-19".to_string(),
            duration: 1200,
            files_scanned: 42,
        }
    }

    // ─── T501: Enhanced Dashboard 2x2 Grid ───

    #[test]
    fn e2e_t501_score_gauge_shows_zone_label() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;

        // GREEN zone
        app.last_scan = Some(make_scan_result(85.0, crate::types::Zone::Green));
        let buf = render_to_string(&app, 120, 40);
        assert!(
            buf.contains("GREEN") && buf.contains("Compliant"),
            "Score gauge should show 'GREEN — Compliant', got:\n{}",
            buf.lines().filter(|l| l.contains("GREEN") || l.contains("Compliance Score")).collect::<Vec<_>>().join("\n")
        );

        // YELLOW zone
        app.last_scan = Some(make_scan_result(65.0, crate::types::Zone::Yellow));
        let buf = render_to_string(&app, 120, 40);
        assert!(
            buf.contains("YELLOW") && buf.contains("Partial"),
            "Score gauge should show 'YELLOW — Partial'"
        );

        // RED zone
        app.last_scan = Some(make_scan_result(30.0, crate::types::Zone::Red));
        let buf = render_to_string(&app, 120, 40);
        assert!(
            buf.contains("RED") && buf.contains("Non-Compliant"),
            "Score gauge should show 'RED — Non-Compliant'"
        );
    }

    #[test]
    fn e2e_t501_dashboard_shows_all_four_widget_titles() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;
        app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
        app.score_history = vec![50.0, 60.0, 70.0, 75.0];
        app.push_activity(crate::types::ActivityKind::Scan, "75/100");

        let buf = render_to_string(&app, 120, 40);

        assert!(buf.contains("Compliance Score"), "Missing: Compliance Score widget title");
        assert!(buf.contains("EU AI Act Deadlines"), "Missing: Deadlines widget title");
        assert!(buf.contains("Activity Log"), "Missing: Activity Log widget title");
        assert!(buf.contains("Score History"), "Missing: Score History widget title");
    }

    #[test]
    fn e2e_t501_deadline_countdown_shows_articles() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;
        app.last_scan = Some(make_scan_result(70.0, crate::types::Zone::Yellow));

        let buf = render_to_string(&app, 120, 40);

        assert!(buf.contains("Art. 5"), "Deadline widget should show Art. 5");
        assert!(buf.contains("Art. 50"), "Deadline widget should show Art. 50");
        assert!(buf.contains("Art. 6"), "Deadline widget should show Art. 6");
        // Should show urgency (overdue/left)
        assert!(
            buf.contains("overdue") || buf.contains("left"),
            "Deadline widget should show urgency labels"
        );
    }

    #[test]
    fn e2e_t501_activity_log_shows_entries_with_icons() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;
        app.last_scan = Some(make_scan_result(80.0, crate::types::Zone::Green));

        app.push_activity(crate::types::ActivityKind::Scan, "80/100");
        app.push_activity(crate::types::ActivityKind::Chat, "AI response");
        app.push_activity(crate::types::ActivityKind::FileOpen, "src/main.rs");

        let buf = render_to_string(&app, 120, 40);

        // Activity log should show icons S, C, O
        assert!(buf.contains(" S "), "Activity log should show Scan icon 'S'");
        assert!(buf.contains(" C "), "Activity log should show Chat icon 'C'");
        assert!(buf.contains(" O "), "Activity log should show FileOpen icon 'O'");
        assert!(buf.contains("80/100"), "Activity log should show scan detail");
        assert!(buf.contains("AI response"), "Activity log should show chat detail");
    }

    #[test]
    fn e2e_t501_score_sparkline_renders_block_chars() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;
        app.last_scan = Some(make_scan_result(90.0, crate::types::Zone::Green));
        app.score_history = vec![20.0, 40.0, 60.0, 80.0, 90.0];

        let buf = render_to_string(&app, 120, 40);

        // Sparkline characters (▁▂▃▄▅▆▇█) should be present
        let sparkline_chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        let has_sparkline = sparkline_chars.iter().any(|c| buf.contains(*c));
        assert!(has_sparkline, "Score History should contain sparkline block characters");
        assert!(buf.contains("Latest:"), "Score History should show 'Latest: N/100'");
        assert!(buf.contains("5 scans"), "Score History should show scan count");
    }

    #[test]
    fn e2e_t501_empty_activity_log_shows_placeholder() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;
        app.last_scan = Some(make_scan_result(70.0, crate::types::Zone::Yellow));
        // No activity entries pushed

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("No activity yet"), "Empty activity log should show placeholder");
    }

    #[test]
    fn e2e_t501_empty_score_history_shows_placeholder() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;
        app.last_scan = Some(make_scan_result(70.0, crate::types::Zone::Yellow));
        app.score_history.clear();

        let buf = render_to_string(&app, 120, 40);
        assert!(
            buf.contains("No history yet"),
            "Empty score history should show placeholder"
        );
    }

    // ─── T504: Status Bar 6 Indicators ───

    #[test]
    fn e2e_t504_status_bar_shows_no_model_when_unconfigured() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        // Force empty provider config (disk may have a real provider configured)
        app.provider_config = crate::providers::ProviderConfig::default();

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("no model"), "Status bar should show 'no model' when no provider configured");
    }

    #[test]
    fn e2e_t504_status_bar_shows_view_indicator() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Dashboard view
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[1 Dashboard]"), "Status bar should show [1 Dashboard]");

        // Switch to Chat view
        app.view_state = ViewState::Chat;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[4 Chat]"), "Status bar should show [4 Chat]");

        // Switch to Scan view
        app.view_state = ViewState::Scan;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[2 Scan]"), "Status bar should show [2 Scan]");
    }

    #[test]
    fn e2e_t504_status_bar_shows_score_badge() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[75]"), "Status bar should show score badge [75]");
    }

    #[test]
    fn e2e_t504_status_bar_watch_indicator_visible_when_active() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Watch inactive — [W] should NOT appear
        app.watch_active = false;
        let buf = render_to_string(&app, 120, 40);
        // The last 2 lines are the footer
        let footer_lines: Vec<&str> = buf.lines().rev().take(2).collect();
        let footer = footer_lines.join("\n");
        assert!(!footer.contains("[W]"), "Status bar should NOT show [W] when watch inactive");

        // Watch active — [W] SHOULD appear
        app.watch_active = true;
        let buf = render_to_string(&app, 120, 40);
        let footer_lines: Vec<&str> = buf.lines().rev().take(2).collect();
        let footer = footer_lines.join("\n");
        assert!(footer.contains("[W]"), "Status bar should show [W] when watch active");
    }

    #[test]
    fn e2e_t504_status_bar_context_indicator() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[ctx:"), "Status bar should show context usage [ctx:N%]");
    }

    #[test]
    fn e2e_t504_status_bar_cost_indicator() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Without usage
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[$0.000]"), "Status bar should show [$0.000] with no token usage");

        // With usage
        app.last_token_usage = Some((1000, 500));
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[$0."), "Status bar should show cost estimate");
        assert!(!buf.contains("[$0.000]"), "Cost should be >0 with token usage");
    }

    #[test]
    fn e2e_t504_status_bar_engine_indicator() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Connected
        app.engine_status = crate::types::EngineConnectionStatus::Connected;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains('●'), "Connected engine should show filled circle ●");

        // Connecting
        app.engine_status = crate::types::EngineConnectionStatus::Connecting;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains('○'), "Connecting engine should show hollow circle ○");

        // Error
        app.engine_status = crate::types::EngineConnectionStatus::Error;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains('✗'), "Error engine should show ✗");
    }

    // ─── T505: Dynamic Footer + Help Overlay ───

    #[test]
    fn e2e_t505_footer_shows_insert_mode_badge() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Insert;

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("INSERT"), "Footer should show INSERT mode badge");
    }

    #[test]
    fn e2e_t505_footer_shows_normal_mode_badge() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Normal;

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("NORMAL"), "Footer should show NORMAL mode badge");
    }

    #[test]
    fn e2e_t505_footer_hints_change_per_view() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Dashboard view — should show dashboard-specific hints
        app.view_state = ViewState::Dashboard;
        let buf = render_to_string(&app, 120, 40);
        let last_line = buf.lines().last().unwrap_or("");
        assert!(last_line.contains("colon"), "Dashboard footer should mention colon");
        assert!(last_line.contains("undo"), "Dashboard footer should mention undo");

        // Chat view — should show chat-specific hints
        app.view_state = ViewState::Chat;
        let buf = render_to_string(&app, 120, 40);
        let last_line = buf.lines().last().unwrap_or("");
        assert!(last_line.contains("@OBL"), "Chat footer should mention @OBL");
        assert!(last_line.contains("send"), "Chat footer should mention send");
    }

    #[test]
    fn e2e_t505_help_overlay_shows_view_specific_section() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::Help;
        app.help_scroll = 0;

        // Dashboard view — help should show "Dashboard View"
        app.view_state = ViewState::Dashboard;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("Dashboard View"), "Help overlay should show 'Dashboard View' section");
        assert!(buf.contains("Keyboard Shortcuts"), "Help overlay should have title");

        // Scan view — help should show "Scan View"
        app.view_state = ViewState::Scan;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("Scan View"), "Help overlay should show 'Scan View' section");

        // Chat view — help should show "Chat View"
        app.view_state = ViewState::Chat;
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("Chat View"), "Help overlay should show 'Chat View' section");
    }

    #[test]
    fn e2e_t505_help_overlay_shows_global_shortcuts() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::Help;
        app.help_scroll = 0;

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("General"), "Help should have General section");
        assert!(buf.contains("Navigation"), "Help should have Navigation section");
        assert!(buf.contains("Features"), "Help should have Features section");
        assert!(buf.contains("Ctrl+C"), "Help should show Ctrl+C shortcut");
        assert!(buf.contains("Command palette"), "Help should show Command palette");
    }

    #[test]
    fn e2e_t505_help_overlay_scroll_changes_visible_content() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::Help;

        // Render with scroll=0
        app.help_scroll = 0;
        let buf0 = render_to_string(&app, 120, 40);

        // Render with scroll=10
        app.help_scroll = 10;
        let buf10 = render_to_string(&app, 120, 40);

        // The content should differ (scrolled down)
        assert_ne!(buf0, buf10, "Help overlay should show different content after scrolling");
    }

    // ─── T503: @OBL/@Art References ───

    #[test]
    fn e2e_t503_obl_tab_complete_full_flow() {
        let mut app = App::new(crate::config::TuiConfig::default());

        // Type "@OBL-0" and tab-complete
        app.input = "@OBL-0".to_string();
        app.input_cursor = 6;
        app.input_mode = crate::types::InputMode::Insert;

        app.apply_action(crate::input::Action::TabComplete);

        // Should complete to @OBL-001
        assert_eq!(app.input, "@OBL-001", "Tab complete should fill @OBL-001");
        assert_eq!(app.input_cursor, 8);
    }

    #[test]
    fn e2e_t503_art_tab_complete_converts_to_obl() {
        let mut app = App::new(crate::config::TuiConfig::default());

        // Type "@Art." and tab-complete
        app.input = "@Art.".to_string();
        app.input_cursor = 5;
        app.input_mode = crate::types::InputMode::Insert;

        app.apply_action(crate::input::Action::TabComplete);

        // Should convert to @OBL-xxx format
        assert!(
            app.input.starts_with("@OBL-"),
            "Art. completion should convert to @OBL- format, got: {}",
            app.input
        );
    }

    #[test]
    fn e2e_t503_obligation_context_injected_on_chat_submit() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Insert;
        app.input = "Explain @OBL-001 requirements".to_string();
        app.input_cursor = app.input.len();

        let cmd = app.apply_action(crate::input::Action::SubmitInput);

        // Should return a Chat command with injected context
        match cmd {
            Some(crate::app::AppCommand::Chat(text)) => {
                assert!(text.contains("[EU AI Act Reference]"), "Chat text should have injected context header");
                assert!(text.contains("Art. 5"), "Chat text should contain Art. 5 from OBL-001");
                assert!(text.contains("Prohibited AI Practices"), "Chat text should contain obligation title");
                assert!(text.contains("Explain @OBL-001 requirements"), "Chat text should contain original message");
            }
            other => panic!("Expected AppCommand::Chat, got: {other:?}"),
        }
    }

    #[test]
    fn e2e_t503_plain_message_no_injection() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Insert;
        app.input = "Hello, explain compliance".to_string();
        app.input_cursor = app.input.len();

        let cmd = app.apply_action(crate::input::Action::SubmitInput);

        match cmd {
            Some(crate::app::AppCommand::Chat(text)) => {
                assert!(!text.contains("[EU AI Act Reference]"), "Plain message should NOT have injected context");
                assert_eq!(text, "Hello, explain compliance");
            }
            other => panic!("Expected AppCommand::Chat, got: {other:?}"),
        }
    }

    #[test]
    fn e2e_t503_obl_tokens_highlighted_in_chat_render() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.view_state = ViewState::Chat;
        app.messages.push(crate::types::ChatMessage::new(
            crate::types::MessageRole::User,
            "Check @OBL-001 compliance".to_string(),
        ));

        let buf = render_to_string(&app, 120, 40);
        // The message text should be in the render output
        assert!(buf.contains("@OBL-001"), "Chat should render @OBL-001 token text");
        assert!(buf.contains("compliance"), "Chat should render the message text");
    }

    // ─── T502: Watch Mode ───

    #[test]
    fn e2e_t502_watch_toggle_via_key_w() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Normal;
        assert!(!app.watch_active);

        let key = crossterm::event::KeyEvent::new(
            crossterm::event::KeyCode::Char('w'),
            crossterm::event::KeyModifiers::NONE,
        );
        let action = crate::input::handle_key_event(key, &app);
        let cmd = app.apply_action(action);

        assert!(
            matches!(cmd, Some(crate::app::AppCommand::ToggleWatch)),
            "Pressing 'w' in Normal mode should produce ToggleWatch command"
        );
    }

    #[test]
    fn e2e_t502_watch_command_via_slash() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Command;
        app.input = "watch".to_string();
        app.input_cursor = 5;

        // Simulate /watch command submission
        let cmd = app.apply_action(crate::input::Action::SubmitInput);

        assert!(
            matches!(cmd, Some(crate::app::AppCommand::ToggleWatch)),
            "/watch command should produce ToggleWatch"
        );
    }

    #[test]
    fn e2e_t502_watcher_is_relevant_rejects_hidden_and_node_modules() {
        use std::path::Path;
        assert!(crate::watcher::is_relevant(Path::new("src/app.rs")));
        assert!(crate::watcher::is_relevant(Path::new("Cargo.toml")));
        assert!(!crate::watcher::is_relevant(Path::new(".git/HEAD")));
        assert!(!crate::watcher::is_relevant(Path::new(".env")));
        assert!(!crate::watcher::is_relevant(Path::new("node_modules/express/index.js")));
        assert!(!crate::watcher::is_relevant(Path::new("target/debug/complior")));
        assert!(!crate::watcher::is_relevant(Path::new("dist/bundle.js")));
        assert!(!crate::watcher::is_relevant(Path::new("build/output.js")));
        assert!(!crate::watcher::is_relevant(Path::new("__pycache__/mod.pyc")));
    }

    #[test]
    fn e2e_t502_watch_mode_status_bar_integration() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Before watch
        let buf_before = render_to_string(&app, 120, 40);
        let footer_before: String = buf_before.lines().rev().take(2).collect::<Vec<_>>().join("\n");

        // Enable watch
        app.watch_active = true;
        app.mode = crate::types::Mode::Watch;
        let buf_after = render_to_string(&app, 120, 40);
        let footer_after: String = buf_after.lines().rev().take(2).collect::<Vec<_>>().join("\n");

        assert!(!footer_before.contains("[W]"), "Footer should NOT have [W] before watch");
        assert!(footer_after.contains("[W]"), "Footer should have [W] after watch enabled");
    }

    #[test]
    fn e2e_t502_auto_scan_regression_detection_state() {
        let mut app = App::new(crate::config::TuiConfig::default());

        // Simulate first scan
        app.set_scan_result(make_scan_result(80.0, crate::types::Zone::Green));
        assert_eq!(app.score_history.last().copied(), Some(80.0));

        // Simulate watch_last_score being set before auto-scan
        app.watch_last_score = Some(80.0);

        // Second scan with lower score (simulating regression)
        app.set_scan_result(make_scan_result(70.0, crate::types::Zone::Yellow));

        // Verify score history updated
        assert_eq!(app.score_history.len(), 2);
        assert_eq!(app.score_history[0], 80.0);
        assert_eq!(app.score_history[1], 70.0);
    }

    // ─── Cross-cutting: All 6 views render without panic ───

    #[test]
    fn e2e_all_views_render_with_scan_data() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = false;
        app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
        app.score_history = vec![60.0, 70.0, 75.0];
        app.push_activity(crate::types::ActivityKind::Scan, "75/100");

        for view in ViewState::ALL {
            app.view_state = view;
            if view == ViewState::Fix {
                // Populate fix view from scan
                app.fix_view = crate::views::fix::FixViewState::from_scan(
                    &app.last_scan.as_ref().unwrap().findings,
                );
            }
            let buf = render_to_string(&app, 120, 40);
            assert!(
                !buf.is_empty(),
                "View {:?} should render non-empty content",
                view
            );
        }
    }

    #[test]
    fn e2e_all_views_footer_contains_mode_badge() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Normal;

        for view in ViewState::ALL {
            app.view_state = view;
            let buf = render_to_string(&app, 120, 40);
            let last_line = buf.lines().last().unwrap_or("");
            assert!(
                last_line.contains("NORMAL"),
                "View {:?} footer should contain NORMAL mode badge, got: '{}'",
                view,
                last_line
            );
        }
    }

    // ─── Edge cases ───

    #[test]
    fn e2e_tiny_terminal_no_panic() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.last_scan = Some(make_scan_result(50.0, crate::types::Zone::Yellow));

        // Very small terminal — should not panic
        let _buf = render_to_string(&app, 40, 10);
    }

    #[test]
    fn e2e_large_terminal_no_panic() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.last_scan = Some(make_scan_result(50.0, crate::types::Zone::Yellow));
        app.score_history = (0..20).map(|i| f64::from(i) * 5.0).collect();
        for i in 0..10 {
            app.push_activity(crate::types::ActivityKind::Scan, format!("scan {i}"));
        }

        let _buf = render_to_string(&app, 300, 100);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sprint T07 — Complior Zen + Advanced UX E2E Tests
    // ═══════════════════════════════════════════════════════════════════

    // ─── T704: Toast Notifications ───

    #[test]
    fn e2e_t704_toast_appears_after_scan() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        assert!(app.toasts.is_empty());

        app.set_scan_result(make_scan_result(85.0, crate::types::Zone::Green));
        assert!(!app.toasts.is_empty(), "Toast should appear after scan");
        let toast = &app.toasts.toasts[0];
        assert!(toast.message.contains("85"), "Toast should contain score");
    }

    #[test]
    fn e2e_t704_toast_overlay_renders() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.toasts.push(crate::components::toast::ToastKind::Info, "Test toast");

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("[i]"), "Toast [i] marker should render in overlay");
        assert!(buf.contains("Test toast"), "Toast message should render");
    }

    #[test]
    fn e2e_t704_confirm_dialog_y_closes() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.confirm_dialog = Some(crate::components::confirm_dialog::ConfirmDialog {
            title: "Confirm".to_string(),
            message: "Apply all?".to_string(),
            file_count: 3,
            score_impact: Some(5.0),
            on_confirm: crate::components::confirm_dialog::ConfirmAction::BatchApply,
        });
        app.overlay = Overlay::ConfirmDialog;

        // Press 'y' to confirm
        app.apply_action(crate::input::Action::InsertChar('y'));
        assert_eq!(app.overlay, Overlay::None, "ConfirmDialog should close on 'y'");
        assert!(app.confirm_dialog.is_none());
    }

    #[test]
    fn e2e_t704_confirm_dialog_n_cancels() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.confirm_dialog = Some(crate::components::confirm_dialog::ConfirmDialog {
            title: "Confirm".to_string(),
            message: "Apply?".to_string(),
            file_count: 1,
            score_impact: None,
            on_confirm: crate::components::confirm_dialog::ConfirmAction::BatchApply,
        });
        app.overlay = Overlay::ConfirmDialog;

        app.apply_action(crate::input::Action::InsertChar('n'));
        assert_eq!(app.overlay, Overlay::None, "ConfirmDialog should close on 'n'");
    }

    // ─── T702: Widget Zoom ───

    #[test]
    fn e2e_t702_zoom_toggle_via_e_key() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Normal;
        app.view_state = ViewState::Dashboard;
        assert!(!app.zoom.is_zoomed());

        // Press 'e' to zoom
        app.apply_action(crate::input::Action::ViewKey('e'));
        assert!(app.zoom.is_zoomed(), "'e' on Dashboard should toggle zoom");

        // Press 'e' again to unzoom
        app.apply_action(crate::input::Action::ViewKey('e'));
        assert!(!app.zoom.is_zoomed(), "'e' again should unzoom");
    }

    // ─── T703: Split-View Fix ───

    #[test]
    fn e2e_t703_fix_split_resize() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.view_state = ViewState::Fix;
        assert_eq!(app.fix_split_pct, 40, "Default split should be 40%");

        // Resize left '<'
        app.handle_view_key('<');
        assert_eq!(app.fix_split_pct, 35, "'<' should decrease split by 5");

        // Resize right '>'
        app.handle_view_key('>');
        app.handle_view_key('>');
        assert_eq!(app.fix_split_pct, 45, "'>' twice should increase split to 45");

        // Clamp at bounds
        for _ in 0..20 {
            app.handle_view_key('<');
        }
        assert_eq!(app.fix_split_pct, 25, "Split should clamp at 25% min");

        for _ in 0..20 {
            app.handle_view_key('>');
        }
        assert_eq!(app.fix_split_pct, 75, "Split should clamp at 75% max");
    }

    #[test]
    fn e2e_t703_fix_view_uses_split_pct() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.view_state = ViewState::Fix;
        app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
        app.fix_view = crate::views::fix::FixViewState::from_scan(
            &app.last_scan.as_ref().unwrap().findings,
        );
        app.fix_split_pct = 30;

        // Should render without panic with custom split
        let _buf = render_to_string(&app, 120, 40);
    }

    // ─── T705: Context Meter + Quick Actions ───

    #[test]
    fn e2e_t705_context_pct_updates_on_tick() {
        let mut app = App::new(crate::config::TuiConfig::default());
        assert_eq!(app.context_pct, 0);

        // Add messages to increase context
        for i in 0..10 {
            app.messages.push(crate::types::ChatMessage::new(
                crate::types::MessageRole::User,
                format!("msg {i}"),
            ));
        }

        app.tick();
        // 11 messages (1 welcome + 10) / 32 max = 34%
        assert!(app.context_pct > 0, "Context pct should update on tick");
        assert!(app.context_pct < 50, "Context pct should be reasonable");
    }

    #[test]
    fn e2e_t705_sidebar_shows_context_and_zen() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.sidebar_visible = true;
        app.zen_active = true;
        app.context_pct = 45;

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("Ctx:"), "Sidebar should show context meter");
        assert!(buf.contains("Zen"), "Sidebar should show Zen status");
    }

    #[test]
    fn e2e_t705_quick_action_d_opens_dismiss_modal() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.view_state = ViewState::Scan;
        app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
        app.scan_view.selected_finding = Some(0);

        // Press 'd' for dismiss
        app.handle_view_key('d');
        assert_eq!(app.overlay, Overlay::DismissModal, "'d' should open dismiss modal");
        assert!(app.dismiss_modal.is_some());
    }

    #[test]
    fn e2e_t705_dismiss_modal_close_on_esc() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.dismiss_modal = Some(crate::components::quick_actions::DismissModal::new(0));
        app.overlay = Overlay::DismissModal;

        app.apply_action(crate::input::Action::EnterNormalMode);
        assert_eq!(app.overlay, Overlay::None, "Dismiss modal should close on Esc");
        assert!(app.dismiss_modal.is_none());
    }

    // ─── T701: Complior Zen ───

    #[test]
    fn e2e_t701_zen_provider_in_catalog() {
        let models = crate::providers::available_models();
        let zen = models.iter().find(|m| m.provider == "complior");
        assert!(zen.is_some(), "Complior Zen should be in the model catalog");
        assert_eq!(zen.unwrap().display_name, "Complior Zen (Free)");
    }

    #[test]
    fn e2e_t701_zen_is_first_model() {
        let models = crate::providers::available_models();
        assert_eq!(models[0].provider, "complior", "Zen should be the first model");
    }

    #[test]
    fn e2e_multiple_overlays_on_different_views() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());

        // Help overlay on each view
        for view in ViewState::ALL {
            app.view_state = view;
            app.overlay = Overlay::Help;
            app.help_scroll = 0;
            let buf = render_to_string(&app, 120, 40);
            assert!(
                buf.contains("Keyboard Shortcuts"),
                "Help overlay should render on {:?} view",
                view
            );
            assert!(
                buf.contains(&format!("{} View", view.short_name())),
                "Help overlay should show {:?} View section",
                view
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sprint T08 — Advanced UX Part 2 + Polish
    // ═══════════════════════════════════════════════════════════════════

    // ─── T803: Responsive Layout ───

    #[test]
    fn e2e_t803_responsive_tiny() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.last_scan = Some(make_scan_result(75.0, crate::types::Zone::Yellow));
        app.sidebar_visible = false;

        // Tiny terminal (40 cols) — should not panic and show minimal summary
        let buf = render_to_string(&app, 40, 10);
        assert!(!buf.is_empty(), "Tiny terminal should render something");
    }

    // ─── T806: Mouse Support ───

    #[test]
    fn t806_scroll_accel_slow() {
        let app = App::new(crate::config::TuiConfig::default());
        // No recent scroll events → should be 1 line
        let lines = crate::input::scroll_line_count_for_test(&app);
        assert_eq!(lines, 1);
    }

    #[test]
    fn t806_scroll_accel_fast() {
        let mut app = App::new(crate::config::TuiConfig::default());
        let now = std::time::Instant::now();
        // Add 4 recent scroll events
        for _ in 0..4 {
            app.scroll_events.push(now);
        }
        let lines = crate::input::scroll_line_count_for_test(&app);
        assert!(lines > 1, "Fast scrolling should accelerate (got {lines})");
    }

    #[test]
    fn t806_click_target_view_tab() {
        let mut app = App::new(crate::config::TuiConfig::default());
        assert_eq!(app.view_state, ViewState::Dashboard);

        app.apply_action(crate::input::Action::ClickAt(
            crate::types::ClickTarget::ViewTab(ViewState::Scan),
        ));
        assert_eq!(app.view_state, ViewState::Scan, "Click on Scan tab should switch view");
    }

    #[test]
    fn t806_click_noop_empty() {
        let mut app = App::new(crate::config::TuiConfig::default());
        // No click areas registered — click should be no-op
        let mouse = crossterm::event::MouseEvent {
            kind: crossterm::event::MouseEventKind::Down(crossterm::event::MouseButton::Left),
            column: 50,
            row: 10,
            modifiers: crossterm::event::KeyModifiers::NONE,
        };
        let action = crate::input::handle_mouse_event(mouse, &app);
        assert!(matches!(action, crate::input::Action::None));
    }

    // ─── T804: Colon-Command Mode ───

    #[test]
    fn t804_colon_enters_mode() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.input_mode = crate::types::InputMode::Normal;

        app.apply_action(crate::input::Action::EnterColonMode);
        assert!(app.colon_mode, "EnterColonMode should set colon_mode");
        assert_eq!(app.input_mode, crate::types::InputMode::Command);
        assert!(app.input.is_empty());
    }

    #[test]
    fn t804_colon_cmd_scan() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.colon_mode = true;
        app.input_mode = crate::types::InputMode::Command;
        app.input = "scan".to_string();
        app.input_cursor = 4;

        let cmd = app.apply_action(crate::input::Action::SubmitInput);
        assert!(matches!(cmd, Some(crate::app::AppCommand::Scan)), "`:scan` should return Scan command");
        assert!(!app.colon_mode, "colon_mode should be cleared after submit");
    }

    #[test]
    fn t804_colon_cmd_quit() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.colon_mode = true;
        app.input_mode = crate::types::InputMode::Command;
        app.input = "quit".to_string();
        app.input_cursor = 4;

        let cmd = app.apply_action(crate::input::Action::SubmitInput);
        assert!(cmd.is_none());
        assert!(!app.running, "`:quit` should set running=false");
    }

    #[test]
    fn t804_colon_tab_complete() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.colon_mode = true;
        app.input_mode = crate::types::InputMode::Command;
        app.input = "sc".to_string();
        app.input_cursor = 2;

        app.apply_action(crate::input::Action::TabComplete);
        assert_eq!(app.input, "scan", "Tab should complete 'sc' to 'scan'");
    }

    #[test]
    fn t804_colon_esc() {
        let mut app = App::new(crate::config::TuiConfig::default());
        app.colon_mode = true;
        app.input_mode = crate::types::InputMode::Command;

        app.apply_action(crate::input::Action::EnterNormalMode);
        assert!(!app.colon_mode, "Esc should clear colon_mode");
        assert_eq!(app.input_mode, crate::types::InputMode::Normal);
    }

    // ─── T08: Owl Header + Animations ───

    #[test]
    fn e2e_t08_owl_header_renders() {
        crate::theme::init_theme("dark");
        let app = App::new(crate::config::TuiConfig::default());
        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("(o)(o)"), "Owl header should render");
        assert!(buf.contains("complior"), "Owl header should show version");
    }

    #[test]
    fn e2e_t08_undo_overlay_renders() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.overlay = Overlay::UndoHistory;

        let buf = render_to_string(&app, 120, 40);
        assert!(buf.contains("Undo History"), "Undo History overlay should render");
    }

    #[test]
    fn e2e_t08_colon_mode_footer() {
        crate::theme::init_theme("dark");
        let mut app = App::new(crate::config::TuiConfig::default());
        app.colon_mode = true;
        app.input_mode = crate::types::InputMode::Command;
        app.input = "the".to_string();

        let buf = render_to_string(&app, 120, 40);
        let last_line = buf.lines().last().unwrap_or("");
        assert!(last_line.contains("COLON"), "Footer should show COLON mode badge");
    }
}
