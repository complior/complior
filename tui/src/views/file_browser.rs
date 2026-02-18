use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, ListState};
use ratatui::Frame;

use crate::app::App;
use crate::theme;
use crate::types::FileEntry;

pub fn render_file_browser(frame: &mut Frame, area: Rect, app: &App, focused: bool) {
    let block = Block::default()
        .title(" Files ")
        .title_style(theme::title_style())
        .borders(Borders::ALL)
        .border_style(theme::border_style(focused));

    let items: Vec<ListItem<'_>> = app
        .file_tree
        .iter()
        .map(|entry| {
            let indent = "  ".repeat(entry.depth);
            let icon = if entry.is_dir {
                if entry.expanded {
                    "v "
                } else {
                    "> "
                }
            } else {
                file_icon(&entry.name)
            };

            let style = if entry.is_dir {
                Style::default().fg(theme::ACCENT)
            } else {
                Style::default().fg(theme::FG)
            };

            ListItem::new(Line::from(vec![
                Span::raw(indent),
                Span::styled(icon, style),
                Span::styled(&entry.name, style),
            ]))
        })
        .collect();

    let list = List::new(items)
        .block(block)
        .highlight_style(Style::default().bg(theme::SELECTION_BG));

    let mut state = ListState::default();
    state.select(Some(app.file_browser_index));
    frame.render_stateful_widget(list, area, &mut state);
}

fn file_icon(name: &str) -> &'static str {
    match name.rsplit('.').next() {
        Some("rs") => "# ",
        Some("ts" | "tsx") => "@ ",
        Some("js" | "jsx") => "$ ",
        Some("json") => "{ ",
        Some("toml" | "yaml" | "yml") => "% ",
        Some("md") => "* ",
        Some("py") => "~ ",
        Some("go") => "& ",
        _ => "  ",
    }
}

pub fn build_file_tree(root: &std::path::Path) -> Vec<FileEntry> {
    let mut entries = Vec::new();
    collect_entries(root, 0, &mut entries);
    entries
}

fn collect_entries(dir: &std::path::Path, depth: usize, entries: &mut Vec<FileEntry>) {
    let Ok(read_dir) = std::fs::read_dir(dir) else {
        return;
    };

    let mut items: Vec<_> = read_dir
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            !name.starts_with('.')
                && name != "node_modules"
                && name != "target"
                && name != "dist"
                && name != "__pycache__"
        })
        .collect();

    items.sort_by(|a, b| {
        let a_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        b_dir.cmp(&a_dir).then_with(|| {
            a.file_name()
                .to_string_lossy()
                .to_lowercase()
                .cmp(&b.file_name().to_string_lossy().to_lowercase())
        })
    });

    for item in items {
        let name = item.file_name().to_string_lossy().to_string();
        let is_dir = item.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let path = item.path();

        entries.push(FileEntry {
            path: path.clone(),
            name,
            is_dir,
            depth,
            expanded: false,
        });

        // Don't auto-expand — user toggles expansion
    }
}

pub fn toggle_expand(tree: &mut Vec<FileEntry>, index: usize) {
    let Some(entry) = tree.get(index).cloned() else {
        return;
    };

    if !entry.is_dir {
        return;
    }

    if entry.expanded {
        // Collapse: remove children
        tree[index].expanded = false;
        let child_depth = entry.depth + 1;
        let mut remove_count = 0;
        for i in (index + 1)..tree.len() {
            if tree[i].depth >= child_depth {
                remove_count += 1;
            } else {
                break;
            }
        }
        tree.drain((index + 1)..(index + 1 + remove_count));
    } else {
        // Expand: insert children
        tree[index].expanded = true;
        let mut children = Vec::new();
        collect_entries(&entry.path, entry.depth + 1, &mut children);
        let insert_pos = index + 1;
        for (i, child) in children.into_iter().enumerate() {
            tree.insert(insert_pos + i, child);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_icon_mapping() {
        assert_eq!(file_icon("main.rs"), "# ");
        assert_eq!(file_icon("app.ts"), "@ ");
        assert_eq!(file_icon("config.json"), "{ ");
        assert_eq!(file_icon("unknown"), "  ");
    }
}
