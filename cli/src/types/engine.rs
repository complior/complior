use serde::{Deserialize, Serialize};

// --- Score caps (V1-M30.10) ---

/// Maximum predicted/projected score the engine and CLI may return.
///
/// V1-M30.9 / W-3 invariant: the predicted score after a fix is an *estimate*,
/// not a guarantee. 100 implies certainty — that the project will pass every
/// check. We cannot promise that, so estimates are capped at 99.
///
/// Mirrors `engine/core/src/domain/whatif/simulate-actions.ts:106` which uses
/// `Math.min(99, currentScore + totalDelta)`.
///
/// All score-cap call sites in the Rust CLI MUST use this constant instead of
/// hardcoded `100.0`. Search prompt: `clamp(.*100\.0)` should return 0 hits.
pub const MAX_PREDICTED_SCORE: f64 = 99.0;

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
    /// V1-M18: Findings skipped because they apply to a different industry domain.
    #[serde(default)]
    pub skipped_by_domain: u32,
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
    /// V1-M24 R-1: Disclaimer field from scan service (explains scan scope, limitations).
    /// Shape differs from `ScoreDisclaimer` (which has covered_obligations etc.).
    /// Engine emits: `{ summary, limitations, confidenceLevel }`. Use opaque Value
    /// to preserve forward compatibility — TS engine may extend the shape.
    #[serde(default)]
    pub disclaimer: Option<serde_json::Value>,
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
#[derive(Debug, Clone, Deserialize, Serialize)]
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

// --- V1-M30.10 RED tests: predicted-score cap invariants ---

#[cfg(test)]
mod predicted_score_cap_tests {
    use super::MAX_PREDICTED_SCORE;

    /// V1-M30.10 / W-3 root-cause invariant: the predicted-score cap is 99,
    /// not 100. 100 implies certainty, but predicted scores are estimates.
    /// Mirrors `simulate-actions.ts` (TS engine) `Math.min(99, ...)`.
    #[test]
    fn max_predicted_score_is_99_not_100() {
        assert!(
            (MAX_PREDICTED_SCORE - 99.0).abs() < f64::EPSILON,
            "MAX_PREDICTED_SCORE must be 99.0 (V1-M30.10 W-3 invariant) but was {MAX_PREDICTED_SCORE}",
        );
        const _: () = assert!(
            MAX_PREDICTED_SCORE < 100.0,
            "MAX_PREDICTED_SCORE must be strictly less than 100 — 100 implies certainty",
        );
    }

    /// V1-M30.10 RED → GREEN: `engine_client.rs` source MUST NOT contain a
    /// hardcoded `100.0` cap inside `fix_dry_run`. It must use the
    /// `MAX_PREDICTED_SCORE` constant (or `99.0` literal) instead.
    ///
    /// This is a static-source invariant test that fails until rust-dev edits
    /// `engine_client.rs:~201` to replace `clamp(current_score, 100.0)` with
    /// `clamp(current_score, MAX_PREDICTED_SCORE)`.
    ///
    /// Why static-source: `fix_dry_run` is async + makes HTTP calls. Mocking
    /// it requires non-trivial test infra. The bug is a single-literal cap;
    /// a source-text invariant test catches both the bug and any regression
    /// where someone reintroduces `100.0` as the upper bound.
    #[test]
    fn engine_client_does_not_hardcode_100_as_predicted_score_cap() {
        let src = include_str!("../engine_client.rs");
        // The bad pattern: `.clamp(current_score, 100.0)` or
        //                  `.clamp(current_score, 100_f64)` etc.
        // We accept ANY of:
        //   .clamp(current_score, MAX_PREDICTED_SCORE)
        //   .clamp(current_score, 99.0)
        //   .clamp(current_score, 99_f64)
        let banned_patterns = [
            "clamp(current_score, 100.0)",
            "clamp(current_score, 100_f64)",
            "clamp(current_score, 100f64)",
            "clamp(current_score, 100)",
            "min(100.0)",
            "min(100_f64)",
        ];
        for pat in &banned_patterns {
            assert!(
                !src.contains(pat),
                "engine_client.rs contains banned pattern `{pat}` — V1-M30.10 W-3 \
                 invariant: predicted score must be capped at 99, not 100. \
                 Replace with MAX_PREDICTED_SCORE from crate::types::engine.",
            );
        }
    }

    /// Engine_client.rs MUST use `MAX_PREDICTED_SCORE` (or the literal 99.0)
    /// somewhere — proving the cap is wired, not just renamed away.
    #[test]
    fn engine_client_uses_max_predicted_score_constant() {
        let src = include_str!("../engine_client.rs");
        let has_constant = src.contains("MAX_PREDICTED_SCORE");
        let has_literal = src.contains("99.0") || src.contains("99_f64");
        assert!(
            has_constant || has_literal,
            "engine_client.rs must reference MAX_PREDICTED_SCORE or 99.0 to \
             enforce V1-M30.10 W-3 cap. Found neither.",
        );
    }

    /// Cap must NOT inflate scores below the cap — it is a ceiling, not a floor.
    #[test]
    fn cap_does_not_inflate_low_baselines() {
        let current_score = 50.0_f64;
        let impacts = [3.0_f64];
        let adjusted: f64 = impacts.iter().sum();
        let predicted = (current_score + adjusted).clamp(current_score, MAX_PREDICTED_SCORE);
        assert!(
            (predicted - 53.0).abs() < f64::EPSILON,
            "predicted={predicted} should be 53.0 (50 baseline + 3 impact, well below cap)",
        );
    }

