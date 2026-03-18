//! Human-readable check label mappings for scan output.

use crate::types::humanize_kebab;

/// Human-readable label for a check_id.
pub(super) fn check_label(check_id: &str) -> String {
    let label = match check_id {
        // ── L1: Document & component presence ───────────────
        "ai-disclosure"            => "AI Disclosure Notice",
        "content-marking"          => "Content Marking / Provenance",
        "interaction-logging"      => "Interaction Logging",
        "ai-literacy"              => "AI Literacy Training Policy",
        "ai-literacy-stale"        => "AI Literacy Training Overdue",
        "ai-literacy-incomplete"   => "AI Literacy Training Incomplete",
        "gpai-transparency"        => "GPAI Transparency Docs",
        "compliance-metadata"      => "Compliance Metadata",
        "documentation"            => "Compliance Documentation",
        "passport-presence"        => "Agent Passport",
        "passport-completeness"    => "Passport Completeness",
        "undeclared-permission"    => "Undeclared Code Permission",
        "unused-declared-permission" => "Unused Passport Permission",
        "behavioral-constraints"   => "Behavioral Constraints",
        "industry-detection"       => "Industry Risk Detection",
        "fria"                     => "Fundamental Rights Assessment",
        "art5-screening"           => "Prohibited Practices Screening",
        "technical-documentation"  => "Technical Documentation",
        "incident-report"          => "Incident Report Template",
        "declaration-of-conformity"=> "Declaration of Conformity",
        "monitoring-policy"        => "Post-Market Monitoring Policy",
        "worker-notification"      => "Worker AI Notification",
        "risk-management"          => "Risk Management System",
        "data-governance"          => "Data Governance Policy",
        "qms"                      => "Quality Management System",
        "instructions-for-use"     => "Instructions for Use",
        "gpai-systemic-risk"       => "GPAI Systemic Risk Assessment",

        // ── L2: Document structure validation ───────────────
        "l2-fria"                  => "FRIA Structure Validation",
        "l2-art5-screening"        => "Art. 5 Screening Structure",
        "l2-tech-documentation"    => "Tech Docs Structure",
        "l2-incident-report"       => "Incident Report Structure",
        "l2-declaration-conformity"=> "Declaration Structure",
        "l2-monitoring-policy"     => "Monitoring Policy Structure",
        "l2-worker-notification"   => "Worker Notification Structure",
        "l2-ai-literacy"           => "AI Literacy Doc Structure",
        "l2-risk-management"       => "Risk Management Doc Structure",
        "l2-data-governance"       => "Data Governance Doc Structure",
        "l2-qms"                   => "QMS Doc Structure",
        "l2-instructions-for-use"  => "Instructions for Use Structure",
        "l2-biometrics-ai-policy"  => "Biometrics AI Policy Structure",
        "l2-critical-infra-ai-policy" => "Critical Infra Policy Structure",
        "l2-migration-ai-policy"   => "Migration AI Policy Structure",

        // ── L3: Dependencies & configuration ────────────────
        "l3-dep-scan"              => "Dependency Security Analysis",
        "l3-dep-license"           => "Dependency License Check",
        "l3-dep-vuln"              => "Dependency Vulnerability",
        "l3-ai-sdk-detected"       => "AI SDK Detected",
        "l3-missing-bias-testing"  => "Bias Testing Missing",
        "l3-log-retention"         => "Log Retention Policy",
        "l3-env-config"            => "Environment Configuration",
        "l3-ci-compliance"         => "CI/CD Compliance Check",

        // ── L4: Code patterns & security ────────────────────
        "l4-bare-llm"              => "Bare LLM API Call",
        "l4-security-risk"         => "Security Vulnerability",
        "l4-human-oversight"       => "Human Oversight Mechanism",
        "l4-conformity-assessment" => "Conformity Assessment",
        "l4-disclosure"            => "AI Disclosure in Code",
        "l4-kill-switch"           => "Kill Switch / Feature Flag",
        "l4-logging"               => "AI Interaction Logging",
        "l4-content-marking"       => "Content Watermarking",
        "l4-data-governance"       => "Data Governance Patterns",
        "l4-accuracy-robustness"   => "Accuracy & Robustness Testing",
        "l4-gpai-transparency"     => "GPAI Model Documentation",
        "l4-deployer-monitoring"   => "Deployer Monitoring",
        "l4-record-keeping"        => "Record Keeping / Audit Trail",
        "l4-cybersecurity"         => "Cybersecurity Controls",
        "l4-nhi-clean"             => "Secrets & Credentials Scan",

        // ── Cross-layer verification ────────────────────────
        "cross-doc-code-mismatch"  => "Documentation ↔ Code Mismatch",
        "cross-sdk-no-disclosure"  => "SDK Without AI Disclosure",
        "cross-banned-with-wrapper"=> "Prohibited Pkg + Controls",
        "cross-logging-no-retention"=> "Logging Without Retention",
        "cross-kill-switch-no-test"=> "Kill Switch Without Tests",
        "cross-passport-code-mismatch" => "Passport ↔ Code Mismatch",
        "cross-permission-passport-mismatch" => "Permission ↔ Passport Mismatch",

        // ── Dynamic patterns (prefix match) ─────────────────
        _ => return check_label_dynamic(check_id),
    };
    label.to_string()
}

