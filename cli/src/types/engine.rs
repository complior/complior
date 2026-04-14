use serde::{Deserialize, Serialize};

// --- Engine API response types (mirror TS Engine JSON) ---

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

impl Severity {
    /// Sort key: Critical = 0, Info = 4. Use for severity-ordered sorting.
    pub const fn sort_key(self) -> u8 {
        match self {
            Self::Critical => 0,
            Self::High => 1,
            Self::Medium => 2,
            Self::Low => 3,
            Self::Info => 4,
        }
    }

    /// Uppercase label for display.
    pub const fn label(self) -> &'static str {
        match self {
            Self::Critical => "CRITICAL",
            Self::High => "HIGH",
            Self::Medium => "MEDIUM",
            Self::Low => "LOW",
            Self::Info => "INFO",
        }
    }

    /// Lowercase string for serialization (matches serde `rename_all` = "lowercase").
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::High => "high",
            Self::Medium => "medium",
            Self::Low => "low",
            Self::Info => "info",
        }
    }
}

/// Strip layer prefix from a `check_id`, returning (`layer_tag`, remainder).
///
/// Single source of truth for prefix stripping across CLI.
/// Example: `"l2-fria"` → `("l2", "fria")`, `"cross-doc-mismatch"` → `("cross", "doc-mismatch")`.
pub fn strip_layer_prefix(check_id: &str) -> (&str, &str) {
    // Order matters: longer prefixes first to avoid false matches (e.g. "l4-nhi-" before "l4-")
    const PREFIXES: &[&str] = &[
        "l1-",
        "l2-",
        "l3-",
        "l4-",
        "l5-",
        "cross-",
        "gpai-",
        "ext-semgrep-",
        "ext-bandit-",
        "ext-modelscan-",
        "ext-detect-secrets-",
        "ext-",
    ];
    for prefix in PREFIXES {
        if let Some(rest) = check_id.strip_prefix(prefix) {
            let tag = &prefix[..prefix.len() - 1]; // strip trailing '-'
            return (tag, rest);
        }
    }
    ("", check_id)
}

/// Convert kebab-case string to Title Case.
///
/// Example: `"risk-management"` → `"Risk Management"`
pub fn humanize_kebab(s: &str) -> String {
    s.split('-')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => format!("{}{}", c.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Zone {
    Red,
    Yellow,
    Green,
}

impl Zone {
    pub const fn label(&self) -> &'static str {
        match self {
            Self::Red => "red",
            Self::Yellow => "yellow",
            Self::Green => "green",
        }
    }
}

/// Check result type from engine: pass, fail, skip, or info.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum CheckResultType {
    Pass,
    Fail,
    Skip,
    Info,
}

/// Finding type classification for code-first UX.
///
/// - **A (Code Fix):** Code-level findings — bare API calls, security patterns, SDK issues.
/// - **B (Missing File):** Missing documentation or config files.
/// - **C (Config Change):** Configuration, dependency, or cross-layer issues.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FindingType {
    A, // Code fix
    B, // Missing file / document
    C, // Config change
}

