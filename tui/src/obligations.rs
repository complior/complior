/// EU AI Act obligation reference data for @OBL/@Art chat completion.

#[derive(Debug, Clone)]
pub struct Obligation {
    pub id: &'static str,
    pub article: &'static str,
    pub title: &'static str,
}

/// Hardcoded EU AI Act obligations (~15 key ones).
pub static OBLIGATIONS: &[Obligation] = &[
    Obligation {
        id: "001",
        article: "Art. 5",
        title: "Prohibited AI Practices",
    },
    Obligation {
        id: "002",
        article: "Art. 6",
        title: "High-Risk AI Classification",
    },
    Obligation {
        id: "003",
        article: "Art. 9",
        title: "Risk Management System",
    },
    Obligation {
        id: "004",
        article: "Art. 10",
        title: "Data Governance",
    },
    Obligation {
        id: "005",
        article: "Art. 11",
        title: "Technical Documentation",
    },
    Obligation {
        id: "006",
        article: "Art. 12",
        title: "Record-Keeping / Logging",
    },
    Obligation {
        id: "007",
        article: "Art. 13",
        title: "Transparency & Information",
    },
    Obligation {
        id: "008",
        article: "Art. 14",
        title: "Human Oversight",
    },
    Obligation {
        id: "009",
        article: "Art. 15",
        title: "Accuracy, Robustness, Cybersecurity",
    },
    Obligation {
        id: "010",
        article: "Art. 50",
        title: "Transparency for All AI",
    },
    Obligation {
        id: "011",
        article: "Art. 52",
        title: "AI Interaction Disclosure",
    },
    Obligation {
        id: "012",
        article: "Art. 53",
        title: "GPAI Model Obligations",
    },
    Obligation {
        id: "013",
        article: "Art. 55",
        title: "Systemic Risk GPAI",
    },
    Obligation {
        id: "014",
        article: "Art. 26",
        title: "Deployer Obligations",
    },
    Obligation {
        id: "015",
        article: "Art. 27",
        title: "Fundamental Rights Impact Assessment",
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
}
