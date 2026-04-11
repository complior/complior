import type { ReadinessDashboard, ReadinessDimension, ReadinessZone } from './types.js';
import { EU_AI_ACT_DEADLINE } from '../shared/compliance-constants.js';
import reporterConfig from '../../../data/reporter-config.json' with { type: 'json' };

export interface ReadinessInput {
  readonly scanScore: number | null;
  readonly scanSecurityScore?: number | null;
  readonly scanLlmScore?: number | null;
  readonly documentScore: number | null;
  readonly passportScore: number | null;
  readonly evalScore: number | null;
  readonly evidenceScore: number | null;
  readonly hasArt5Violation?: boolean;
}

const ZONE_THRESHOLDS = reporterConfig.readiness.zoneThresholds;
const CRITICAL_CAPS = reporterConfig.readiness.criticalCaps;

const toZone = (score: number): ReadinessZone => {
  if (score >= ZONE_THRESHOLDS.green) return 'green';
  if (score >= ZONE_THRESHOLDS.yellow) return 'yellow';
  if (score >= ZONE_THRESHOLDS.orange) return 'orange';
  return 'red';
};

export const daysUntilEnforcement = (now: Date = new Date()): number => {
  const diff = EU_AI_ACT_DEADLINE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

/**
 * Simple average of all available dimension scores.
 * Each available dimension contributes equally (1/N weight).
 * Critical caps still apply as regulatory safety rails.
 */
export const calculateReadinessScore = (input: ReadinessInput, now?: Date): ReadinessDashboard => {
  const dimensions: [string, number | null][] = [
    ['scan', input.scanScore],
    ['scanSecurity', input.scanSecurityScore ?? null],
    ['scanLlm', input.scanLlmScore ?? null],
    ['docs', input.documentScore],
    ['passports', input.passportScore],
    ['eval', input.evalScore],
    ['evidence', input.evidenceScore],
  ];

  const available = dimensions.filter(([, v]) => v !== null);
  const count = available.length;

  // Simple average — each available score contributes equally
  let score = count > 0
    ? available.reduce((sum, [, v]) => sum + (v ?? 0), 0) / count
    : 0;

  // Critical caps (regulatory safety rails)
  const caps: string[] = [];
  if (input.scanScore === 0) {
    score = Math.min(score, CRITICAL_CAPS.scanZero);
    caps.push('Scan score is 0 — no checks passed');
  }
  if (input.documentScore !== null && input.documentScore === 0) {
    score = Math.min(score, CRITICAL_CAPS.noDocuments);
    caps.push('No documents reviewed');
  }
  if (input.passportScore !== null && input.passportScore === 0) {
    score = Math.min(score, CRITICAL_CAPS.noPassports);
    caps.push('No agent passports created');
  }
  if (input.evidenceScore !== null && input.evidenceScore === 0) {
    score = Math.min(score, CRITICAL_CAPS.noEvidence);
    caps.push('Evidence chain missing or invalid');
  }
  if (input.hasArt5Violation) {
    score = Math.min(score, CRITICAL_CAPS.art5Violation);
    caps.push('Art. 5 prohibited practice detected');
  }

  const rounded = Math.round(score);
  const equalWeight = count > 0 ? 1 / count : 0;

  const buildDim = (key: string): ReadinessDimension => {
    const entry = dimensions.find(([k]) => k === key)!;
    const isAvailable = entry[1] !== null;
    return {
      // Return 0 (not null) for unavailable dimensions so score is always a number (not 'object')
      score: isAvailable ? (entry[1] ?? 0) : 0,
      weight: isAvailable ? equalWeight : 0,
      available: isAvailable,
    };
  };

  return {
    readinessScore: rounded,
    zone: toZone(rounded),
    dimensions: {
      scan: buildDim('scan'),
      scanSecurity: buildDim('scanSecurity'),
      scanLlm: buildDim('scanLlm'),
      docs: buildDim('docs'),
      documents: buildDim('docs'), // alias for backward compat
      passports: buildDim('passports'),
      eval: buildDim('eval'),
      evidence: buildDim('evidence'),
    },
    trend: null,
    criticalCaps: caps,
    daysUntilEnforcement: daysUntilEnforcement(now),
  };
};
