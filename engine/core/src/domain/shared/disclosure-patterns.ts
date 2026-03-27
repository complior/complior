/**
 * Core AI disclosure detection patterns shared across scanner checks.
 * Used by both source-code scanning (L1 ai-disclosure check) and
 * external page scanning (L5 runtime checks).
 */

/** Patterns detecting AI disclosure text in any context. */
export const CORE_DISCLOSURE_PATTERNS: readonly RegExp[] = [
  /\bAI[- ]?powered\b/i,
  /\bartificial intelligence\b/i,
  /\bAI[- ]?generated\b/i,
  /\bpowered by AI\b/i,
  /\bmachine learning\b/i,
  /\bAI[- ]?assistant\b/i,
  /\bAI system\b/i,
];
