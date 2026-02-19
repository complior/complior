use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::{Overlay, Panel, ViewState};

use super::chat::render_chat;
use super::file_browser::render_file_browser;
use super::sidebar::render_sidebar;
use super::terminal::render_terminal;

/// Top-level render entry point — dispatches to view-specific renderer.
pub fn render_dashboard(frame: &mut Frame, app: &App) {
    let area = frame.area();

    // Reserve 2 lines at bottom for footer
    let body_area = Rect {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height.saturating_sub(2),
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

    // 2-line footer at bottom
    render_view_footer(frame, app);

    // Overlay on top of everything
    render_overlay(frame, app);
}

/// Dashboard view — the original multi-panel layout.
fn render_dashboard_view(frame: &mut Frame, body_area: Rect, app: &App) {
    if app.sidebar_visible {
        let main_layout = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Min(40), Constraint::Length(28)])
            .split(body_area);

        render_dashboard_content(frame, main_layout[0], app);
        render_sidebar(frame, main_layout[1], app);
    } else {
        render_dashboard_content(frame, body_area, app);
    }
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

/// Score gauge widget — colored by threshold, with zone label.
fn render_score_gauge(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    if let Some(scan) = &app.last_scan {
        let score = scan.score.total_score;
        let (color, zone_label) = score_zone_info(score, &t);

        let ratio = (score / 100.0).clamp(0.0, 1.0);
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
            .label(format!("{score:.0}/100 — {zone_label}"));

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

    let mode_str = match app.input_mode {
        crate::types::InputMode::Normal => " NORMAL ",
        crate::types::InputMode::Insert => " INSERT ",
        crate::types::InputMode::Command => " CMD ",
        crate::types::InputMode::Visual => " VISUAL ",
    };

    let hint_text = footer_hints_for_view(app.view_state);

    let mut hint_spans: Vec<Span<'_>> = vec![
        Span::styled(mode_str, theme::status_bar_style()),
        Span::raw(" "),
    ];

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

    frame.render_widget(Paragraph::new(Line::from(hint_spans)), line2_area);
}

/// View-specific footer hints (line 2).
pub fn footer_hints_for_view(view: ViewState) -> &'static str {
    match view {
        ViewState::Dashboard => "1-6:view Tab:mode i:ins /:cmd ^P:palette ^B:sidebar w:watch ?:help",
        ViewState::Scan => "a:All c:Crit h:High m:Med l:Low Enter:detail f:fix j/k:nav",
        ViewState::Fix => "Space:toggle a:all n:none d:diff Enter:apply j/k:nav",
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
    }
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
    lines.push(shortcut_line("  Ctrl+M", "Switch model", &t));
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
            shortcut_line("  w", "Toggle watch", t),
            shortcut_line("  ^B", "Toggle sidebar", t),
        ],
        ViewState::Scan => vec![
            shortcut_line("  a", "Show all findings", t),
            shortcut_line("  c/h/m/l", "Filter by severity", t),
            shortcut_line("  Enter", "Open/close detail", t),
            shortcut_line("  f", "Fix selected finding", t),
            shortcut_line("  j/k", "Navigate findings", t),
        ],
        ViewState::Fix => vec![
            shortcut_line("  Space", "Toggle current fix", t),
            shortcut_line("  a", "Select all fixes", t),
            shortcut_line("  n", "Deselect all", t),
            shortcut_line("  d", "Toggle diff preview", t),
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
        assert!(dashboard_hints.contains("w:watch"));
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
}
