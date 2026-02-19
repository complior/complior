/// EU AI Act obligation reference data for @OBL/@Art chat completion.

#[derive(Debug, Clone)]
pub struct Obligation {
    pub id: &'static str,
    pub article: &'static str,
    pub severity: &'static str,
    pub deadline: &'static str,
    pub title: &'static str,
    pub description: &'static str,
    pub related: &'static [&'static str],
}

/// Hardcoded EU AI Act obligations (~15 key ones).
pub static OBLIGATIONS: &[Obligation] = &[
    Obligation {
        id: "001",
        article: "Art. 5",
        severity: "Critical",
        deadline: "2025-02-02",
        title: "Prohibited AI Practices",
        description: "Ban on social scoring, real-time biometric ID in public, subliminal manipulation, exploitation of vulnerabilities.",
        related: &["002"],
    },
    Obligation {
        id: "002",
        article: "Art. 6",
        severity: "High",
        deadline: "2026-08-02",
        title: "High-Risk AI Classification",
        description: "AI systems listed in Annex III must comply with high-risk requirements (Ch.2 Sec.2).",
        related: &["003", "004", "005"],
    },
    Obligation {
        id: "003",
        article: "Art. 9",
        severity: "High",
        deadline: "2026-08-02",
        title: "Risk Management System",
        description: "Establish, implement, document and maintain a risk management system throughout the AI lifecycle.",
        related: &["002"],
    },
    Obligation {
        id: "004",
        article: "Art. 10",
        severity: "High",
        deadline: "2026-08-02",
        title: "Data Governance",
        description: "Training, validation & testing data sets must be relevant, representative, free of errors and complete.",
        related: &["002"],
    },
    Obligation {
        id: "005",
        article: "Art. 11",
        severity: "High",
        deadline: "2026-08-02",
        title: "Technical Documentation",
        description: "Draw up technical documentation before placing on market, keep up-to-date.",
        related: &["002", "006"],
    },
    Obligation {
        id: "006",
        article: "Art. 12",
        severity: "High",
        deadline: "2026-08-02",
        title: "Record-Keeping / Logging",
        description: "High-risk AI must have automatic logging capabilities for traceability.",
        related: &["002"],
    },
    Obligation {
        id: "007",
        article: "Art. 13",
        severity: "High",
        deadline: "2026-08-02",
        title: "Transparency & Information",
        description: "High-risk AI must be transparent; provide sufficient info to deployers.",
        related: &["002", "010"],
    },
    Obligation {
        id: "008",
        article: "Art. 14",
        severity: "High",
        deadline: "2026-08-02",
        title: "Human Oversight",
        description: "Design high-risk AI to allow effective human oversight during use.",
        related: &["002"],
    },
    Obligation {
        id: "009",
        article: "Art. 15",
        severity: "High",
        deadline: "2026-08-02",
        title: "Accuracy, Robustness, Cybersecurity",
        description: "High-risk AI must achieve appropriate levels of accuracy, robustness and cybersecurity.",
        related: &["002"],
    },
    Obligation {
        id: "010",
        article: "Art. 50",
        severity: "Medium",
        deadline: "2025-08-02",
        title: "Transparency for All AI",
        description: "Providers must ensure AI-generated content is machine-detectable; deepfake labelling required.",
        related: &["007"],
    },
    Obligation {
        id: "011",
        article: "Art. 52",
        severity: "Medium",
        deadline: "2025-08-02",
        title: "AI Interaction Disclosure",
        description: "Persons interacting with AI must be informed they are interacting with an AI system.",
        related: &["010"],
    },
    Obligation {
        id: "012",
        article: "Art. 53",
        severity: "Medium",
        deadline: "2025-08-02",
        title: "GPAI Model Obligations",
        description: "General-purpose AI model providers must provide technical docs, comply with copyright, publish training data summaries.",
        related: &["013"],
    },
    Obligation {
        id: "013",
        article: "Art. 55",
        severity: "High",
        deadline: "2025-08-02",
        title: "Systemic Risk GPAI",
        description: "GPAI with systemic risk: adversarial testing, incident reporting, cybersecurity measures.",
        related: &["012"],
    },
    Obligation {
        id: "014",
        article: "Art. 26",
        severity: "High",
        deadline: "2026-08-02",
        title: "Deployer Obligations",
        description: "Deployers of high-risk AI must use in accordance with instructions, ensure human oversight, monitor.",
        related: &["002", "008"],
    },
    Obligation {
        id: "015",
        article: "Art. 27",
        severity: "High",
        deadline: "2026-08-02",
        title: "Fundamental Rights Impact Assessment",
        description: "Deployers of high-risk AI must carry out a FRIA before putting the system into use.",
        related: &["002", "014"],
    },
];

/// Autocomplete: match by id prefix or article substring.
pub fn autocomplete_obl(prefix: &str) -> Vec<&'static Obligation> {
    if prefix.is_empty() {
        return OBLIGATIONS.iter().take(5).collect();
    }
    let lower = prefix.to_lowercase();
    OBLIGATIONS
        .iter()
        .filter(|o| {
            o.id.starts_with(&lower)
                || o.article.to_lowercase().contains(&lower)
                || o.title.to_lowercase().contains(&lower)
        })
        .collect()
}

/// Find obligation by exact id.
pub fn find_obl(id: &str) -> Option<&'static Obligation> {
    OBLIGATIONS.iter().find(|o| o.id == id)
}

/// Scan message for @OBL-xxx tokens and prepend obligation context if found.
pub fn inject_obligation_context(message: &str) -> String {
    let mut context_parts = Vec::new();

    for word in message.split_whitespace() {
        if let Some(raw_id) = word.strip_prefix("@OBL-") {
            // Strip trailing punctuation
            let id = raw_id.trim_end_matches(|c: char| !c.is_alphanumeric());
            if let Some(obl) = find_obl(id) {
                context_parts.push(format!(
                    "[{} — {} ({}): {}]",
                    obl.article, obl.title, obl.severity, obl.description
                ));
            }
        }
    }

    if context_parts.is_empty() {
        message.to_string()
    } else {
        format!(
            "[EU AI Act Reference]\n{}\n\n{}",
            context_parts.join("\n"),
            message
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_obl_autocomplete_prefix() {
        let matches = autocomplete_obl("00");
        assert!(matches.len() >= 2);
        assert!(matches.iter().all(|o| o.id.starts_with("00")));

        let matches = autocomplete_obl("01");
        assert!(matches.iter().all(|o| o.id.starts_with("01")));

        // Empty prefix returns first 5
        let matches = autocomplete_obl("");
        assert_eq!(matches.len(), 5);
    }

    #[test]
    fn test_obl_find_by_id() {
        let obl = find_obl("001");
        assert!(obl.is_some());
        assert_eq!(obl.unwrap().article, "Art. 5");
        assert_eq!(obl.unwrap().title, "Prohibited AI Practices");

        let obl = find_obl("015");
        assert!(obl.is_some());
        assert_eq!(obl.unwrap().article, "Art. 27");

        assert!(find_obl("999").is_none());
    }

    #[test]
    fn test_obl_context_injection() {
        let msg = "How do I comply with @OBL-001?";
        let injected = inject_obligation_context(msg);
        assert!(injected.contains("[EU AI Act Reference]"));
        assert!(injected.contains("Art. 5"));
        assert!(injected.contains("Prohibited AI Practices"));
        assert!(injected.contains(msg));

        // No injection for plain messages
        let plain = "Hello world";
        assert_eq!(inject_obligation_context(plain), plain);
    }
}
