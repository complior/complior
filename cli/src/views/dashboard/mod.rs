mod content;
mod footer;
mod overlays;
mod panels;
mod utils;

#[cfg(test)]
mod tests_helpers;
#[cfg(test)]
mod tests_state;
#[cfg(test)]
mod tests_rendering;
#[cfg(test)]
mod tests_score;
#[cfg(test)]
mod tests_footer;
#[cfg(test)]
mod tests_overlay;
#[cfg(test)]
mod tests_input;
#[cfg(test)]
mod tests_watch;
#[cfg(test)]
mod tests_status_bar;
#[cfg(test)]
mod tests_e2e_panels;
#[cfg(test)]
mod tests_e2e_views;
#[cfg(test)]
mod tests_widgets;

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::layout::{Breakpoint, compute_layout};
use crate::theme;
use crate::types::{Overlay, ViewState};

use content::render_dashboard_content;
use footer::render_view_footer;
use overlays::{render_dismiss_modal, render_getting_started_overlay, render_help_overlay};
use panels::render_detail_panel;

// Re-export items used outside dashboard module.
// NOTE: footer_hints_for_view, deadline_label, score_zone_info are only used
// within the dashboard module (panels, footer, tests), so no pub re-export needed.

/// Top-level render entry point -- dispatches to view-specific renderer.
pub fn render_dashboard(frame: &mut Frame, app: &App) {
    let area = frame.area();
    let t = theme::theme();

    // Paint entire screen with theme background so all areas update on theme switch
    frame.render_widget(
        Block::default().style(Style::default().bg(t.bg).fg(t.fg)),
        area,
    );

    // T08: Splash screen -- full-screen owl during startup fade-in
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

    // Navigation tab bar (1 line) -- always visible on all views
    let tab_height: u16 = 1;
    let tab_area = Rect {
        x: area.x,
        y: area.y + owl_height,
        width: area.width,
        height: tab_height,
    };
    render_nav_tab_bar(frame, tab_area, app.view_state);

    // Reserve: owl (2) + tab bar (1) + footer (2) + optional suggestion (2)
    let suggestion_height: u16 = if app.idle_suggestions.current.is_some() { 2 } else { 0 };
    let footer_height: u16 = 2;
    let overhead = owl_height + tab_height + footer_height + suggestion_height;
    let body_area = Rect {
        x: area.x,
        y: area.y + owl_height + tab_height,
        width: area.width,
        height: area.height.saturating_sub(overhead),
    };

    // Dispatch to the active view
    match app.view_state {
        ViewState::Dashboard => render_dashboard_view(frame, body_area, app),
        ViewState::Log => render_chat_full_view(frame, body_area, app),
        ViewState::Scan => super::scan::render_scan_view(frame, body_area, app),
        ViewState::Fix => super::fix::render_fix_view(frame, body_area, app),
        ViewState::Passport => super::passport::render_passport_view(frame, body_area, app),
        ViewState::Obligations => super::obligations::render_obligations_view(frame, body_area, app),
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
        "       \u{2584}\u{2584}           \u{2584}\u{2584}",
        "      \u{2588}\u{2588}\u{2588}\u{2588}\u{2584}\u{2584}\u{2584}\u{2584}\u{2584}\u{2584}\u{2584}\u{2584}\u{2588}\u{2588}\u{2588}\u{2588}",
        "      \u{2588}  \u{2584}\u{2588}\u{2588}\u{2588}\u{2588}\u{2584}\u{2584}\u{2588}\u{2588}\u{2588}\u{2588}\u{2584}  \u{2588}",
        "      \u{2588}  \u{2588}\u{2588}\u{25c9}\u{25c9}\u{2588}\u{2588}\u{2588}\u{2588}\u{25c9}\u{25c9}\u{2588}\u{2588}  \u{2588}",
        "      \u{2588}  \u{2580}\u{2588}\u{2588}\u{2588}\u{2588}\u{2580}\u{2580}\u{2588}\u{2588}\u{2588}\u{2588}\u{2580}  \u{2588}",
        "      \u{2588}      \u{2584}\u{25bc}\u{2584}      \u{2588}",
        "      \u{2588}\u{2588}   \u{2580}\u{2580}\u{2580}\u{2580}\u{2580}   \u{2588}\u{2588}",
        "       \u{2588}\u{2588}\u{2580}\u{2588}\u{2580}\u{2588}\u{2580}\u{2588}\u{2580}\u{2588}\u{2580}\u{2588}\u{2588}",
        "        \u{2588}\u{2580}\u{2588}     \u{2588}\u{2580}\u{2588}",
        "        \u{2580}\u{2584}\u{2580}     \u{2580}\u{2584}\u{2580}",
    ];

    let owl_height = owl_lines.len() as u16;
    let title_height = 2;
    let total = owl_height + title_height + 1;

    if area.height < total {
        // Too small -- just show text
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
        "AI Compliance \u{00b7} Made Simple",
        Style::default().fg(t.muted),
    ));
    let sub_area = Rect { x: area.x, y: sub_y, width: area.width, height: 1 };
    frame.render_widget(
        Paragraph::new(subtitle).alignment(ratatui::layout::Alignment::Center),
        sub_area,
    );
}

