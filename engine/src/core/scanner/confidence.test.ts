import { describe, it, expect } from 'vitest';
import {
  getConfidenceLevel,
  l1Confidence,
  l2Confidence,
  l3Confidence,
  l4Confidence,
  aggregateConfidence,
  aggregateLevel,
  confidenceScoreMultiplier,
} from './confidence.js';
import type { CheckWithConfidence } from './confidence.js';
import { createScanner } from './index.js';
import type { ScanContext, FileInfo } from './scanner.types.js';

const createFile = (relativePath: string, content: string): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

describe('getConfidenceLevel', () => {
  it('returns PASS for high-confidence pass', () => {
    expect(getConfidenceLevel(95, true)).toBe('PASS');
    expect(getConfidenceLevel(100, true)).toBe('PASS');
  });

  it('returns LIKELY_PASS for medium-confidence pass', () => {
    expect(getConfidenceLevel(70, true)).toBe('LIKELY_PASS');
    expect(getConfidenceLevel(85, true)).toBe('LIKELY_PASS');
  });

  it('returns UNCERTAIN for low-confidence pass', () => {
    expect(getConfidenceLevel(50, true)).toBe('UNCERTAIN');
    expect(getConfidenceLevel(69, true)).toBe('UNCERTAIN');
  });

  it('returns FAIL for high-confidence fail', () => {
    expect(getConfidenceLevel(95, false)).toBe('FAIL');
    expect(getConfidenceLevel(100, false)).toBe('FAIL');
  });

  it('returns LIKELY_FAIL for medium-confidence fail', () => {
    expect(getConfidenceLevel(70, false)).toBe('LIKELY_FAIL');
    expect(getConfidenceLevel(80, false)).toBe('LIKELY_FAIL');
  });
});

describe('per-layer confidence', () => {
  it('L1: file found → PASS (95%)', () => {
    const result = l1Confidence(true);
    expect(result.level).toBe('PASS');
    expect(result.confidence).toBe(95);
    expect(result.layer).toBe('L1');
  });

  it('L1: file not found → FAIL (98%)', () => {
    const result = l1Confidence(false);
    expect(result.level).toBe('FAIL');
    expect(result.confidence).toBe(98);
  });

  it('L2: VALID → PASS (95%)', () => {
    expect(l2Confidence('VALID').level).toBe('PASS');
    expect(l2Confidence('VALID').confidence).toBe(95);
  });

  it('L2: PARTIAL → LIKELY_PASS (75%)', () => {
    expect(l2Confidence('PARTIAL').level).toBe('LIKELY_PASS');
    expect(l2Confidence('PARTIAL').confidence).toBe(75);
  });

  it('L2: EMPTY → FAIL (95%)', () => {
    expect(l2Confidence('EMPTY').level).toBe('FAIL');
    expect(l2Confidence('EMPTY').confidence).toBe(95);
  });

  it('L3: PROHIBITED → FAIL (99%)', () => {
    expect(l3Confidence('PROHIBITED').level).toBe('FAIL');
    expect(l3Confidence('PROHIBITED').confidence).toBe(99);
  });

  it('L3: OK → LIKELY_PASS (80%)', () => {
    expect(l3Confidence('OK').level).toBe('LIKELY_PASS');
    expect(l3Confidence('OK').confidence).toBe(80);
  });

  it('L4: negative FOUND → LIKELY_FAIL (80%)', () => {
    expect(l4Confidence('negative', 'FOUND').level).toBe('LIKELY_FAIL');
    expect(l4Confidence('negative', 'FOUND').confidence).toBe(80);
  });

  it('L4: positive FOUND → LIKELY_PASS (75%)', () => {
    expect(l4Confidence('positive', 'FOUND').level).toBe('LIKELY_PASS');
    expect(l4Confidence('positive', 'FOUND').confidence).toBe(75);
  });
});

describe('aggregateConfidence', () => {
  it('returns weighted average for checks from different layers', () => {
    const checks: CheckWithConfidence[] = [
      { layer: 'L1', confidence: 95, level: 'PASS' },    // weight 1.0
      { layer: 'L2', confidence: 75, level: 'LIKELY_PASS' }, // weight 0.95
      { layer: 'L4', confidence: 80, level: 'LIKELY_FAIL' }, // weight 0.7
    ];

    const result = aggregateConfidence(checks);

    // (95*1.0 + 75*0.95 + 80*0.7) / (1.0+0.95+0.7)
    // = (95 + 71.25 + 56) / 2.65
    // = 222.25 / 2.65 ≈ 83.87
    expect(result).toBeCloseTo(83.87, 1);
  });

  it('returns 0 for empty checks', () => {
    expect(aggregateConfidence([])).toBe(0);
  });

  it('returns single check confidence for one check', () => {
    const checks: CheckWithConfidence[] = [
      { layer: 'L1', confidence: 98, level: 'FAIL' },
    ];
    expect(aggregateConfidence(checks)).toBe(98);
  });
});

