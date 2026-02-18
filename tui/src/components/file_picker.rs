use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, List, ListItem, Paragraph};
use ratatui::Frame;

use crate::theme;
use crate::types::FileEntry;

/// Render fuzzy file picker overlay (triggered by `@` in chat input).
pub fn render_file_picker(frame: &mut Frame, filter: &str, files: &[FileEntry]) {
    let area = frame.area();
    let popup = centered_rect(60, 50, area);

    frame.render_widget(Clear, popup);

    let t = theme::theme();
    let block = Block::default()
        .title(" Select File (@) ")
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
        Span::styled("@ ", Style::default().fg(t.accent)),
        Span::raw(filter),
        Span::styled("▌", Style::default().fg(t.accent)),
    ]))
    .block(
        Block::default()
            .borders(Borders::BOTTOM)
            .border_style(Style::default().fg(t.border)),
    );
    frame.render_widget(input, chunks[0]);

    // Fuzzy-matched file list
    let filter_lower = filter.to_lowercase();
    let items: Vec<ListItem<'_>> = files
        .iter()
        .filter(|f| !f.is_dir)
        .filter(|f| {
            filter_lower.is_empty()
                || f.name.to_lowercase().contains(&filter_lower)
                || f.path.to_string_lossy().to_lowercase().contains(&filter_lower)
        })
        .take(20) // limit display
        .map(|f| {
            let path_str = f.path.to_string_lossy();
            ListItem::new(Line::from(vec![
                Span::styled(
                    format!("{:<20}", f.name),
                    Style::default()
                        .fg(t.fg)
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    format!(" {path_str}"),
                    Style::default().fg(t.muted),
                ),
            ]))
        })
        .collect();

    let list = List::new(items).highlight_style(Style::default().bg(t.selection_bg));
    frame.render_widget(list, chunks[1]);
}

/// Find files matching a fuzzy filter. Returns file paths.
pub fn fuzzy_match_files<'a>(files: &'a [FileEntry], filter: &str) -> Vec<&'a FileEntry> {
    let filter_lower = filter.to_lowercase();
    files
        .iter()
        .filter(|f| !f.is_dir)
        .filter(|f| {
            filter_lower.is_empty()
                || f.name.to_lowercase().contains(&filter_lower)
                || f.path.to_string_lossy().to_lowercase().contains(&filter_lower)
        })
        .collect()
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
    use std::path::PathBuf;

    #[test]
    fn test_fuzzy_match_files() {
        let files = vec![
            FileEntry { path: PathBuf::from("src/app.rs"), name: "app.rs".into(), is_dir: false, depth: 1, expanded: false },
            FileEntry { path: PathBuf::from("src/main.rs"), name: "main.rs".into(), is_dir: false, depth: 1, expanded: false },
            FileEntry { path: PathBuf::from("src"), name: "src".into(), is_dir: true, depth: 0, expanded: true },
        ];

        let matched = fuzzy_match_files(&files, "app");
        assert_eq!(matched.len(), 1);
        assert_eq!(matched[0].name, "app.rs");

        let all = fuzzy_match_files(&files, "");
        assert_eq!(all.len(), 2); // excludes dirs
    }
}
