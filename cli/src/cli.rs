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

    /// Daemon management (background compliance monitoring)
    Daemon {
        #[command(subcommand)]
        action: Option<DaemonAction>,

        /// Enable file watcher (shortcut for `daemon start --watch`)
        #[arg(long)]
        watch: bool,
    },

    /// Manage Agent Passport (AI system identity, permissions, compliance)
    Agent {
        #[command(subcommand)]
        action: AgentAction,
    },

    /// Authenticate with SaaS (app.complior.ai) via browser
    Login,

    /// Clear SaaS authentication tokens
    Logout,

    /// Sync data with SaaS (passports, scans, documents)
    Sync {
        /// Sync only passports
        #[arg(long)]
        passport: bool,

        /// Sync only scan results
        #[arg(long)]
        scan: bool,

        /// Sync only documents
        #[arg(long)]
        docs: bool,

        /// Skip auto-sync after scan
        #[arg(long)]
        no_sync: bool,
    },
}

#[derive(Subcommand, Debug, Clone)]
pub enum AgentAction {
    /// Auto-generate Agent Passport from codebase analysis
    Init {
        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Overwrite existing passports (default: skip)
        #[arg(long)]
        force: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// List all Agent Passports in this project
    List {
        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Show a specific Agent Passport
    Show {
        /// Agent name
        name: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Analyze project autonomy level (L1-L5) without generating a passport
    Autonomy {
        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Validate an existing Agent Passport (schema + signature + completeness)
    Validate {
        /// Agent name (validates all if omitted)
        name: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// CI mode: exit 1 if validation fails
        #[arg(long)]
        ci: bool,

        /// Strict mode: warnings also cause failure
        #[arg(long)]
        strict: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Show passport completeness score and obligation gaps
    Completeness {
        /// Agent name
        name: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Generate Fundamental Rights Impact Assessment (Art.27)
    Fria {
        /// Agent name
        name: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Organization name (for FRIA header)
        #[arg(long)]
        organization: Option<String>,

        /// Impact description for risk assessment (Section 4)
        #[arg(long)]
        impact: Option<String>,

        /// Mitigation measures for risk assessment (Section 4)
        #[arg(long)]
        mitigation: Option<String>,

        /// Decision-maker name/title for sign-off (Section 10)
        #[arg(long)]
        approval: Option<String>,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Show evidence chain summary or verify integrity
    Evidence {
        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Verify chain integrity
        #[arg(long)]
        verify: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
}

#[derive(Subcommand, Debug, Clone)]
pub enum DaemonAction {
    /// Start daemon (default)
    Start {
        /// Enable file watcher for automatic rescans
        #[arg(long)]
        watch: bool,

        /// Port to bind (default: auto-detect free port)
        #[arg(long)]
        port: Option<u16>,
    },
    /// Show daemon status
    Status,
    /// Stop running daemon
    Stop,
}

/// Returns true if the CLI indicates a headless (non-TUI) invocation.
pub fn is_headless(cli: &Cli) -> bool {
    match &cli.command {
        Some(Command::Scan { ci, json, sarif, no_tui, .. }) => {
            *ci || *json || *sarif || *no_tui
        }
        Some(Command::Fix { dry_run, json, .. }) => *dry_run || *json,
        Some(
            Command::Version
            | Command::Doctor
            | Command::Report { .. }
            | Command::Init { .. }
            | Command::Update
            | Command::Daemon { .. }
            | Command::Agent { .. }
            | Command::Login
            | Command::Logout
            | Command::Sync { .. },
        ) => true,
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
    fn cli_parse_daemon_bare() {
        let cli = Cli::parse_from(["complior", "daemon"]);
        match &cli.command {
            Some(Command::Daemon { action, watch }) => {
                assert!(action.is_none());
                assert!(!watch);
            }
            _ => panic!("Expected Daemon command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_daemon_start_watch_port() {
        let cli = Cli::parse_from(["complior", "daemon", "start", "--watch", "--port", "4000"]);
        match cli.command {
            Some(Command::Daemon { action: Some(DaemonAction::Start { watch, port }), .. }) => {
                assert!(watch);
                assert_eq!(port, Some(4000));
            }
            _ => panic!("Expected Daemon Start"),
        }
    }

    #[test]
    fn cli_parse_daemon_top_level_watch() {
        let cli = Cli::parse_from(["complior", "daemon", "--watch"]);
        match cli.command {
            Some(Command::Daemon { action, watch }) => {
                assert!(action.is_none());
                assert!(watch);
            }
            _ => panic!("Expected Daemon with --watch"),
        }
    }

    #[test]
    fn cli_parse_daemon_status() {
        let cli = Cli::parse_from(["complior", "daemon", "status"]);
        assert!(matches!(
            cli.command,
            Some(Command::Daemon { action: Some(DaemonAction::Status), .. })
        ));
    }

    #[test]
    fn cli_parse_daemon_stop() {
        let cli = Cli::parse_from(["complior", "daemon", "stop"]);
        assert!(matches!(
            cli.command,
            Some(Command::Daemon { action: Some(DaemonAction::Stop), .. })
        ));
    }

    #[test]
    fn cli_parse_agent_init() {
        let cli = Cli::parse_from(["complior", "agent", "init"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Init { json, path, .. } }) => {
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Agent Init command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_init_json() {
        let cli = Cli::parse_from(["complior", "agent", "init", "--json"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Init { json, .. } }) => {
                assert!(*json);
            }
            _ => panic!("Expected Agent Init command"),
        }
    }

    #[test]
    fn cli_parse_agent_init_path() {
        let cli = Cli::parse_from(["complior", "agent", "init", "/tmp/project"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Init { path, .. } }) => {
                assert_eq!(path.as_deref(), Some("/tmp/project"));
            }
            _ => panic!("Expected Agent Init command"),
        }
    }

    #[test]
    fn cli_parse_agent_list() {
        let cli = Cli::parse_from(["complior", "agent", "list"]);
        assert!(matches!(
            &cli.command,
            Some(Command::Agent { action: AgentAction::List { json: false, path: None } })
        ));
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_show() {
        let cli = Cli::parse_from(["complior", "agent", "show", "my-bot"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Show { name, json, path } }) => {
                assert_eq!(name, "my-bot");
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Agent Show command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_show_json() {
        let cli = Cli::parse_from(["complior", "agent", "show", "my-bot", "--json"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Show { name, json, .. } }) => {
                assert_eq!(name, "my-bot");
                assert!(*json);
            }
            _ => panic!("Expected Agent Show command"),
        }
    }

    #[test]
    fn cli_parse_agent_autonomy() {
        let cli = Cli::parse_from(["complior", "agent", "autonomy"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Autonomy { json, path } }) => {
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Agent Autonomy command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_autonomy_json() {
        let cli = Cli::parse_from(["complior", "agent", "autonomy", "--json"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Autonomy { json, .. } }) => {
                assert!(*json);
            }
            _ => panic!("Expected Agent Autonomy command"),
        }
    }

    #[test]
    fn cli_parse_agent_autonomy_path() {
        let cli = Cli::parse_from(["complior", "agent", "autonomy", "/tmp/proj"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Autonomy { path, .. } }) => {
                assert_eq!(path.as_deref(), Some("/tmp/proj"));
            }
            _ => panic!("Expected Agent Autonomy command"),
        }
    }

    #[test]
    fn cli_parse_agent_validate() {
        let cli = Cli::parse_from(["complior", "agent", "validate"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Validate { name, json, ci, strict, path } }) => {
                assert!(name.is_none());
                assert!(!json);
                assert!(!ci);
                assert!(!strict);
                assert!(path.is_none());
            }
            _ => panic!("Expected Agent Validate command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_validate_name() {
        let cli = Cli::parse_from(["complior", "agent", "validate", "my-bot"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Validate { name, .. } }) => {
                assert_eq!(name.as_deref(), Some("my-bot"));
            }
            _ => panic!("Expected Agent Validate command"),
        }
    }

    #[test]
    fn cli_parse_agent_validate_ci_strict() {
        let cli = Cli::parse_from(["complior", "agent", "validate", "--ci", "--strict"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Validate { ci, strict, .. } }) => {
                assert!(*ci);
                assert!(*strict);
            }
            _ => panic!("Expected Agent Validate command"),
        }
    }

    #[test]
    fn cli_parse_agent_completeness() {
        let cli = Cli::parse_from(["complior", "agent", "completeness", "my-bot"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Completeness { name, json, path } }) => {
                assert_eq!(name, "my-bot");
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Agent Completeness command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_completeness_json() {
        let cli = Cli::parse_from(["complior", "agent", "completeness", "my-bot", "--json"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Completeness { name, json, .. } }) => {
                assert_eq!(name, "my-bot");
                assert!(*json);
            }
            _ => panic!("Expected Agent Completeness command"),
        }
    }

    #[test]
    fn cli_parse_agent_fria() {
        let cli = Cli::parse_from(["complior", "agent", "fria", "my-bot"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Fria { name, json, organization, impact, mitigation, approval, path } }) => {
                assert_eq!(name, "my-bot");
                assert!(!json);
                assert!(organization.is_none());
                assert!(impact.is_none());
                assert!(mitigation.is_none());
                assert!(approval.is_none());
                assert!(path.is_none());
            }
            _ => panic!("Expected Agent Fria command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_fria_json() {
        let cli = Cli::parse_from(["complior", "agent", "fria", "my-bot", "--json"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Fria { name, json, .. } }) => {
                assert_eq!(name, "my-bot");
                assert!(*json);
            }
            _ => panic!("Expected Agent Fria command"),
        }
    }

    #[test]
    fn cli_parse_agent_fria_organization() {
        let cli = Cli::parse_from(["complior", "agent", "fria", "my-bot", "--organization", "Acme"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Fria { name, organization, .. } }) => {
                assert_eq!(name, "my-bot");
                assert_eq!(organization.as_deref(), Some("Acme"));
            }
            _ => panic!("Expected Agent Fria command"),
        }
    }

    #[test]
    fn cli_parse_agent_fria_manual_fields() {
        let cli = Cli::parse_from([
            "complior", "agent", "fria", "my-bot",
            "--impact", "Credit scoring bias",
            "--mitigation", "Quarterly audits",
            "--approval", "Jane Doe, CTO",
        ]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Fria { name, impact, mitigation, approval, .. } }) => {
                assert_eq!(name, "my-bot");
                assert_eq!(impact.as_deref(), Some("Credit scoring bias"));
                assert_eq!(mitigation.as_deref(), Some("Quarterly audits"));
                assert_eq!(approval.as_deref(), Some("Jane Doe, CTO"));
            }
            _ => panic!("Expected Agent Fria command"),
        }
    }

    #[test]
    fn cli_parse_agent_evidence() {
        let cli = Cli::parse_from(["complior", "agent", "evidence"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Evidence { json, verify, path } }) => {
                assert!(!json);
                assert!(!verify);
                assert!(path.is_none());
            }
            _ => panic!("Expected Agent Evidence command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_agent_evidence_verify() {
        let cli = Cli::parse_from(["complior", "agent", "evidence", "--verify"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Evidence { verify, .. } }) => {
                assert!(*verify);
            }
            _ => panic!("Expected Agent Evidence command"),
        }
    }

    #[test]
    fn cli_parse_agent_evidence_json() {
        let cli = Cli::parse_from(["complior", "agent", "evidence", "--json"]);
        match &cli.command {
            Some(Command::Agent { action: AgentAction::Evidence { json, .. } }) => {
                assert!(*json);
            }
            _ => panic!("Expected Agent Evidence command"),
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
