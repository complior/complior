/** Shared severity levels and weights for pattern-based detection (bias, safety). */

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  LOW: 0.1,
  MEDIUM: 0.3,
  HIGH: 0.6,
  CRITICAL: 1.0,
};
