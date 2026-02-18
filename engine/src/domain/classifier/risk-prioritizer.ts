import type { Finding, Severity } from '../../types/common.types.js';

// --- Severity scoring (PURE — no I/O) ---

const SEVERITY_WEIGHTS: Readonly<Record<Severity, number>> = {
  critical: 10,
  high: 5,
  medium: 3,
  low: 1,
  info: 0,
};

export const scoreFinding = (finding: Finding): number => {
  const weight = SEVERITY_WEIGHTS[finding.severity];
  return weight * 100;
};

export const prioritizeFindings = (findings: readonly Finding[]): readonly Finding[] =>
  [...findings]
    .map((f) => ({ ...f, priority: scoreFinding(f) }))
    .sort((a, b) => b.priority - a.priority);
