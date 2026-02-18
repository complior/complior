import type { GateResult, Finding, ScanResult } from '../../types/common.types.js';
import type { ScanContext } from '../../ports/scanner.port.js';
import type { Scanner } from '../scanner/create-scanner.js';

export interface ComplianceGateDeps {
  readonly scanner: Scanner;
  readonly collectFiles: (projectPath: string) => Promise<ScanContext>;
  readonly getLastScanResult: () => ScanResult | null;
  readonly setLastScanResult: (result: ScanResult) => void;
}

export const createComplianceGate = (deps: ComplianceGateDeps) => {
  const { scanner, collectFiles, getLastScanResult, setLastScanResult } = deps;

  const check = async (projectPath: string): Promise<GateResult> => {
    const lastScanResult = getLastScanResult();
    const beforeScore = lastScanResult?.score.totalScore ?? 0;

    const scanContext = await collectFiles(projectPath);
    const afterResult = scanner.scan(scanContext);

    const afterScore = afterResult.score.totalScore;
    const delta = afterScore - beforeScore;

    const beforeCheckIds = new Set(
      lastScanResult?.findings
        .filter((f) => f.type === 'fail')
        .map((f) => f.checkId) ?? [],
    );

    const newFindings: Finding[] = afterResult.findings
      .filter(
        (f): f is Finding & { readonly type: 'fail' } =>
          f.type === 'fail' && !beforeCheckIds.has(f.checkId),
      );

    const warnings: string[] = [];

    if (delta < 0) {
      warnings.push(
        `Compliance score decreased by ${Math.abs(delta).toFixed(1)} points`,
      );
    }

    for (const finding of newFindings) {
      if (finding.severity === 'critical') {
        warnings.push(`New critical finding: ${finding.message}`);
      }
    }

    setLastScanResult(afterResult);

    return {
      passed: delta >= 0,
      beforeScore,
      afterScore,
      delta,
      warnings,
      newFindings,
    };
  };

  return Object.freeze({ check });
};

export type ComplianceGate = ReturnType<typeof createComplianceGate>;