impl FindingType {
    /// Short badge text for list display.
    pub const fn badge(self) -> &'static str {
        match self {
            Self::A => "[A]",
            Self::B => "[B]",
            Self::C => "[C]",
        }
    }

    /// Human-readable label.
    pub const fn label(self) -> &'static str {
        match self {
            Self::A => "Code Fix",
            Self::B => "Missing File",
            Self::C => "Config Change",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeContextLine {
    pub num: u32,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeContext {
    pub lines: Vec<CodeContextLine>,
    pub start_line: u32,
    #[serde(default)]
    pub highlight_line: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixDiff {
    pub before: Vec<String>,
    pub after: Vec<String>,
    pub start_line: u32,
    pub file_path: String,
    /// Import line to add at top of file (e.g. "import { complior } from '@complior/sdk'").
    #[serde(default)]
    pub import_line: Option<String>,
}

/// US-S05-07: Finding explanation with article, penalty, deadline, business impact.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
#[derive(Default)]
pub struct FindingExplanation {
    pub article: String,
    pub penalty: String,
    pub deadline: String,
    pub business_impact: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    pub check_id: String,
    pub r#type: CheckResultType,
    pub message: String,
    pub severity: Severity,
    #[serde(default)]
    pub obligation_id: Option<String>,
    #[serde(default)]
    pub article_reference: Option<String>,
    #[serde(default)]
    pub fix: Option<String>,
    #[serde(default)]
    pub file: Option<String>,
    #[serde(default)]
    pub line: Option<u32>,
    #[serde(default)]
    pub code_context: Option<CodeContext>,
    #[serde(default)]
    pub fix_diff: Option<FixDiff>,
    #[serde(default)]
    pub priority: Option<i32>,
    #[serde(default)]
    pub confidence: Option<f64>,
    #[serde(default)]
    pub confidence_level: Option<String>,
    #[serde(default)]
    pub evidence: Option<Vec<serde_json::Value>>,
    #[serde(default)]
    pub explanation: Option<FindingExplanation>,
    /// Agent passport name (enriched post-scan from passport `source_files`).
    #[serde(default)]
    pub agent_id: Option<String>,
    /// Document quality assessment from L2 scanner (e.g. "COMPREHENSIVE", "SHALLOW").
    #[serde(default)]
    pub doc_quality: Option<String>,
    /// True when this finding was analyzed/modified by L5 LLM.
    #[serde(default)]
    pub l5_analyzed: Option<bool>,
}

impl Finding {
    /// Classify finding into A/B/C type based on `check_id` prefix.
    ///
    /// - l4-/l5-/cross- → Type A (code-level)
    /// - l1-/l2-/missing → Type B (missing file/document)
    /// - l3- → Type C (config/dependency)
    pub fn finding_type(&self) -> FindingType {
        if self.check_id.starts_with("l4-")
            || self.check_id.starts_with("l5-")
            || self.check_id.starts_with("cross-")
        {
            FindingType::A
        } else if self.check_id.starts_with("l3-") {
            FindingType::C
        } else {
            // l1-, l2-, missing-*, EU-AIA-* (mock) → Type B
            FindingType::B
        }
    }

    /// Predicted score impact if this finding is fixed.
    pub const fn predicted_impact(&self) -> i32 {
        match self.severity {
            Severity::Critical => 8,
            Severity::High => 5,
            Severity::Medium => 3,
            Severity::Low => 1,
            Severity::Info => 0,
        }
    }

    /// Short <file:line> label for display.
    pub fn file_line_label(&self) -> Option<String> {
        match (&self.file, self.line) {
            (Some(f), Some(l)) => Some(format!("{f}:{l}")),
            (Some(f), None) => Some(f.clone()),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryScore {
    pub category: String,
    pub weight: f64,
    pub score: f64,
    pub obligation_count: u32,
    pub passed_count: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreBreakdown {
    pub total_score: f64,
    pub zone: Zone,
    pub category_scores: Vec<CategoryScore>,
    pub critical_cap_applied: bool,
    pub total_checks: u32,
    pub passed_checks: u32,
    pub failed_checks: u32,
    pub skipped_checks: u32,
    #[serde(default)]
    pub confidence_summary: Option<serde_json::Value>,
}

/// Per-agent finding summary (enriched post-scan from passport `source_files`).
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSummary {
    pub agent_id: String,
    pub agent_name: String,
    pub finding_count: u32,
    pub critical_count: u32,
    pub high_count: u32,
    pub file_count: u32,
}

/// V1-M08: Context about profile-based filtering applied to scan findings.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanFilterContext {
    pub role: String,
    #[serde(default)]
    pub risk_level: Option<String>,
    #[serde(default)]
    pub domain: Option<String>,
    pub profile_found: bool,
    pub total_obligations: u32,
    pub applicable_obligations: u32,
    pub skipped_by_role: u32,
    pub skipped_by_risk_level: u32,
}

/// V1-M08: Priority action from scan for "FIX FIRST" CLI display.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopAction {
    pub id: String,
    pub title: String,
    pub severity: String,
    pub command: String,
    #[serde(default)]
    pub projected_score: Option<f64>,
    #[serde(default)]
    pub effort: Option<String>,
    #[serde(default)]
    pub score_impact: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub score: ScoreBreakdown,
    pub findings: Vec<Finding>,
    pub project_path: String,
    pub scanned_at: String,
    pub duration: u64,
    pub files_scanned: u32,
    #[serde(default)]
    pub files_excluded: Option<u32>,
    #[serde(default)]
    pub deep_analysis: Option<bool>,
    #[serde(default)]
    pub l5_cost: Option<f64>,
    #[serde(default)]
    pub regulation_version: Option<serde_json::Value>,
    #[serde(default)]
    pub tier: Option<u8>,
    #[serde(default)]
    pub external_tool_results: Option<Vec<ExternalToolResult>>,
    #[serde(default)]
    pub agent_summaries: Option<Vec<AgentSummary>>,
    /// V1-M08: Profile-based filter context (role + risk level).
    #[serde(default)]
    pub filter_context: Option<ScanFilterContext>,
    /// V1-M08: Top priority actions for CLI "FIX FIRST" section.
    #[serde(default)]
    pub top_actions: Option<Vec<TopAction>>,
}

/// Result from a single external security tool (Semgrep, Bandit, etc.)
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalToolResult {
    pub tool: String,
    pub version: String,
    pub findings: Vec<Finding>,
    pub duration: u64,
    pub exit_code: i32,
    #[serde(default)]
    pub error: Option<String>,
}

// Re-derive Serialize for nested types used in session save
impl Serialize for ScoreBreakdown {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("ScoreBreakdown", 9)?;
        state.serialize_field("totalScore", &self.total_score)?;
        state.serialize_field("zone", &format!("{:?}", self.zone).to_lowercase())?;
        state.serialize_field("categoryScores", &self.category_scores)?;
        state.serialize_field("criticalCapApplied", &self.critical_cap_applied)?;
        state.serialize_field("totalChecks", &self.total_checks)?;
        state.serialize_field("passedChecks", &self.passed_checks)?;
        state.serialize_field("failedChecks", &self.failed_checks)?;
        state.serialize_field("skippedChecks", &self.skipped_checks)?;
        state.serialize_field("confidenceSummary", &self.confidence_summary)?;
        state.end()
    }
}

impl Serialize for CategoryScore {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("CategoryScore", 5)?;
        state.serialize_field("category", &self.category)?;
        state.serialize_field("weight", &self.weight)?;
        state.serialize_field("score", &self.score)?;
        state.serialize_field("obligationCount", &self.obligation_count)?;
        state.serialize_field("passedCount", &self.passed_count)?;
        state.end()
    }
}

impl Serialize for Finding {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = s.serialize_struct("Finding", 19)?;
        state.serialize_field("checkId", &self.check_id)?;
        state.serialize_field("type", &self.r#type)?;
        state.serialize_field("message", &self.message)?;
        state.serialize_field("severity", self.severity.as_str())?;
        state.serialize_field("obligationId", &self.obligation_id)?;
        state.serialize_field("articleReference", &self.article_reference)?;
        state.serialize_field("fix", &self.fix)?;
        state.serialize_field("file", &self.file)?;
        state.serialize_field("line", &self.line)?;
        state.serialize_field("codeContext", &self.code_context)?;
        state.serialize_field("fixDiff", &self.fix_diff)?;
        state.serialize_field("priority", &self.priority)?;
        state.serialize_field("confidence", &self.confidence)?;
        state.serialize_field("confidenceLevel", &self.confidence_level)?;
        state.serialize_field("evidence", &self.evidence)?;
        state.serialize_field("explanation", &self.explanation)?;
        state.serialize_field("agentId", &self.agent_id)?;
        state.serialize_field("docQuality", &self.doc_quality)?;
        state.serialize_field("l5Analyzed", &self.l5_analyzed)?;
        state.end()
    }
}

// --- Multi-Framework Scoring (E-105, E-106, E-107) ---

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct FrameworkCategoryScore {
    pub category_id: String,
    pub category_name: String,
    pub score: f64,
    pub weight: f64,
    pub passed_checks: u32,
    pub total_checks: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct FrameworkScoreResult {
    pub framework_id: String,
    pub framework_name: String,
    pub score: f64,
    pub grade: String,
    pub grade_type: String,
    pub gaps: u32,
    pub total_checks: u32,
    pub passed_checks: u32,
    #[serde(default)]
    pub deadline: Option<String>,
    #[serde(default)]
    pub categories: Vec<FrameworkCategoryScore>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct MultiFrameworkScoreResult {
    pub frameworks: Vec<FrameworkScoreResult>,
    pub selected_framework_ids: Vec<String>,
    pub computed_at: String,
}

// --- Security Score (S10: Promptfoo/Redteam) ---

/// Security category score for OWASP LLM Top 10 breakdown.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct SecurityCategoryScore {
    pub category_id: String,
    #[serde(default)]
    pub name: String,
    pub score: f64,
    pub probes_passed: u32,
    pub probes_total: u32,
}

/// Security score from redteam or promptfoo import.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct SecurityScoreResult {
    pub score: f64,
    pub grade: String,
    pub categories: Vec<SecurityCategoryScore>,
    #[serde(default)]
    pub critical_findings: u32,
    #[serde(default)]
    pub critical_capped: bool,
}

/// Probe result from a redteam run.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ProbeResult {
    pub probe_id: String,
    #[serde(default)]
    pub probe_name: String,
    #[serde(default)]
    pub owasp_category: String,
    pub verdict: String,
    #[serde(default)]
    pub response: String,
    #[serde(default)]
    pub confidence: f64,
}

/// OWASP category summary within a redteam report.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct OwaspCategorySummary {
    pub category_id: String,
    pub total: u32,
    pub passed: u32,
    pub failed: u32,
    #[serde(default)]
    pub inconclusive: u32,
}

/// Full redteam report from `POST /redteam/run` or `GET /redteam/last`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct RedteamReport {
    pub agent_name: String,
    pub timestamp: String,
    #[serde(default)]
    pub duration: u64,
    pub total_probes: u32,
    pub pass_count: u32,
    pub fail_count: u32,
    #[serde(default)]
    pub inconclusive_count: u32,
    pub security_score: SecurityScoreResult,
    #[serde(default)]
    pub owasp_mapping: std::collections::HashMap<String, OwaspCategorySummary>,
    #[serde(default)]
    pub probe_results: Vec<ProbeResult>,
}

