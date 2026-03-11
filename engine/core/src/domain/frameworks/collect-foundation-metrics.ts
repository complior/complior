import type { ScanResult } from '../../types/common.types.js';
import type { AgentPassport } from '../../types/passport.types.js';
import type { EvidenceChainSummary } from '../scanner/evidence-store.js';
import type { FoundationMetrics } from '../../types/framework.types.js';

export interface FoundationMetricsDeps {
  readonly getLastScanResult: () => ScanResult | null;
  readonly getPassport: () => Promise<AgentPassport | null>;
  readonly getPassportCompleteness: () => Promise<number>;
  readonly getEvidenceSummary: () => Promise<EvidenceChainSummary>;
  readonly getDocuments: () => Promise<ReadonlySet<string>>;
}

export const collectFoundationMetrics = async (
  deps: FoundationMetricsDeps,
): Promise<FoundationMetrics> => {
  const [passport, passportCompleteness, evidenceSummary, documents] =
    await Promise.all([
      deps.getPassport(),
      deps.getPassportCompleteness(),
      deps.getEvidenceSummary(),
      deps.getDocuments(),
    ]);

  return Object.freeze({
    scanResult: deps.getLastScanResult(),
    passport,
    passportCompleteness,
    evidenceChainValid: evidenceSummary.chainValid,
    evidenceEntryCount: evidenceSummary.totalEntries,
    evidenceScanCount: evidenceSummary.scanCount,
    documents,
  });
};
