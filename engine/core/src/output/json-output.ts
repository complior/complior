import type { ScanResult } from '../types/common.types.js';

export interface JsonOutput {
  readonly scanner: string;
  readonly version: string;
  readonly score: number;
  readonly zone: string;
  readonly totalChecks: number;
  readonly passedChecks: number;
  readonly failedChecks: number;
  readonly criticalCapApplied: boolean;
  readonly findings: readonly {
    readonly checkId: string;
    readonly type: string;
    readonly severity: string;
    readonly message: string;
    readonly obligationId?: string;
    readonly articleReference?: string;
    readonly file?: string;
    readonly line?: number;
    readonly fix?: string;
  }[];
  readonly categories: readonly {
    readonly category: string;
    readonly weight: number;
    readonly score: number;
    readonly passed: number;
    readonly total: number;
  }[];
  readonly scannedAt: string;
  readonly projectPath: string;
  readonly filesScanned: number;
  readonly duration: number;
}

export const toJsonOutput = (result: ScanResult, version: string): JsonOutput => ({
  scanner: 'complior',
  version,
  score: result.score.totalScore,
  zone: result.score.zone,
  totalChecks: result.score.totalChecks,
  passedChecks: result.score.passedChecks,
  failedChecks: result.score.failedChecks,
  criticalCapApplied: result.score.criticalCapApplied,
  findings: result.findings.map((f) => ({
    checkId: f.checkId,
    type: f.type,
    severity: f.severity,
    message: f.message,
    obligationId: f.obligationId,
    articleReference: f.articleReference,
    file: f.file,
    line: f.line,
    fix: f.fix,
  })),
  categories: result.score.categoryScores.map((c) => ({
    category: c.category,
    weight: c.weight,
    score: c.score,
    passed: c.passedCount,
    total: c.obligationCount,
  })),
  scannedAt: result.scannedAt,
  projectPath: result.projectPath,
  filesScanned: result.filesScanned,
  duration: result.duration,
});
