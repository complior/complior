//! Layer definitions, inference, and finding-limit logic.

use crate::types::{CheckResultType, Finding, Severity};

// ── Constants ────────────────────────────────────────────────────

pub(crate) const SEP_WIDTH: usize = 65;
pub(crate) const BAR_WIDTH: usize = 20;
/// Maximum medium-severity findings to display.
pub(crate) const MAX_MEDIUM: usize = 5;

/// Base layer definitions: (tag, label). Single source of truth for scan info + layer results.
pub(crate) const BASE_LAYERS: &[(&str, &str)] = &[
    ("L1", "File Presence"),
    ("L2", "Document Structure"),
    ("L3", "Dependencies"),
    ("L4", "Code Patterns"),
    ("NHI", "Secrets"),
    ("CROSS", "Cross-Layer"),
    ("GPAI", "Systemic Risk"),
    ("L5", "LLM Analysis"),
];

/// Deep layer definitions for Layer Results section.
pub(crate) const DEEP_LAYERS: &[(&str, &str)] = &[
    ("L4+", "Ext. Code Analysis"),
    ("L3+", "Model Security"),
    ("NHI+", "Ext. Secret Detection"),
];

/// Deep layer definitions for scan info header: (tag, tool name).
pub(crate) const DEEP_TOOL_NAMES: &[(&str, &str)] = &[
    ("L4+", "Semgrep"),
    ("L4+", "Bandit"),
    ("L3+", "ModelScan"),
    ("NHI+", "detect-secrets"),
];

// ── Layer Inference ──────────────────────────────────────────────

pub(crate) struct LayerResult {
    pub id: String,
    pub label: String,
    pub status: &'static str,
    pub summary: String,
}

/// Infer the layer tag for a finding based on its check_id prefix.
pub(crate) fn infer_layer_tag(check_id: &str) -> &'static str {
    if check_id.starts_with("l4-nhi-") { return "NHI"; }
    if check_id.starts_with("ext-semgrep-") { return "L4+"; }
    if check_id.starts_with("ext-bandit-") { return "L4+"; }
    if check_id.starts_with("ext-modelscan-") { return "L3+"; }
    if check_id.starts_with("ext-detect-secrets-") { return "NHI+"; }
    if check_id.starts_with("l5-") { return "L5"; }
    if check_id.starts_with("l4-") { return "L4"; }
    if check_id.starts_with("l3-") { return "L3"; }
    if check_id.starts_with("l2-") { return "L2"; }
    if check_id.starts_with("cross-") { return "CROSS"; }
    if check_id.starts_with("gpai-") { return "GPAI"; }
    "L1"
}

/// Infer layer results from findings.
///
/// Uses `infer_layer_tag` as the single source of truth for layer classification,
/// then groups findings by tag and computes status per layer.
pub(crate) fn infer_layer_results(findings: &[Finding], tier: Option<u8>) -> Vec<LayerResult> {
    let all_layers = if tier == Some(2) {
        [BASE_LAYERS, DEEP_LAYERS].concat()
    } else {
        BASE_LAYERS.to_vec()
    };

    all_layers
        .iter()
        .filter_map(|&(tag, label)| {
            let layer_findings: Vec<&Finding> = findings
                .iter()
                .filter(|f| infer_layer_tag(&f.check_id) == tag)
                .collect();
            if layer_findings.is_empty() {
                return None;
            }
            let (status, summary) = compute_layer_status(&layer_findings);
            Some(LayerResult {
                id: tag.to_string(),
                label: label.to_string(),
                status,
                summary,
            })
        })
        .collect()
}

fn compute_layer_status(findings: &[&Finding]) -> (&'static str, String) {
    let fails: Vec<&&Finding> = findings
        .iter()
        .filter(|f| f.r#type == CheckResultType::Fail)
        .collect();
    let passes = findings
        .iter()
        .filter(|f| f.r#type == CheckResultType::Pass)
        .count();

    if fails.is_empty() {
        if passes > 0 {
            return ("PASS", format!("{passes} checks passed"));
        }
        return ("SKIP", "no checks".to_string());
    }

    let has_crit_high = fails
        .iter()
        .any(|f| matches!(f.severity, Severity::Critical | Severity::High));
    let fail_count = fails.len();

    if has_crit_high {
        ("FAIL", format!("{fail_count} issues found"))
    } else {
        ("WARN", format!("{fail_count} issues found"))
    }
}

/// Apply display limits: all critical/high, max 5 medium, no low/info.
pub(crate) fn apply_finding_limits<'a>(sorted: &[&'a Finding]) -> Vec<&'a Finding> {
    let mut result = Vec::new();
    let mut medium_count = 0;
    for f in sorted {
        match f.severity {
            Severity::Critical | Severity::High => result.push(*f),
            Severity::Medium => {
                if medium_count < MAX_MEDIUM {
                    result.push(*f);
                    medium_count += 1;
                }
            }
            Severity::Low | Severity::Info => {} // not shown
        }
    }
    result
}
