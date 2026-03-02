/// A single field in the Agent Passport.
#[derive(Debug, Clone)]
pub struct PassportField {
    pub name: &'static str,
    pub category: &'static str,
    pub value: String,
    pub description: &'static str,
    pub example: &'static str,
    pub article: &'static str,
}

/// Default passport fields across 5 categories per EU AI Act requirements.
pub(super) fn default_passport_fields() -> Vec<PassportField> {
    vec![
        // ── Identity ──
        PassportField {
            name: "name",
            category: "Identity",
            value: String::new(),
            description: "Name of the AI system",
            example: "acme-support-bot",
            article: "Art. 49",
        },
        PassportField {
            name: "version",
            category: "Identity",
            value: String::new(),
            description: "Version of the AI system",
            example: "2.1.0",
            article: "Art. 49",
        },
        PassportField {
            name: "description",
            category: "Identity",
            value: String::new(),
            description: "A brief description of what this AI system does, who uses it, and what decisions it makes or supports.",
            example: "AI-powered customer support chatbot that handles tier-1 support queries. Uses GPT-4 via API.",
            article: "Art. 13",
        },
        PassportField {
            name: "provider",
            category: "Identity",
            value: String::new(),
            description: "Legal entity that provides the AI system",
            example: "Acme Corp",
            article: "Art. 16",
        },
        PassportField {
            name: "deployer",
            category: "Identity",
            value: String::new(),
            description: "Legal entity deploying the AI system",
            example: "Acme Corp",
            article: "Art. 26",
        },
        PassportField {
            name: "country",
            category: "Identity",
            value: String::new(),
            description: "Country where the system is deployed",
            example: "DE",
            article: "Art. 49",
        },
        // ── Risk & Autonomy ──
        PassportField {
            name: "riskClass",
            category: "Risk & Autonomy",
            value: String::new(),
            description: "Risk classification per EU AI Act: minimal, limited, high, unacceptable",
            example: "high",
            article: "Art. 6",
        },
        PassportField {
            name: "autonomy",
            category: "Risk & Autonomy",
            value: String::new(),
            description: "Autonomy level: L1 (tool), L2 (assistant), L3 (supervised), L4 (autonomous), L5 (self-directed)",
            example: "L3",
            article: "Art. 14",
        },
        PassportField {
            name: "constraints",
            category: "Risk & Autonomy",
            value: String::new(),
            description: "Operational constraints and guardrails defined for the system",
            example: "max_tokens: 4096, no PII storage, escalate complaints",
            article: "Art. 9",
        },
        // ── Human Oversight ──
        PassportField {
            name: "assignedPerson",
            category: "Human Oversight",
            value: String::new(),
            description: "Name of the person responsible for human oversight",
            example: "Sarah Chen, Head of AI",
            article: "Art. 14(4)",
        },
        PassportField {
            name: "role",
            category: "Human Oversight",
            value: String::new(),
            description: "Role/title of the oversight person",
            example: "AI Compliance Officer",
            article: "Art. 14(4)",
        },
        PassportField {
            name: "overrideProcedure",
            category: "Human Oversight",
            value: String::new(),
            description: "Documented procedure for human override or system shutdown",
            example: "Emergency stop via /kill-switch command, notifies ops team",
            article: "Art. 14(4)(e)",
        },
        // ── Data & Permissions ──
        PassportField {
            name: "dataAccess",
            category: "Data & Permissions",
            value: String::new(),
            description: "Data sources the AI system can access",
            example: "customer_db (read), ticket_system (read/write), knowledge_base (read)",
            article: "Art. 10",
        },
        PassportField {
            name: "permissions",
            category: "Data & Permissions",
            value: String::new(),
            description: "Actions the AI system can perform",
            example: "reply_to_ticket, escalate_to_human, read_kb, update_status",
            article: "Art. 9",
        },
        PassportField {
            name: "dataRetention",
            category: "Data & Permissions",
            value: String::new(),
            description: "How long interaction data is retained",
            example: "180 days, anonymized after 30 days",
            article: "Art. 12",
        },
        // ── Compliance ──
        PassportField {
            name: "workerNotification",
            category: "Compliance",
            value: String::new(),
            description: "Status of worker notification about AI system usage",
            example: "sent 2026-01-15, signed by works council",
            article: "Art. 26(7)",
        },
        PassportField {
            name: "aiLiteracy",
            category: "Compliance",
            value: String::new(),
            description: "Status of AI literacy training for affected staff",
            example: "completed 2026-01-20, 15 employees trained",
            article: "Art. 4",
        },
        PassportField {
            name: "impactAssessment",
            category: "Compliance",
            value: String::new(),
            description: "Status of fundamental rights impact assessment",
            example: "FRIA completed 2026-02-01, no high-risk impacts",
            article: "Art. 27",
        },
    ]
}
