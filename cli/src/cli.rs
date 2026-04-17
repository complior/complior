use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "complior",
    version,
    about = "AI Act Compliance Scanner & Fixer",
    long_about = "Complior scans your project for EU AI Act compliance, identifies gaps, and helps you fix them.\n\nRun without a subcommand to launch the interactive TUI.",
    after_long_help = "\x1b[1mExamples:\x1b[0m\n  complior                              Launch TUI dashboard\n  complior scan                         Scan current project\n  complior scan --ci --threshold 80     CI gate with threshold\n  complior eval http://localhost:4000   Dynamic AI testing\n  complior fix --doc fria my-bot        Generate FRIA report\n  complior passport list                List agent passports\n  complior doctor                       System health check"
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Command>,

    /// Engine URL override (e.g. <http://127.0.0.1:3099>)
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

    /// Disable colored output (same as `NO_COLOR=1`)
    #[arg(long, global = true)]
    pub no_color: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, clap::ValueEnum)]
pub enum FixSource {
    Scan,
    Eval,
    All,
}

impl std::fmt::Display for FixSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Scan => write!(f, "scan"),
            Self::Eval => write!(f, "eval"),
            Self::All => write!(f, "all"),
        }
    }
}

/// Severity level for `--fail-on` flag (validated at parse time).
#[derive(Debug, Clone, Copy, PartialEq, Eq, clap::ValueEnum)]
pub enum SeverityLevel {
    Critical,
    High,
    Medium,
    Low,
}

impl SeverityLevel {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
        }
    }
}

#[derive(Subcommand)]
pub enum Command {
    /// Scan project for AI Act compliance
    #[command(after_long_help = "\x1b[1mExamples:\x1b[0m\n  complior scan                         Basic scan (L1-L4)\n  complior scan --deep                  Include external tools\n  complior scan --llm                   Add LLM analysis (L5)\n  complior scan --ci --threshold 80     CI mode with threshold\n  complior scan --json                  JSON output\n  complior scan --diff main             Compare against branch")]
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

        /// [deprecated] Scans are always headless; this flag is a no-op
        #[arg(long, hide = true)]
        no_tui: bool,

        /// Score threshold for CI pass (default: 50)
        #[arg(long, default_value = "50")]
        threshold: u32,

        /// Fail on severity level (critical, high, medium, low)
        #[arg(long, value_enum)]
        fail_on: Option<SeverityLevel>,

        /// Diff mode: compare against base branch (e.g. --diff main)
        #[arg(long)]
        diff: Option<String>,

        /// Exit 1 if score regressed or new critical findings
        #[arg(long)]
        fail_on_regression: bool,

        /// Post diff as PR comment (requires gh CLI)
        #[arg(long)]
        comment: bool,

        /// Tier 2: Run external security tools (Semgrep, Bandit, ModelScan, detect-secrets) via uv
        #[arg(long)]
        deep: bool,

        /// L5: AI-powered document quality analysis (LLM)
        #[arg(long)]
        llm: bool,

        /// [planned] Cloud scan via SaaS API
        #[arg(long, hide = true)]
        cloud: bool,

        /// Show only critical findings and score
        #[arg(long, short = 'q')]
        quiet: bool,

