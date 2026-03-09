/**
 * US-S05-34: Compliance Diff — compare two scan results to find delta.
 * Pure function, no I/O.
 */

import type { ScanResult, Finding, Severity } from '../../types/common.types.js';

export interface DiffFinding {
  readonly checkId: string;
  readonly message: string;
  readonly severity: Severity;
  readonly file?: string;
  readonly status: 'new' | 'resolved';
}

export interface ComplianceDiff {
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  readonly scoreDelta: number;
  readonly newFindings: readonly DiffFinding[];
  readonly resolvedFindings: readonly DiffFinding[];
  readonly unchangedCount: number;
  readonly hasRegression: boolean;
  readonly hasCriticalNew: boolean;
}

const findingKey = (f: Finding): string =>
  `${f.checkId}::${f.file ?? ''}::${f.message}`;

export const computeComplianceDiff = (
  before: ScanResult | null,
  after: ScanResult,
  changedFiles?: readonly string[],
): ComplianceDiff => {
  const scoreBefore = Math.round(before?.score.totalScore ?? 0);
  const scoreAfter = Math.round(after.score.totalScore);
  const scoreDelta = scoreAfter - scoreBefore;

  const beforeFails = (before?.findings ?? []).filter((f) => f.type === 'fail');
  const afterFails = after.findings.filter((f) => f.type === 'fail');

  // Filter to changed files if provided
  const filterToChanged = (findings: readonly Finding[]): readonly Finding[] => {
    if (!changedFiles || changedFiles.length === 0) return findings;
    return findings.filter((f) => !f.file || changedFiles.some((cf) => f.file?.includes(cf)));
  };

  const filteredAfter = filterToChanged(afterFails);
  const filteredBefore = filterToChanged(beforeFails);

  const beforeKeys = new Set(filteredBefore.map(findingKey));
  const afterKeys = new Set(filteredAfter.map(findingKey));

  const newFindings: DiffFinding[] = filteredAfter
    .filter((f) => !beforeKeys.has(findingKey(f)))
    .map((f) => ({
      checkId: f.checkId,
      message: f.message,
      severity: f.severity,
      file: f.file,
      status: 'new',
    }));

  const resolvedFindings: DiffFinding[] = filteredBefore
    .filter((f) => !afterKeys.has(findingKey(f)))
    .map((f) => ({
      checkId: f.checkId,
      message: f.message,
      severity: f.severity,
      file: f.file,
      status: 'resolved',
    }));

  const unchangedCount = filteredAfter.filter((f) => beforeKeys.has(findingKey(f))).length;

  const hasCriticalNew = newFindings.some((f) => f.severity === 'critical');
  const hasRegression = scoreDelta < 0 || hasCriticalNew;

  return Object.freeze({
    scoreBefore,
    scoreAfter,
    scoreDelta,
    newFindings,
    resolvedFindings,
    unchangedCount,
    hasRegression,
    hasCriticalNew,
  });
};

export const formatDiffMarkdown = (diff: ComplianceDiff): string => {
  const lines: string[] = [];

  const icon = diff.scoreDelta > 0 ? '+' : diff.scoreDelta < 0 ? '-' : '=';
  lines.push(`## Compliance Diff`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Score Before | ${diff.scoreBefore}% |`);
  lines.push(`| Score After | ${diff.scoreAfter}% |`);
  lines.push(`| Delta | ${icon}${Math.abs(diff.scoreDelta)}% |`);
  lines.push(`| New Findings | ${diff.newFindings.length} |`);
  lines.push(`| Resolved | ${diff.resolvedFindings.length} |`);
  lines.push(`| Unchanged | ${diff.unchangedCount} |`);
  lines.push('');

  if (diff.newFindings.length > 0) {
    lines.push('### New Findings');
    lines.push('');
    lines.push('| Severity | Check | File | Message |');
    lines.push('|----------|-------|------|---------|');
    for (const f of diff.newFindings) {
      lines.push(`| ${f.severity} | ${f.checkId} | ${f.file ?? '-'} | ${f.message} |`);
    }
    lines.push('');
  }

  if (diff.resolvedFindings.length > 0) {
    lines.push('### Resolved Findings');
    lines.push('');
    lines.push('| Severity | Check | File | Message |');
    lines.push('|----------|-------|------|---------|');
    for (const f of diff.resolvedFindings) {
      lines.push(`| ${f.severity} | ${f.checkId} | ${f.file ?? '-'} | ${f.message} |`);
    }
    lines.push('');
  }

  if (diff.hasRegression) {
    lines.push('> **Warning:** Compliance regression detected.');
    if (diff.hasCriticalNew) {
      lines.push('> New CRITICAL findings introduced.');
    }
    lines.push('');
  }

  return lines.join('\n');
};
