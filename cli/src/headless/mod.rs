//! Headless (non-TUI) mode for CI/CD pipelines and scripted usage.
//!
//! This module uses `println!`/`eprintln!` instead of `tracing` because its
//! output is user-facing CLI output (exit codes, JSON, SARIF), not diagnostic
//! logging. The output goes directly to stdout/stderr for consumption by CI
//! runners, shell scripts, and human operators.

pub mod agent;
pub mod cert;
mod commands;
pub(crate) mod common;
pub mod daemon;
mod fix;
pub(crate) mod format;
pub mod login;
pub mod scan;
pub mod supply_chain;
pub mod sync;
#[cfg(test)]
mod tests;

pub use commands::{run_doctor, run_init, run_report, run_update, run_version};
pub use fix::run_headless_fix;
pub use login::{run_login, run_logout};
pub use scan::run_headless_scan;
pub use sync::run_sync;
