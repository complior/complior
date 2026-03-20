//! ANSI terminal color utilities with NO_COLOR / TERM=dumb detection.

use std::io::IsTerminal as _;
use std::sync::OnceLock;

use crate::types::Severity;

/// Cached color detection — computed once per process.
static COLOR_ENABLED: OnceLock<bool> = OnceLock::new();

fn color_enabled() -> bool {
    *COLOR_ENABLED.get_or_init(|| {
        if std::env::var("NO_COLOR").is_ok() {
            return false;
        }
        if std::env::var("TERM")
            .map(|t| t == "dumb")
            .unwrap_or(false)
        {
            return false;
        }
        std::io::stdout().is_terminal()
    })
}

fn ansi(code: &str, text: &str) -> String {
    if color_enabled() {
        format!("\x1b[{code}m{text}\x1b[0m")
    } else {
        text.to_string()
    }
}

pub(crate) fn red(t: &str) -> String { ansi("31", t) }
pub(crate) fn green(t: &str) -> String { ansi("32", t) }
pub(crate) fn yellow(t: &str) -> String { ansi("33", t) }
pub(crate) fn cyan(t: &str) -> String { ansi("36", t) }
pub(crate) fn bold(t: &str) -> String { ansi("1", t) }
pub(crate) fn bold_red(t: &str) -> String { ansi("1;31", t) }
pub(crate) fn bold_green(t: &str) -> String { ansi("1;32", t) }
pub(crate) fn bold_yellow(t: &str) -> String { ansi("1;33", t) }
pub(crate) fn dim(t: &str) -> String { ansi("2", t) }

pub(crate) fn score_color(score: f64, text: &str) -> String {
    if score >= 90.0 {
        bold_green(text)
    } else if score >= 80.0 {
        green(text)
    } else if score >= 70.0 {
        yellow(text)
    } else if score >= 50.0 {
        bold_yellow(text)
    } else {
        bold_red(text)
    }
}

pub(crate) fn severity_icon(sev: &Severity) -> String {
    match sev {
        Severity::Critical | Severity::High => red("✖"),
        Severity::Medium => yellow("▲"),
        Severity::Low => cyan("●"),
        Severity::Info => dim("·"),
    }
}

pub(crate) fn severity_color(sev: &Severity, text: &str) -> String {
    match sev {
        Severity::Critical => bold_red(text),
        Severity::High => red(text),
        Severity::Medium => yellow(text),
        Severity::Low => cyan(text),
        Severity::Info => dim(text),
    }
}

pub(crate) fn layer_status_color(status: &str, text: &str) -> String {
    match status {
        "PASS" => green(text),
        "WARN" => yellow(text),
        "FAIL" => red(text),
        _ => dim(text),
    }
}
