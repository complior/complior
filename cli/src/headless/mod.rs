//! Headless (non-TUI) mode for CI/CD pipelines and scripted usage.
//!
//! This module uses `println!`/`eprintln!` instead of `tracing` because its
//! output is user-facing CLI output (exit codes, JSON, SARIF), not diagnostic
//! logging. The output goes directly to stdout/stderr for consumption by CI
//! runners, shell scripts, and human operators.

// Core
pub mod agent;
mod commands;
pub mod common;
pub mod daemon;
pub mod eval;
pub mod fix;
pub mod format;
pub mod interactive;
pub mod scan;

// Extras
#[cfg(feature = "extras")]
pub mod audit;
#[cfg(feature = "extras")]
pub mod cert;
#[cfg(feature = "extras")]
pub mod chat;
#[cfg(feature = "extras")]
pub mod cost;
#[cfg(feature = "extras")]
pub mod debt;
#[cfg(feature = "extras")]
pub mod doc;
#[cfg(feature = "extras")]
pub mod import;
#[cfg(feature = "extras")]
pub mod jurisdiction;
#[cfg(feature = "extras")]
pub mod login;
#[cfg(feature = "extras")]
pub mod proxy;
#[cfg(feature = "extras")]
pub mod redteam;
#[cfg(feature = "extras")]
pub mod simulate;
#[cfg(feature = "extras")]
pub mod supply_chain;
#[cfg(feature = "extras")]
pub mod sync;
#[cfg(feature = "extras")]
pub mod tools;

#[cfg(test)]
mod tests;

pub use commands::{run_doctor, run_init, run_report, run_update, run_version};
pub use fix::run_headless_fix;
pub use scan::run_headless_scan;

#[cfg(feature = "extras")]
pub use login::{run_login, run_logout};
#[cfg(feature = "extras")]
pub use sync::run_sync;
