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

/** Standard letter-grade thresholds used across all frameworks. */
export const LETTER_GRADE_THRESHOLDS = [
  { minScore: 90, grade: 'A' },
  { minScore: 75, grade: 'B' },
  { minScore: 60, grade: 'C' },
  { minScore: 40, grade: 'D' },
  { minScore: 0, grade: 'F' },
] as const;

/** Resolve a numeric score (0–100) to a letter grade. */
export const resolveGrade = (score: number): string =>
  LETTER_GRADE_THRESHOLDS.find((t) => score >= t.minScore)?.grade ?? 'F';

/** EU AI Act full enforcement date (ISO string). */
export const EU_AI_ACT_DEADLINE_ISO = '2026-08-02';

/** EU AI Act full enforcement date as Date object. */
export const EU_AI_ACT_DEADLINE = new Date(`${EU_AI_ACT_DEADLINE_ISO}T00:00:00Z`);
