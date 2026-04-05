import type { ReadinessDashboard, ReadinessDimension, ReadinessZone } from './types.js';

export interface ReadinessInput {
  readonly scanScore: number | null;
  readonly documentScore: number | null;
  readonly passportScore: number | null;
  readonly evalScore: number | null;
  readonly evidenceScore: number | null;
}

const BASE_WEIGHTS = {
  scan: 0.35,
  documents: 0.25,
  passports: 0.20,
  eval: 0.15,
  evidence: 0.05,
} as const;

const ENFORCEMENT_DATE = new Date('2026-08-02T00:00:00Z');

const toZone = (score: number): ReadinessZone => {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  if (score >= 50) return 'orange';
  return 'red';
};

export const daysUntilEnforcement = (now: Date = new Date()): number => {
  const diff = ENFORCEMENT_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

export const calculateReadinessScore = (input: ReadinessInput, now?: Date): ReadinessDashboard => {
  const dimensions: [string, number | null, number][] = [
    ['scan', input.scanScore, BASE_WEIGHTS.scan],
    ['documents', input.documentScore, BASE_WEIGHTS.documents],
    ['passports', input.passportScore, BASE_WEIGHTS.passports],
    ['eval', input.evalScore, BASE_WEIGHTS.eval],
    ['evidence', input.evidenceScore, BASE_WEIGHTS.evidence],
  ];

  const available = dimensions.filter(([, v]) => v !== null);
  const totalWeight = available.reduce((sum, [, , w]) => sum + w, 0);

  let score = 0;
  if (totalWeight > 0) {
    for (const [, value, weight] of available) {
      score += (value ?? 0) * (weight / totalWeight);
    }
  }

  // Critical caps
  const caps: string[] = [];
  if (input.scanScore === 0) {
    score = Math.min(score, 29);
    caps.push('Scan score is 0 — no checks passed');
  }
  if (input.documentScore !== null && input.documentScore === 0) {
    score = Math.min(score, 49);
    caps.push('No documents reviewed');
  }
  if (input.passportScore !== null && input.passportScore === 0) {
    score = Math.min(score, 59);
    caps.push('No agent passports created');
  }
  if (input.evidenceScore !== null && input.evidenceScore === 0) {
    score = Math.min(score, 79);
    caps.push('Evidence chain missing or invalid');
  }

  const rounded = Math.round(score);

  const buildDim = (key: string): ReadinessDimension => {
    const entry = dimensions.find(([k]) => k === key)!;
    const isAvailable = entry[1] !== null;
    return {
      score: entry[1],
      weight: isAvailable && totalWeight > 0 ? entry[2] / totalWeight : 0,
      available: isAvailable,
    };
  };

  return {
    readinessScore: rounded,
    zone: toZone(rounded),
    dimensions: {
      scan: buildDim('scan'),
      documents: buildDim('documents'),
      passports: buildDim('passports'),
      eval: buildDim('eval'),
      evidence: buildDim('evidence'),
    },
    criticalCaps: caps,
    daysUntilEnforcement: daysUntilEnforcement(now),
  };
};
