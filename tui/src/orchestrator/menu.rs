use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::theme;

/// Render the Orchestrator view — deterministic command menu.
pub fn render_orchestrator_view(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();

    let block = Block::default()
        .title(" Orchestrator ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let agent_count = app.pty_manager.session_count();

    let mut lines: Vec<Line> = vec![
        Line::from(Span::styled(
            " Wrapper-Orchestrator — deterministic agent control",
            Style::default().fg(t.muted),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled(" Active agents: ", Style::default().fg(t.fg)),
            Span::styled(
                agent_count.to_string(),
                Style::default()
                    .fg(if agent_count > 0 { t.zone_green } else { t.muted })
                    .add_modifier(Modifier::BOLD),
            ),
        ]),
        Line::from(""),
        Line::from(Span::styled(" Commands:", Style::default().fg(t.accent).add_modifier(Modifier::BOLD))),
        Line::from(""),
    ];

    // Command list
    let cmds = [
        ("[s] Send", "Type text to a specific agent"),
        ("[h] Handoff", "Transfer context from one agent to another"),
        ("[k] Kill", "Stop a running agent"),
        ("[r] Restart", "Kill and re-launch an agent"),
        ("[b] Broadcast", "Send the same message to all agents"),
        ("[A] Agent Grid", "Switch to the agent grid view"),
        ("[D] Dashboard", "Switch to the compliance dashboard"),
    ];

    for (key, desc) in &cmds {
        lines.push(Line::from(vec![
            Span::styled(format!("  {key:<14}"), Style::default().fg(t.accent)),
            Span::styled(format!("— {desc}"), Style::default().fg(t.fg)),
        ]));
    }

    lines.push(Line::from(""));

    // Session list
    if agent_count > 0 {
        lines.push(Line::from(Span::styled(
            " Running sessions:",
            Style::default().fg(t.accent),
        )));
        for handle in app.pty_manager.sessions() {
            let state_color = match handle.state() {
                crate::pty::session::AgentState::Starting => t.zone_yellow,
                crate::pty::session::AgentState::Ready => t.zone_green,
                crate::pty::session::AgentState::Working => t.accent,
                crate::pty::session::AgentState::Dead => t.zone_red,
            };
            let proto_tag = if handle.is_acp() { " [acp]" } else { "" };
            lines.push(Line::from(vec![
                Span::styled(format!("  [{}] ", handle.id()), Style::default().fg(t.muted)),
                Span::styled(
                    handle.config().display_name.as_str(),
                    Style::default().fg(t.fg).add_modifier(Modifier::BOLD),
                ),
                Span::styled(proto_tag, Style::default().fg(t.muted)),
                Span::styled(" — ", Style::default().fg(t.muted)),
                Span::styled(
                    handle.state().label(),
                    Style::default().fg(state_color),
                ),
            ]));
        }
    } else {
        lines.push(Line::from(Span::styled(
            " No agents running. Use :agent to launch one.",
            Style::default().fg(t.muted),
        )));
    }

    frame.render_widget(Paragraph::new(lines), inner);
}
