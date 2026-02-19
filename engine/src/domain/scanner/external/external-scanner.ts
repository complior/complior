import type { ExternalCheck, ExternalCheckStatus, ExternalScanResult, PageData } from './types.js';
import { ALL_L1_CHECKS } from './checks.js';

const STATUS_WEIGHTS: Record<ExternalCheckStatus, number> = {
  PASS: 1.0,
  PARTIAL: 0.5,
  FAIL: 0.0,
  N_A: -1, // excluded from scoring
};

export const calculateExternalScore = (checks: readonly ExternalCheck[]): number => {
  const scorable = checks.filter((c) => c.status !== 'N_A');
  if (scorable.length === 0) return 100;

  const total = scorable.reduce((sum, c) => sum + STATUS_WEIGHTS[c.status], 0);
  return Math.round((total / scorable.length) * 100);
};

export const runL1Checks = (page: PageData): readonly ExternalCheck[] => {
  return ALL_L1_CHECKS.map((check) => check(page));
};

export const buildExternalScanResult = (
  url: string,
  checks: readonly ExternalCheck[],
  screenshots: readonly string[],
  duration: number,
): ExternalScanResult => ({
  url,
  scanLevel: 'L1',
  score: calculateExternalScore(checks),
  checks,
  screenshots,
  duration,
  timestamp: new Date().toISOString(),
});
