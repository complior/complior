/**
 * US-S05-27: Cost Estimation Service
 *
 * Orchestrates cost estimation by gathering scan results, passport completeness,
 * and evidence chain state, then delegates to the pure domain function.
 */

import type { ScanResult } from '../types/common.types.js';
import type { CostEstimateResult } from '../domain/cost/cost-estimator.js';
import { computeCostEstimate } from '../domain/cost/cost-estimator.js';
import { DEFAULT_HOURLY_RATE } from '../domain/shared/compliance-constants.js';

export interface CostServiceDeps {
  readonly getLastScanResult: () => ScanResult | null;
  readonly getPassportCompleteness: (
    name?: string,
  ) => Promise<{ score: number; friaCompleted: boolean }>;
  readonly getEvidenceValid: () => Promise<boolean>;
}

export interface CostService {
  readonly estimate: (
    hourlyRate?: number,
    agentName?: string,
  ) => Promise<CostEstimateResult>;
}

export const createCostService = (deps: CostServiceDeps): CostService => {
  const estimate = async (
    hourlyRate = DEFAULT_HOURLY_RATE,
    agentName?: string,
  ): Promise<CostEstimateResult> => {
    const scan = deps.getLastScanResult();
    const findings = scan?.findings ?? [];
    const completeness = await deps.getPassportCompleteness(agentName);
    const evidenceValid = await deps.getEvidenceValid();

    return computeCostEstimate({
      findings: findings.map((f) => ({
        severity: f.severity,
        checkId: f.checkId,
        status: f.type ?? 'fail',
      })),
      passportCompleteness: completeness.score,
      friaCompleted: completeness.friaCompleted,
      evidenceValid,
      hourlyRate,
    });
  };

  return Object.freeze({ estimate });
};
