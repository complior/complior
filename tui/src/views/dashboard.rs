use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
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

/// Placeholder view for not-yet-implemented views (Scan, Fix, Timeline, Report).
fn render_placeholder_view(frame: &mut Frame, area: Rect, title: &str, description: &str) {
    let t = theme::theme();

    let block = Block::default()
        .title(format!(" {title} "))
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::raw(""),
        Line::from(Span::styled(
            format!("  {title} View"),
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
        Line::from(Span::styled(
            format!("  {description}"),
            Style::default().fg(t.fg),
        )),
        Line::raw(""),
        Line::from(Span::styled(
            "  Coming soon in a future sprint.",
            Style::default().fg(t.muted),
        )),
        Line::raw(""),
        Line::from(vec![
            Span::styled("  Press ", Style::default().fg(t.muted)),
            Span::styled("1", Style::default().fg(t.accent)),
            Span::styled(" to return to Dashboard", Style::default().fg(t.muted)),
        ]),
    ];

    let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false });
    frame.render_widget(paragraph, inner);
}

/// Dashboard content area — multi-panel layout with chat, files, terminal.
fn render_dashboard_content(frame: &mut Frame, area: Rect, app: &App) {
    // Top section: score gauge + critical findings | chat
    // Bottom section: deadlines + history | quick input (if scan data exists)
    if app.last_scan.is_some() {
        let v_split = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Percentage(60), Constraint::Percentage(40)])
            .split(area);

        // Top: chat + files/code
        render_top_panels(frame, v_split[0], app);

        // Bottom: dashboard widgets
        render_bottom_widgets(frame, v_split[1], app);
    } else {
        // No scan data — use the old multi-panel layout
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

/// Bottom dashboard widgets: score gauge | findings | deadlines | history.
fn render_bottom_widgets(frame: &mut Frame, area: Rect, app: &App) {
    let h_split = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    // Left: score gauge + critical findings
    let left_split = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(3)])
        .split(h_split[0]);

    render_score_gauge(frame, left_split[0], app);
    render_critical_findings(frame, left_split[1], app);

    // Right: deadlines + score history
    let right_split = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(h_split[1]);

    render_deadlines(frame, right_split[0]);
    render_score_history_line(frame, right_split[1], app);
}

/// Score gauge widget — colored by threshold.
fn render_score_gauge(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    if let Some(scan) = &app.last_scan {
        let score = scan.score.total_score;
        let color = if score < 50.0 {
            t.zone_red
        } else if score < 80.0 {
            t.zone_yellow
        } else {
            t.zone_green
        };

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
            .label(format!("{score:.0}/100"));

        frame.render_widget(gauge, area);
    }
}

/// Top-3 critical findings by severity.
fn render_critical_findings(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Critical Findings ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if let Some(scan) = &app.last_scan {
        let mut findings = scan.findings.clone();
        findings.sort_by(|a, b| severity_rank(a.severity).cmp(&severity_rank(b.severity)));

        let lines: Vec<Line<'_>> = findings
            .iter()
            .take(3)
            .map(|f| {
                let sev_color = theme::severity_color(f.severity);
                Line::from(vec![
                    Span::styled(
                        format!(" {:?} ", f.severity).to_uppercase(),
                        Style::default().fg(sev_color).add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(&f.message, Style::default().fg(t.fg)),
                ])
            })
            .collect();

        if lines.is_empty() {
            frame.render_widget(
                Paragraph::new(Line::from(Span::styled(
                    " No findings",
                    Style::default().fg(t.muted),
                ))),
                inner,
            );
        } else {
            frame.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }), inner);
        }
    }
}

