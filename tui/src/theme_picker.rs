use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, List, ListItem, Paragraph};
use ratatui::Frame;

use crate::theme::{self, list_themes, ThemeColors};

/// State for the Theme Picker overlay.
pub struct ThemePickerState {
    pub selected: usize,
    pub themes: Vec<ThemeColors>,
}

impl ThemePickerState {
    pub fn new() -> Self {
        let themes = list_themes();
        let current = theme::current_theme_name();
        let selected = themes
            .iter()
            .position(|t| t.name == current)
            .unwrap_or(0);
        Self { selected, themes }
    }

    pub fn move_up(&mut self) {
        if self.selected > 0 {
            self.selected -= 1;
        }
    }

    pub fn move_down(&mut self) {
        if self.selected + 1 < self.themes.len() {
            self.selected += 1;
        }
    }

    pub fn selected_name(&self) -> &str {
        self.themes[self.selected].name
    }
}

/// Render the Theme Picker as a centered modal overlay.
pub fn render_theme_picker(frame: &mut Frame, state: &ThemePickerState) {
    let t = theme::theme();
    let area = centered_rect(56, 22, frame.area());

    // Clear background
    frame.render_widget(Clear, area);

    let block = Block::default()
        .title(" Theme Picker ")
        .title_style(Style::default().fg(t.accent).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(t.border_focused))
        .style(Style::default().bg(t.bg));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Split: theme list (top) + preview (bottom) + footer
    let chunks = Layout::vertical([
        Constraint::Min(10),     // theme list
        Constraint::Length(6),   // preview
        Constraint::Length(1),   // footer hints
    ])
    .split(inner);

    // --- Theme list with palette bars ---
    let items: Vec<ListItem> = state
        .themes
        .iter()
        .enumerate()
        .map(|(i, theme)| {
            let is_sel = i == state.selected;
            let marker = if is_sel { "> " } else { "  " };
            let palette = theme.palette_colors();

            let mut spans = vec![
                Span::styled(
                    marker,
                    Style::default().fg(if is_sel { t.accent } else { t.fg }),
                ),
                Span::styled(
                    format!("{:<20}", theme.name),
                    if is_sel {
                        Style::default()
                            .fg(t.accent)
                            .add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(t.fg)
                    },
                ),
            ];

            // Palette color bar — 2 chars per color
            for color in &palette {
                spans.push(Span::styled("██", Style::default().fg(*color)));
            }

            ListItem::new(Line::from(spans))
        })
        .collect();

    let list = List::new(items).style(Style::default().bg(t.bg));
    frame.render_widget(list, chunks[0]);

    // --- Preview area ---
    let preview_theme = &state.themes[state.selected];
    let preview_block = Block::default()
        .title(" Preview ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(preview_theme.border_focused))
        .style(Style::default().bg(preview_theme.bg));

    let preview_inner = preview_block.inner(chunks[1]);
    frame.render_widget(preview_block, chunks[1]);

    let preview_lines = vec![
        Line::from(vec![
            Span::styled("Score: ", Style::default().fg(preview_theme.fg)),
            Span::styled(
                "72",
                Style::default()
                    .fg(preview_theme.zone_yellow)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" [C] ", Style::default().fg(preview_theme.muted)),
            Span::styled("//////////", Style::default().fg(preview_theme.zone_yellow)),
            Span::styled("....", Style::default().fg(preview_theme.muted)),
        ]),
        Line::from(vec![
            Span::styled("Deadline: ", Style::default().fg(preview_theme.fg)),
            Span::styled("Art. 6 — 167 days", Style::default().fg(preview_theme.zone_green)),
        ]),
        Line::from(vec![
            Span::styled("> OBL-015 Art.50.1 ", Style::default().fg(preview_theme.fg)),
            Span::styled("PASS ✓", Style::default().fg(preview_theme.zone_green)),
        ]),
        Line::from(vec![
            Span::styled("  OBL-016 Art.50.2 ", Style::default().fg(preview_theme.fg)),
            Span::styled("FAIL ✗", Style::default().fg(preview_theme.zone_red)),
        ]),
    ];

    let preview = Paragraph::new(preview_lines).style(Style::default().bg(preview_theme.bg));
    frame.render_widget(preview, preview_inner);

    // --- Footer hints ---
    let footer = Paragraph::new(Line::from(vec![
        Span::styled("j/k", Style::default().fg(t.accent)),
        Span::styled(": navigate  ", Style::default().fg(t.muted)),
        Span::styled("Enter", Style::default().fg(t.accent)),
        Span::styled(": apply  ", Style::default().fg(t.muted)),
        Span::styled("Esc", Style::default().fg(t.accent)),
        Span::styled(": cancel", Style::default().fg(t.muted)),
    ]));
    frame.render_widget(footer, chunks[2]);
}

fn centered_rect(width: u16, height: u16, area: Rect) -> Rect {
    let x = area.x + area.width.saturating_sub(width) / 2;
    let y = area.y + area.height.saturating_sub(height) / 2;
    Rect::new(x, y, width.min(area.width), height.min(area.height))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_theme_picker_navigation() {
        let mut state = ThemePickerState::new();
        assert_eq!(state.themes.len(), 8);
        state.selected = 0;
        state.move_down();
        assert_eq!(state.selected, 1);
        state.move_up();
        assert_eq!(state.selected, 0);
        state.move_up(); // should clamp
        assert_eq!(state.selected, 0);
    }

    #[test]
    fn test_theme_picker_selected_name() {
        let state = ThemePickerState::new();
        assert!(!state.selected_name().is_empty());
    }
}