/// Handle dynamic check_ids (l3-banned-*, l4-nhi-*, industry-*).
fn check_label_dynamic(check_id: &str) -> String {
    if let Some(pkg) = check_id.strip_prefix("l3-banned-") {
        return format!("Prohibited Package: {pkg}");
    }
    if let Some(cat) = check_id.strip_prefix("l4-nhi-") {
        return format!("Secrets: {}", humanize_kebab(cat));
    }
    if check_id == "industry-biometrics" {
        return "High-Risk Domain: Biometrics".to_string();
    }
    if check_id == "industry-critical-infra" {
        return "High-Risk Domain: Critical Infrastructure".to_string();
    }
    if check_id == "industry-migration" {
        return "High-Risk Domain: Migration".to_string();
    }
    if check_id == "industry-legal" {
        return "High-Risk Domain: Legal".to_string();
    }
    if let Some(industry) = check_id.strip_prefix("industry-") {
        return format!("High-Risk Domain: {}", humanize_kebab(industry));
    }
    if let Some(doc) = check_id.strip_prefix("l2-") {
        return format!("{} Structure", humanize_kebab(doc));
    }
    // Final fallback
    let (_, name) = crate::types::strip_layer_prefix(check_id);
    humanize_kebab(name)
}

/// Human-readable label for an external check_id.
pub(super) fn ext_check_label(check_id: &str) -> String {
    // Match on known rule patterns within the check_id
    if check_id.contains("unsafe-deser-js") {
        return "Unsafe Code Execution (eval/Function)".to_string();
    }
    if check_id.contains("unsafe-deser") {
        return "Unsafe Deserialization (pickle/yaml)".to_string();
    }
    if check_id.contains("bare-call") {
        return "Bare LLM API Call".to_string();
    }
    if check_id.contains("injection") {
        return "Prompt Injection Risk".to_string();
    }
    if check_id.contains("missing-error-handling") {
        return "Missing Error Handling".to_string();
    }
    if check_id.contains("hardcoded-secret") {
        return "Hardcoded Secrets".to_string();
    }
    // Bandit specific rules
    match check_id {
        "ext-bandit-B301" => return "Unsafe Pickle Usage (pickle.loads)".to_string(),
        "ext-bandit-B302" => return "Unsafe Marshal Deserialization".to_string(),
        "ext-bandit-B307" => return "Unsafe eval() Usage".to_string(),
        "ext-bandit-B324" => return "Weak Hash Algorithm (MD5/SHA1)".to_string(),
        "ext-bandit-B403" => return "Pickle Import Warning".to_string(),
        "ext-bandit-B404" => return "Subprocess Import Warning".to_string(),
        "ext-bandit-B501" => return "SSL Verification Disabled".to_string(),
        "ext-bandit-B506" => return "Unsafe YAML Load".to_string(),
        "ext-bandit-B602" => return "Shell Injection (subprocess)".to_string(),
        "ext-bandit-B605" => return "Shell Command (os.system)".to_string(),
        "ext-bandit-B608" => return "SQL Injection Risk".to_string(),
        "ext-bandit-B102" => return "Hardcoded Password (exec_command)".to_string(),
        "ext-bandit-B104" => return "Binding to All Interfaces (0.0.0.0)".to_string(),
        "ext-bandit-B105" => return "Hardcoded Password String".to_string(),
        "ext-bandit-B108" => return "Hardcoded Temp Directory".to_string(),
        "ext-bandit-B113" => return "Request Without Timeout".to_string(),
        _ => {}
    }
    // Generic prefix-based fallback
    if check_id.starts_with("ext-bandit-") {
        let rule = check_id.strip_prefix("ext-bandit-").unwrap_or(check_id);
        return format!("Python Security Issue ({rule})");
    }
    if check_id.starts_with("ext-detect-secrets-") {
        let secret_type = check_id.strip_prefix("ext-detect-secrets-").unwrap_or("");
        return match secret_type {
            "AWS-Access-Key" => "AWS Access Key Exposed".to_string(),
            "Secret-Keyword" => "Secret Keyword Detected".to_string(),
            "Hex-High-Entropy-String" => "High-Entropy Hex String (possible key)".to_string(),
            "Base64-High-Entropy-String" => "High-Entropy Base64 String (possible key)".to_string(),
            "Stripe-Access-Key" => "Stripe API Key Exposed".to_string(),
            "Slack-Webhook" => "Slack Webhook URL Exposed".to_string(),
            "GitHub-Token" => "GitHub Token Exposed".to_string(),
            "Twilio-Access-Token" => "Twilio Token Exposed".to_string(),
            _ if !secret_type.is_empty() => format!("Hardcoded Secret ({})", humanize_kebab(secret_type)),
            _ => "Hardcoded Secret Detected".to_string(),
        };
    }
    if check_id.starts_with("ext-modelscan-") {
        let scanner = check_id.strip_prefix("ext-modelscan-").unwrap_or("");
        return match scanner {
            s if s.contains("PickleUnsafeOp") => "Malicious Pickle Model (code execution)".to_string(),
            s if s.contains("Pickle") => "Unsafe Pickle Model".to_string(),
            s if s.contains("H5") || s.contains("Keras") => "Unsafe HDF5/Keras Model".to_string(),
            _ => "Unsafe Model File".to_string(),
        };
    }
    // Final fallback: strip ext- prefix and humanize
    let stripped = check_id.strip_prefix("ext-semgrep-").or_else(|| check_id.strip_prefix("ext-"))
        .unwrap_or(check_id);
    humanize_kebab(stripped)
}
