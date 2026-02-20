use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "complior",
    version,
    about = "AI Act Compliance Scanner & Fixer",
    long_about = "Complior scans your project for EU AI Act compliance, identifies gaps, and helps you fix them.\n\nRun without a subcommand to launch the interactive TUI."
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Command>,

    /// Engine URL override (e.g. http://127.0.0.1:3099)
    #[arg(long = "engine-url", global = true)]
    pub engine_url: Option<String>,

    /// Resume previous session
    #[arg(long, global = true)]
    pub resume: bool,

    /// Color theme (dark, light, dracula, nord, solarized)
    #[arg(long, global = true)]
    pub theme: Option<String>,

    /// Skip interactive onboarding, use defaults (EU, deployer, general)
    #[arg(long, short = 'y', global = true)]
    pub yes: bool,
}

#[derive(Subcommand)]
pub enum Command {
    /// Scan project for AI Act compliance
    Scan {
        /// CI mode: exit 0 if score >= threshold, exit 1 otherwise
        #[arg(long)]
        ci: bool,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Output as SARIF v2.1.0 (IDE integration)
        #[arg(long)]
        sarif: bool,

        /// Headless human-readable output (no TUI)
        #[arg(long)]
        no_tui: bool,

        /// Score threshold for CI pass (default: 50)
        #[arg(long, default_value = "50")]
        threshold: u32,

        /// Fail on severity level (critical, high, medium, low)
        #[arg(long)]
        fail_on: Option<String>,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Apply fixes to improve compliance score
    Fix {
        /// Dry-run: preview fixes without modifying files
        #[arg(long)]
        dry_run: bool,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Show version and build info
    Version,

    /// Diagnose system health (engine connection, config, etc.)
    Doctor,

    /// Generate compliance report (markdown or PDF)
    Report {
        /// Output format: md or pdf (default: md)
        #[arg(long, default_value = "md")]
        format: String,

        /// Output path (default: auto-generated)
        #[arg(long, short)]
        output: Option<String>,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Initialize .complior/ configuration in project
    Init {
        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Check for and install updates
    Update,
}

/// Returns true if the CLI indicates a headless (non-TUI) invocation.
pub fn is_headless(cli: &Cli) -> bool {
    match &cli.command {
        Some(Command::Scan { ci, json, sarif, no_tui, .. }) => {
            *ci || *json || *sarif || *no_tui
        }
        Some(Command::Fix { dry_run, json, .. }) => *dry_run || *json,
        Some(Command::Version | Command::Doctor | Command::Report { .. } | Command::Init { .. } | Command::Update) => true,
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::Parser;

    #[test]
    fn cli_parse_scan_json() {
        let cli = Cli::parse_from(["complior", "scan", "--json"]);
        assert!(matches!(cli.command, Some(Command::Scan { json: true, .. })));
    }

    #[test]
    fn cli_parse_scan_ci() {
        let cli = Cli::parse_from(["complior", "scan", "--ci", "--threshold", "80"]);
        match cli.command {
            Some(Command::Scan { ci, threshold, .. }) => {
                assert!(ci);
                assert_eq!(threshold, 80);
            }
            _ => panic!("Expected Scan command"),
        }
    }

    #[test]
    fn cli_parse_no_subcommand() {
        let cli = Cli::parse_from(["complior"]);
        assert!(cli.command.is_none());
        assert!(!is_headless(&cli));
    }

    #[test]
    fn cli_parse_version() {
        let cli = Cli::parse_from(["complior", "version"]);
        assert!(matches!(cli.command, Some(Command::Version)));
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_global_flags() {
        let cli = Cli::parse_from(["complior", "--engine-url", "http://localhost:4000", "--resume"]);
        assert_eq!(cli.engine_url.as_deref(), Some("http://localhost:4000"));
        assert!(cli.resume);
    }

    #[test]
    fn cli_parse_yes_flag() {
        let cli = Cli::parse_from(["complior", "--yes"]);
        assert!(cli.yes);
        assert!(!is_headless(&cli));
    }

    #[test]
    fn cli_parse_y_shorthand() {
        let cli = Cli::parse_from(["complior", "-y"]);
        assert!(cli.yes);
    }

    #[test]
    fn cli_parse_fix_dry_run() {
        let cli = Cli::parse_from(["complior", "fix", "--dry-run"]);
        match cli.command {
            Some(Command::Fix { dry_run, json, .. }) => {
                assert!(dry_run);
                assert!(!json);
            }
            _ => panic!("Expected Fix command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_fix_json() {
        let cli = Cli::parse_from(["complior", "fix", "--dry-run", "--json"]);
        match cli.command {
            Some(Command::Fix { dry_run, json, .. }) => {
                assert!(dry_run);
                assert!(json);
            }
            _ => panic!("Expected Fix command"),
        }
    }

    #[test]
    fn cli_headless_detection() {
        let json_cli = Cli::parse_from(["complior", "scan", "--json"]);
        assert!(is_headless(&json_cli));

        let ci_cli = Cli::parse_from(["complior", "scan", "--ci"]);
        assert!(is_headless(&ci_cli));

        let sarif_cli = Cli::parse_from(["complior", "scan", "--sarif"]);
        assert!(is_headless(&sarif_cli));

        let no_tui_cli = Cli::parse_from(["complior", "scan", "--no-tui"]);
        assert!(is_headless(&no_tui_cli));

        let dry_run_cli = Cli::parse_from(["complior", "fix", "--dry-run"]);
        assert!(is_headless(&dry_run_cli));

        let tui_cli = Cli::parse_from(["complior"]);
        assert!(!is_headless(&tui_cli));
    }
}
