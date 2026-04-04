use ratatui::Frame;
use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

use crate::app::App;
use crate::theme;
use crate::types::ViewState;

use super::utils::score_zone_info;

/// 2-line footer: Line 1 = 6-indicator status bar; Line 2 = view-specific hints.
pub(super) fn render_view_footer(frame: &mut Frame, app: &App) {
    let t = theme::theme();
    let area = frame.area();

    // -- Line 1: Status bar with 6 indicators --
    let line1_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(2),
        width: area.width,
        height: 1,
    };

    let mut spans: Vec<Span<'_>> = Vec::new();

    // Indicator 1: Score badge [75] or [--] before first scan
    {
        if let Some(scan) = &app.last_scan {
            let score = scan.score.total_score;
            let (color, _) = score_zone_info(score, &t);
            spans.push(Span::styled(
                format!("[{score:.0}]"),
                Style::default().fg(color).add_modifier(Modifier::BOLD),
            ));
        } else {
            spans.push(Span::styled(
                "[--]",
                Style::default().fg(t.muted).add_modifier(Modifier::BOLD),
            ));
        }
    }

    spans.push(Span::raw(" "));

    // Indicator 3: View [N Name]
    spans.push(Span::styled(
        format!(
            "[{} {}]",
            app.view_state.index() + 1,
            app.view_state.short_name()
        ),
        Style::default().fg(t.fg),
    ));

    spans.push(Span::raw(" "));

    // Indicator: Context usage [ctx:N%]
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

    // Engine / PROJECT API status indicator
    let engine_indicator = match app.engine_status {
        crate::types::EngineConnectionStatus::Connected => {
            Span::styled(" \u{25cf}", Style::default().fg(t.zone_green))
        }
        crate::types::EngineConnectionStatus::Connecting => {
            Span::styled(" \u{25cb}", Style::default().fg(t.zone_yellow))
        }
        crate::types::EngineConnectionStatus::Disconnected => {
            Span::styled(" \u{25cb}", Style::default().fg(t.muted))
        }
        crate::types::EngineConnectionStatus::Error => {
            Span::styled(" \u{2717}", Style::default().fg(t.zone_red))
        }
    };
    spans.push(engine_indicator);

    frame.render_widget(Paragraph::new(Line::from(spans)), line1_area);

    // -- Line 2: Input mode + view-specific hints --
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
        hint_spans.push(Span::styled("\u{258c}", Style::default().fg(t.accent)));
        // Autocomplete hint
        if let Some(hint) = crate::components::command_palette::complete_colon_command(&app.input)
            && hint != app.input
        {
            let remaining = &hint[app.input.len()..];
            hint_spans.push(Span::styled(remaining, Style::default().fg(t.muted)));
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
pub const fn footer_hints_for_view(view: ViewState) -> &'static str {
    match view {
        ViewState::Dashboard => "e:zoom f:focus w:watch Ctrl+S:scan Ctrl+P:palette ?:help",
        ViewState::Scan => {
            "a:All c:Crit h:High m:Med l:Low p:passed Enter:detail f:fix x:explain d:dismiss j/k:nav"
        }
        ViewState::Fix => "Space:toggle a:all n:none d:diff </>:resize Enter:apply j/k:nav",
        ViewState::Log => "j/k:scroll ?:help",
        ViewState::Chat => "i:type /:command Esc:cancel j/k:scroll :llm:settings",
        ViewState::Passport => "e:edit o:obligations c:validate f:fria x:export r:reload j/k:nav",
        ViewState::Obligations => "f:filter l:load j/k:nav ?:help",
        ViewState::Timeline => "j/k:scroll ?:help",
        ViewState::Report => "1-9:generate e:export j/k:nav Enter:generate ?:help",
    }
}
