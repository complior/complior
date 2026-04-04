/// Penalty info for EU AI Act articles.
pub(super) fn penalty_for_article(article: &str) -> &'static str {
    match article {
        "Art. 5" => "Up to \u{20ac}35M / 7% turnover",
        "Art. 6" | "Art. 9" | "Art. 10" | "Art. 12" | "Art. 13" | "Art. 14" | "Art. 15"
        | "Art. 49" => "Up to \u{20ac}15M / 3% turnover",
        "Art. 50" | "Art. 53" | "Art. 72" | "Art. 73" => "Up to \u{20ac}7.5M / 1.5% turnover",
        _ => "See EU AI Act penalty schedule",
    }
}

/// Deadline context for an article reference.
pub(super) fn deadline_for_article(art: &str) -> String {
    if art.contains("Art. 5") {
        "Feb 2, 2025 (already in effect)".to_string()
    } else if art.contains("Art. 50") || art.contains("Art. 53") {
        "Aug 2, 2025 (transparency obligations)".to_string()
    } else {
        "Aug 2, 2026 (high-risk AI requirements)".to_string()
    }
}

/// Simple word-wrap for plain text into lines of max `width` chars.
pub(super) fn wrap_text(text: &str, width: usize) -> Vec<String> {
    crate::views::wrap_text_lines(text, width)
}

