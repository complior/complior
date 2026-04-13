//! Sync Contract types — Rust mirror of engine/core/src/types/sync.types.ts
//!
//! Source of truth: sync.types.ts (Zod schemas).
//! This file MUST stay in sync. If sync.types.ts changes, update here.
//! Contract test: engine/core/src/types/sync-contract.test.ts

use serde::{Deserialize, Serialize};

// ─── Passport Sync (POST /api/sync/passport) ────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPassportPayload {
    // GROUP A: Identity
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,

    // GROUP B: Tech Stack
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub framework: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_residency: Option<String>,

    // GROUP C: Compliance (dual score)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub risk_level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub complior_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lifecycle_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fria_completed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fria_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub worker_notification_sent: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy_generated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scan_summary: Option<SyncScanSummary>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multi_framework: Option<Vec<SyncFrameworkScore>>,

    // GROUP D: Autonomy
    #[serde(skip_serializing_if = "Option::is_none")]
    pub autonomy_level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub autonomy_evidence: Option<SyncAutonomyEvidence>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_type: Option<String>,

    // GROUP E: Permissions + Constraints (serialized as JSON)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner: Option<SyncOwner>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub constraints: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oversight: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disclosure: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logging: Option<serde_json::Value>,

    // GROUP F: Metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manifest_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detection_patterns: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub versions: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoints: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<SyncSignature>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncAutonomyEvidence {
    pub human_approval_gates: u32,
    pub unsupervised_actions: u32,
    pub no_logging_actions: u32,
    pub auto_rated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncOwner {
    pub team: String,
    pub contact: String,
    pub responsible_person: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncScanSummary {
    pub total_checks: u32,
    pub passed: u32,
    pub failed: u32,
    pub skipped: u32,
    pub failed_checks: Vec<String>,
    pub scan_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFrameworkScore {
    pub framework_id: String,
    pub framework_name: String,
    pub score: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grade: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncSignature {
    pub algorithm: String,
    pub public_key: String,
    pub signed_at: String,
    pub hash: String,
    pub value: String,
}

// ─── Scan Sync (POST /api/sync/scan) ────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncScanPayload {
    pub project_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub security_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tier: Option<u8>,
    pub findings: Vec<SyncFinding>,
    pub tools_detected: Vec<SyncToolDetected>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFinding {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub check_id: Option<String>,
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub obligation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub article_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc_quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub l5_analyzed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncToolDetected {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sync_passport_minimal_roundtrip() {
        let json = r#"{"name":"my-agent"}"#;
        let parsed: SyncPassportPayload = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "my-agent");
        assert!(parsed.autonomy_evidence.is_none());
    }

    #[test]
    fn sync_passport_full_roundtrip() {
        let payload = SyncPassportPayload {
            name: "test-bot".to_string(),
            slug: Some("test-bot".to_string()),
            display_name: None,
            description: Some("Test".to_string()),
            purpose: None,
            domain: None,
            version: None,
            vendor_name: Some("ACME".to_string()),
            vendor_url: None,
            framework: Some("langchain".to_string()),
            model_provider: Some("openai".to_string()),
            model_id: Some("gpt-4o".to_string()),
            data_residency: Some("EU".to_string()),
            risk_level: Some("limited".to_string()),
            complior_score: Some(72.0),
            project_score: Some(68.0),
            lifecycle_status: Some("active".to_string()),
            fria_completed: Some(true),
            fria_date: None,
            worker_notification_sent: None,
            policy_generated: None,
            scan_summary: None,
            multi_framework: None,
            autonomy_level: Some("L3".to_string()),
            autonomy_evidence: Some(SyncAutonomyEvidence {
                human_approval_gates: 2,
                unsupervised_actions: 5,
                no_logging_actions: 0,
                auto_rated: true,
            }),
            agent_type: Some("hybrid".to_string()),
            owner: Some(SyncOwner {
                team: "Platform".to_string(),
                contact: "team@acme.com".to_string(),
                responsible_person: "Jane".to_string(),
            }),
            permissions: None,
            constraints: None,
            oversight: None,
            disclosure: None,
            logging: None,
            manifest_version: None,
            detection_patterns: Some(vec!["openai".to_string()]),
            versions: None,
            source_files: None,
            endpoints: None,
            signature: None,
        };

        let json = serde_json::to_string(&payload).unwrap();
        let parsed: SyncPassportPayload = serde_json::from_str(&json).unwrap();

        // Dual score preserved
        assert_eq!(parsed.complior_score, Some(72.0));
        assert_eq!(parsed.project_score, Some(68.0));
        // Autonomy evidence preserved
        let ev = parsed.autonomy_evidence.unwrap();
        assert_eq!(ev.human_approval_gates, 2);
        assert_eq!(ev.unsupervised_actions, 5);
    }

    #[test]
    fn sync_scan_roundtrip() {
        let json = r#"{
            "projectPath": "/test",
            "score": 72,
            "findings": [{"severity": "high", "message": "Missing disclosure"}],
            "toolsDetected": [{"name": "openai"}]
        }"#;
        let parsed: SyncScanPayload = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.findings.len(), 1);
        assert_eq!(parsed.tools_detected[0].name, "openai");
    }
}
