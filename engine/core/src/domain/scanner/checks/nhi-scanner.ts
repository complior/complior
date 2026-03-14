import type { CheckResult, Severity } from '../../../types/common.types.js';
import type { ScanContext } from '../../../ports/scanner.port.js';
import { NHI_PATTERNS, shouldScanFile, type NhiCategory, type NhiPattern } from '../rules/nhi-patterns.js';

export interface NhiCheckResult {
  readonly patternId: string;
  readonly patternName: string;
  readonly category: NhiCategory;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly file: string;
  readonly line: number;
  readonly match: string;
  readonly description: string;
}

const scanLine = (line: string, lineNum: number, file: string, pattern: NhiPattern): NhiCheckResult | null => {
  const match = pattern.pattern.exec(line);
  if (!match) return null;
  // Mask the matched value for security (show first 4 + last 4 chars)
  const val = match[0];
  const masked = val.length > 12
    ? `${val.slice(0, 4)}...${val.slice(-4)}`
    : '***';
  return {
    patternId: pattern.id,
    patternName: pattern.name,
    category: pattern.category,
    severity: pattern.severity,
    file,
    line: lineNum,
    match: masked,
    description: pattern.description,
  };
};

export const runNhiScan = (ctx: ScanContext): readonly NhiCheckResult[] => {
  const results: NhiCheckResult[] = [];

  for (const file of ctx.files) {
    if (!shouldScanFile(file.relativePath)) continue;

    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of NHI_PATTERNS) {
        const result = scanLine(line, i + 1, file.relativePath, pattern);
        if (result) results.push(result);
      }
    }
  }

  return results;
};

const toSeverity = (s: string): Severity =>
  (s === 'critical' || s === 'high' || s === 'medium') ? s : 'high';

export const nhiToCheckResults = (results: readonly NhiCheckResult[]): readonly CheckResult[] => {
  if (results.length === 0) {
    return [{
      type: 'pass',
      checkId: 'l4-nhi-clean',
      message: 'No non-human identity secrets detected in source code',
    }];
  }

  return results.map((r): CheckResult => ({
    type: 'fail',
    checkId: `l4-nhi-${r.category}`,
    message: `${r.description}: ${r.match} in ${r.file}:${r.line}`,
    severity: toSeverity(r.severity),
    obligationId: 'eu-ai-act-OBL-015',
    articleReference: 'Art. 15(4)',
    fix: 'Remove or externalize the secret from source code. Use environment variables or a secrets manager.',
    file: r.file,
    line: r.line,
  }));
};