    /// Cap must never push a score backwards (predicted < current).
    #[test]
    fn cap_is_monotonic_never_decreases_baseline() {
        let current_score = 70.0_f64;
        let impacts: Vec<f64> = vec![]; // no fixes
        let adjusted: f64 = impacts.iter().sum();
        let predicted = (current_score + adjusted).clamp(current_score, MAX_PREDICTED_SCORE);
        assert!(
            (predicted - 70.0).abs() < f64::EPSILON,
            "predicted={predicted} should equal current_score=70.0 with no fixes",
        );
    }
}

// --- V1-M30.11 RED tests: fix --doc engine error handling + scan --diff git stderr ---
//
// Background: post V1-M30.10 final /deep-e2e exposed two UX bugs.
//
// BUG-1 (P2): `engine_client::post_json` returns Ok(error_json) for HTTP 4xx
// responses (deliberate, so callers can read structured error fields). But the
// `fix --doc <type>` handlers in fix.rs and doc.rs DON'T check the `error`
// field — they just call `.get("savedPath")` which returns None → "unknown".
// User sees fake "Document generated" + "Saved to: unknown" + "Prefilled: 0"
// + "Manual: 0" instead of the real "Passport not found: <name>" error.
//
// BUG-3 (P3): `scan --diff main` on a non-git project dumps full git --help
// (~70 lines) because scan.rs:677 prints `String::from_utf8_lossy(&o.stderr)`
// without truncation or pattern detection.
//
// rust-dev MUST add error-field checks (BUG-1) + friendly stderr handling
// (BUG-3). These are static-source invariant tests.
#[cfg(test)]
mod doc_generate_error_tests {

    /// Sanity: source files we will probe actually exist as compile-time strings.
    #[test]
    fn sanity_source_files_loadable() {
        let fix_rs = include_str!("../headless/fix.rs");
        let doc_rs = include_str!("../headless/doc.rs");
        let scan_rs = include_str!("../headless/scan.rs");
        assert!(!fix_rs.is_empty(), "fix.rs source must be non-empty");
        assert!(!doc_rs.is_empty(), "doc.rs source must be non-empty");
        assert!(!scan_rs.is_empty(), "scan.rs source must be non-empty");
    }

    /// V1-M30.11 BUG-1 invariant: `cli/src/headless/fix.rs` MUST check for
    /// the `error` field in the doc-generate response before reading other
    /// fields, INSIDE the `run_doc_generate_single` function specifically
    /// (not in other handlers that already do).
    ///
    /// We slice the source between `fn run_doc_generate_single` and the
    /// next top-level `fn ` boundary, then assert `get("error")` appears
    /// in that window.
    #[test]
    fn fix_rs_doc_generate_checks_error_field() {
        let src = include_str!("../headless/fix.rs");
        let fn_start = src
            .find("async fn run_doc_generate_single")
            .or_else(|| src.find("fn run_doc_generate_single"))
            .expect("fix.rs must define run_doc_generate_single fn");
        // End-of-fn boundary: next "\n}\n\n" closure followed by another fn,
        // mod boundary, or EOF. Cheap heuristic: take the next 4 KB.
        let window_end = (fn_start + 4096).min(src.len());
        let window = &src[fn_start..window_end];
        assert!(
            window.contains("get(\"error\")"),
            "fix.rs::run_doc_generate_single MUST check `result.get(\"error\")` \
             after post_json (V1-M30.11 BUG-1). Without this check the user \
             sees fake 'Document generated' + 'Saved to: unknown' instead of \
             the real engine error like 'Passport not found: default'. \
             Note: error checks elsewhere in fix.rs do NOT count — must be \
             inside run_doc_generate_single specifically.",
        );
    }

    /// V1-M30.11 BUG-1 invariant: `cli/src/headless/doc.rs` has TWO doc-generate
    /// handlers (one for /fix/doc/all loop response and one for single types).
    /// Both must check for the engine error field.
    ///
    /// This test counts occurrences of `get("error")` and requires at least 2.
    #[test]
    fn doc_rs_handlers_check_error_field() {
        let src = include_str!("../headless/doc.rs");
        let count = src.matches("get(\"error\")").count();
        assert!(
            count >= 2,
            "doc.rs MUST check `result.get(\"error\")` in BOTH doc-generate \
             handlers (V1-M30.11 BUG-1). Found {count} occurrence(s), need ≥2. \
             Without these checks user sees fake success messages when engine \
             returns 4xx error JSON.",
        );
    }

    /// V1-M30.11 BUG-3 invariant: `cli/src/headless/scan.rs` MUST NOT dump raw
    /// git stderr unbounded. When git fails on a non-git project, its stderr
    /// contains the full ~70 line `git --help` output. Must be:
    ///   - detected via "not a git repository" pattern + friendly message, OR
    ///   - truncated explicitly (e.g. `.lines().next()` or `[..200]` slice)
    ///
    /// This test asserts that scan.rs source either:
    ///   (a) contains the case-insensitive pattern "not a git" / "not_a_git" check
    ///   (b) OR contains an explicit truncation pattern on stderr
    #[test]
    fn scan_rs_diff_does_not_dump_git_help() {
        let src = include_str!("../headless/scan.rs");
        // Either detect the not-git case…
        let has_not_git_check = src.contains("not a git")
            || src.contains("not_a_git")
            || src.contains("Not a git")
            || src.contains("NotARepo")
            || src.contains("repository");
        // …or explicitly truncate stderr length.
        let has_truncation = src.contains("stderr).lines().next()")
            || src.contains("stderr_first_line")
            || src.contains("truncate(200)")
            || src.contains("&stderr_str[..");
        assert!(
            has_not_git_check || has_truncation,
            "scan.rs MUST detect 'not a git repository' pattern OR truncate \
             git stderr explicitly (V1-M30.11 BUG-3). Without this fix, \
             `complior scan --diff main` on non-git projects dumps the full \
             git --help text (~70 lines).",
        );
    }
}
