//! ANSI terminal color utilities with `NO_COLOR` / TERM=dumb detection.

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

/// Cached unicode detection — disabled for dumb terminals and piped output.
static UNICODE_ENABLED: OnceLock<bool> = OnceLock::new();

pub fn use_unicode() -> bool {
    *UNICODE_ENABLED.get_or_init(|| {
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

pub fn red(t: &str) -> String { ansi("31", t) }
pub fn green(t: &str) -> String { ansi("32", t) }
pub fn yellow(t: &str) -> String { ansi("33", t) }
pub fn cyan(t: &str) -> String { ansi("36", t) }
pub fn bold(t: &str) -> String { ansi("1", t) }
pub fn bold_red(t: &str) -> String { ansi("1;31", t) }
pub fn bold_green(t: &str) -> String { ansi("1;32", t) }
pub fn bold_yellow(t: &str) -> String { ansi("1;33", t) }
pub fn dim(t: &str) -> String { ansi("2", t) }

// ── Unicode/ASCII fallback helpers ──────────────────────────────

pub fn diamond() -> &'static str { if use_unicode() { "◆" } else { "*" } }
pub fn bar_filled() -> &'static str { if use_unicode() { "█" } else { "#" } }
pub fn bar_empty() -> &'static str { if use_unicode() { "░" } else { "-" } }
pub fn h_line() -> &'static str { if use_unicode() { "─" } else { "-" } }
pub fn check_mark() -> &'static str { if use_unicode() { "✓" } else { "+" } }
pub fn skip_icon() -> &'static str { if use_unicode() { "⏭" } else { ">" } }
pub fn warning_icon() -> &'static str { if use_unicode() { "⚠" } else { "!" } }
pub fn tree_branch() -> &'static str { if use_unicode() { "├" } else { "|" } }
pub fn tree_end() -> &'static str { if use_unicode() { "└" } else { "`" } }

// ── Score & severity ────────────────────────────────────────────

pub fn score_color(score: f64, text: &str) -> String {
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

pub fn severity_icon(sev: &Severity) -> String {
    if use_unicode() {
        match sev {
            Severity::Critical => red("✖"),
            Severity::High => yellow("▲"),
            Severity::Medium => cyan("●"),
            Severity::Low | Severity::Info => dim("·"),
        }
    } else {
        match sev {
            Severity::Critical => red("X"),
            Severity::High => yellow("!"),
            Severity::Medium => cyan("*"),
            Severity::Low | Severity::Info => ".".to_string(),
        }
    }
}

pub fn severity_color(sev: &Severity, text: &str) -> String {
    match sev {
        Severity::Critical => bold_red(text),
        Severity::High => red(text),
        Severity::Medium => yellow(text),
        Severity::Low => cyan(text),
        Severity::Info => dim(text),
    }
}

pub fn layer_status_color(status: &str, text: &str) -> String {
    match status {
        "PASS" => green(text),
        "WARN" => yellow(text),
        "FAIL" => red(text),
        _ => dim(text),
    }
}

// ── Grade computation ───────────────────────────────────────────

/// Map score to letter grade (mirrors TS engine's `resolveGrade()`).
pub fn resolve_grade(score: f64) -> &'static str {
    if score >= 90.0 {
        "A"
    } else if score >= 75.0 {
        "B"
    } else if score >= 60.0 {
        "C"
    } else if score >= 40.0 {
        "D"
    } else {
        "F"
    }
}

/// Color a string based on letter grade.
pub fn grade_color(grade: &str, text: &str) -> String {
    match grade {
        "A" => bold_green(text),
        "B" => green(text),
        "C" => yellow(text),
        "D" => bold_yellow(text),
        _ => bold_red(text),
    }
}