describe('aggregateLevel', () => {
  it('returns UNCERTAIN for contradictory signals', () => {
    const checks: CheckWithConfidence[] = [
      { layer: 'L1', confidence: 95, level: 'PASS' },
      { layer: 'L4', confidence: 80, level: 'LIKELY_FAIL' },
    ];

    const result = aggregateLevel(checks);
    expect(result).toBe('UNCERTAIN');
  });

  it('returns PASS for all-pass checks', () => {
    const checks: CheckWithConfidence[] = [
      { layer: 'L1', confidence: 95, level: 'PASS' },
      { layer: 'L2', confidence: 95, level: 'PASS' },
    ];

    const result = aggregateLevel(checks);
    expect(result).toBe('PASS');
  });

  it('returns FAIL for all-fail checks', () => {
    const checks: CheckWithConfidence[] = [
      { layer: 'L1', confidence: 98, level: 'FAIL' },
      { layer: 'L3', confidence: 99, level: 'FAIL' },
    ];

    const result = aggregateLevel(checks);
    expect(result).toBe('FAIL');
  });
});

describe('confidenceScoreMultiplier', () => {
  it('returns correct multiplier for each level', () => {
    expect(confidenceScoreMultiplier('PASS')).toBe(1.0);
    expect(confidenceScoreMultiplier('LIKELY_PASS')).toBe(0.75);
    expect(confidenceScoreMultiplier('UNCERTAIN')).toBe(0.5);
    expect(confidenceScoreMultiplier('LIKELY_FAIL')).toBe(0.25);
    expect(confidenceScoreMultiplier('FAIL')).toBe(0.0);
  });
});

describe('scanner integration — confidence in findings', () => {
  it('attaches confidence to findings in full scan (all PASS)', () => {
    const scanner = createScanner();
    const ctx = createCtx([
      createFile('AI-LITERACY.md', '# AI Literacy\n## Training Program\n## Training Levels\n## Assessment Methods'),
      createFile('ART5-SCREENING.md', '# Screening\n## Prohibited Practices\n## Screening Results\n## Mitigations'),
      createFile('COMPLIANCE.md', '# EU AI Act Compliance\nRisk assessment documentation'),
      createFile('.complior/config.json', '{"version":"1.0"}'),
      createFile('.well-known/ai-compliance.json', '{"compliant":true}'),
    ]);

    const result = scanner.scan(ctx);

    // Some findings should have confidence
    const withConfidence = result.findings.filter((f) => f.confidence !== undefined);
    expect(withConfidence.length).toBeGreaterThan(0);

    // High-confidence L1/L2 passes should be 95%
    const passes = withConfidence.filter((f) => f.type === 'pass' && f.confidence === 95);
    expect(passes.length).toBeGreaterThan(0);

    // Confidence summary should be present
    expect(result.score.confidenceSummary).toBeDefined();
    expect(result.score.confidenceSummary!.total).toBeGreaterThan(0);
  });

  it('attaches confidence to mixed findings', () => {
    const scanner = createScanner();
    const ctx = createCtx([
      createFile('src/chat.tsx', `
import OpenAI from 'openai';
const response = await openai.chat.completions.create({ model: 'gpt-4' });
      `),
      createFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
    ]);

    const result = scanner.scan(ctx);

    const withConfidence = result.findings.filter((f) => f.confidence !== undefined);
    expect(withConfidence.length).toBeGreaterThan(0);

    // Should have mix of levels
    const levels = [...new Set(withConfidence.map((f) => f.confidenceLevel))];
    expect(levels.length).toBeGreaterThan(1); // At least PASS + FAIL/LIKELY_FAIL
  });

  it('confidence summary counts all levels correctly', () => {
    const scanner = createScanner();
    const ctx = createCtx([
      createFile('AI-LITERACY.md', '# Policy\n## Training Program\n## Training Levels\n## Assessment Methods'),
      createFile('package.json', '{"dependencies":{"openai":"^4.0.0","express":"^4.0.0"}}'),
      createFile('src/app.ts', `
const res = await openai.chat.completions.create({ model: 'gpt-4' });
      `),
    ]);

    const result = scanner.scan(ctx);
    const summary = result.score.confidenceSummary!;

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.pass + summary.likelyPass + summary.uncertain + summary.likelyFail + summary.fail).toBe(summary.total);
  });
});
