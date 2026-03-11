/**
 * US-S05-22: Compliance Debt Calculator
 *
 * Pure domain function that computes a compliance debt score from findings,
 * passport completeness, and evidence/scan freshness.
 */

import type { SeverityLevel } from '../shared/compliance-constants.js';

export interface DebtInput {
  readonly findings: readonly { severity: string; status: string; checkId: string; createdAt?: string }[];
  readonly passportCompleteness: number; // 0-100
  readonly evidenceFreshness: number; // days since last evidence entry
  readonly daysSinceLastScan: number;
}

export interface DebtResult {
  readonly totalDebt: number;
  readonly findingsDebt: number;
  readonly documentationDebt: number;
  readonly freshnessDebt: number;
  readonly level: 'low' | 'medium' | 'high' | 'critical';
  readonly breakdown: readonly DebtItem[];
}

export interface DebtItem {
  readonly category: string;
  readonly description: string;
  readonly points: number;
}

/** Debt weight per finding severity — higher = more debt accumulated per day. */
const SEVERITY_WEIGHT: Record<SeverityLevel, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

export const computeDebt = (input: DebtInput): DebtResult => {
  const { findings, passportCompleteness, evidenceFreshness, daysSinceLastScan } = input;
  const breakdown: DebtItem[] = [];

  // 1. Findings debt: severity x age factor
  let findingsDebt = 0;
  const failFindings = findings.filter(f => f.status === 'fail');
  for (const f of failFindings) {
    const weight = SEVERITY_WEIGHT[f.severity] ?? 2;
    // Age factor: findings get worse over time (min 1x, max 3x at 90+ days)
    const age = f.createdAt
      ? Math.max(0, (Date.now() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 30; // default 30 days if no timestamp
    const ageFactor = Math.min(3.0, 1.0 + age / 90);
    const points = Math.round(weight * ageFactor * 10) / 10;
    findingsDebt += points;
    breakdown.push({
      category: 'findings',
      description: `${f.checkId} (${f.severity})`,
      points,
    });
  }

  // 2. Documentation debt: missing passport fields
  let documentationDebt = 0;
  if (passportCompleteness < 100) {
    const missingPenalty = Math.round((100 - passportCompleteness) * 0.5);
    documentationDebt += missingPenalty;
    breakdown.push({
      category: 'documentation',
      description: `Passport ${passportCompleteness}% complete`,
      points: missingPenalty,
    });
  }

  // 3. Freshness debt: stale evidence + stale scan
  let freshnessDebt = 0;
  if (evidenceFreshness > 7) {
    const staleEvPoints = Math.min(20, Math.round((evidenceFreshness - 7) * 0.5));
    freshnessDebt += staleEvPoints;
    breakdown.push({
      category: 'freshness',
      description: `Evidence ${evidenceFreshness}d old`,
      points: staleEvPoints,
    });
  }
  if (daysSinceLastScan > 1) {
    const staleScanPoints = Math.min(15, Math.round((daysSinceLastScan - 1) * 1.0));
    freshnessDebt += staleScanPoints;
    breakdown.push({
      category: 'freshness',
      description: `Last scan ${daysSinceLastScan}d ago`,
      points: staleScanPoints,
    });
  }

  const totalDebt = Math.round((findingsDebt + documentationDebt + freshnessDebt) * 10) / 10;

  const level = totalDebt >= 100 ? 'critical' as const
    : totalDebt >= 50 ? 'high' as const
    : totalDebt >= 20 ? 'medium' as const
    : 'low' as const;

  return Object.freeze({
    totalDebt,
    findingsDebt: Math.round(findingsDebt * 10) / 10,
    documentationDebt,
    freshnessDebt,
    level,
    breakdown: Object.freeze(breakdown),
  });
};
