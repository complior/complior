mod detail;
pub(crate) mod explain;
mod preview;
mod render;
mod shared;
#[cfg(test)]
mod tests;

// Re-export pub(crate) shared rendering helpers used by the fix view.
pub(crate) use shared::{render_code_block, render_fix_diff, render_fix_text};

// Re-export public items for external use.
pub use explain::explain_finding;

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::Frame;

use crate::app::App;
use crate::types::Severity;

use self::explain::severity_order;

/// Per-layer scanning progress.
#[derive(Debug, Clone)]
pub struct LayerProgress {
    pub name: &'static str,
    pub short: &'static str,
    pub current: u32,
    pub total: u32,
    pub status: LayerStatus,
}

/// Status of a single scan layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LayerStatus {
    Waiting,
    Running,
    Complete,
    Skipped,
}

/// Finding severity filter.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FindingsFilter {
    All,
    Critical,
    High,
    Medium,
    Low,
}

impl FindingsFilter {
    pub fn from_key(key: char) -> Option<Self> {
        match key {
            'a' => Some(Self::All),
            'c' => Some(Self::Critical),
            'h' => Some(Self::High),
            'm' => Some(Self::Medium),
            'l' => Some(Self::Low),
            _ => None,
        }
    }

    pub fn matches(self, severity: Severity) -> bool {
        match self {
            Self::All => true,
            Self::Critical => matches!(severity, Severity::Critical),
            Self::High => matches!(severity, Severity::High),
            Self::Medium => matches!(severity, Severity::Medium),
            Self::Low => matches!(severity, Severity::Low | Severity::Info),
        }
    }
}

/// State for the Scan View.
#[derive(Debug, Clone)]
pub struct ScanViewState {
    pub layer_progress: [LayerProgress; 5],
    pub findings_filter: FindingsFilter,
    pub selected_finding: Option<usize>,
    pub detail_open: bool,
    pub scanning: bool,
    pub show_passed: bool,
    /// Preview panel scroll offset.
    pub preview_scroll: usize,
    /// Horizontal split percentage for left panel (25-75).
    pub scan_split_pct: u16,
    /// Whether layer progress gauges are collapsed after scan complete.
    pub progress_collapsed: bool,
    /// Last scan error message (shown on Scan tab instead of chat only).
    pub scan_error: Option<String>,
}

impl Default for ScanViewState {
    fn default() -> Self {
        Self {
            layer_progress: [
                LayerProgress { name: "Files", short: "L1", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "Docs", short: "L2", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "Config", short: "L3", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "Patterns", short: "L4", current: 0, total: 0, status: LayerStatus::Waiting },
                LayerProgress { name: "LLM", short: "L5", current: 0, total: 0, status: LayerStatus::Waiting },
            ],
            findings_filter: FindingsFilter::All,
            selected_finding: None,
            detail_open: false,
            scanning: false,
            show_passed: false,
            preview_scroll: 0,
            scan_split_pct: 45,
            progress_collapsed: false,
            scan_error: None,
        }
    }
}

impl ScanViewState {
    /// Navigate to previous finding.
    pub fn navigate_up(&mut self) {
        let current = self.selected_finding.unwrap_or(0);
        self.selected_finding = Some(current.saturating_sub(1));
    }

    /// Navigate to next finding.
    pub fn navigate_down(&mut self, max: usize) {
        if max == 0 {
            return;
        }
        let current = self.selected_finding.unwrap_or(0);
        self.selected_finding = Some((current + 1).min(max.saturating_sub(1)));
    }

    /// Populate layer progress from completed scan.
    pub fn set_complete(&mut self, files_scanned: u32) {
        self.layer_progress[0] = LayerProgress {
            name: "Files", short: "L1",
            current: files_scanned, total: files_scanned, status: LayerStatus::Complete,
        };
        self.layer_progress[1] = LayerProgress {
            name: "Docs", short: "L2",
            current: files_scanned / 3, total: files_scanned / 3, status: LayerStatus::Complete,
        };
        self.layer_progress[2] = LayerProgress {
            name: "Config", short: "L3",
            current: 5, total: 5, status: LayerStatus::Complete,
        };
        self.layer_progress[3] = LayerProgress {
            name: "Patterns", short: "L4",
            current: files_scanned, total: files_scanned, status: LayerStatus::Complete,
        };
        self.layer_progress[4] = LayerProgress {
            name: "LLM", short: "L5",
            current: 0, total: 0, status: LayerStatus::Skipped,
        };
        self.scanning = false;
        self.scan_error = None;
        self.progress_collapsed = true;
    }
}

/// Resolve the selected finding index from the sorted/filtered display list
/// back to the actual `Finding` in the original scan results.
///
/// This is needed because `selected_finding` is an index into the
/// sorted-by-severity, filtered list shown on screen -- NOT the original
/// `scan.findings` array.
pub fn resolve_selected_finding<'a>(
    findings: &'a [crate::types::Finding],
    filter: FindingsFilter,
    selected_index: usize,
) -> Option<&'a crate::types::Finding> {
    let mut filtered: Vec<&crate::types::Finding> = findings
        .iter()
        .filter(|f| filter.matches(f.severity))
        .collect();
    filtered.sort_by_key(|f| severity_order(f.severity));
    filtered.get(selected_index).copied()
}

/// Render the full Scan View -- master-detail split layout.
pub fn render_scan_view(frame: &mut Frame, area: Rect, app: &App) {
    if app.last_scan.is_none() && !app.scan_view.scanning {
        render::render_no_scan(frame, area, app.scan_view.scan_error.as_deref());
        return;
    }

    // Determine progress area height -- collapsed after scan complete
    let progress_height = if app.scan_view.progress_collapsed && !app.scan_view.scanning {
        1_u16 // Single summary line
    } else {
        10 // Full: 3 (puzzle) + 7 (gauges)
    };

    let top = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(progress_height), // Progress area
            Constraint::Length(1),               // Scan status line
            Constraint::Length(1),               // Filter bar
            Constraint::Min(5),                  // Main content area
        ])
        .split(area);

    if app.scan_view.progress_collapsed && !app.scan_view.scanning {
        render::render_progress_summary(frame, top[0], app);
    } else {
        // Split progress area into puzzle header (3) + gauges (7)
        let progress_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),
                Constraint::Min(5),
            ])
            .split(top[0]);
        render::render_puzzle_header(frame, progress_chunks[0], &app.scan_view);
        render::render_layer_progress(frame, progress_chunks[1], app);
    }

    render::render_scan_header(frame, top[1], app);
    render::render_filter_bar(frame, top[2], app);

    // Main content: horizontal split -- findings list (left) + preview panel (right)
    if app.last_scan.is_some() {
        let left_pct = u16::from(app.scan_view.scan_split_pct.clamp(25, 75));
        let right_pct = 100 - left_pct;
        let split = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(left_pct),
                Constraint::Percentage(right_pct),
            ])
            .split(top[3]);

        render::render_findings_list(frame, split[0], app);

        if app.scan_view.detail_open {
            detail::render_finding_detail(frame, split[1], app);
        } else {
            preview::render_scan_preview(frame, split[1], app);
        }
    } else {
        render::render_findings_list(frame, top[3], app);
    }
}
