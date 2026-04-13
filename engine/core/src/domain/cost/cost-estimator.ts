/**
 * US-S05-27: Compliance Cost Estimator
 *
 * Pure domain function that computes remediation costs, documentation costs,
 * potential fines, and ROI based on scan findings and passport state.
 *
 * EU AI Act reference: Art. 99 (fines up to EUR 35M or 7% of global turnover).
 */

import type { SeverityLevel, ComplianceDocType } from '../shared/compliance-constants.js';

export interface CostEstimateInput {
  readonly findings: readonly { severity: string; checkId: string; status: string }[];
  readonly passportCompleteness: number; // 0-100
  readonly friaCompleted: boolean;
  readonly evidenceValid: boolean;
  readonly hourlyRate: number; // default EUR 150
}

export interface CostEstimateResult {
  readonly remediationCost: number;
  readonly documentationCost: number;
  readonly totalCost: number;
  readonly potentialFine: number;
  readonly roi: number;
  readonly breakdown: readonly CostLineItem[];
  readonly currency: string;
}

export interface CostLineItem {
  readonly category: string;
  readonly item: string;
  readonly effortHours: number;
  readonly cost: number;
}

/** Estimated remediation hours per severity level. */
const SEVERITY_HOURS: Record<SeverityLevel, number> = {
  critical: 8,
  high: 4,
  medium: 2,
  low: 1,
};

/** Estimated documentation effort hours per compliance doc type. */
const DOC_HOURS: Record<ComplianceDocType, number> = {
  fria: 16,
  'technical-documentation': 8,
  'worker-notification': 4,
  'monitoring-policy': 4,
  'ai-literacy': 4,
  'declaration-of-conformity': 8,
  'incident-report': 2,
};

/** EU AI Act max fine: EUR 35M or 7% of global turnover (Art. 99) */
const MAX_FINE_EUR = 35_000_000;

export const computeCostEstimate = (input: CostEstimateInput): CostEstimateResult => {
  const { findings, passportCompleteness, friaCompleted, evidenceValid, hourlyRate } = input;
  const breakdown: CostLineItem[] = [];

  // 1. Remediation cost per finding (only failed checks)
  const failFindings = findings.filter(f => f.status === 'fail');
  for (const finding of failFindings) {
    const hours = SEVERITY_HOURS[finding.severity as SeverityLevel] ?? 2;
    breakdown.push({
      category: 'remediation',
      item: finding.checkId,
      effortHours: hours,
      cost: hours * hourlyRate,
    });
  }

  // 2. Documentation cost — FRIA (Art. 27)
  if (!friaCompleted) {
    breakdown.push({
      category: 'documentation',
      item: 'FRIA (Art. 27)',
      effortHours: DOC_HOURS['fria']!,
      cost: DOC_HOURS['fria']! * hourlyRate,
    });
  }

  // 3. Passport completion cost
  if (passportCompleteness < 100) {
    const missingPct = 100 - passportCompleteness;
    const hours = Math.ceil(missingPct / 10) * 2; // ~2h per 10% missing
    breakdown.push({
      category: 'documentation',
      item: 'Passport completion',
      effortHours: hours,
      cost: hours * hourlyRate,
    });
  }

  // 4. Evidence chain setup
  if (!evidenceValid) {
    breakdown.push({
      category: 'infrastructure',
      item: 'Evidence chain setup',
      effortHours: 4,
      cost: 4 * hourlyRate,
    });
  }

  const remediationCost = breakdown
    .filter(b => b.category === 'remediation')
    .reduce((sum, b) => sum + b.cost, 0);
  const documentationCost = breakdown
    .filter(b => b.category !== 'remediation')
    .reduce((sum, b) => sum + b.cost, 0);
  const totalCost = remediationCost + documentationCost;

  // Potential fine estimate based on severity distribution
  const criticalCount = failFindings.filter(f => f.severity === 'critical').length;
  const highCount = failFindings.filter(f => f.severity === 'high').length;
  const riskFactor = Math.min(1.0, (criticalCount * 0.3 + highCount * 0.1));
  const potentialFine = Math.round(MAX_FINE_EUR * riskFactor);

  // ROI as multiplier: how many times the compliance cost is recovered in avoided fines
  const roi = totalCost > 0 ? Math.round((potentialFine / totalCost) * 10) / 10 : 0;

  return Object.freeze({
    remediationCost,
    documentationCost,
    totalCost,
    potentialFine,
    roi,
    breakdown: Object.freeze(breakdown),
    currency: 'EUR',
  });
};
