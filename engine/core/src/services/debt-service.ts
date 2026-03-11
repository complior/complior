/**
 * US-S05-22: Compliance Debt Service
 *
 * Application service that gathers inputs from scan results, passport, and
 * evidence store, then delegates to the pure domain computeDebt function.
 */

import type { ScanResult } from '../types/common.types.js';
import type { DebtResult } from '../domain/scanner/debt-calculator.js';
import { computeDebt } from '../domain/scanner/debt-calculator.js';

export interface DebtServiceDeps {
  readonly getLastScanResult: () => ScanResult | null;
  readonly getPassportCompleteness: () => Promise<number>;
  readonly getEvidenceFreshness: () => Promise<number>;
}

/** Extended result with optional trend data (previous debt score). */
export interface DebtResultWithTrend extends DebtResult {
  readonly previousDebt?: number;
}

export interface DebtService {
  readonly getDebt: (includeTrend?: boolean) => Promise<DebtResultWithTrend>;
}

export const createDebtService = (deps: DebtServiceDeps): DebtService => {
  /** In-memory previous debt score for trend comparison. */
  let previousDebt: number | undefined;

  const getDebt = async (includeTrend = false): Promise<DebtResultWithTrend> => {
    const scan = deps.getLastScanResult();
    const findings = scan?.findings ?? [];
    const passportCompleteness = await deps.getPassportCompleteness();
    const evidenceFreshness = await deps.getEvidenceFreshness();

    // Calculate days since last scan
    const daysSinceLastScan = scan?.timestamp
      ? Math.max(0, (Date.now() - new Date(scan.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const result = computeDebt({
      findings: findings.map((f) => ({
        severity: f.severity,
        status: f.type ?? 'fail',
        checkId: f.checkId,
        createdAt: undefined,
      })),
      passportCompleteness,
      evidenceFreshness,
      daysSinceLastScan: Math.round(daysSinceLastScan),
    });

    const withTrend: DebtResultWithTrend = includeTrend && previousDebt !== undefined
      ? { ...result, previousDebt }
      : result;

    // Store current for next trend comparison
    previousDebt = result.totalDebt;

    return withTrend;
  };

  return Object.freeze({ getDebt });
};