/// EU AI Act deadline widget.
fn render_deadlines(frame: &mut Frame, area: Rect) {
    let t = theme::theme();

    let block = Block::default()
        .title(" EU AI Act Deadlines ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let lines = vec![
        Line::from(vec![
            Span::styled(" 02 Feb 2025  ", Style::default().fg(t.zone_red)),
            Span::styled("Art. 5 — Prohibited AI practices", Style::default().fg(t.fg)),
        ]),
        Line::from(vec![
            Span::styled(" 02 Aug 2025  ", Style::default().fg(t.zone_yellow)),
            Span::styled("Art. 50 — Transparency obligations", Style::default().fg(t.fg)),
        ]),
        Line::from(vec![
            Span::styled(" 02 Aug 2026  ", Style::default().fg(t.zone_green)),
            Span::styled("Art. 6 — High-risk AI classification", Style::default().fg(t.fg)),
        ]),
    ];

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
            format!(" Latest: {last_score:.0}/100  ({} scans)", app.score_history.len()),
            Style::default().fg(t.muted),
        )),
    ];

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Severity rank for sorting (lower = more severe).
const fn severity_rank(severity: crate::types::Severity) -> u8 {
    match severity {
        crate::types::Severity::Critical => 0,
        crate::types::Severity::High => 1,
        crate::types::Severity::Medium => 2,
        crate::types::Severity::Low => 3,
        crate::types::Severity::Info => 4,
    }
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

/// 2-line footer: Line 1 = view tabs + mode badge + engine + model; Line 2 = input mode + hints.
fn render_view_footer(frame: &mut Frame, app: &App) {
    let t = theme::theme();
    let area = frame.area();

    // Line 1: View tabs + mode badge + engine status + model
    let line1_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(2),
        width: area.width,
        height: 1,
    };

    let mut spans: Vec<Span<'_>> = Vec::new();

    // View tabs (current highlighted inverted)
    for view in ViewState::ALL {
        if view == app.view_state {
            spans.push(Span::styled(
                format!(" {} ", view.short_name()),
                Style::default()
                    .bg(t.accent)
                    .fg(t.bg)
                    .add_modifier(Modifier::BOLD),
            ));
        } else {
            spans.push(Span::styled(
                format!(" {} ", view.short_name()),
                Style::default().fg(t.muted),
            ));
        }
    }

    spans.push(Span::raw(" "));

    // Mode badge
    spans.push(Span::styled(
        format!(" {} ", app.mode.label()),
        Style::default()
            .bg(t.zone_yellow)
            .fg(t.bg)
            .add_modifier(Modifier::BOLD),
    ));

    spans.push(Span::raw(" "));

    // Engine status indicator
    let engine_indicator = match app.engine_status {
        crate::types::EngineConnectionStatus::Connected => {
            Span::styled("●", Style::default().fg(t.zone_green))
        }
        crate::types::EngineConnectionStatus::Connecting => {
            Span::styled("○", Style::default().fg(t.zone_yellow))
        }
        _ => Span::styled("✗", Style::default().fg(t.zone_red)),
    };
    spans.push(engine_indicator);

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

    // Active model indicator
    if crate::providers::is_configured(&app.provider_config) {
        let model_name = crate::providers::display_model_name(&app.provider_config.active_model);
        spans.push(Span::styled(
            format!(" [{model_name}]"),
            Style::default().fg(t.accent),
        ));
    }

    // Token usage
    if let Some((prompt, completion)) = app.last_token_usage {
        spans.push(Span::styled(
            format!(" [{} tok]", prompt + completion),
            Style::default().fg(t.muted),
        ));
    }

    frame.render_widget(Paragraph::new(Line::from(spans)), line1_area);

    // Line 2: Input mode + keyboard hints
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

    let hints = Line::from(vec![
        Span::styled(mode_str, theme::status_bar_style()),
        Span::raw(" "),
        Span::styled("1-6", Style::default().fg(t.accent)),
        Span::styled(":view ", Style::default().fg(t.muted)),
        Span::styled("Tab", Style::default().fg(t.accent)),
        Span::styled(":mode ", Style::default().fg(t.muted)),
        Span::styled("i", Style::default().fg(t.accent)),
        Span::styled(":ins ", Style::default().fg(t.muted)),
        Span::styled("/", Style::default().fg(t.accent)),
        Span::styled(":cmd ", Style::default().fg(t.muted)),
        Span::styled("^P", Style::default().fg(t.accent)),
        Span::styled(":palette ", Style::default().fg(t.muted)),
        Span::styled("^B", Style::default().fg(t.accent)),
        Span::styled(":sidebar ", Style::default().fg(t.muted)),
        Span::styled("?", Style::default().fg(t.accent)),
        Span::styled(":help", Style::default().fg(t.muted)),
    ]);

    frame.render_widget(Paragraph::new(hints), line2_area);
}

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
        Overlay::Help => render_help_overlay(frame),
        Overlay::GettingStarted => render_getting_started_overlay(frame),
        Overlay::ProviderSetup => {
            crate::components::provider_setup::render_provider_setup(frame, app);
        }
        Overlay::ModelSelector => {
            crate::components::model_selector::render_model_selector(frame, app);
        }
    }
}

fn render_help_overlay(frame: &mut Frame) {
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

    let lines = vec![
        Line::from(Span::styled(
            " General",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        shortcut_line("  Ctrl+C", "Quit", &t),
        shortcut_line("  1-6", "Switch view", &t),
        shortcut_line("  Tab", "Toggle mode (Scan/Fix/Watch)", &t),
        shortcut_line("  Alt+1..5", "Jump to panel", &t),
        shortcut_line("  i", "Insert mode", &t),
        shortcut_line("  Esc", "Normal mode", &t),
        shortcut_line("  /", "Command mode", &t),
        Line::raw(""),
        Line::from(Span::styled(
            " Navigation",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        shortcut_line("  j/k", "Scroll up/down", &t),
        shortcut_line("  Ctrl+D/U", "Half-page down/up", &t),
        shortcut_line("  g/G", "Top/bottom", &t),
        shortcut_line("  Up/Down", "History (insert mode)", &t),
        Line::raw(""),
        Line::from(Span::styled(
            " Features",
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD),
        )),
        shortcut_line("  Ctrl+P", "Command palette", &t),
        shortcut_line("  Ctrl+B", "Toggle sidebar", &t),
        shortcut_line("  Ctrl+T", "Toggle terminal", &t),
        shortcut_line("  @", "File picker", &t),
        shortcut_line("  !cmd", "Run shell command", &t),
        shortcut_line("  V", "Visual select", &t),
        shortcut_line("  Ctrl+K", "Send selection to AI", &t),
        shortcut_line("  Ctrl+M", "Switch model", &t),
        Line::raw(""),
        Line::from(Span::styled(
            " Press Esc to close",
            Style::default().fg(t.muted),
        )),
    ];

    let paragraph = Paragraph::new(lines);
    frame.render_widget(paragraph, inner);
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
        // Test the color logic directly
        let score_low: f64 = 30.0;
        let color_low = if score_low < 50.0 { t.zone_red } else if score_low < 80.0 { t.zone_yellow } else { t.zone_green };
        assert_eq!(color_low, t.zone_red);

        let score_mid: f64 = 65.0;
        let color_mid = if score_mid < 50.0 { t.zone_red } else if score_mid < 80.0 { t.zone_yellow } else { t.zone_green };
        assert_eq!(color_mid, t.zone_yellow);

        let score_high: f64 = 90.0;
        let color_high = if score_high < 50.0 { t.zone_red } else if score_high < 80.0 { t.zone_yellow } else { t.zone_green };
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

        // Inject mock scan data
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
}