/// Human-readable explanation of a check ID.
///
/// Returns (`short_description`, `what_to_do`, `what_document`).
pub fn explain_check(check_id: &str) -> (&'static str, &'static str, &'static str) {
    // Strip layer prefixes so engine IDs like "l2-declaration-conformity" match lookup keys.
    let (_, normalized) = crate::types::strip_layer_prefix(check_id);
    match normalized {
        // L2 Document validators
        "ai-literacy" => (
            "AI Literacy Training \u{2014} your organization must document how people are trained to work with AI systems.",
            "Create a file named ai-literacy.md (or similar) with sections: Training Program, Training Levels, Assessment Methods.",
            "docs/ai-literacy.md or COMPLIANCE.md",
        ),
        "art5-screening" => (
            "Prohibited AI Practices Screening \u{2014} Art. 5 bans certain AI uses (social scoring, exploitation of vulnerabilities, etc.).",
            "Create art5-screening.md documenting: which prohibited practices were checked, screening results, and mitigations.",
            "docs/art5-screening.md",
        ),
        "declaration-conformity" | "conformity-assessment" => (
            "Declaration of Conformity \u{2014} Art. 47 requires a formal statement that your AI system meets EU AI Act requirements.",
            "Create declaration-conformity.md with sections: Conformity Statement, Standards Applied, Supporting Evidence.",
            "docs/declaration-conformity.md",
        ),
        "fria" => (
            "Fundamental Rights Impact Assessment \u{2014} Art. 27 requires assessing how your AI system affects people's rights.",
            "Create fria.md with sections: Risk Assessment, Impact Analysis, Mitigation Measures.",
            "docs/fria.md",
        ),
        "incident-report" => (
            "Incident Reporting \u{2014} Art. 73 requires documenting AI incidents and how they were handled.",
            "Create incident-report.md with sections: Incident Description, Root Cause, Corrective Actions.",
            "docs/incident-report.md",
        ),
        "monitoring-policy" => (
            "Monitoring Policy \u{2014} Art. 26 requires documenting how you monitor your AI system in production.",
            "Create monitoring-policy.md with sections: Monitoring Scope, Frequency, Escalation Procedures.",
            "docs/monitoring-policy.md",
        ),
        "tech-documentation" => (
            "Technical Documentation \u{2014} Art. 11 requires documenting your AI system's architecture and data.",
            "Create tech-documentation.md with sections: System Description, Architecture, Data Sources.",
            "docs/tech-documentation.md",
        ),
        "worker-notification" => (
            "Worker Notification \u{2014} Art. 26(7) requires notifying affected workers about AI system deployment.",
            "Create worker-notification.md with sections: Notification Scope, Affected Workers, Timeline.",
            "docs/worker-notification.md",
        ),
        // L1/L3 checks
        "ai-disclosure" => (
            "AI Disclosure \u{2014} Art. 50(1) requires informing users that they are interacting with AI.",
            "Add AI disclosure components in your UI (banners, labels, or metadata) that clearly state AI involvement.",
            "UI code (React/HTML components)",
        ),
        "documentation" => (
            "Compliance Documentation \u{2014} Art. 19 requires maintaining overall compliance documentation.",
            "Create a COMPLIANCE.md or similar document summarizing your compliance measures.",
            "COMPLIANCE.md",
        ),
        "compliance-metadata" => (
            "Compliance Metadata \u{2014} structured compliance info in .well-known/ai-compliance.json or .complior/ config.",
            "Create .well-known/ai-compliance.json with your system's compliance metadata, or initialize with `complior init`.",
            ".well-known/ai-compliance.json",
        ),
        "content-marking" => (
            "Content Marking \u{2014} Art. 50(2) requires marking AI-generated content (watermarking, metadata).",
            "Implement content marking (C2PA metadata, IPTC tags, or visible watermarks) on AI-generated output.",
            "Output pipeline code",
        ),
        "interaction-logging" => (
            "Interaction Logging \u{2014} Art. 12 requires structured logging of AI system interactions.",
            "Add structured logging for AI interactions: inputs, outputs, timestamps, and user context.",
            "Logging infrastructure code",
        ),
        "gpai-transparency" => (
            "GPAI Transparency \u{2014} Art. 51-53 requires model cards and training data documentation for general-purpose AI.",
            "Create a model card documenting: model capabilities, limitations, training data, and intended use.",
            "docs/model-card.md",
        ),
        // Cross-layer checks (engine sends "cross-X", prefix stripped to "X")
        "doc-code-mismatch" => (
            "Documentation claims monitoring capabilities but no corresponding code patterns were found.",
            "Either implement the monitoring described in your documentation, or update the documentation to match reality.",
            "Documentation and source code",
        ),
        "sdk-no-disclosure" => (
            "AI SDK detected in your project but no AI disclosure pattern found in UI code.",
            "Add UI components that disclose AI usage to end users (Art. 50(1) requirement).",
            "UI components",
        ),
        "logging-no-retention" => (
            "Logging code found but no data retention configuration detected.",
            "Add a data retention policy and configure log retention periods per GDPR requirements.",
            "Config files and docs/data-retention.md",
        ),
        "kill-switch-no-test" => (
            "Kill switch / feature flag found but no corresponding test file detected.",
            "Add tests for your AI kill switch to ensure it works when needed.",
            "Test files",
        ),
        // Pattern-based security
        s if s.contains("bare") => (
            "Bare API Call \u{2014} direct LLM API usage detected without compliance wrapper (@complior/sdk).",
            "Wrap your LLM API calls with @complior/sdk: `import { complior } from '@complior/sdk'; const client = complior(yourClient);`",
            "Source files with API calls",
        ),
        s if s.contains("security") || s.contains("pickle") || s.contains("eval") => (
            "Security Risk \u{2014} potentially unsafe code pattern detected (eval, pickle, command injection, etc.).",
            "Replace unsafe patterns: use safe alternatives (json.loads instead of eval, safetensors instead of pickle).",
            "Source files",
        ),
        _ => (
            "Compliance check \u{2014} your project has a finding that needs attention.",
            "Review the finding details and apply the suggested fix, or create the missing documentation.",
            "Project files",
        ),
    }
}

/// Generate a human-readable explanation for a finding.
pub fn explain_finding(finding: &crate::types::Finding) -> String {
    let (desc, action, file) = explain_check(&finding.check_id);
    let obl = finding.obligation_id.as_deref().unwrap_or("N/A");
    let art = finding.article_reference.as_deref().unwrap_or("N/A");

    let mut explanation = format!("=== Explanation: {} ===\n", finding.check_id);
    explanation.push_str(&format!("Obligation: {obl}  |  Article: {art}\n\n"));
    explanation.push_str(&format!("What this means:\n  {desc}\n\n"));
    explanation.push_str(&format!("What to do:\n  {action}\n\n"));
    explanation.push_str(&format!("File to create/edit:\n  {file}\n"));
    if let Some(ref fix) = finding.fix {
        explanation.push_str(&format!("\nSuggested fix:\n  {fix}\n"));
    }
    explanation
}