// --- Dashboard Metrics (S05: Cost, Debt, Readiness) ---

/// GET /cost-estimate response.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct CostEstimateResult {
    pub remediation_cost: f64,
    pub documentation_cost: f64,
    pub total_cost: f64,
    pub potential_fine: f64,
    pub roi: f64,
}

/// GET /debt response.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct DebtResult {
    pub total_debt: f64,
    pub level: String,
    pub findings_debt: f64,
    pub documentation_debt: f64,
    pub freshness_debt: f64,
}

/// GET /cert/readiness response.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ReadinessResult {
    pub overall_score: f64,
    pub readiness_level: String,
    #[serde(default)]
    pub categories: Vec<ReadinessCategory>,
    #[serde(default)]
    pub gaps: Vec<String>,
    #[serde(default)]
    pub total_requirements: u32,
    #[serde(default)]
    pub met_requirements: u32,
    #[serde(default)]
    pub unmet_requirements: u32,
}

/// Readiness category from engine (matches TS `Aiuc1CategoryScore`).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ReadinessCategory {
    pub category: String,
    #[serde(default)]
    pub label: String,
    pub score: f64,
    #[serde(default)]
    pub max_weight: f64,
    #[serde(default)]
    pub achieved_weight: f64,
}

/// GET /status response — lightweight daemon status.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct EngineStatus {
    pub ready: bool,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub mode: Option<String>,
    #[serde(default)]
    pub uptime: Option<u64>,
    #[serde(default)]
    pub last_scan: Option<serde_json::Value>,
}

