import { describe, it, expect } from 'vitest';
import { checkGpaiSystemicRisk } from './gpai-systemic-risk.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

describe('checkGpaiSystemicRisk', () => {
  it('returns skip when no GPAI indicators in codebase', () => {
    const ctx = createScanCtx([
      createScanFile('src/app.ts', 'function main() { return "hello"; }'),
      createScanFile('src/utils.ts', 'export const add = (a: number, b: number) => a + b;'),
    ]);

    const results = checkGpaiSystemicRisk(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skip');
  });

  it('returns pass when dedicated systemic risk doc exists', () => {
    const ctx = createScanCtx([
      createScanFile('docs/GPAI-SYSTEMIC-RISK-ASSESSMENT.md', '# GPAI Systemic Risk Assessment\n\nContent here.'),
      createScanFile('src/app.ts', 'function main() {}'),
    ]);

    const results = checkGpaiSystemicRisk(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].message).toContain('GPAI-SYSTEMIC-RISK-ASSESSMENT.md');
  });

  it('returns pass when md files contain systemic risk content', () => {
    const ctx = createScanCtx([
      createScanFile('docs/RISK-MANAGEMENT.md', '# Risk Management\n\nWe conduct adversarial testing on all model outputs.'),
      createScanFile('src/app.ts', 'function main() {}'),
    ]);

    const results = checkGpaiSystemicRisk(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].message).toContain('systemic risk content found');
  });

  it('returns fail when code has LLM indicators without risk doc', () => {
    const ctx = createScanCtx([
      createScanFile('src/model.ts', 'const model = "large language model"; // our provider uses LLM'),
      createScanFile('docs/README.md', '# Project\n\nA simple tool.'),
    ]);

    const results = checkGpaiSystemicRisk(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    expect(results[0].severity).toBe('high');
    expect(results[0].message).toContain('systemic risk indicators detected');
  });

  it('does NOT trigger on markdown docs describing the model', () => {
    const ctx = createScanCtx([
      createScanFile('docs/compliance/TECH-DOCUMENTATION.md',
        '# Technical Documentation\n\n## General Description\nThis system uses a large language model provided by the vendor.\n\n## System Elements\nIntegration details.'),
      createScanFile('src/app.ts', 'function main() { return "hello"; }'),
    ]);

    const results = checkGpaiSystemicRisk(ctx);

    expect(results).toHaveLength(1);
    // .md files excluded from indicator scan → no indicators in code → skip
    expect(results[0].type).toBe('skip');
  });

  it('returns fail for FLOP threshold in code', () => {
    const ctx = createScanCtx([
      createScanFile('src/config.ts', 'const COMPUTE_BUDGET = "10^25"; // FLOP threshold'),
      createScanFile('docs/README.md', '# Project docs'),
    ]);

    const results = checkGpaiSystemicRisk(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    expect(results[0].severity).toBe('high');
  });
});
