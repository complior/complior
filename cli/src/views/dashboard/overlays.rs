use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};

use crate::app::App;
use crate::theme;
use crate::types::ViewState;

/// Scrollable help overlay -- shows view-specific section first, then global shortcuts.
pub(super) fn render_help_overlay(frame: &mut Frame, app: &App) {
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
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
        )));
        lines.extend(view_section);
        lines.push(Line::raw(""));
    }

    // Global section
    lines.push(Line::from(Span::styled(
        " General",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(shortcut_line("  Ctrl+C", "Quit", &t));
    lines.push(shortcut_line("  D/S/F/P/T/R/L", "Switch view", &t));
    lines.push(shortcut_line("  Tab", "Toggle mode (Scan/Fix/Watch)", &t));
    lines.push(shortcut_line("  w", "Toggle watch mode", &t));
    lines.push(shortcut_line("  Alt+1..5", "Jump to panel", &t));
    lines.push(shortcut_line("  i", "Insert mode", &t));
    lines.push(shortcut_line("  Esc", "Normal mode", &t));
    lines.push(shortcut_line("  /", "Command mode", &t));
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        " Navigation",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
    )));
    lines.push(shortcut_line("  j/k", "Scroll up/down", &t));
    lines.push(shortcut_line("  Ctrl+D/U", "Half-page down/up", &t));
    lines.push(shortcut_line("  g/G", "Top/bottom", &t));
    lines.push(shortcut_line("  Up/Down", "History (insert mode)", &t));
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        " Features",
        Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
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
    lines.push(Line::raw(""));
    lines.push(Line::from(Span::styled(
        " j/k to scroll, Esc to close",
        Style::default().fg(t.muted),
    )));

    // Apply scroll
    let scroll = app.help_scroll.min(lines.len().saturating_sub(1));
    let paragraph = Paragraph::new(lines).scroll((u16::try_from(scroll).unwrap_or(u16::MAX), 0));
    frame.render_widget(paragraph, inner);
}

/// View-specific help lines.
fn help_section_for_view(view: ViewState, t: &theme::ThemeColors) -> Vec<Line<'_>> {
    match view {
        ViewState::Dashboard => vec![
            shortcut_line("  D/S/F/P/T/R/L", "Switch view", t),
            shortcut_line("  Tab", "Toggle mode", t),
            shortcut_line("  e", "Zoom/expand widget", t),
            shortcut_line("  w", "Toggle watch", t),
            shortcut_line("  ^B", "Toggle sidebar", t),
        ],
        ViewState::Scan => vec![
            shortcut_line("  a", "Show all findings", t),
            shortcut_line("  c/h/m/l", "Filter by severity", t),
            shortcut_line("  p", "Toggle show passed", t),
            shortcut_line("  Enter", "Open/close detail", t),
            shortcut_line("  f", "Apply fix (inline)", t),
            shortcut_line("  x", "Explain finding", t),
            shortcut_line("  d", "Dismiss finding", t),
            shortcut_line("  o", "Open related file", t),
            shortcut_line("  n/N", "Next/prev finding (detail)", t),
            shortcut_line("  </>", "Resize split panel", t),
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
        ViewState::Log => vec![shortcut_line("  j/k", "Scroll log", t)],
        ViewState::Chat => vec![
            shortcut_line("  Tab", "Autocomplete (@OBL-, /cmd)", t),
            shortcut_line("  @OBL-xxx", "Reference obligation", t),
            shortcut_line("  !cmd", "Run shell command", t),
            shortcut_line("  Enter", "Send message", t),
        ],
        ViewState::Passport => vec![
            shortcut_line("  e", "Edit selected field", t),
            shortcut_line("  o", "Toggle obligations", t),
            shortcut_line("  c", "Validate passport", t),
            shortcut_line("  f", "Generate FRIA", t),
            shortcut_line("  x", "Export passport", t),
            shortcut_line("  j/k", "Navigate fields", t),
        ],
        ViewState::Obligations => vec![
            shortcut_line("  f", "Cycle filter", t),
            shortcut_line("  l", "Reload obligations", t),
            shortcut_line("  j/k", "Navigate obligations", t),
        ],
        ViewState::Timeline => vec![shortcut_line("  j/k", "Scroll timeline", t)],
        ViewState::Report => vec![
            shortcut_line("  e", "Export report", t),
            shortcut_line("  j/k", "Scroll report", t),
        ],
    }
}

pub(super) fn render_getting_started_overlay(frame: &mut Frame) {
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
            Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
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
            Span::raw("Use 1-7 to switch views"),
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

pub(super) fn shortcut_line<'a>(key: &'a str, desc: &'a str, t: &theme::ThemeColors) -> Line<'a> {
    Line::from(vec![
        Span::styled(format!("{key:<16}"), Style::default().fg(t.accent)),
        Span::styled(desc, Style::default().fg(t.fg)),
    ])
}

pub(super) fn centered_rect(percent_x: u16, percent_y: u16, area: Rect) -> Rect {
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
pub(super) fn render_dismiss_modal(
    frame: &mut Frame,
    modal: &crate::components::quick_actions::DismissModal,
) {
    use ratatui::widgets::Clear;

    let t = theme::theme();
    let area = centered_rect(50, 40, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Dismiss Finding ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let reasons = crate::components::quick_actions::DismissReason::all();

    let mut all_lines = vec![
        Line::from(Span::styled(
            " Why are you dismissing this finding?",
            Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
        )),
        Line::raw(""),
    ];

    for (i, reason) in reasons.iter().enumerate() {
        let is_selected = i == modal.cursor;
        let marker = if is_selected { "> " } else { "  " };
        let color = if is_selected { t.accent } else { t.fg };

        all_lines.push(Line::from(Span::styled(
            format!("{marker}{}", reason.label()),
            Style::default().fg(color).add_modifier(if is_selected {
                Modifier::BOLD
            } else {
                Modifier::empty()
            }),
        )));
        // Show description for selected reason
        if is_selected {
            all_lines.push(Line::from(Span::styled(
                format!("    {}", reason.description()),
                Style::default().fg(t.muted),
            )));
        }
    }

    all_lines.push(Line::raw(""));
    all_lines.push(Line::from(Span::styled(
        " Enter:confirm  Esc:cancel",
        Style::default().fg(t.muted),
    )));

    frame.render_widget(Paragraph::new(all_lines), inner);
}
