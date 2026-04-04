//! Layer definitions, inference, and finding-limit logic.

use crate::types::{CheckResultType, Finding, Severity};

// ── Constants ────────────────────────────────────────────────────

pub const SEP_WIDTH: usize = 65;

/// Dynamic separator width: terminal width capped at 80, falling back to `SEP_WIDTH`.
pub fn display_width() -> usize {
    crossterm::terminal::size()
        .map(|(cols, _)| (cols as usize).min(80))
        .unwrap_or(SEP_WIDTH)
}
pub const BAR_WIDTH: usize = 20;
/// Maximum medium-severity findings to display.
pub const MAX_MEDIUM: usize = 5;

/// Base layer definitions: (tag, label). Single source of truth for scan info + layer results.
pub const BASE_LAYERS: &[(&str, &str)] = &[
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
pub const DEEP_LAYERS: &[(&str, &str)] = &[
    ("L4+", "Ext. Code Analysis"),
    ("L3+", "Model Security"),
    ("NHI+", "Ext. Secret Detection"),
];

/// Deep layer definitions for scan info header: (tag, tool name).
pub const DEEP_TOOL_NAMES: &[(&str, &str)] = &[
    ("L4+", "Semgrep"),
    ("L4+", "Bandit"),
    ("L3+", "ModelScan"),
    ("NHI+", "detect-secrets"),
];

// ── Layer Inference ──────────────────────────────────────────────

pub struct LayerResult {
    pub id: String,
    pub label: String,
    pub status: &'static str,
    pub summary: String,
}

/// Infer the layer tag for a finding based on its `check_id` prefix.
pub fn infer_layer_tag(check_id: &str) -> &'static str {
    if check_id.starts_with("l4-nhi-") {
        return "NHI";
    }
    if check_id.starts_with("ext-semgrep-") {
        return "L4+";
    }
    if check_id.starts_with("ext-bandit-") {
        return "L4+";
    }
    if check_id.starts_with("ext-modelscan-") {
        return "L3+";
    }
    if check_id.starts_with("ext-detect-secrets-") {
        return "NHI+";
    }
    if check_id.starts_with("l5-") {
        return "L5";
    }
    if check_id.starts_with("l4-") {
        return "L4";
    }
    if check_id.starts_with("l3-") {
        return "L3";
    }
    if check_id.starts_with("l2-") {
        return "L2";
    }
    if check_id.starts_with("cross-") {
        return "CROSS";
    }
    if check_id.starts_with("gpai-") {
        return "GPAI";
    }
    "L1"
}

/// Infer layer results from findings.
///
/// Uses `infer_layer_tag` as the single source of truth for layer classification,
/// then groups findings by tag and computes status per layer.
pub fn infer_layer_results(findings: &[Finding], tier: Option<u8>) -> Vec<LayerResult> {
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

/// Multi-key finding sort: severity → layer order → confidence (desc).
pub fn sort_findings_full(findings: &mut [&Finding]) {
    findings.sort_by(|a, b| {
        a.severity
            .sort_key()
            .cmp(&b.severity.sort_key())
            .then_with(|| layer_order(&a.check_id).cmp(&layer_order(&b.check_id)))
            .then_with(|| {
                let ca = a.confidence.unwrap_or(0.0);
                let cb = b.confidence.unwrap_or(0.0);
                cb.partial_cmp(&ca).unwrap_or(std::cmp::Ordering::Equal)
            })
    });
}

fn layer_order(check_id: &str) -> u8 {
    match infer_layer_tag(check_id) {
        "L1" => 0,
        "L2" => 1,
        "L3" => 2,
        "L4" => 3,
        "NHI" => 4,
        "CROSS" => 5,
        "GPAI" => 6,
        "L5" => 7,
        "L4+" => 8,
        "L3+" => 9,
        "NHI+" => 10,
        _ => 11,
    }
}

/// Apply display limits: all critical/high, max 5 medium, no low/info.
pub fn apply_finding_limits<'a>(sorted: &[&'a Finding]) -> Vec<&'a Finding> {
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
