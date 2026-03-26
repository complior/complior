import type { AgentPassport } from '../../types/passport.types.js';

// --- Types ---

export interface ObligationFieldMapping {
  readonly field: string;
  readonly obligation: string;
  readonly article: string;
  readonly description: string;
  readonly required: boolean;
}

export interface MissingField {
  readonly field: string;
  readonly obligation: string;
  readonly article: string;
  readonly description: string;
}

// --- Obligation → field mappings ---

export const OBLIGATION_FIELD_MAP: readonly ObligationFieldMapping[] = [
  // Identity (Art.49 — Registration)
  { field: 'agent_id', obligation: 'OBL-049', article: 'Art.49(1)', description: 'Unique AI system identifier for EU database', required: true },
  { field: 'name', obligation: 'OBL-049', article: 'Art.49(1)', description: 'AI system name for registration', required: true },
  { field: 'display_name', obligation: 'OBL-049', article: 'Art.49(2)', description: 'Public-facing name of AI system', required: true },
  { field: 'description', obligation: 'OBL-049', article: 'Art.49(3)', description: 'Description of AI system purpose', required: true },
  { field: 'version', obligation: 'OBL-049', article: 'Art.49(1)', description: 'Version tracking for AI system', required: true },

  // Ownership (Art.26(6) — Deployer responsible person)
  { field: 'owner.team', obligation: 'OBL-012', article: 'Art.26(6)', description: 'Team responsible for AI system', required: true },
  { field: 'owner.contact', obligation: 'OBL-012', article: 'Art.26(6)', description: 'Contact for AI system inquiries', required: true },
  { field: 'owner.responsible_person', obligation: 'OBL-012', article: 'Art.26(6)', description: 'Designated responsible natural person', required: true },

  // Autonomy (Art.14 — Human oversight)
  { field: 'type', obligation: 'OBL-014', article: 'Art.14(1)', description: 'Agent type classification for oversight', required: true },
  { field: 'autonomy_level', obligation: 'OBL-014', article: 'Art.14(1)', description: 'Autonomy level (L1-L5) for oversight requirements', required: true },
  { field: 'autonomy_evidence.human_approval_gates', obligation: 'OBL-014', article: 'Art.14(4)', description: 'Number of human approval checkpoints', required: true },
  { field: 'autonomy_evidence.unsupervised_actions', obligation: 'OBL-014', article: 'Art.14(4)', description: 'Number of unsupervised actions', required: true },

  // Tech stack (Art.13 — Transparency)
  { field: 'framework', obligation: 'OBL-013', article: 'Art.13(3)', description: 'AI framework used (for technical transparency)', required: false },
  { field: 'model.provider', obligation: 'OBL-013', article: 'Art.13(3)', description: 'Model provider for transparency', required: true },
  { field: 'model.model_id', obligation: 'OBL-013', article: 'Art.13(3)', description: 'Model identifier for traceability', required: true },
  { field: 'model.data_residency', obligation: 'OBL-013', article: 'Art.13(3)', description: 'Data residency for GDPR alignment', required: false },

  // Permissions (Art.26(4) — Deployer monitoring)
  { field: 'permissions.tools', obligation: 'OBL-026', article: 'Art.26(4)', description: 'Tools accessible by AI agent', required: true },
  { field: 'permissions.denied', obligation: 'OBL-026', article: 'Art.26(4)', description: 'Explicitly denied actions', required: false },

  // Constraints (Art.9 — Risk management)
  { field: 'constraints.rate_limits.max_actions_per_minute', obligation: 'OBL-009', article: 'Art.9(2)', description: 'Rate limits for risk mitigation', required: false },
  { field: 'constraints.human_approval_required', obligation: 'OBL-014', article: 'Art.14(4)', description: 'Actions requiring human approval', required: true },
  { field: 'constraints.prohibited_actions', obligation: 'OBL-005', article: 'Art.5', description: 'Prohibited AI practices', required: true },
  { field: 'constraints.escalation_rules', obligation: 'OBL-014', article: 'Art.14(4)', description: 'Structured escalation rules for human oversight', required: false },
  { field: 'permissions.data_boundaries', obligation: 'OBL-009', article: 'Art.9(2)', description: 'Data handling boundaries including PII and geographic restrictions', required: false },

  // Compliance (Art.9 — Risk management system)
  { field: 'compliance.eu_ai_act.risk_class', obligation: 'OBL-009', article: 'Art.9(1)', description: 'AI Act risk classification', required: true },
  { field: 'compliance.complior_score', obligation: 'OBL-009', article: 'Art.9(4)', description: 'Overall compliance score', required: true },
  { field: 'compliance.last_scan', obligation: 'OBL-009', article: 'Art.9(9)', description: 'Date of last compliance scan', required: true },

  // Per-agent document status
  { field: 'compliance.technical_documentation.documented', obligation: 'OBL-005', article: 'Art.11', description: 'Technical documentation exists for this AI system', required: false },
  { field: 'compliance.declaration_of_conformity.documented', obligation: 'OBL-019', article: 'Art.47', description: 'Declaration of conformity issued', required: false },
  { field: 'compliance.art5_screening.completed', obligation: 'OBL-002', article: 'Art.5', description: 'Art.5 prohibited practices screening completed', required: false },
  { field: 'compliance.instructions_for_use.documented', obligation: 'OBL-007', article: 'Art.13', description: 'Instructions for use documented', required: false },

  // Disclosure (Art.50 — Transparency for users)
  { field: 'disclosure.user_facing', obligation: 'OBL-050', article: 'Art.50(1)', description: 'Whether AI system interacts with users', required: true },
  { field: 'disclosure.disclosure_text', obligation: 'OBL-050', article: 'Art.50(1)', description: 'Disclosure text shown to users', required: true },
  { field: 'disclosure.ai_marking.responses_marked', obligation: 'OBL-050', article: 'Art.50(2)', description: 'Whether AI-generated content is marked', required: true },

  // Logging (Art.12 — Record-keeping)
  { field: 'logging.actions_logged', obligation: 'OBL-012L', article: 'Art.12(1)', description: 'Whether agent actions are logged', required: true },
  { field: 'logging.retention_days', obligation: 'OBL-012L', article: 'Art.12(3)', description: 'Log retention period in days', required: true },
  { field: 'logging.includes_decision_rationale', obligation: 'OBL-012L', article: 'Art.12(2)', description: 'Whether decision rationale is logged', required: false },

  // Lifecycle (Art.26(5) — Deployer monitoring)
  { field: 'lifecycle.status', obligation: 'OBL-026L', article: 'Art.26(5)', description: 'Current lifecycle status', required: true },
  { field: 'lifecycle.next_review', obligation: 'OBL-026L', article: 'Art.26(5)', description: 'Next scheduled review date', required: true },
  { field: 'lifecycle.review_frequency_days', obligation: 'OBL-026L', article: 'Art.26(5)', description: 'Review frequency in days', required: false },
] as const;

// --- Field accessor ---

export const getFieldValue = (manifest: AgentPassport, fieldPath: string): unknown => {
  const parts = fieldPath.split('.');
  let current: unknown = manifest;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

// --- Helpers ---

export const isNonEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
};

export const getRequiredFields = (): readonly ObligationFieldMapping[] =>
  OBLIGATION_FIELD_MAP.filter((m) => m.required);

export const getMissingFields = (manifest: AgentPassport): readonly MissingField[] =>
  OBLIGATION_FIELD_MAP
    .filter((m) => m.required && !isNonEmpty(getFieldValue(manifest, m.field)))
    .map(({ field, obligation, article, description }) => ({
      field,
      obligation,
      article,
      description,
    }));
