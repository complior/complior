/**
 * HTTP Contract Test — validates TS types match the shared JSON schema.
 *
 * This test ensures that:
 * 1. TS types can construct objects matching the contract sample
 * 2. The sample fixture round-trips through JSON serialization
 * 3. All required fields are present and correctly typed
 *
 * If this test fails, TS types have drifted from the contract.
 * Update both `common.types.ts` and `http-contract.json` together.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ScanResult,
  Finding,
  ScoreBreakdown,
  CategoryScore,
  CodeContext,
  CodeContextLine,
  FixDiff,
  Severity,
  ScoreZone,
} from './common.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = resolve(__dirname, '../../data/schemas/http-contract-sample.json');
const SCHEMA_PATH = resolve(__dirname, '../../data/schemas/http-contract.json');

const loadSample = (): unknown => JSON.parse(readFileSync(SAMPLE_PATH, 'utf-8'));
const loadSchema = (): unknown => JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));

describe('HTTP Contract — TS side', () => {
  it('sample fixture exists and is valid JSON', () => {
    const sample = loadSample();
    expect(sample).toBeDefined();
    expect(typeof sample).toBe('object');
  });

  it('schema file exists and is valid JSON Schema', () => {
    const schema = loadSchema() as Record<string, unknown>;
    expect(schema['$schema']).toContain('json-schema.org');
    expect(schema['$defs']).toBeDefined();
  });

  it('sample deserializes as ScanResult with all required fields', () => {
    const raw = loadSample() as ScanResult;

    // ScanResult top-level
    expect(typeof raw.projectPath).toBe('string');
    expect(typeof raw.scannedAt).toBe('string');
    expect(typeof raw.duration).toBe('number');
    expect(typeof raw.filesScanned).toBe('number');
    expect(Array.isArray(raw.findings)).toBe(true);
    expect(raw.score).toBeDefined();
  });

  it('ScoreBreakdown has correct structure', () => {
    const raw = loadSample() as ScanResult;
    const score: ScoreBreakdown = raw.score;

    expect(typeof score.totalScore).toBe('number');
    expect(['red', 'yellow', 'green']).toContain(score.zone);
    expect(Array.isArray(score.categoryScores)).toBe(true);
    expect(typeof score.criticalCapApplied).toBe('boolean');
    expect(typeof score.totalChecks).toBe('number');
    expect(typeof score.passedChecks).toBe('number');
    expect(typeof score.failedChecks).toBe('number');
    expect(typeof score.skippedChecks).toBe('number');
  });

  it('CategoryScore has correct structure', () => {
    const raw = loadSample() as ScanResult;
    const cat: CategoryScore = raw.score.categoryScores[0]!;

    expect(typeof cat.category).toBe('string');
    expect(typeof cat.weight).toBe('number');
    expect(typeof cat.score).toBe('number');
    expect(typeof cat.obligationCount).toBe('number');
    expect(typeof cat.passedCount).toBe('number');
  });

  it('Finding has correct required fields', () => {
    const raw = loadSample() as ScanResult;
    const finding: Finding = raw.findings[0]!;

    expect(typeof finding.checkId).toBe('string');
    expect(['pass', 'fail', 'skip']).toContain(finding.type);
    expect(typeof finding.message).toBe('string');
    expect(['critical', 'high', 'medium', 'low', 'info'] satisfies Severity[]).toContain(finding.severity);
  });

  it('Finding optional fields have correct types when present', () => {
    const raw = loadSample() as ScanResult;
    const finding: Finding = raw.findings[0]!;

    // First finding has all optional fields
    expect(typeof finding.file).toBe('string');
    expect(typeof finding.line).toBe('number');
    expect(typeof finding.obligationId).toBe('string');
    expect(typeof finding.articleReference).toBe('string');
    expect(typeof finding.fix).toBe('string');
  });

  it('CodeContext has correct structure when present', () => {
    const raw = loadSample() as ScanResult;
    const ctx: CodeContext = raw.findings[0]!.codeContext!;

    expect(Array.isArray(ctx.lines)).toBe(true);
    expect(typeof ctx.startLine).toBe('number');
    expect(typeof ctx.highlightLine).toBe('number');

    const line: CodeContextLine = ctx.lines[0]!;
    expect(typeof line.num).toBe('number');
    expect(typeof line.content).toBe('string');
  });

  it('FixDiff has correct structure when present', () => {
    const raw = loadSample() as ScanResult;
    const diff: FixDiff = raw.findings[0]!.fixDiff!;

    expect(Array.isArray(diff.before)).toBe(true);
    expect(Array.isArray(diff.after)).toBe(true);
    expect(typeof diff.startLine).toBe('number');
    expect(typeof diff.filePath).toBe('string');
    expect(typeof diff.importLine).toBe('string');
  });

  it('Severity enum values match contract', () => {
    const validSeverities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    const raw = loadSample() as ScanResult;
    for (const f of raw.findings) {
      expect(validSeverities).toContain(f.severity);
    }
  });

  it('Zone enum values match contract', () => {
    const validZones: ScoreZone[] = ['red', 'yellow', 'green'];
    const raw = loadSample() as ScanResult;
    expect(validZones).toContain(raw.score.zone);
  });

  it('Finding new optional fields have correct types when present', () => {
    const raw = loadSample() as ScanResult;
    const finding = raw.findings[0]! as Record<string, unknown>;

    expect(typeof finding.priority).toBe('number');
    expect(typeof finding.confidence).toBe('number');
    expect(typeof finding.confidenceLevel).toBe('string');
    expect(Array.isArray(finding.evidence)).toBe(true);
  });

  it('ScoreBreakdown has confidenceSummary', () => {
    const raw = loadSample() as ScanResult;
    const score = raw.score as Record<string, unknown>;
    expect(score.confidenceSummary).toBeDefined();
    expect(typeof score.confidenceSummary).toBe('object');
  });

  it('ScanResult has new optional fields', () => {
    const raw = loadSample() as Record<string, unknown>;
    expect(typeof raw.deepAnalysis).toBe('boolean');
    expect(typeof raw.l5Cost).toBe('number');
    expect(raw.regulationVersion).toBeDefined();
  });

  it('sample round-trips through JSON serialization', () => {
    const original = loadSample();
    const roundTripped = JSON.parse(JSON.stringify(original));
    expect(roundTripped).toEqual(original);
  });

  it('TS can construct a type-safe ScanResult matching the fixture shape', () => {
    // This verifies the TS interfaces can represent the fixture data.
    // If interfaces change in a way that breaks the contract, this won't compile.
    const result: ScanResult = {
      score: {
        totalScore: 72.5,
        zone: 'yellow',
        categoryScores: [{
          category: 'documentation',
          weight: 0.25,
          score: 80.0,
          obligationCount: 5,
          passedCount: 4,
        }],
        criticalCapApplied: false,
        totalChecks: 20,
        passedChecks: 14,
        failedChecks: 4,
        skippedChecks: 2,
      },
      findings: [{
        checkId: 'l4-bare-api-call',
        type: 'fail',
        message: 'test',
        severity: 'high',
        file: 'test.ts',
        line: 1,
      }],
      projectPath: '/test',
      scannedAt: '2026-01-01T00:00:00Z',
      duration: 100,
      filesScanned: 10,
    };

    expect(result.score.totalScore).toBe(72.5);
    expect(result.findings).toHaveLength(1);
  });
});
