use crate::types::{ActivityEntry, Finding, Zone};

/// Abstraction over compliance data sources (mock / engine / hybrid).
///
/// All compliance views read from this trait when real scan data is absent,
/// allowing the TUI to show meaningful placeholder content offline.
pub trait DataProvider: Send + Sync {
    /// Overall compliance score (0–100).
    fn score(&self) -> f64;
    /// Compliance zone derived from score.
    fn zone(&self) -> Zone;
    /// List of compliance findings.
    fn findings(&self) -> Vec<Finding>;
    /// Ordered list of recent scan/fix events for the timeline view.
    fn timeline(&self) -> Vec<ActivityEntry>;
    /// Activity log entries for the dashboard widget.
    fn activity_log(&self) -> Vec<ActivityEntry>;
}
