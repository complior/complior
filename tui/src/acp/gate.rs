//! Compliance gate — intercepts ACP `file/write` notifications and decides
//! whether to PASS or REJECT the write based on simple pattern rules.
//!
//! In S01 this is a mock implementation. S02 will replace it with a real call
//! to the engine `POST /compliance-check` endpoint.

/// Decision made by the compliance gate for a prospective file write.
#[derive(Debug, Clone)]
pub enum GateDecision {
    Pass,
    Reject { reason: String },
}

/// S01 mock compliance gate.
pub struct ComplianceGate;

impl ComplianceGate {
    pub fn new() -> Self {
        Self
    }

    /// Check whether writing `content` to `path` is compliant.
    ///
    /// S01 rules:
    /// - Reject `.env` files (leak risk)
    /// - Reject content containing `PRIVATE_KEY` or `password =` patterns
    /// - Pass everything else
    pub fn check_file_write(&self, path: &str, content: &str) -> GateDecision {
        // Rule 1: block .env files
        let filename = std::path::Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        if filename == ".env" || filename.starts_with(".env.") {
            return GateDecision::Reject {
                reason: format!("Refusing to write secrets file: {path}"),
            };
        }

        // Rule 2: block content with sensitive patterns
        let content_lower = content.to_lowercase();
        if content_lower.contains("private_key") {
            return GateDecision::Reject {
                reason: format!("Content contains PRIVATE_KEY — blocked: {path}"),
            };
        }
        if content_lower.contains("password =") || content_lower.contains("password=") {
            return GateDecision::Reject {
                reason: format!("Content contains plaintext password — blocked: {path}"),
            };
        }

        GateDecision::Pass
    }
}

impl Default for ComplianceGate {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gate_blocks_env_file() {
        let gate = ComplianceGate::new();
        assert!(matches!(
            gate.check_file_write(".env", "SECRET=foo"),
            GateDecision::Reject { .. }
        ));
    }

    #[test]
    fn test_gate_blocks_env_local() {
        let gate = ComplianceGate::new();
        assert!(matches!(
            gate.check_file_write(".env.local", "API_KEY=abc"),
            GateDecision::Reject { .. }
        ));
    }

    #[test]
    fn test_gate_blocks_private_key_content() {
        let gate = ComplianceGate::new();
        assert!(matches!(
            gate.check_file_write("config.js", "const PRIVATE_KEY = 'abc123';"),
            GateDecision::Reject { .. }
        ));
    }

    #[test]
    fn test_gate_blocks_plaintext_password() {
        let gate = ComplianceGate::new();
        assert!(matches!(
            gate.check_file_write("config.yaml", "db:\n  password=secret"),
            GateDecision::Reject { .. }
        ));
    }

    #[test]
    fn test_gate_passes_clean_file() {
        let gate = ComplianceGate::new();
        assert!(matches!(
            gate.check_file_write("README.md", "# Hello World"),
            GateDecision::Pass
        ));
    }

    #[test]
    fn test_gate_passes_source_file() {
        let gate = ComplianceGate::new();
        assert!(matches!(
            gate.check_file_write("src/main.rs", "fn main() { println!(\"hello\"); }"),
            GateDecision::Pass
        ));
    }
}
