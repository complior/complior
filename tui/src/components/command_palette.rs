use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, List, ListItem, Paragraph};
use ratatui::Frame;

use crate::theme;

/// Available commands for the palette.
const COMMANDS: &[(&str, &str)] = &[
    ("/scan", "Scan project for compliance"),
    ("/help", "Show all commands and shortcuts"),
    ("/edit", "Open file in code viewer"),
    ("/run", "Run shell command"),
    ("/clear", "Clear terminal output"),
    ("/reconnect", "Reconnect to engine"),
    ("/theme", "Switch color theme"),
    ("/view", "Switch to view (1-6)"),
    ("/save", "Save current session"),
    ("/load", "Load saved session"),
    ("/sessions", "List saved sessions"),
    ("/watch", "Toggle file watch mode"),
    ("/undo", "Undo last fix"),
    ("/animations", "Toggle animations on/off"),
];

/// Colon commands — used for tab completion in colon mode.
pub const COLON_COMMANDS: &[&str] = &[
    "scan", "fix", "theme", "export", "watch", "quit", "help",
    "undo", "view", "provider", "animations",
];

/// Complete a partial colon-mode command against known commands.
pub fn complete_colon_command(partial: &str) -> Option<&'static str> {
    let lower = partial.to_lowercase();
    COLON_COMMANDS
        .iter()
        .find(|cmd| cmd.starts_with(&lower))
        .copied()
}

/// Return filtered commands matching the filter string.
fn filtered_commands(filter: &str) -> Vec<(&'static str, &'static str)> {
    let filter_lower = filter.to_lowercase();
    COMMANDS
        .iter()
        .filter(|(cmd, desc)| {
            filter_lower.is_empty()
                || cmd.to_lowercase().contains(&filter_lower)
                || desc.to_lowercase().contains(&filter_lower)
        })
        .copied()
        .collect()
}

/// Count of commands matching the current filter.
pub fn filtered_count(filter: &str) -> usize {
    filtered_commands(filter).len()
}

/// Get command at index from filtered list.
pub fn filtered_command(filter: &str, index: usize) -> Option<&'static str> {
    filtered_commands(filter).get(index).map(|(cmd, _)| *cmd)
}

pub fn render_command_palette(frame: &mut Frame, filter: &str, selected: usize) {
    let area = frame.area();
    let popup = centered_rect(50, 40, area);

    frame.render_widget(Clear, popup);

    let t = theme::theme();
    let block = Block::default()
        .title(" Commands ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(popup);
    frame.render_widget(block, popup);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(1)])
        .split(inner);

    // Filter input
    let input = Paragraph::new(Line::from(vec![
        Span::styled("> ", Style::default().fg(t.accent)),
        Span::raw(filter),
        Span::styled("▌", Style::default().fg(t.accent)),
    ]))
    .block(
        Block::default()
            .borders(Borders::BOTTOM)
            .border_style(Style::default().fg(t.border)),
    );
    frame.render_widget(input, chunks[0]);

    // Filtered command list with cursor highlight
    let matches = filtered_commands(filter);
    let items: Vec<ListItem<'_>> = matches
        .iter()
        .enumerate()
        .map(|(i, (cmd, desc))| {
            let (cmd_style, desc_style) = if i == selected {
                (
                    Style::default().fg(t.bg).bg(t.accent).add_modifier(Modifier::BOLD),
                    Style::default().fg(t.bg).bg(t.accent),
                )
            } else {
                (
                    Style::default().fg(t.accent).add_modifier(Modifier::BOLD),
                    Style::default().fg(t.muted),
                )
            };
            ListItem::new(Line::from(vec![
                Span::styled(format!("{cmd:<14}"), cmd_style),
                Span::styled(*desc, desc_style),
            ]))
        })
        .collect();

    let list = List::new(items);
    frame.render_widget(list, chunks[1]);
}

/// Match a partial input against commands, returning the best match.
pub fn complete_command(partial: &str) -> Option<&'static str> {
    let lower = partial.to_lowercase();
    COMMANDS
        .iter()
        .find(|(cmd, _)| cmd[1..].starts_with(&lower))
        .map(|(cmd, _)| *cmd)
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let v = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);
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
    use super::*;

    #[test]
    fn test_complete_command() {
        assert_eq!(complete_command("sc"), Some("/scan"));
        assert_eq!(complete_command("he"), Some("/help"));
        assert_eq!(complete_command("th"), Some("/theme"));
        assert_eq!(complete_command("xyz"), None);
    }
}
