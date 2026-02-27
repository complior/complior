use crate::types::{ActivityEntry, ActivityKind, Finding, Severity, Zone};
use super::provider::DataProvider;

/// Mock data provider — static EU AI Act findings used before the engine connects.
pub struct MockDataProvider;

impl MockDataProvider {
    pub fn new() -> Self {
        Self
    }
}

impl Default for MockDataProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl DataProvider for MockDataProvider {
    fn score(&self) -> f64 {
        47.0
    }

    fn zone(&self) -> Zone {
        Zone::Red
    }

    fn findings(&self) -> Vec<Finding> {
        vec![
            Finding {
                check_id: "EU-AIA-001".into(),
                r#type: "transparency".into(),
                message: "No AI disclosure statement found in user-facing documentation.".into(),
                severity: Severity::Critical,
                obligation_id: Some("OBL-013".into()),
                article_reference: Some("Art. 13".into()),
                fix: Some("Add AI disclosure notice to docs/DISCLOSURE.md".into()),
            },
            Finding {
                check_id: "EU-AIA-002".into(),
                r#type: "risk_management".into(),
                message: "Risk management system documentation is missing.".into(),
                severity: Severity::Critical,
                obligation_id: Some("OBL-009".into()),
                article_reference: Some("Art. 9".into()),
                fix: Some("Create docs/RISK-MANAGEMENT.md".into()),
            },
            Finding {
                check_id: "EU-AIA-003".into(),
                r#type: "data_governance".into(),
                message: "No data governance policy detected.".into(),
                severity: Severity::High,
                obligation_id: Some("OBL-010".into()),
                article_reference: Some("Art. 10".into()),
                fix: None,
            },
            Finding {
                check_id: "EU-AIA-004".into(),
                r#type: "human_oversight".into(),
                message: "Human oversight mechanism not documented.".into(),
                severity: Severity::High,
                obligation_id: Some("OBL-014".into()),
                article_reference: Some("Art. 14".into()),
                fix: Some("Document human-in-the-loop controls".into()),
            },
            Finding {
                check_id: "EU-AIA-005".into(),
                r#type: "accuracy_robustness".into(),
                message: "Model accuracy metrics not reported.".into(),
                severity: Severity::High,
                obligation_id: Some("OBL-015".into()),
                article_reference: Some("Art. 15".into()),
                fix: None,
            },
            Finding {
                check_id: "EU-AIA-006".into(),
                r#type: "transparency".into(),
                message: "GPAI model card is absent.".into(),
                severity: Severity::Medium,
                obligation_id: Some("OBL-053".into()),
                article_reference: Some("Art. 53".into()),
                fix: Some("Add MODEL-CARD.md following EU AI Act Annex XI".into()),
            },
            Finding {
                check_id: "EU-AIA-007".into(),
                r#type: "logging".into(),
                message: "No automatic logging of AI system operations found.".into(),
                severity: Severity::Medium,
                obligation_id: Some("OBL-012".into()),
                article_reference: Some("Art. 12".into()),
                fix: None,
            },
            Finding {
                check_id: "EU-AIA-008".into(),
                r#type: "conformity".into(),
                message: "CE marking / conformity declaration not referenced.".into(),
                severity: Severity::Medium,
                obligation_id: Some("OBL-049".into()),
                article_reference: Some("Art. 49".into()),
                fix: None,
            },
            Finding {
                check_id: "EU-AIA-009".into(),
                r#type: "prohibited_practice".into(),
                message: "Potentially prohibited biometric categorisation pattern detected.".into(),
                severity: Severity::Critical,
                obligation_id: Some("OBL-005".into()),
                article_reference: Some("Art. 5".into()),
                fix: None,
            },
            Finding {
                check_id: "EU-AIA-010".into(),
                r#type: "copyright".into(),
                message: "Training data copyright policy not disclosed.".into(),
                severity: Severity::Medium,
                obligation_id: Some("OBL-053".into()),
                article_reference: Some("Art. 53".into()),
                fix: None,
            },
            Finding {
                check_id: "EU-AIA-011".into(),
                r#type: "incident_reporting".into(),
                message: "Incident reporting procedure absent.".into(),
                severity: Severity::Low,
                obligation_id: None,
                article_reference: Some("Art. 73".into()),
                fix: Some("Create docs/INCIDENT-RESPONSE.md".into()),
            },
            Finding {
                check_id: "EU-AIA-012".into(),
                r#type: "post_market".into(),
                message: "Post-market monitoring plan not found.".into(),
                severity: Severity::Low,
                obligation_id: None,
                article_reference: Some("Art. 72".into()),
                fix: None,
            },
        ]
    }

    fn timeline(&self) -> Vec<ActivityEntry> {
        vec![
            ActivityEntry {
                timestamp: "09:00".into(),
                kind: ActivityKind::Scan,
                detail: "Initial scan: 47/100 (RED)".into(),
            },
            ActivityEntry {
                timestamp: "09:15".into(),
                kind: ActivityKind::Fix,
                detail: "Added disclosure notice".into(),
            },
            ActivityEntry {
                timestamp: "09:30".into(),
                kind: ActivityKind::Scan,
                detail: "Re-scan: 52/100 (YELLOW)".into(),
            },
            ActivityEntry {
                timestamp: "10:00".into(),
                kind: ActivityKind::Daemon,
                detail: "Explained Art. 13 obligation".into(),
            },
            ActivityEntry {
                timestamp: "10:20".into(),
                kind: ActivityKind::Watch,
                detail: "File change detected: docs/".into(),
            },
        ]
    }

    fn activity_log(&self) -> Vec<ActivityEntry> {
        self.timeline()
    }
}
