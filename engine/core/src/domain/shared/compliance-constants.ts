/**
 * Shared compliance constants — canonical severity levels and document types.
 *
 * Used by cost-estimator, debt-calculator, and simulate-actions to ensure
 * consistent classification across all compliance calculations.
 */

/** Canonical severity levels for compliance findings. */
export const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

/** Canonical EU AI Act compliance document types. */
export const COMPLIANCE_DOC_TYPES = [
  'fria',
  'technical-documentation',
  'worker-notification',
  'monitoring-policy',
  'ai-literacy',
  'declaration-of-conformity',
  'incident-report',
] as const;
export type ComplianceDocType = (typeof COMPLIANCE_DOC_TYPES)[number];

/** Default LLM cost per 1K tokens (used when model-specific pricing is unavailable). */
export const DEFAULT_INPUT_COST_PER_1K = 0.003;
export const DEFAULT_OUTPUT_COST_PER_1K = 0.015;

/** Default hourly rate for compliance cost estimation (EUR). */
export const DEFAULT_HOURLY_RATE = 150;
