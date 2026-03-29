/// HTTP Contract Test — validates Rust types can deserialize the shared contract sample.
///
/// This test ensures that:
/// 1. The shared fixture JSON deserializes into Rust types without error
/// 2. All required fields are present and correctly typed
/// 3. camelCase → snake_case mapping works via serde rename_all
/// 4. Optional fields deserialize correctly (Some/None)
///
/// If this test fails, Rust types have drifted from the TS engine contract.
/// Update both `types.rs` and `http-contract.json` together.
#[cfg(test)]
mod contract_tests {
    use crate::types::{
        CategoryScore, CodeContext, CodeContextLine, Finding, FixDiff, ScanResult, ScoreBreakdown,
        Severity, Zone,
    };

    /// Path to the shared contract sample (relative to workspace root).
    fn sample_json() -> String {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let workspace_root = std::path::Path::new(manifest_dir)
            .parent()
            .expect("cli/ should have a parent directory");
        let path = workspace_root.join("engine/core/data/schemas/http-contract-sample.json");
        std::fs::read_to_string(&path).unwrap_or_else(|e| {
            panic!(
                "Failed to read contract sample at {}: {e}",
                path.display()
            )
        })
    }

    #[test]
    fn contract_sample_deserializes_as_scan_result() {
        let json = sample_json();
        let result: ScanResult =
            serde_json::from_str(&json).expect("ScanResult should deserialize from contract sample");

        assert_eq!(result.project_path, "/home/user/my-ai-project");
        assert_eq!(result.scanned_at, "2026-03-01T14:30:00Z");
        assert_eq!(result.duration, 1250);
        assert_eq!(result.files_scanned, 47);
    }

    #[test]
    fn contract_score_breakdown_fields() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        let score: &ScoreBreakdown = &result.score;

        assert!((score.total_score - 72.5).abs() < f64::EPSILON);
        assert_eq!(score.zone, Zone::Yellow);
        assert!(!score.critical_cap_applied);
        assert_eq!(score.total_checks, 20);
        assert_eq!(score.passed_checks, 14);
        assert_eq!(score.failed_checks, 4);
        assert_eq!(score.skipped_checks, 2);
        assert_eq!(score.category_scores.len(), 2);
    }

    #[test]
    fn contract_category_score_fields() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        let cat: &CategoryScore = &result.score.category_scores[0];

        assert_eq!(cat.category, "documentation");
        assert!((cat.weight - 0.25).abs() < f64::EPSILON);
        assert!((cat.score - 80.0).abs() < f64::EPSILON);
        assert_eq!(cat.obligation_count, 5);
        assert_eq!(cat.passed_count, 4);
    }

    #[test]
    fn contract_zone_enum_mapping() {
        // Verify lowercase JSON → PascalCase Rust enum
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        assert_eq!(result.score.zone, Zone::Yellow);

        // Test all zone variants
        let green: Zone = serde_json::from_str(r#""green""#).unwrap();
        assert_eq!(green, Zone::Green);
        let red: Zone = serde_json::from_str(r#""red""#).unwrap();
        assert_eq!(red, Zone::Red);
    }

    #[test]
    fn contract_severity_enum_mapping() {
        // Verify lowercase JSON → PascalCase Rust enum
        let all = ["critical", "high", "medium", "low", "info"];
        let expected = [
            Severity::Critical,
            Severity::High,
            Severity::Medium,
            Severity::Low,
            Severity::Info,
        ];
        for (json_val, expected_val) in all.iter().zip(expected.iter()) {
            let s: Severity = serde_json::from_str(&format!("\"{json_val}\"")).unwrap();
            assert_eq!(&s, expected_val);
        }
    }

    #[test]
    fn contract_finding_required_fields() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        let finding: &Finding = &result.findings[0];

        assert_eq!(finding.check_id, "l4-bare-api-call");
        assert_eq!(finding.r#type, crate::types::CheckResultType::Info);
        assert_eq!(finding.severity, Severity::Info);
        assert!(!finding.message.is_empty());
    }

    #[test]
    fn contract_finding_new_optional_fields() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        let f0: &Finding = &result.findings[0];

        assert_eq!(f0.priority, Some(3));
        assert!((f0.confidence.unwrap() - 0.95).abs() < f64::EPSILON);
        assert_eq!(f0.confidence_level.as_deref(), Some("high"));
        assert!(f0.evidence.is_some());
        assert_eq!(f0.evidence.as_ref().unwrap().len(), 1);

        // Second finding: missing new fields (should default to None)
        let f1: &Finding = &result.findings[1];
        assert!(f1.priority.is_none());
        assert!(f1.confidence.is_none());
        assert!(f1.confidence_level.is_none());
        assert!(f1.evidence.is_none());
    }

    #[test]
    fn contract_score_confidence_summary() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        assert!(result.score.confidence_summary.is_some());
        let cs = result.score.confidence_summary.as_ref().unwrap();
        assert_eq!(cs["average"], 0.82);
    }

    #[test]
    fn contract_scan_result_new_fields() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        assert_eq!(result.deep_analysis, Some(false));
        assert!((result.l5_cost.unwrap() - 0.0).abs() < f64::EPSILON);
        assert!(result.regulation_version.is_some());
    }

    #[test]
    fn contract_finding_optional_fields() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();

        // First finding: has all optional fields
        let f0: &Finding = &result.findings[0];
        assert_eq!(f0.file.as_deref(), Some("src/ai/chat.ts"));
        assert_eq!(f0.line, Some(42));
        assert_eq!(f0.obligation_id.as_deref(), Some("OBL-015"));
        assert_eq!(f0.article_reference.as_deref(), Some("Art. 14(4)"));
        assert_eq!(f0.fix.as_deref(), Some("Optional: wrap with @complior/sdk for runtime Art. 50/12/14 enforcement"));

        // Second finding: missing file/line (should be None)
        let f1: &Finding = &result.findings[1];
        assert!(f1.file.is_none());
        assert!(f1.line.is_none());
    }

    #[test]
    fn contract_code_context_deserialization() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        let ctx: &CodeContext = result.findings[0]
            .code_context
            .as_ref()
            .expect("first finding should have codeContext");

        assert_eq!(ctx.start_line, 40);
        assert_eq!(ctx.highlight_line, Some(42));
        assert_eq!(ctx.lines.len(), 5);

        let line: &CodeContextLine = &ctx.lines[0];
        assert_eq!(line.num, 40);
        assert!(line.content.contains("async function"));
    }

    #[test]
    fn contract_fix_diff_deserialization() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();
        // First finding is info (no fixDiff), check that it is None
        assert!(result.findings[0].fix_diff.is_none(), "info finding should not have fixDiff");
    }

    #[test]
    fn contract_finding_without_optional_nested_types() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();

        // Third finding: no codeContext, no fixDiff
        let f2: &Finding = &result.findings[2];
        assert!(f2.code_context.is_none());
        assert!(f2.fix_diff.is_none());
    }

    #[test]
    fn contract_roundtrip_serialize_deserialize() {
        let json = sample_json();
        let result: ScanResult = serde_json::from_str(&json).unwrap();

        // Serialize back to JSON
        let reserialized = serde_json::to_string(&result).expect("should serialize");

        // Deserialize again — should produce identical struct
        let result2: ScanResult = serde_json::from_str(&reserialized).unwrap();
        assert!((result.score.total_score - result2.score.total_score).abs() < f64::EPSILON);
        assert_eq!(result.findings.len(), result2.findings.len());
        assert_eq!(result.project_path, result2.project_path);
    }
}
