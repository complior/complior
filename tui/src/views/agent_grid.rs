use ratatui::layout::Rect;
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::app::App;
use crate::pty::session::AgentState;
use crate::pty::{calculate_rects, calculate_max};
use crate::theme;

/// Render the multi-agent grid view (PTY and ACP sessions).
pub fn render_agent_grid(frame: &mut Frame, area: Rect, app: &App) {
    let t = theme::theme();
    let sessions = app.pty_manager.sessions();

    if sessions.is_empty() {
        // No agents yet — show empty state with launch hint
        let lines = vec![
            Line::from(""),
            Line::from(vec![
                Span::styled("  No agents running.  ", Style::default().fg(t.muted)),
                Span::styled(
                    "Use :agent <id> to launch one.",
                    Style::default().fg(t.accent),
                ),
            ]),
            Line::from(""),
            Line::from(Span::styled(
                "  Tip: run :agent to list all registered agents.",
                Style::default().fg(t.muted),
            )),
        ];
        frame.render_widget(
            Paragraph::new(lines)
                .block(
                    Block::default()
                        .title(" Agents  :agent add  K kill  O orch ")
                        .title_style(theme::title_style())
                        .borders(Borders::ALL)
                        .border_style(Style::default().fg(t.border)),
                ),
            area,
        );
        return;
    }

    // Header bar: one row above the panels showing active agents + shortcuts
    let (header_area, panels_area): (Option<Rect>, Rect) = if area.height > 2 {
        let hdr = Rect { x: area.x, y: area.y, width: area.width, height: 1 };
        let body = Rect {
            x: area.x,
            y: area.y + 1,
            width: area.width,
            height: area.height - 1,
        };
        (Some(hdr), body)
    } else {
        (None, area)
    };

    if let Some(hdr) = header_area {
        // Build "Agents: [1] Name ● [2] Name  :agent add  K kill  O orch"
        let mut spans: Vec<Span> = vec![
            Span::styled(" Agents: ", Style::default().fg(t.muted)),
        ];
        for (i, handle) in sessions.iter().enumerate() {
            if i > 0 {
                spans.push(Span::styled("  ", Style::default()));
            }
            let is_focused = app.focused_agent == Some(handle.id());
            let state_dot = match handle.state() {
                AgentState::Starting => Span::styled("◌", Style::default().fg(t.zone_yellow)),
                AgentState::Ready    => Span::styled("●", Style::default().fg(t.zone_green)),
                AgentState::Working  => Span::styled("◉", Style::default().fg(t.accent)),
                AgentState::Dead     => Span::styled("✕", Style::default().fg(t.zone_red)),
            };
            let (num_style, name_style) = if is_focused {
                (
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                )
            } else {
                (
                    Style::default().fg(t.muted),
                    Style::default().fg(t.fg),
                )
            };
            spans.push(Span::styled(format!("[{}] ", i + 1), num_style));
            spans.push(Span::styled(handle.display_name().to_string(), name_style));
            spans.push(Span::raw(" "));
            spans.push(state_dot);
        }
        spans.push(Span::styled(
            "  :agent add  K kill  O orch",
            Style::default().fg(t.muted),
        ));
        frame.render_widget(Paragraph::new(Line::from(spans)), hdr);
    }

    let max_panels = calculate_max(panels_area.width, panels_area.height);
    let visible_count = sessions.len().min(max_panels);
    let rects = calculate_rects(panels_area, visible_count);

    for (i, handle) in sessions.iter().take(visible_count).enumerate() {
        let panel_rect = rects[i];
        let is_focused = app.focused_agent == Some(handle.id());

        // Choose border color by state
        let border_color = match handle.state() {
            AgentState::Starting => t.zone_yellow,
            AgentState::Ready => t.zone_green,
            AgentState::Working => t.accent,
            AgentState::Dead => t.zone_red,
        };

        let border_style = if is_focused {
            Style::default()
                .fg(t.accent)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(border_color)
        };

        // Protocol tag suffix for ACP sessions
        let proto_tag = if handle.is_acp() { " [acp]" } else { "" };
        let title = format!(
            " [{}] {}{} [{}] ",
            i + 1,
            handle.display_name(),
            proto_tag,
            handle.state().label()
        );

        let block = Block::default()
            .title(title)
            .title_style(if is_focused {
                Style::default()
                    .fg(t.accent)
                    .add_modifier(Modifier::BOLD)
            } else {
                theme::title_style()
            })
            .borders(Borders::ALL)
            .border_style(border_style);

        let inner = block.inner(panel_rect);
        frame.render_widget(block, panel_rect);

        // Render visible lines (PTY → ring buffer, ACP → event log)
        if inner.height > 0 {
            let n_lines = inner.height as usize;
            let lines_text = handle.last_lines(n_lines);

            let para_lines: Vec<Line> = lines_text
                .iter()
                .map(|l| Line::from(Span::styled(l.as_str(), Style::default().fg(t.fg))))
                .collect();

            frame.render_widget(Paragraph::new(para_lines), inner);
        }
    }

    // Overflow hint if sessions > max_panels
    if sessions.len() > max_panels {
        let extra = sessions.len() - max_panels;
        if let Some(&last_rect) = rects.last() {
            let hint_y = last_rect.y + last_rect.height;
            if hint_y < panels_area.y + panels_area.height {
                let hint = Line::from(Span::styled(
                    format!(" +{extra} more agents (resize terminal to see them) "),
                    Style::default().fg(t.muted),
                ));
                let hint_area = Rect {
                    x: panels_area.x,
                    y: hint_y,
                    width: panels_area.width,
                    height: 1,
                };
                frame.render_widget(Paragraph::new(hint), hint_area);
            }
        }
    }
}
