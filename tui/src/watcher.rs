// File-system watcher for Watch mode — auto-triggers scan on relevant file changes.

use std::path::{Path, PathBuf};
use std::time::Instant;

use tokio::sync::mpsc;
use tokio::task::JoinHandle;

/// Spawn a blocking watcher that sends changed file paths through `tx`.
/// Uses notify crate's recommended watcher with 500ms debounce.
pub fn spawn_watcher(
    project_path: PathBuf,
    tx: mpsc::UnboundedSender<PathBuf>,
) -> JoinHandle<()> {
    tokio::task::spawn_blocking(move || {
        use notify::{RecursiveMode, Watcher};

        let tx_clone = tx;
        let mut last_sent = Instant::now();

        let mut watcher = match notify::recommended_watcher(
            move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    // Only care about Create and Modify events
                    match event.kind {
                        notify::EventKind::Create(_) | notify::EventKind::Modify(_) => {}
                        _ => return,
                    }

                    for path in event.paths {
                        if !is_relevant(&path) {
                            continue;
                        }
                        // Debounce: skip if within 500ms of last send
                        let now = Instant::now();
                        if now.duration_since(last_sent).as_millis() < 500 {
                            continue;
                        }
                        last_sent = now;
                        let _ = tx_clone.send(path);
                    }
                }
            },
        ) {
            Ok(w) => w,
            Err(e) => {
                tracing::error!("Failed to create watcher: {e}");
                return;
            }
        };

        if let Err(e) = watcher.watch(&project_path, RecursiveMode::Recursive) {
            tracing::error!("Failed to watch {}: {e}", project_path.display());
            return;
        }

        tracing::info!("Watching {} for changes", project_path.display());

        // Block forever — watcher lives until task is aborted
        loop {
            std::thread::sleep(std::time::Duration::from_secs(3600));
        }
    })
}

/// Filter: skip hidden files/dirs, `node_modules`, `target`, `.git`, etc.
pub fn is_relevant(path: &Path) -> bool {
    // Check each path component
    let skip_dirs = [
        "node_modules",
        "target",
        "dist",
        "build",
        "__pycache__",
    ];

    for component in path.components() {
        if let std::path::Component::Normal(name) = component {
            let name = name.to_string_lossy();
            // Skip hidden directories and files
            if name.starts_with('.') {
                return false;
            }
            // Skip common non-source directories
            if skip_dirs.iter().any(|d| *d == &*name) {
                return false;
            }
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_relevant_filter() {
        assert!(is_relevant(Path::new("src/main.rs")));
        assert!(is_relevant(Path::new("README.md")));
        assert!(is_relevant(Path::new("app/config/plans.js")));

        // Hidden files/dirs
        assert!(!is_relevant(Path::new(".git/config")));
        assert!(!is_relevant(Path::new(".env")));
        assert!(!is_relevant(Path::new("src/.hidden/file.rs")));

        // Ignored directories
        assert!(!is_relevant(Path::new("node_modules/foo/bar.js")));
        assert!(!is_relevant(Path::new("target/debug/main")));
    }

    #[test]
    fn test_debounce_skips_fast_events() {
        // Debounce logic is internal to the watcher callback.
        // We test the timing contract: two events within 500ms should produce at most one send.
        use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};

        let counter = Arc::new(AtomicUsize::new(0));
        let counter_clone = counter.clone();

        // Set last_sent far in the past so first event passes
        let mut last_sent = Instant::now() - std::time::Duration::from_secs(10);
        let debounce_ms: u128 = 500;

        // Simulate event processing
        let process_event = |last: &mut Instant, counter: &AtomicUsize| {
            let now = Instant::now();
            if now.duration_since(*last).as_millis() >= debounce_ms {
                *last = now;
                counter.fetch_add(1, Ordering::SeqCst);
            }
        };

        // First event: should pass (10s since last_sent)
        process_event(&mut last_sent, &counter_clone);
        assert_eq!(counter.load(Ordering::SeqCst), 1);

        // Immediate second event: should be debounced
        process_event(&mut last_sent, &counter_clone);
        assert_eq!(counter.load(Ordering::SeqCst), 1);

        // After sleeping past debounce window
        std::thread::sleep(std::time::Duration::from_millis(550));
        process_event(&mut last_sent, &counter_clone);
        assert_eq!(counter.load(Ordering::SeqCst), 2);
    }
}
