import { describe, it, expect } from 'vitest';
import type { ScanResult, Finding, ScoreBreakdown } from '../types/common.types.js';
import { parseCliArgs, shouldFail } from './ci-mode.js';
import { toSarif } from '../output/sarif.js';
import { toJsonOutput } from '../output/json-output.js';

// --- Helpers ---

const makeScore = (overrides?: Partial<ScoreBreakdown>): ScoreBreakdown => ({
  totalScore: 42,
  zone: 'red',
  categoryScores: [],
  criticalCapApplied: false,
  totalChecks: 10,
  passedChecks: 4,
  failedChecks: 5,
  skippedChecks: 1,
  ...overrides,
});

const makeFinding = (overrides?: Partial<Finding>): Finding => ({
  checkId: 'test-check',
  type: 'fail',
  message: 'Test failure',
  severity: 'high',
  ...overrides,
});

const makeResult = (overrides?: Partial<ScanResult>): ScanResult => ({
  score: makeScore(),
  findings: [makeFinding()],
  projectPath: '/test',
  scannedAt: '2026-01-01T00:00:00Z',
  duration: 100,
  filesScanned: 50,
  ...overrides,
});

// --- parseCliArgs ---

describe('parseCliArgs', () => {
  it('parses --ci flag', () => {
    const opts = parseCliArgs(['scan', '--ci']);
    expect(opts.ci).toBe(true);
  });

  it('parses --fail-on=medium', () => {
    const opts = parseCliArgs(['--fail-on=medium']);
    expect(opts.failOn).toBe('medium');
  });

  it('parses --threshold 60', () => {
    const opts = parseCliArgs(['--threshold', '60']);
    expect(opts.threshold).toBe(60);
  });

  it('parses --sarif=results.sarif', () => {
    const opts = parseCliArgs(['--sarif=results.sarif']);
    expect(opts.sarif).toBe('results.sarif');
  });

  it('defaults failOn to critical', () => {
    const opts = parseCliArgs([]);
    expect(opts.failOn).toBe('critical');
  });
});

// --- shouldFail ---

describe('shouldFail', () => {
  it('fails when critical findings exist and failOn=critical', () => {
    const result = makeResult({
      findings: [makeFinding({ severity: 'critical' })],
    });
    expect(shouldFail(result, parseCliArgs(['--ci']))).toBe(true);
  });

  it('fails when score below threshold', () => {
    const result = makeResult({ score: makeScore({ totalScore: 42 }) });
    expect(shouldFail(result, parseCliArgs(['--threshold', '50']))).toBe(true);
  });

  it('passes when score above threshold and no critical findings', () => {
    const result = makeResult({
      score: makeScore({ totalScore: 80 }),
      findings: [makeFinding({ severity: 'low' })],
    });
    const opts = parseCliArgs(['--threshold', '50', '--fail-on=critical']);
    expect(shouldFail(result, opts)).toBe(false);
  });

  it('fails on high when failOn=high', () => {
    const result = makeResult({
      findings: [makeFinding({ severity: 'high' })],
    });
    expect(shouldFail(result, parseCliArgs(['--fail-on=high']))).toBe(true);
  });
});

// --- SARIF output ---

describe('toSarif', () => {
  it('produces valid SARIF 2.1.0 structure', () => {
    const result = makeResult({
      findings: [
        makeFinding({ checkId: 'ai-disclosure', severity: 'high', message: 'No disclosure' }),
        makeFinding({ checkId: 'logging', severity: 'medium', message: 'No logging' }),
        makeFinding({ type: 'pass', checkId: 'docs', message: 'OK' }),
      ],
    });

    const sarif = toSarif(result, '0.1.0');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('Complior');
    // Only fail findings in results
    expect(sarif.runs[0].results).toHaveLength(2);
    expect(sarif.runs[0].results[0].level).toBe('error');
    expect(sarif.runs[0].results[1].level).toBe('warning');
  });

  it('includes file locations when present', () => {
    const result = makeResult({
      findings: [makeFinding({ file: 'src/app.ts', line: 42 })],
    });
    const sarif = toSarif(result, '0.1.0');
    const loc = sarif.runs[0].results[0].locations;
    expect(loc).toBeDefined();
    expect(loc![0].physicalLocation?.artifactLocation.uri).toBe('src/app.ts');
    expect(loc![0].physicalLocation?.region?.startLine).toBe(42);
  });
});

// --- JSON output ---

describe('toJsonOutput', () => {
  it('produces structured JSON', () => {
    const result = makeResult();
    const json = toJsonOutput(result, '0.1.0');
    expect(json.scanner).toBe('complior');
    expect(json.version).toBe('0.1.0');
    expect(json.score).toBe(42);
    expect(json.zone).toBe('red');
    expect(json.findings).toHaveLength(1);
    expect(json.filesScanned).toBe(50);
  });
});
