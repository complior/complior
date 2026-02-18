import type { GateResult, Finding } from '../types/common.types.js';
import type { EngineContext } from '../context.js';
import { collectFiles } from '../core/scanner/file-collector.js';
import { createScanner } from '../core/scanner/index.js';

export const createComplianceGate = (ctx: EngineContext) => ({
  async check(projectPath: string): Promise<GateResult> {
    const beforeScore = ctx.lastScanResult?.score.totalScore ?? 0;

    const scanContext = await collectFiles(projectPath);
    const scanner = createScanner(ctx.regulationData.scoring.scoring);
    const afterResult = scanner.scan(scanContext);

    const afterScore = afterResult.score.totalScore;
    const delta = afterScore - beforeScore;

    const beforeCheckIds = new Set(
      ctx.lastScanResult?.findings
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

    ctx.lastScanResult = afterResult;

    return {
      passed: delta >= 0,
      beforeScore,
      afterScore,
      delta,
      warnings,
      newFindings,
    };
  },
});