/// Owl ASCII header -- 2 lines at top of every view.
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

/// Navigation tab bar -- 1-line view selector visible on ALL views.
///
/// ```text
///  [D]ash  [S]can  [F]ix  [P]assport  [O]blig  [T]ime  [R]eport  [L]og
/// ```
/// Active view is highlighted with accent color and bold.
fn render_nav_tab_bar(frame: &mut Frame, area: Rect, current: ViewState) {
    let t = theme::theme();
    let tabs = [
        ('D', "Dash", ViewState::Dashboard),
        ('S', "Scan", ViewState::Scan),
        ('F', "Fix", ViewState::Fix),
        ('P', "Passport", ViewState::Passport),
        ('O', "Oblig", ViewState::Obligations),
        ('T', "Time", ViewState::Timeline),
        ('R', "Report", ViewState::Report),
        ('L', "Log", ViewState::Log),
    ];

    let mut spans: Vec<Span<'_>> = vec![Span::raw(" ")];
    for (key, label, view) in &tabs {
        let is_active = *view == current;
        if is_active {
            spans.push(Span::styled(
                format!(" {key}"),
                Style::default().fg(t.bg).bg(t.accent).add_modifier(Modifier::BOLD),
            ));
            spans.push(Span::styled(
                format!(":{label} "),
                Style::default().fg(t.bg).bg(t.accent),
            ));
        } else {
            spans.push(Span::styled(
                format!(" {key}"),
                Style::default().fg(t.accent),
            ));
            spans.push(Span::styled(
                format!(":{label} "),
                Style::default().fg(t.muted),
            ));
        }
    }

    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

/// Dashboard view -- responsive multi-panel layout (T803).
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
                    super::sidebar::render_sidebar(frame, sb, app);
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
                    super::sidebar::render_sidebar(frame, sb, app);
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

/// Tiny terminal mode -- minimal summary.
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

/// Chat full-width view -- full chat + optional sidebar.
fn render_chat_full_view(frame: &mut Frame, body_area: Rect, app: &App) {
    if app.sidebar_visible {
        let main_layout = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Min(40), Constraint::Length(28)])
            .split(body_area);

        super::chat::render_chat_view(frame, main_layout[0], app);
        super::sidebar::render_sidebar(frame, main_layout[1], app);
    } else {
        super::chat::render_chat_view(frame, body_area, app);
    }
}

// =========================================================================
// Overlays
// =========================================================================

fn render_overlay(frame: &mut Frame, app: &App) {
    match &app.overlay {
        Overlay::None => {}
        Overlay::CommandPalette => {
            crate::components::command_palette::render_command_palette(
                frame,
                &app.overlay_filter,
                app.palette_index,
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
