//! Headless (non-TUI) mode for CI/CD pipelines and scripted usage.
//!
//! This module uses `println!`/`eprintln!` instead of `tracing` because its
//! output is user-facing CLI output (exit codes, JSON, SARIF), not diagnostic
//! logging. The output goes directly to stdout/stderr for consumption by CI
//! runners, shell scripts, and human operators.

mod commands;
pub mod daemon;
mod fix;
pub(crate) mod format;
mod scan;
#[cfg(test)]
mod tests;

pub use commands::{run_doctor, run_init, run_report, run_update, run_version};
pub use fix::run_headless_fix;
pub use scan::run_headless_scan;