        /// Filter by agent name (passport source_files)
        #[arg(long)]
        agent: Option<String>,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Apply fixes to improve compliance score
    #[command(after_long_help = "\x1b[1mExamples:\x1b[0m\n  complior fix                          Apply all scan fixes\n  complior fix --dry-run                Preview without applying\n  complior fix --check-id l1-fria       Fix single check\n  complior fix --doc fria my-bot        Generate FRIA report\n  complior fix --doc all my-bot         Generate all documents")]
    Fix {
        /// Dry-run: preview fixes without modifying files
        #[arg(long)]
        dry_run: bool,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Use LLM to enrich generated documents with context-aware content
        #[arg(long)]
        ai: bool,

        /// Fix source: scan (default), eval, or all
        #[arg(long, default_value_t = FixSource::Scan, value_enum)]
        source: FixSource,

        /// Apply fix for a specific check ID only (e.g. l1-fria)
        #[arg(long)]
        check_id: Option<String>,

        /// Generate a compliance document (e.g. ai-literacy, art5-screening,
        /// technical-documentation, fria, worker-notification)
        #[arg(long)]
        doc: Option<String>,

        /// Agent name (used with --doc to select which passport to generate docs for)
        #[arg(long)]
        agent: Option<String>,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Show version and build info
    Version,

    /// Diagnose system health (engine connection, config, etc.)
    Doctor {
        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Show aggregated compliance posture (score disclaimer, categories, top actions)
    Status {
        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Generate compliance readiness report
    #[command(after_long_help = "\x1b[1mExamples:\x1b[0m\n  complior report                       Human-readable report\n  complior report --format html         Interactive HTML report\n  complior report --json -o report.json Save JSON to file\n  complior report --share               Offline HTML for sharing")]
    Report {
        /// Output format: human, json, md, markdown, pdf, html (default: human)
        #[arg(long, default_value = "human")]
        format: String,

        /// Output path (default: stdout for human/json, auto-generated for files)
        #[arg(long, short)]
        output: Option<String>,

        /// Output JSON to stdout (shorthand for --format json)
        #[arg(long)]
        json: bool,

        /// Generate offline HTML report for sharing
        #[arg(long)]
        share: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Initialize .complior/ configuration in project
    Init {
        /// Overwrite existing passports (default: skip)
        #[arg(long)]
        force: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Check for and install updates
    Update,

    /// Generate shell completions (bash, zsh, fish, powershell)
    #[command(after_long_help = "\x1b[1mExamples:\x1b[0m\n  complior completions bash > ~/.local/share/bash-completion/completions/complior\n  complior completions zsh > ~/.zfunc/_complior\n  complior completions fish > ~/.config/fish/completions/complior.fish")]
    Completions {
        /// Shell to generate completions for
        #[arg(value_enum)]
        shell: clap_complete::Shell,
    },

    /// Daemon management (background compliance monitoring)
    Daemon {
        #[command(subcommand)]
        action: Option<DaemonAction>,

        /// Enable file watcher (shortcut for `daemon start --watch`)
        #[arg(long)]
        watch: bool,
    },

    /// Manage Agent Passport (AI system identity, permissions, compliance)
    #[command(after_long_help = "\x1b[1mExamples:\x1b[0m\n  complior passport init                Auto-discover agents\n  complior passport list                List all passports\n  complior passport show my-bot         View passport details\n  complior passport validate --ci       CI validation gate\n  complior passport export my-bot --format a2a  Export to A2A")]
    Passport {
        #[command(subcommand)]
        action: PassportAction,
    },

    // === EXTRAS (behind feature flag) ===
    /// AIUC-1 certification readiness assessment
    #[cfg(feature = "extras")]
    Cert {
        #[command(subcommand)]
        action: CertAction,
    },

    /// Chat with the compliance assistant (LLM-powered)
    #[cfg(feature = "extras")]
    Chat {
        /// The question or message to send
        message: String,

        /// Output raw JSON events instead of streamed text
        #[arg(long)]
        json: bool,

        /// Model override (e.g. "gpt-4o", "claude-sonnet")
        #[arg(long)]
        model: Option<String>,
    },

    /// Audit AI supply chain dependencies and model compliance cards
    #[cfg(feature = "extras")]
    SupplyChain {
        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Show model compliance cards only
        #[arg(long)]
        models: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Compliance cost estimator (remediation, documentation, ROI)
    #[cfg(feature = "extras")]
    Cost {
        /// Hourly rate in EUR (default: 150)
        #[arg(long, default_value = "150")]
        hourly_rate: u32,
        /// Agent name (optional)
        #[arg(long)]
        agent: Option<String>,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Compliance debt score
    #[cfg(feature = "extras")]
    Debt {
        /// Output as JSON
        #[arg(long)]
        json: bool,
        /// Show trend (compare to previous)
        #[arg(long)]
        trend: bool,
    },

    /// Simulate compliance actions (what-if score projection)
    #[cfg(feature = "extras")]
    Simulate {
        /// Fix a specific finding (by check ID)
        #[arg(long)]
        fix: Vec<String>,
        /// Add a document type (fria, technical-documentation, etc.)
        #[arg(long, value_name = "TYPE")]
        add_doc: Vec<String>,
        /// Complete a passport field
        #[arg(long, value_name = "FIELD")]
        complete_passport: Vec<String>,
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Query EU AI Act jurisdiction data (MSA, requirements)
    #[cfg(feature = "extras")]
    Jurisdiction {
        #[command(subcommand)]
        action: JurisdictionAction,
    },

    /// MCP Compliance Proxy (intercept, log, enforce tool calls)
    #[cfg(feature = "extras")]
    Proxy {
        #[command(subcommand)]
        action: ProxyAction,
    },

    /// Generate compliance documents from EU AI Act templates
    #[cfg(feature = "extras")]
    Doc {
        #[command(subcommand)]
        action: DocAction,
    },

    /// Import external tool results (e.g. Promptfoo red-team output)
    #[cfg(feature = "extras")]
    Import {
        #[command(subcommand)]
        action: ImportAction,
    },

    /// Run security red-team probes against your AI system
    #[cfg(feature = "extras")]
    Redteam {
        #[command(subcommand)]
        action: RedteamAction,
    },

    /// Manage external security tools (install, update, status)
    #[cfg(feature = "extras")]
    Tools {
        #[command(subcommand)]
        action: ToolsAction,
    },

    /// Run dynamic AI system evaluation (probes + LLM judge + security)
    #[command(after_long_help = "\x1b[1mExamples:\x1b[0m\n  complior eval http://localhost:4000    Deterministic tests\n  complior eval http://localhost:4000 --llm    Add LLM judge\n  complior eval http://localhost:4000 --full   All test suites\n  complior eval --last --failures       Review last failures")]
    Eval {
        /// Target AI endpoint URL (e.g. <http://localhost:4000/api/chat>)
        target: Option<String>,

        /// Run deterministic tests (168 tests, default when no flags)
        #[arg(long)]
        det: bool,

        /// Run LLM-judged tests (212 tests). Requires one of: `OPENROUTER_API_KEY`,
        /// `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` in .complior/.env or env
        #[arg(long)]
        llm: bool,

        /// Run security probes (300 probes, OWASP LLM Top 10)
        #[arg(long)]
        security: bool,

        /// Run all tests: deterministic (168) + LLM (212) + security (300)
        #[arg(long)]
        full: bool,

        /// Agent name (for passport attribution)
        #[arg(long)]
        agent: Option<String>,

        /// Filter by category (comma-separated: transparency,bias,prohibited,...)
        #[arg(long, value_delimiter = ',')]
        categories: Vec<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// CI mode: exit 2 if score < threshold (machine-parseable output)
        #[arg(long)]
        ci: bool,

        /// Score threshold for CI pass (default: 60)
        #[arg(long, default_value = "60")]
        threshold: u32,

        /// LLM model override for judge
        #[arg(long)]
        model: Option<String>,

        /// API key for target endpoint
        #[arg(long)]
        api_key: Option<String>,

        /// Custom request JSON template with {{probe}} placeholder
        #[arg(long)]
        request_template: Option<String>,

        /// Dot-path to response text (e.g. "result.text")
        #[arg(long)]
        response_path: Option<String>,

        /// Custom headers as JSON (e.g. '{"Authorization": "Bearer xxx"}')
        #[arg(long)]
        headers: Option<String>,

        /// Show last eval result
        #[arg(long)]
        last: bool,

        /// Show only failures (with --last)
        #[arg(long)]
        failures: bool,

        /// Show verbose test details (probe/response for all tests)
        #[arg(long)]
        verbose: bool,

        /// Parallel test execution (1-50, default: 5)
        #[arg(long, short = 'j', default_value = "5")]
        concurrency: u32,

        /// Disable inline remediation recommendations
        #[arg(long)]
        no_remediation: bool,

        /// Generate full remediation report (saved to .complior/eval-fixes/)
        #[arg(long)]
        remediation: bool,

        /// Auto-apply fixes from eval failures (interactive preview)
        #[arg(long)]
        fix: bool,

        /// Dry-run mode for --fix (preview without applying)
        #[arg(long)]
        dry_run: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Run comprehensive audit (static scan + dynamic eval + security)
    #[cfg(feature = "extras")]
    Audit {
        /// Target AI endpoint URL
        target: String,

        /// Agent name (for passport attribution)
        #[arg(long)]
        agent: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },

    /// Authenticate with SaaS dashboard via browser
    #[cfg(feature = "extras")]
    Login,

    /// Clear SaaS authentication tokens
    #[cfg(feature = "extras")]
    Logout,

    /// Sync data with SaaS (passports, scans, documents)
    #[cfg(feature = "extras")]
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

        /// Sync only audit trail
        #[arg(long)]
        audit: bool,

        /// Sync only evidence chain
        #[arg(long)]
        evidence: bool,

        /// Sync only agent registry
        #[arg(long)]
        registry: bool,

        /// Skip auto-sync after scan
        #[arg(long)]
        no_sync: bool,
    },
}


#[derive(Subcommand, Debug, Clone)]
pub enum PassportAction {

    /// Rename an existing Agent Passport
    Rename {
        /// Current passport name
        old_name: String,

        /// New passport name
        new_name: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
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

        /// Show extended columns (framework, model, owner, files)
        #[arg(long, short = 'v')]
        verbose: bool,

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

        /// Show per-field breakdown (filled/empty)
        #[arg(long)]
        verbose: bool,

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
    /// Export passport to external format (A2A, AIUC-1, NIST)
    Export {
        /// Agent name
        name: String,

        /// Export format: a2a, aiuc-1, nist
        #[arg(long)]
        format: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Show unified per-agent compliance registry
    Registry {
        /// Output as JSON
        #[arg(long)]
        json: bool,

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
    /// Show cross-agent permissions matrix and conflicts
    Permissions {
        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Compare passport versions (diff)
    Diff {
        /// Agent name
        name: String,

        /// Project path (default: current directory)
        #[arg(long)]
        path: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Import passport from external format (A2A, AIUC-1)
    Import {
        /// Source format: a2a
        #[arg(long)]
        from: String,

        /// Input file path (JSON)
        file: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        #[arg(long)]
        path: Option<String>,
    },
    /// Export audit package (tar.gz) for auditors
    AuditPackage {
        /// Output file path
        #[arg(long, short)]
        output: Option<String>,

        /// Output as JSON (metadata only)
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        #[arg(long)]
        path: Option<String>,
    },
    /// Show audit trail (compliance event log)
    Audit {
        /// Filter by agent name
        #[arg(long)]
        agent: Option<String>,

        /// Filter events since date (ISO format)
        #[arg(long)]
        since: Option<String>,

        /// Filter by event type
        #[arg(long = "type")]
        event_type: Option<String>,

        /// Max entries
        #[arg(long, default_value = "50")]
        limit: u32,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
}


#[cfg(feature = "extras")]
#[derive(Subcommand, Debug, Clone)]
pub enum CertAction {
    /// Compute AIUC-1 readiness score for an agent
    Readiness {
        /// Agent name
        name: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
    /// Run adversarial tests against an AI agent
    Test {
        /// Agent name
        name: String,

        /// Run adversarial test suite (prompt injection, bias, safety)
        #[arg(long)]
        adversarial: bool,

        /// Filter categories (comma-separated: prompt_injection,bias_detection,safety_boundary)
        #[arg(long)]
        categories: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,

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

#[cfg(feature = "extras")]
#[derive(Subcommand, Debug, Clone)]
pub enum ProxyAction {
    /// Start MCP proxy bridge to upstream server
    Start {
        /// Upstream MCP server command (e.g., "npx @modelcontextprotocol/server-filesystem")
        command: String,

        /// Arguments to pass to the upstream server
        #[arg(trailing_var_arg = true)]
        args: Vec<String>,
    },
    /// Stop the running proxy
    Stop,
    /// Show proxy status and statistics
    Status,
}

#[cfg(feature = "extras")]
#[derive(Subcommand, Debug, Clone)]
pub enum DocAction {
    /// Generate compliance documents (single type or all)
    Generate {
        /// Agent name
        name: String,

        /// Document type (ai-literacy, art5-screening, technical-documentation,
        /// incident-report, declaration-of-conformity, monitoring-policy)
        #[arg(long = "type")]
        doc_type: Option<String>,

        /// Generate ALL required compliance documents (6 templates + FRIA + Worker Notification)
        #[arg(long)]
        all: bool,

        /// Organization name (for document headers)
        #[arg(long)]
        organization: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// Project path (default: current directory)
        path: Option<String>,
    },
}

#[cfg(feature = "extras")]
#[derive(Subcommand, Debug, Clone)]
pub enum ImportAction {
    /// Import Promptfoo red-team results (JSON)
    Promptfoo {
        /// Path to Promptfoo JSON output file (or read from stdin)
        #[arg(long)]
        file: Option<String>,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
}

#[cfg(feature = "extras")]
#[derive(Subcommand, Debug, Clone)]
pub enum RedteamAction {
    /// Run red-team security probes against your AI system
    Run {
        /// Agent name to test
        #[arg(long, default_value = "default")]
        agent: String,

        /// OWASP categories to test (e.g. LLM01,LLM06). Default: all
        #[arg(long, value_delimiter = ',')]
        categories: Vec<String>,

        /// Maximum number of probes to run
        #[arg(long)]
        max_probes: Option<u32>,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Show the last red-team report
    Last {
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },

    /// Run eval --security against a target URL (alias for complior eval --security)
    Target {
        /// Target AI endpoint URL
        url: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,

        /// CI mode: exit 1 if score < threshold
        #[arg(long)]
        ci: bool,

        /// Score threshold for CI pass (default: 60)
        #[arg(long, default_value = "60")]
        threshold: u32,
    },
}

#[cfg(feature = "extras")]
#[derive(Subcommand, Debug, Clone)]
pub enum ToolsAction {
    /// Show status of external security tools
    Status,
    /// Install or update external security tools
    Update,
}

#[cfg(feature = "extras")]
#[derive(Subcommand, Debug, Clone)]
pub enum JurisdictionAction {
    /// List all 30 EU/EEA jurisdictions
    List {
        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
    /// Show jurisdiction details for a specific country
    Show {
        /// Two-letter country code (e.g., de, fr, nl)
        code: String,

        /// Output as JSON
        #[arg(long)]
        json: bool,
    },
}

/// Returns true if the command requires a running engine to function.
/// Commands like version, init, update, daemon work without the engine.
pub fn needs_engine(cli: &Cli) -> bool {
    match &cli.command {
        None => false,
        Some(Command::Version | Command::Update | Command::Completions { .. } | Command::Daemon { .. }) => false,
        #[cfg(feature = "extras")]
        Some(Command::Login | Command::Logout) => false,
        _ => true,
    }
}

/// Extract the explicit project path from CLI command (if provided).
/// Used to start the engine with the correct project context (API keys, config).
pub fn explicit_project_path(cli: &Cli) -> Option<std::path::PathBuf> {
    let raw = match &cli.command {
        Some(
            Command::Scan { path, .. }
            | Command::Fix { path, .. }
            | Command::Init { path, .. }
            | Command::Report { path, .. }
            | Command::Doctor { path, .. },
        ) => path.as_deref(),
        Some(Command::Eval { path, .. }) => path.as_deref(),
        Some(Command::Passport { action }) => match action {
            PassportAction::Init { path, .. }
            | PassportAction::List { path, .. }
            | PassportAction::Show { path, .. }
            | PassportAction::Autonomy { path, .. }
            | PassportAction::Validate { path, .. }
            | PassportAction::Completeness { path, .. }
            | PassportAction::Rename { path, .. }
            | PassportAction::Export { path, .. }
            | PassportAction::Registry { path, .. }
            | PassportAction::Evidence { path, .. }
            | PassportAction::Permissions { path, .. }
            | PassportAction::Diff { path, .. }
            | PassportAction::Import { path, .. }
            | PassportAction::AuditPackage { path, .. }
            | PassportAction::Audit { path, .. } => path.as_deref(),
        },
        #[cfg(feature = "extras")]
        Some(Command::Audit { path, .. } | Command::SupplyChain { path, .. }) => path.as_deref(),
        #[cfg(feature = "extras")]
        Some(Command::Cert { action }) => match action {
            CertAction::Readiness { path, .. } | CertAction::Test { path, .. } => path.as_deref(),
        },
        #[cfg(feature = "extras")]
        Some(Command::Doc { action }) => match action {
            DocAction::Generate { path, .. } => path.as_deref(),
        },
        _ => None,
    };
    raw.map(|p| {
        let pb = std::path::PathBuf::from(p);
        if pb.is_absolute() {
            pb
        } else {
            std::env::current_dir().unwrap_or_default().join(pb)
        }
    })
}

/// Returns true if the command produces machine-readable output (JSON/SARIF)
/// and startup messages should be suppressed on stderr.
pub fn wants_quiet_startup(cli: &Cli) -> bool {
    matches!(
        &cli.command,
        Some(
            Command::Scan { json: true, .. }
                | Command::Scan { sarif: true, .. }
                | Command::Fix { json: true, .. }
                | Command::Eval { json: true, .. }
                | Command::Report { json: true, .. }
        )
    )
}

/// Returns true if the ephemeral engine should write a PID file to `.complior/`.
/// Read-only commands like `doctor` should NOT create `.complior/` as a side effect.
pub const fn wants_pid_file(cli: &Cli) -> bool {
    !matches!(&cli.command, Some(Command::Doctor { .. }))
}

/// Returns true if the CLI indicates a headless (non-TUI) invocation.
pub fn is_headless(cli: &Cli) -> bool {
    match &cli.command {
        Some(
            Command::Scan { .. }
            | Command::Fix { .. }
            | Command::Version
            | Command::Doctor { .. }
            | Command::Report { .. }
            | Command::Init { .. }
            | Command::Update
            | Command::Completions { .. }
            | Command::Daemon { .. }
            | Command::Passport { .. }
            | Command::Eval { .. },
        ) => true,
        #[cfg(feature = "extras")]
        Some(
            Command::Cert { .. }
            | Command::Chat { .. }
            | Command::SupplyChain { .. }
            | Command::Cost { .. }
            | Command::Debt { .. }
            | Command::Simulate { .. }
            | Command::Doc { .. }
            | Command::Jurisdiction { .. }
            | Command::Proxy { .. }
            | Command::Import { .. }
            | Command::Redteam { .. }
            | Command::Tools { .. }
            | Command::Audit { .. }
            | Command::Login
            | Command::Logout
            | Command::Sync { .. },
        ) => true,
        None => false,
        #[allow(unreachable_patterns)]
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::Parser;

    #[test]
    fn cli_parse_scan_json() {
        let cli = Cli::parse_from(["complior", "scan", "--json"]);
        assert!(matches!(
            cli.command,
            Some(Command::Scan { json: true, .. })
        ));
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
        let cli = Cli::parse_from([
            "complior",
            "--engine-url",
            "http://localhost:4000",
            "--resume",
        ]);
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
            Some(Command::Fix {
                dry_run,
                json,
                ref check_id,
                ..
            }) => {
                assert!(dry_run);
                assert!(!json);
                assert!(check_id.is_none());
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
    fn cli_parse_fix_check_id() {
        let cli = Cli::parse_from(["complior", "fix", "--check-id", "l1-fria"]);
        match cli.command {
            Some(Command::Fix {
                check_id, dry_run, ..
            }) => {
                assert_eq!(check_id.as_deref(), Some("l1-fria"));
                assert!(!dry_run);
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
            Some(Command::Daemon {
                action: Some(DaemonAction::Start { watch, port }),
                ..
            }) => {
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
            Some(Command::Daemon {
                action: Some(DaemonAction::Status),
                ..
            })
        ));
    }

    #[test]
    fn cli_parse_daemon_stop() {
        let cli = Cli::parse_from(["complior", "daemon", "stop"]);
        assert!(matches!(
            cli.command,
            Some(Command::Daemon {
                action: Some(DaemonAction::Stop),
                ..
            })
        ));
    }

    #[test]
    fn cli_parse_passport_init() {
        let cli = Cli::parse_from(["complior", "passport", "init"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Init { json, path, .. },
            }) => {
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport Init command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_init_json() {
        let cli = Cli::parse_from(["complior", "passport", "init", "--json"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Init { json, .. },
            }) => {
                assert!(*json);
            }
            _ => panic!("Expected Passport Init command"),
        }
    }

    #[test]
    fn cli_parse_passport_init_path() {
        let cli = Cli::parse_from(["complior", "passport", "init", "/tmp/project"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Init { path, .. },
            }) => {
                assert_eq!(path.as_deref(), Some("/tmp/project"));
            }
            _ => panic!("Expected Passport Init command"),
        }
    }

    #[test]
    fn cli_parse_passport_list() {
        let cli = Cli::parse_from(["complior", "passport", "list"]);
        assert!(matches!(
            &cli.command,
            Some(Command::Passport {
                action: PassportAction::List {
                    json: false,
                    verbose: false,
                    path: None
                }
            })
        ));
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_list_verbose() {
        let cli = Cli::parse_from(["complior", "passport", "list", "--verbose"]);
        match &cli.command {
            Some(Command::Passport {
                action:
                    PassportAction::List {
                        json,
                        verbose,
                        path,
                    },
            }) => {
                assert!(!json);
                assert!(*verbose);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport List command"),
        }
    }

    #[test]
    fn cli_parse_passport_show() {
        let cli = Cli::parse_from(["complior", "passport", "show", "my-bot"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Show { name, json, path },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport Show command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_show_json() {
        let cli = Cli::parse_from(["complior", "passport", "show", "my-bot", "--json"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Show { name, json, .. },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(*json);
            }
            _ => panic!("Expected Passport Show command"),
        }
    }

    #[test]
    fn cli_parse_passport_autonomy() {
        let cli = Cli::parse_from(["complior", "passport", "autonomy"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Autonomy { json, path },
            }) => {
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport Autonomy command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_autonomy_json() {
        let cli = Cli::parse_from(["complior", "passport", "autonomy", "--json"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Autonomy { json, .. },
            }) => {
                assert!(*json);
            }
            _ => panic!("Expected Passport Autonomy command"),
        }
    }

    #[test]
    fn cli_parse_passport_autonomy_path() {
        let cli = Cli::parse_from(["complior", "passport", "autonomy", "/tmp/proj"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Autonomy { path, .. },
            }) => {
                assert_eq!(path.as_deref(), Some("/tmp/proj"));
            }
            _ => panic!("Expected Passport Autonomy command"),
        }
    }

    #[test]
    fn cli_parse_passport_validate() {
        let cli = Cli::parse_from(["complior", "passport", "validate"]);
        match &cli.command {
            Some(Command::Passport {
                action:
                    PassportAction::Validate {
                        name,
                        json,
                        ci,
                        strict,
                        verbose,
                        path,
                    },
            }) => {
                assert!(name.is_none());
                assert!(!json);
                assert!(!ci);
                assert!(!strict);
                assert!(!verbose);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport Validate command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_validate_name() {
        let cli = Cli::parse_from(["complior", "passport", "validate", "my-bot"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Validate { name, .. },
            }) => {
                assert_eq!(name.as_deref(), Some("my-bot"));
            }
            _ => panic!("Expected Passport Validate command"),
        }
    }

    #[test]
    fn cli_parse_passport_validate_ci_strict() {
        let cli = Cli::parse_from(["complior", "passport", "validate", "--ci", "--strict"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Validate { ci, strict, .. },
            }) => {
                assert!(*ci);
                assert!(*strict);
            }
            _ => panic!("Expected Passport Validate command"),
        }
    }

    #[test]
    fn cli_parse_passport_validate_verbose() {
        let cli = Cli::parse_from(["complior", "passport", "validate", "--verbose"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Validate { verbose, .. },
            }) => {
                assert!(*verbose);
            }
            _ => panic!("Expected Passport Validate command"),
        }
    }

    #[test]
    fn cli_parse_passport_completeness() {
        let cli = Cli::parse_from(["complior", "passport", "completeness", "my-bot"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Completeness { name, json, path },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport Completeness command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_completeness_json() {
        let cli = Cli::parse_from(["complior", "passport", "completeness", "my-bot", "--json"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Completeness { name, json, .. },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(*json);
            }
            _ => panic!("Expected Passport Completeness command"),
        }
    }

    #[test]
    fn cli_parse_passport_diff() {
        let cli = Cli::parse_from(["complior", "passport", "diff", "my-bot"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Diff { name, json, path },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport Diff command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_diff_json() {
        let cli = Cli::parse_from(["complior", "passport", "diff", "my-bot", "--json"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Diff { name, json, .. },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(*json);
            }
            _ => panic!("Expected Passport Diff command"),
        }
    }

    #[test]
    fn cli_parse_passport_diff_path() {
        let cli = Cli::parse_from(["complior", "passport", "diff", "my-bot", "--path", "/tmp/proj"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::Diff { name, path, .. },
            }) => {
                assert_eq!(name, "my-bot");
                assert_eq!(path.as_deref(), Some("/tmp/proj"));
            }
            _ => panic!("Expected Passport Diff command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_chat() {
        let cli = Cli::parse_from(["complior", "chat", "What is Article 5?"]);
        match &cli.command {
            Some(Command::Chat {
                message,
                json,
                model,
            }) => {
                assert_eq!(message, "What is Article 5?");
                assert!(!json);
                assert!(model.is_none());
            }
            _ => panic!("Expected Chat command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_chat_json() {
        let cli = Cli::parse_from(["complior", "chat", "test", "--json"]);
        match &cli.command {
            Some(Command::Chat { message, json, .. }) => {
                assert_eq!(message, "test");
                assert!(*json);
            }
            _ => panic!("Expected Chat command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_chat_model() {
        let cli = Cli::parse_from(["complior", "chat", "test", "--model", "gpt-4o"]);
        match &cli.command {
            Some(Command::Chat { message, model, .. }) => {
                assert_eq!(message, "test");
                assert_eq!(model.as_deref(), Some("gpt-4o"));
            }
            _ => panic!("Expected Chat command"),
        }
    }

    #[test]
    fn cli_parse_scan_agent() {
        let cli = Cli::parse_from(["complior", "scan", "--agent", "my-bot"]);
        match &cli.command {
            Some(Command::Scan { agent, .. }) => {
                assert_eq!(agent.as_deref(), Some("my-bot"));
            }
            _ => panic!("Expected Scan command"),
        }
    }

    #[test]
    fn cli_parse_scan_diff() {
        let cli = Cli::parse_from(["complior", "scan", "--diff", "main"]);
        match &cli.command {
            Some(Command::Scan {
                diff,
                fail_on_regression,
                comment,
                ..
            }) => {
                assert_eq!(diff.as_deref(), Some("main"));
                assert!(!fail_on_regression);
                assert!(!comment);
            }
            _ => panic!("Expected Scan command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_scan_diff_full() {
        let cli = Cli::parse_from([
            "complior",
            "scan",
            "--diff",
            "develop",
            "--fail-on-regression",
            "--comment",
            "--json",
        ]);
        match &cli.command {
            Some(Command::Scan {
                diff,
                fail_on_regression,
                comment,
                json,
                ..
            }) => {
                assert_eq!(diff.as_deref(), Some("develop"));
                assert!(*fail_on_regression);
                assert!(*comment);
                assert!(*json);
            }
            _ => panic!("Expected Scan command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_cert_readiness() {
        let cli = Cli::parse_from(["complior", "cert", "readiness", "my-bot"]);
        match &cli.command {
            Some(Command::Cert {
                action: CertAction::Readiness { name, json, path },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Cert Readiness command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_cert_readiness_json_path() {
        let cli = Cli::parse_from([
            "complior",
            "cert",
            "readiness",
            "my-bot",
            "--json",
            "/tmp/project",
        ]);
        match &cli.command {
            Some(Command::Cert {
                action: CertAction::Readiness { name, json, path },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(*json);
                assert_eq!(path.as_deref(), Some("/tmp/project"));
            }
            _ => panic!("Expected Cert Readiness command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_sync_audit() {
        let cli = Cli::parse_from(["complior", "sync", "--audit"]);
        match &cli.command {
            Some(Command::Sync {
                audit,
                evidence,
                registry,
                ..
            }) => {
                assert!(*audit);
                assert!(!evidence);
                assert!(!registry);
            }
            _ => panic!("Expected Sync command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_sync_all_new_flags() {
        let cli = Cli::parse_from(["complior", "sync", "--audit", "--evidence", "--registry"]);
        match &cli.command {
            Some(Command::Sync {
                audit,
                evidence,
                registry,
                ..
            }) => {
                assert!(*audit);
                assert!(*evidence);
                assert!(*registry);
            }
            _ => panic!("Expected Sync command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_simulate_fix() {
        let cli = Cli::parse_from(["complior", "simulate", "--fix", "l1-risk"]);
        match &cli.command {
            Some(Command::Simulate {
                fix,
                add_doc,
                complete_passport,
                json,
            }) => {
                assert_eq!(fix, &["l1-risk"]);
                assert!(add_doc.is_empty());
                assert!(complete_passport.is_empty());
                assert!(!json);
            }
            _ => panic!("Expected Simulate command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_simulate_add_doc() {
        let cli = Cli::parse_from(["complior", "simulate", "--add-doc", "fria"]);
        match &cli.command {
            Some(Command::Simulate { fix, add_doc, .. }) => {
                assert!(fix.is_empty());
                assert_eq!(add_doc, &["fria"]);
            }
            _ => panic!("Expected Simulate command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_simulate_complete_passport() {
        let cli = Cli::parse_from(["complior", "simulate", "--complete-passport", "description"]);
        match &cli.command {
            Some(Command::Simulate {
                complete_passport, ..
            }) => {
                assert_eq!(complete_passport, &["description"]);
            }
            _ => panic!("Expected Simulate command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_simulate_multiple_actions() {
        let cli = Cli::parse_from([
            "complior",
            "simulate",
            "--fix",
            "l1-risk",
            "--fix",
            "l2-fria",
            "--add-doc",
            "fria",
            "--complete-passport",
            "description",
            "--json",
        ]);
        match &cli.command {
            Some(Command::Simulate {
                fix,
                add_doc,
                complete_passport,
                json,
            }) => {
                assert_eq!(fix, &["l1-risk", "l2-fria"]);
                assert_eq!(add_doc, &["fria"]);
                assert_eq!(complete_passport, &["description"]);
                assert!(*json);
            }
            _ => panic!("Expected Simulate command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_simulate_json() {
        let cli = Cli::parse_from(["complior", "simulate", "--fix", "l1-risk", "--json"]);
        match &cli.command {
            Some(Command::Simulate { json, .. }) => {
                assert!(*json);
            }
            _ => panic!("Expected Simulate command"),
        }
    }

    #[test]
    fn cli_parse_passport_import() {
        let cli = Cli::parse_from(["complior", "passport", "import", "--from", "a2a", "card.json"]);
        match &cli.command {
            Some(Command::Passport {
                action:
                    PassportAction::Import {
                        from,
                        file,
                        json,
                        path,
                    },
            }) => {
                assert_eq!(from, "a2a");
                assert_eq!(file, "card.json");
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport Import command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_import_json() {
        let cli = Cli::parse_from([
            "complior",
            "passport",
            "import",
            "--from",
            "a2a",
            "card.json",
            "--json",
        ]);
        match &cli.command {
            Some(Command::Passport {
                action:
                    PassportAction::Import {
                        from, file, json, ..
                    },
            }) => {
                assert_eq!(from, "a2a");
                assert_eq!(file, "card.json");
                assert!(*json);
            }
            _ => panic!("Expected Passport Import command"),
        }
    }

    #[test]
    fn cli_parse_passport_import_path() {
        let cli = Cli::parse_from([
            "complior",
            "passport",
            "import",
            "--from",
            "a2a",
            "card.json",
            "--path",
            "/tmp/proj",
        ]);
        match &cli.command {
            Some(Command::Passport {
                action:
                    PassportAction::Import {
                        from, file, path, ..
                    },
            }) => {
                assert_eq!(from, "a2a");
                assert_eq!(file, "card.json");
                assert_eq!(path.as_deref(), Some("/tmp/proj"));
            }
            _ => panic!("Expected Passport Import command"),
        }
    }

    #[test]
    fn cli_parse_passport_audit_package() {
        let cli = Cli::parse_from(["complior", "passport", "audit-package"]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::AuditPackage { output, json, path },
            }) => {
                assert!(output.is_none());
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Passport AuditPackage command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_passport_audit_package_output() {
        let cli = Cli::parse_from([
            "complior",
            "passport",
            "audit-package",
            "--output",
            "audit.tar.gz",
        ]);
        match &cli.command {
            Some(Command::Passport {
                action: PassportAction::AuditPackage { output, .. },
            }) => {
                assert_eq!(output.as_deref(), Some("audit.tar.gz"));
            }
            _ => panic!("Expected Passport AuditPackage command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_proxy_start() {
        let cli = Cli::parse_from([
            "complior",
            "proxy",
            "start",
            "npx",
            "@modelcontextprotocol/server-filesystem",
        ]);
        match &cli.command {
            Some(Command::Proxy {
                action: ProxyAction::Start { command, args },
            }) => {
                assert_eq!(command, "npx");
                assert_eq!(args, &["@modelcontextprotocol/server-filesystem"]);
            }
            _ => panic!("Expected Proxy Start command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_proxy_stop() {
        let cli = Cli::parse_from(["complior", "proxy", "stop"]);
        assert!(matches!(
            &cli.command,
            Some(Command::Proxy {
                action: ProxyAction::Stop
            })
        ));
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_proxy_status() {
        let cli = Cli::parse_from(["complior", "proxy", "status"]);
        assert!(matches!(
            &cli.command,
            Some(Command::Proxy {
                action: ProxyAction::Status
            })
        ));
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_proxy_start_multiple_args() {
        let cli = Cli::parse_from([
            "complior",
            "proxy",
            "start",
            "node",
            "server.js",
            "--port",
            "3000",
        ]);
        match &cli.command {
            Some(Command::Proxy {
                action: ProxyAction::Start { command, args },
            }) => {
                assert_eq!(command, "node");
                assert_eq!(args, &["server.js", "--port", "3000"]);
            }
            _ => panic!("Expected Proxy Start command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_doc_generate_type() {
        let cli = Cli::parse_from([
            "complior",
            "doc",
            "generate",
            "my-bot",
            "--type",
            "ai-literacy",
        ]);
        match &cli.command {
            Some(Command::Doc {
                action:
                    DocAction::Generate {
                        name,
                        doc_type,
                        all,
                        organization,
                        json,
                        path,
                    },
            }) => {
                assert_eq!(name, "my-bot");
                assert_eq!(doc_type.as_deref(), Some("ai-literacy"));
                assert!(!all);
                assert!(organization.is_none());
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Doc Generate command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_doc_generate_all() {
        let cli = Cli::parse_from(["complior", "doc", "generate", "my-bot", "--all"]);
        match &cli.command {
            Some(Command::Doc {
                action:
                    DocAction::Generate {
                        name,
                        all,
                        doc_type,
                        ..
                    },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(*all);
                assert!(doc_type.is_none());
            }
            _ => panic!("Expected Doc Generate command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_doc_generate_all_with_options() {
        let cli = Cli::parse_from([
            "complior",
            "doc",
            "generate",
            "my-bot",
            "--all",
            "--organization",
            "Acme Corp",
            "--json",
            "/tmp/project",
        ]);
        match &cli.command {
            Some(Command::Doc {
                action:
                    DocAction::Generate {
                        name,
                        all,
                        organization,
                        json,
                        path,
                        ..
                    },
            }) => {
                assert_eq!(name, "my-bot");
                assert!(*all);
                assert_eq!(organization.as_deref(), Some("Acme Corp"));
                assert!(*json);
                assert_eq!(path.as_deref(), Some("/tmp/project"));
            }
            _ => panic!("Expected Doc Generate command"),
        }
    }

    #[test]
    fn cli_parse_scan_deep() {
        let cli = Cli::parse_from(["complior", "scan", "--deep"]);
        match cli.command {
            Some(Command::Scan {
                deep, llm, cloud, ..
            }) => {
                assert!(deep);
                assert!(!llm);
                assert!(!cloud);
            }
            _ => panic!("Expected Scan command"),
        }
    }

    #[test]
    fn cli_parse_scan_llm() {
        let cli = Cli::parse_from(["complior", "scan", "--llm"]);
        match cli.command {
            Some(Command::Scan {
                deep, llm, cloud, ..
            }) => {
                assert!(!deep);
                assert!(llm);
                assert!(!cloud);
            }
            _ => panic!("Expected Scan command"),
        }
    }

    #[test]
    fn cli_parse_scan_deep_llm() {
        let cli = Cli::parse_from(["complior", "scan", "--deep", "--llm"]);
        match cli.command {
            Some(Command::Scan { deep, llm, .. }) => {
                assert!(deep);
                assert!(llm);
            }
            _ => panic!("Expected Scan command"),
        }
    }

    #[test]
    fn cli_parse_scan_cloud() {
        let cli = Cli::parse_from(["complior", "scan", "--cloud"]);
        match cli.command {
            Some(Command::Scan { cloud, .. }) => {
                assert!(cloud);
            }
            _ => panic!("Expected Scan command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_tools_status() {
        let cli = Cli::parse_from(["complior", "tools", "status"]);
        assert!(matches!(
            cli.command,
            Some(Command::Tools {
                action: ToolsAction::Status
            })
        ));
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_tools_update() {
        let cli = Cli::parse_from(["complior", "tools", "update"]);
        assert!(matches!(
            cli.command,
            Some(Command::Tools {
                action: ToolsAction::Update
            })
        ));
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_eval_default() {
        let cli = Cli::parse_from(["complior", "eval", "http://localhost:4000/api/chat"]);
        match &cli.command {
            Some(Command::Eval {
                target,
                det,
                llm,
                security,
                full,
                agent,
                categories,
                json,
                ci,
                threshold,
                model,
                api_key,
                request_template,
                response_path,
                headers,
                last,
                failures,
                verbose,
                concurrency,
                no_remediation,
                remediation,
                fix,
                dry_run,
                path,
            }) => {
                assert_eq!(target.as_deref(), Some("http://localhost:4000/api/chat"));
                assert!(!det);
                assert!(!llm);
                assert!(!security);
                assert!(!full);
                assert!(agent.is_none());
                assert!(categories.is_empty());
                assert!(!json);
                assert!(!ci);
                assert_eq!(*threshold, 60);
                assert!(model.is_none());
                assert!(api_key.is_none());
                assert!(request_template.is_none());
                assert!(response_path.is_none());
                assert!(headers.is_none());
                assert!(!last);
                assert!(!failures);
                assert!(!verbose);
                assert_eq!(*concurrency, 5);
                assert!(!no_remediation);
                assert!(!remediation);
                assert!(!fix);
                assert!(!dry_run);
                assert!(path.is_none());
            }
            _ => panic!("Expected Eval command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_eval_llm_flag() {
        let cli = Cli::parse_from(["complior", "eval", "http://localhost:4000", "--llm"]);
        match &cli.command {
            Some(Command::Eval {
                llm,
                security,
                full,
                ..
            }) => {
                assert!(*llm);
                assert!(!security);
                assert!(!full);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_security_flag() {
        let cli = Cli::parse_from(["complior", "eval", "http://localhost:4000", "--security"]);
        match &cli.command {
            Some(Command::Eval {
                llm,
                security,
                full,
                ..
            }) => {
                assert!(!llm);
                assert!(*security);
                assert!(!full);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_full_flag() {
        let cli = Cli::parse_from([
            "complior",
            "eval",
            "http://localhost:4000",
            "--full",
            "--agent",
            "my-bot",
            "--categories",
            "transparency,bias,prohibited",
            "--json",
            "--ci",
            "--threshold",
            "80",
            "--model",
            "gpt-4o",
            "--api-key",
            "sk-test",
        ]);
        match &cli.command {
            Some(Command::Eval {
                target,
                llm,
                security,
                full,
                agent,
                categories,
                json,
                ci,
                threshold,
                model,
                api_key,
                request_template,
                response_path,
                headers,
                last,
                ..
            }) => {
                assert_eq!(target.as_deref(), Some("http://localhost:4000"));
                assert!(!llm);
                assert!(!security);
                assert!(*full);
                assert_eq!(agent.as_deref(), Some("my-bot"));
                assert_eq!(categories, &["transparency", "bias", "prohibited"]);
                assert!(*json);
                assert!(*ci);
                assert_eq!(*threshold, 80);
                assert_eq!(model.as_deref(), Some("gpt-4o"));
                assert_eq!(api_key.as_deref(), Some("sk-test"));
                assert!(request_template.is_none());
                assert!(response_path.is_none());
                assert!(headers.is_none());
                assert!(!last);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_det_llm_combo() {
        let cli = Cli::parse_from([
            "complior",
            "eval",
            "http://localhost:4000",
            "--det",
            "--llm",
        ]);
        match &cli.command {
            Some(Command::Eval {
                det,
                llm,
                security,
                full,
                ..
            }) => {
                assert!(*det);
                assert!(*llm);
                assert!(!security);
                assert!(!full);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_llm_security_combo() {
        let cli = Cli::parse_from([
            "complior",
            "eval",
            "http://localhost:4000",
            "--llm",
            "--security",
        ]);
        match &cli.command {
            Some(Command::Eval {
                llm,
                security,
                full,
                ..
            }) => {
                assert!(*llm);
                assert!(*security);
                assert!(!full);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_last() {
        let cli = Cli::parse_from(["complior", "eval", "--last"]);
        match &cli.command {
            Some(Command::Eval {
                target,
                last,
                failures,
                ..
            }) => {
                assert!(target.is_none());
                assert!(*last);
                assert!(!failures);
            }
            _ => panic!("Expected Eval command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_eval_last_failures() {
        let cli = Cli::parse_from(["complior", "eval", "--last", "--failures"]);
        match &cli.command {
            Some(Command::Eval { last, failures, .. }) => {
                assert!(*last);
                assert!(*failures);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_verbose() {
        let cli = Cli::parse_from(["complior", "eval", "http://localhost:4000", "--verbose"]);
        match &cli.command {
            Some(Command::Eval { verbose, .. }) => {
                assert!(*verbose);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_concurrency() {
        let cli = Cli::parse_from(["complior", "eval", "http://localhost:4000", "-j", "10"]);
        match &cli.command {
            Some(Command::Eval { concurrency, .. }) => {
                assert_eq!(*concurrency, 10);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_concurrency_long() {
        let cli = Cli::parse_from([
            "complior",
            "eval",
            "http://localhost:4000",
            "--concurrency",
            "1",
        ]);
        match &cli.command {
            Some(Command::Eval { concurrency, .. }) => {
                assert_eq!(*concurrency, 1);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_ci_mode() {
        let cli = Cli::parse_from([
            "complior",
            "eval",
            "http://localhost:4000",
            "--ci",
            "--threshold",
            "75",
        ]);
        match &cli.command {
            Some(Command::Eval { ci, threshold, .. }) => {
                assert!(*ci);
                assert_eq!(*threshold, 75);
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[test]
    fn cli_parse_eval_custom_adapter() {
        let cli = Cli::parse_from([
            "complior",
            "eval",
            "http://api.company.com/predict",
            "--request-template",
            r#"{"prompt":"{{probe}}"}"#,
            "--response-path",
            "result.text",
            "--headers",
            r#"{"Authorization":"Bearer xxx"}"#,
        ]);
        match &cli.command {
            Some(Command::Eval {
                target,
                request_template,
                response_path,
                headers,
                ..
            }) => {
                assert_eq!(target.as_deref(), Some("http://api.company.com/predict"));
                assert_eq!(
                    request_template.as_deref(),
                    Some(r#"{"prompt":"{{probe}}"}"#)
                );
                assert_eq!(response_path.as_deref(), Some("result.text"));
                assert_eq!(
                    headers.as_deref(),
                    Some(r#"{"Authorization":"Bearer xxx"}"#)
                );
            }
            _ => panic!("Expected Eval command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_redteam_target_alias() {
        let cli = Cli::parse_from(["complior", "redteam", "target", "http://localhost:4000"]);
        match &cli.command {
            Some(Command::Redteam { action }) => match action {
                RedteamAction::Target {
                    url,
                    json,
                    ci,
                    threshold,
                } => {
                    assert_eq!(url, "http://localhost:4000");
                    assert!(!json);
                    assert!(!ci);
                    assert_eq!(*threshold, 60);
                }
                _ => panic!("Expected Target subcommand"),
            },
            _ => panic!("Expected Redteam command"),
        }
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_audit_basic() {
        let cli = Cli::parse_from(["complior", "audit", "http://localhost:4000/api/chat"]);
        match &cli.command {
            Some(Command::Audit {
                target,
                agent,
                json,
                path,
            }) => {
                assert_eq!(target, "http://localhost:4000/api/chat");
                assert!(agent.is_none());
                assert!(!json);
                assert!(path.is_none());
            }
            _ => panic!("Expected Audit command"),
        }
        assert!(is_headless(&cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_parse_audit_full_flags() {
        let cli = Cli::parse_from([
            "complior",
            "audit",
            "http://localhost:4000",
            "--agent",
            "my-bot",
            "--json",
            "/tmp/project",
        ]);
        match &cli.command {
            Some(Command::Audit {
                target,
                agent,
                json,
                path,
            }) => {
                assert_eq!(target, "http://localhost:4000");
                assert_eq!(agent.as_deref(), Some("my-bot"));
                assert!(*json);
                assert_eq!(path.as_deref(), Some("/tmp/project"));
            }
            _ => panic!("Expected Audit command"),
        }
    }

    #[test]
    fn cli_headless_detection_core() {
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

        let bare_scan_cli = Cli::parse_from(["complior", "scan"]);
        assert!(is_headless(&bare_scan_cli));

        let tui_cli = Cli::parse_from(["complior"]);
        assert!(!is_headless(&tui_cli));

        let eval_cli = Cli::parse_from(["complior", "eval", "http://localhost:4000"]);
        assert!(is_headless(&eval_cli));
    }

    #[cfg(feature = "extras")]
    #[test]
    fn cli_headless_detection_extras() {
        let audit_cli = Cli::parse_from(["complior", "audit", "http://localhost:4000"]);
        assert!(is_headless(&audit_cli));
    }

    #[test]
    fn cli_wants_quiet_startup_json() {
        let cli = Cli::parse_from(["complior", "scan", "--json"]);
        assert!(wants_quiet_startup(&cli));

        let cli = Cli::parse_from(["complior", "scan", "--sarif"]);
        assert!(wants_quiet_startup(&cli));

        let cli = Cli::parse_from(["complior", "fix", "--json"]);
        assert!(wants_quiet_startup(&cli));

        let cli = Cli::parse_from(["complior", "eval", "http://localhost:4000", "--json"]);
        assert!(wants_quiet_startup(&cli));
    }

    #[test]
    fn cli_wants_quiet_startup_normal() {
        let cli = Cli::parse_from(["complior", "scan"]);
        assert!(!wants_quiet_startup(&cli));

        let cli = Cli::parse_from(["complior", "fix"]);
        assert!(!wants_quiet_startup(&cli));

        let cli = Cli::parse_from(["complior"]);
        assert!(!wants_quiet_startup(&cli));
    }

    #[test]
    fn cli_parse_doctor_with_path() {
        let cli = Cli::parse_from(["complior", "doctor", "/project"]);
        match &cli.command {
            Some(Command::Doctor { path }) => {
                assert_eq!(path.as_deref(), Some("/project"));
            }
            _ => panic!("Expected Doctor command"),
        }
        assert!(is_headless(&cli));
    }

    #[test]
    fn cli_parse_doctor_without_path() {
        let cli = Cli::parse_from(["complior", "doctor"]);
        match &cli.command {
            Some(Command::Doctor { path }) => {
                assert!(path.is_none());
            }
            _ => panic!("Expected Doctor command"),
        }
    }
}
