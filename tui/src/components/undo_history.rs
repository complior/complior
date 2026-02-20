use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph, Row, Table};
use ratatui::Frame;

use crate::theme;

#[derive(Debug, Clone)]
pub struct UndoEntry {
    pub id: u32,
    pub timestamp: String,
    pub action: String,
    pub status: UndoStatus,
    pub score_delta: Option<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UndoStatus {
    Applied,
    Undone,
    Baseline,
}

impl UndoStatus {
    pub const fn label(self) -> &'static str {
        match self {
            Self::Applied => "Applied",
            Self::Undone => "Undone",
            Self::Baseline => "Baseline",
        }
    }
}

pub struct UndoHistoryState {
    pub entries: Vec<UndoEntry>,
    pub selected: usize,
}

impl UndoHistoryState {
    pub const fn new() -> Self {
        Self {
            entries: Vec::new(),
            selected: 0,
        }
    }

    pub const fn navigate_up(&mut self) {
        self.selected = self.selected.saturating_sub(1);
    }

    pub fn navigate_down(&mut self) {
        if !self.entries.is_empty() {
            self.selected = (self.selected + 1).min(self.entries.len() - 1);
        }
    }

    pub fn selected_id(&self) -> Option<u32> {
        self.entries.get(self.selected).map(|e| e.id)
    }
}

pub fn render_undo_history(frame: &mut Frame, state: &UndoHistoryState) {
    let t = theme::theme();
    let area = centered_rect(60, 50, frame.area());

    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Undo History ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.accent));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if state.entries.is_empty() {
        frame.render_widget(
            Paragraph::new(Line::from(Span::styled(
                " No undo history. Apply fixes first.",
                Style::default().fg(t.muted),
            ))),
            inner,
        );
        return;
    }

    let rows: Vec<Row<'_>> = state
        .entries
        .iter()
        .enumerate()
        .map(|(i, entry)| {
            let selected = i == state.selected;
            let style = if selected {
                Style::default().fg(t.accent).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(t.fg)
            };
            let _status_color = match entry.status {
                UndoStatus::Applied => t.zone_green,
                UndoStatus::Undone => t.muted,
                UndoStatus::Baseline => t.zone_yellow,
            };
            let marker = if selected { "> " } else { "  " };
            let delta_str = entry
                .score_delta
                .map(|d| format!("{d:+.0}"))
                .unwrap_or_default();

            Row::new(vec![
                format!("{marker}#{}", entry.id),
                entry.timestamp.clone(),
                entry.action.clone(),
                entry.status.label().to_string(),
                delta_str,
            ])
            .style(style)
        })
        .collect();

    let widths = [
        Constraint::Length(8),
        Constraint::Length(12),
        Constraint::Min(20),
        Constraint::Length(10),
        Constraint::Length(6),
    ];

    let header = Row::new(vec!["  ID", "Time", "Action", "Status", "Delta"])
        .style(Style::default().fg(t.muted).add_modifier(Modifier::BOLD));

    let table = Table::new(rows, widths).header(header);
    frame.render_widget(table, inner);
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
    fn undo_history_nav() {
        let mut state = UndoHistoryState::new();
        state.entries = vec![
            UndoEntry {
                id: 1,
                timestamp: "12:00".to_string(),
                action: "Fix OBL-001".to_string(),
                status: UndoStatus::Applied,
                score_delta: Some(5.0),
            },
            UndoEntry {
                id: 2,
                timestamp: "12:05".to_string(),
                action: "Fix OBL-002".to_string(),
                status: UndoStatus::Applied,
                score_delta: Some(3.0),
            },
        ];
        state.selected = 0;

        state.navigate_down();
        assert_eq!(state.selected, 1);
        assert_eq!(state.selected_id(), Some(2));

        state.navigate_down(); // should clamp
        assert_eq!(state.selected, 1);

        state.navigate_up();
        assert_eq!(state.selected, 0);
        assert_eq!(state.selected_id(), Some(1));

        state.navigate_up(); // should clamp
        assert_eq!(state.selected, 0);
    }

    #[test]
    fn undo_action_mapping() {
        assert_eq!(UndoStatus::Applied.label(), "Applied");
        assert_eq!(UndoStatus::Undone.label(), "Undone");
        assert_eq!(UndoStatus::Baseline.label(), "Baseline");
    }

    #[test]
    fn show_undo_overlay() {
        let state = UndoHistoryState::new();
        assert!(state.entries.is_empty());
        assert_eq!(state.selected_id(), None);
    }

    #[test]
    fn undo_enter_selects() {
        let mut state = UndoHistoryState::new();
        state.entries.push(UndoEntry {
            id: 42,
            timestamp: "14:00".to_string(),
            action: "Fix CHK-001".to_string(),
            status: UndoStatus::Applied,
            score_delta: Some(10.0),
        });
        state.selected = 0;
        assert_eq!(state.selected_id(), Some(42));
    }

    #[test]
    fn e2e_undo_render() {
        crate::theme::init_theme("dark");
        let backend = ratatui::backend::TestBackend::new(120, 40);
        let mut terminal = ratatui::Terminal::new(backend).expect("terminal");

        let state = UndoHistoryState::new();
        terminal
            .draw(|frame| render_undo_history(frame, &state))
            .expect("render empty undo history");
    }
}
