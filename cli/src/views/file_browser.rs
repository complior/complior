use crate::types::FileEntry;

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
        .filter_map(std::result::Result::ok)
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
