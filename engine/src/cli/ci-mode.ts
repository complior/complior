import { writeFile } from 'node:fs/promises';
import type { ScanResult, Severity } from '../types/common.types.js';
import { toSarif } from '../output/sarif.js';
import { toJsonOutput } from '../output/json-output.js';

export interface CliOptions {
  readonly ci: boolean;
  readonly failOn: Severity;
  readonly sarif?: string;
  readonly json: boolean;
  readonly threshold: number;
  readonly auto: boolean;
  readonly path: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export const parseCliArgs = (args: readonly string[]): CliOptions => {
  const opts: CliOptions = {
    ci: args.includes('--ci'),
    failOn: (getArgValue(args, '--fail-on') as Severity) ?? 'critical',
    sarif: getArgValue(args, '--sarif') ?? undefined,
    json: args.includes('--json'),
    threshold: parseInt(getArgValue(args, '--threshold') ?? '0', 10),
    auto: args.includes('--auto'),
    path: args.find((a) => !a.startsWith('--') && a !== 'scan') ?? '.',
  };
  return opts;
};

const getArgValue = (args: readonly string[], flag: string): string | null => {
  // --flag=value
  const eqArg = args.find((a) => a.startsWith(`${flag}=`));
  if (eqArg) return eqArg.split('=')[1];

  // --flag value
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];

  return null;
};

export const shouldFail = (result: ScanResult, opts: CliOptions): boolean => {
  // Check threshold
  if (opts.threshold > 0 && result.score.totalScore < opts.threshold) return true;

  // Check fail-on severity
  const minRank = SEVERITY_RANK[opts.failOn];
  const hasMatchingFindings = result.findings.some(
    (f) => f.type === 'fail' && SEVERITY_RANK[f.severity] >= minRank,
  );

  return hasMatchingFindings;
};

export const formatCiOutput = async (
  result: ScanResult,
  opts: CliOptions,
  version: string,
): Promise<string> => {
  // Write SARIF if requested
  if (opts.sarif) {
    const sarif = toSarif(result, version);
    await writeFile(opts.sarif, JSON.stringify(sarif, null, 2), 'utf-8');
  }

  // JSON output
  if (opts.json) {
    return JSON.stringify(toJsonOutput(result, version), null, 2);
  }

  // Default text output
  const failCount = result.findings.filter((f) => f.type === 'fail').length;
  const lines = [
    `Complior v${version} — EU AI Act Compliance Scanner`,
    `Score: ${result.score.totalScore}/100 (${result.score.zone.toUpperCase()})`,
    `Files scanned: ${result.filesScanned}`,
    `Findings: ${failCount} violations, ${result.score.passedChecks} passed`,
    '',
  ];

  if (failCount > 0) {
    lines.push('Violations:');
    for (const f of result.findings.filter((f) => f.type === 'fail')) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.checkId}: ${f.message}`);
    }
  }

  return lines.join('\n');
};