// ── V1-M10: Score Transparency types ──────────────────────────────

/// V1-M10: Score disclaimer explaining what the compliance score covers.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreDisclaimer {
    pub summary: String,
    pub covered_obligations: usize,
    pub total_applicable_obligations: usize,
    pub coverage_percent: f64,
    pub uncovered_count: usize,
    #[serde(default)]
    pub limitations: Vec<String>,
    #[serde(default)]
    pub critical_cap_explanation: Option<String>,
}

/// V1-M10: Category-level breakdown with impact and top failures.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryBreakdown {
    pub category: String,
    pub score: f64,
    pub weight: f64,
    #[serde(deserialize_with = "crate::types::engine::de_usize")]
    pub passed: usize,
    #[serde(deserialize_with = "crate::types::engine::de_usize")]
    pub failed: usize,
    #[serde(rename = "impact")]
    pub impact: String,
    #[serde(default)]
    pub top_failures: Vec<String>,
    pub explanation: String,
}

/// Deserialize a number into usize.
pub fn de_usize<'de, D>(deserializer: D) -> Result<usize, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let f = f64::deserialize(deserializer)?;
    Ok(f as usize)
}

/// V1-M10: Priority action with rank and effort estimates.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriorityAction {
    pub rank: u32,
    pub source: String,
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub article: String,
    #[serde(rename = "severity")]
    pub severity: String,
    #[serde(default)]
    pub deadline: Option<String>,
    #[serde(default)]
    pub days_left: Option<isize>,
    #[serde(default)]
    pub score_impact: f64,
    pub fix_available: bool,
    pub command: String,
    pub priority_score: f64,
    #[serde(default)]
    pub effort: Option<String>,
    #[serde(default)]
    pub projected_score: Option<f64>,
}

/// V1-M10: Aggregated compliance posture from GET /status/posture.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompliancePosture {
    pub score: ScoreBreakdown,
    pub disclaimer: ScoreDisclaimer,
    #[serde(default)]
    pub categories: Vec<CategoryBreakdown>,
    #[serde(default)]
    pub top_actions: Vec<PriorityAction>,
    #[serde(default)]
    pub profile: Option<serde_json::Value>,
    #[serde(default)]
    pub last_scan_at: Option<String>,
    pub passport_count: usize,
    pub document_count: usize,
    #[serde(default)]
    pub evidence_verified: Option<bool>,
}
