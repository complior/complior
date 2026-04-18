/**
 * Shared enums — canonical definitions used by both complior CLI and PROJECT SaaS.
 *
 * These are the source of truth. Both repos MUST reference these values.
 * DO NOT duplicate enum arrays inline — import from here.
 */

// --- Risk & Classification ---

export const RISK_LEVELS = ['prohibited', 'high', 'gpai', 'limited', 'minimal'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const AUTONOMY_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const LIFECYCLE_STATUSES = ['draft', 'review', 'active', 'suspended', 'retired'] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const AGENT_TYPES = ['autonomous', 'assistive', 'hybrid'] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

// --- Severity & Quality ---

export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const DOC_QUALITIES = ['none', 'scaffold', 'draft', 'reviewed'] as const;
export type DocQuality = (typeof DOC_QUALITIES)[number];

// --- Sync Document Types ---

export const SYNC_DOC_TYPES = [
  'fria', 'monitoring_plan', 'usage_policy', 'employee_notification',
  'incident_report', 'risk_assessment', 'transparency_notice', 'qms_template',
] as const;
export type SyncDocType = (typeof SYNC_DOC_TYPES)[number];

// --- Domains ---

export const DOMAINS = [
  'biometrics', 'critical_infrastructure', 'education', 'employment',
  'essential_services', 'law_enforcement', 'migration', 'justice',
  'customer_service', 'marketing', 'coding', 'analytics', 'other',
] as const;
export type Domain = (typeof DOMAINS)[number];

// --- Permission & Constraint Enums ---

export const PII_HANDLING_MODES = ['block', 'redact', 'allow'] as const;
export type PiiHandlingMode = (typeof PII_HANDLING_MODES)[number];

export const ESCALATION_ACTIONS = ['require_approval', 'notify', 'block', 'log'] as const;
export type EscalationAction = (typeof ESCALATION_ACTIONS)[number];
