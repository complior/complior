import type { EngineStatus, ScanResult } from '../types/common.types.js';

export interface StatusServiceDeps {
  readonly getVersion: () => string;
  readonly getStartedAt: () => number;
  readonly getLastScanResult: () => ScanResult | null;
}

export const createStatusService = (deps: StatusServiceDeps) => {
  const { getVersion, getStartedAt, getLastScanResult } = deps;

  const getStatus = (): EngineStatus => {
    const lastScan = getLastScanResult();

    return {
      ready: true,
      version: getVersion(),
      uptime: Date.now() - getStartedAt(),
      lastScan: lastScan
        ? {
            score: lastScan.score.totalScore,
            zone: lastScan.score.zone,
            findingsCount: lastScan.findings.length,
            criticalCount: lastScan.findings.filter(
              (f) => f.severity === 'critical',
            ).length,
            timestamp: lastScan.scannedAt,
          }
        : undefined,
    };
  };

  return Object.freeze({ getStatus });
};

export type StatusService = ReturnType<typeof createStatusService>;
