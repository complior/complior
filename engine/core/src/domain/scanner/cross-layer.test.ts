import { describe, it, expect } from 'vitest';
import { runCrossLayerChecks, crossLayerToCheckResults, CROSS_LAYER_RULES } from './cross-layer.js';
import type { CheckResult } from '../../types/common.types.js';
import type { L2CheckResult } from './layers/layer2-docs.js';
import type { L3CheckResult } from './layers/layer3-config.js';
import type { L4CheckResult } from './layers/layer4-patterns.js';

const makeL1Pass = (checkId: string): CheckResult => ({
  type: 'pass',
  checkId,
  message: `${checkId} found`,
});

const makeL1Fail = (checkId: string): CheckResult => ({
  type: 'fail',
  checkId,
  message: `${checkId} missing`,
  severity: 'medium',
});

const makeL2 = (overrides: Partial<L2CheckResult> = {}): L2CheckResult => ({
  obligationId: 'eu-ai-act-OBL-011',
  article: 'Art. 26',
  document: 'monitoring-policy',
  status: 'VALID',
  foundSections: ['Monitoring Scope'],
  missingSections: [],
  totalRequired: 1,
  matchedRequired: 1,
  ...overrides,
});

const makeL3 = (overrides: Partial<L3CheckResult> = {}): L3CheckResult => ({
  type: 'ai-sdk-detected',
  status: 'OK',
  message: 'AI SDK detected: OpenAI',
  packageName: 'openai',
  ecosystem: 'npm',
  ...overrides,
});

const makeL4 = (overrides: Partial<L4CheckResult> = {}): L4CheckResult => ({
  obligationId: 'eu-ai-act-OBL-015',
  article: 'Art. 50(1)',
  category: 'disclosure',
  patternType: 'positive',
  status: 'FOUND',
  matchedPattern: 'AI disclosure component',
  recommendation: 'Add disclosure',
  ...overrides,
});

describe('CROSS_LAYER_RULES', () => {
  it('has 6 rules defined', () => {
    expect(CROSS_LAYER_RULES).toHaveLength(6);
  });

  it('all rules have id and description', () => {
    for (const rule of CROSS_LAYER_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.description).toBeTruthy();
    }
  });
});

describe('cross-doc-code-mismatch', () => {
  it('fires when monitoring doc exists but no monitoring code', () => {
    const findings = runCrossLayerChecks(
      [],
      [makeL2({ document: 'monitoring-policy', status: 'VALID' })],
      [],
      [], // No monitoring code
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-doc-code-mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe('medium');
  });

  it('does not fire when monitoring doc and code both present', () => {
    const findings = runCrossLayerChecks(
      [],
      [makeL2({ document: 'monitoring-policy', status: 'VALID' })],
      [],
      [makeL4({ category: 'deployer-monitoring', status: 'FOUND' })],
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-doc-code-mismatch');
    expect(mismatch).toBeUndefined();
  });

  it('does not fire when no monitoring doc', () => {
    const findings = runCrossLayerChecks([], [], [], []);
    const mismatch = findings.find((f) => f.ruleId === 'cross-doc-code-mismatch');
    expect(mismatch).toBeUndefined();
  });

  it('fires for SHALLOW monitoring docs too', () => {
    const findings = runCrossLayerChecks(
      [],
      [makeL2({ document: 'monitoring-policy', status: 'SHALLOW' })],
      [],
      [],
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-doc-code-mismatch');
    expect(mismatch).toBeDefined();
  });
});

describe('cross-banned-with-wrapper', () => {
  it('fires when banned package has compliance controls', () => {
    const findings = runCrossLayerChecks(
      [],
      [],
      [makeL3({ type: 'banned-package', status: 'PROHIBITED' })],
      [makeL4({ category: 'disclosure', status: 'FOUND' })],
    );

    const wrapped = findings.find((f) => f.ruleId === 'cross-banned-with-wrapper');
    expect(wrapped).toBeDefined();
    expect(wrapped?.severity).toBe('medium');
  });

  it('does not fire when banned package has no controls', () => {
    const findings = runCrossLayerChecks(
      [],
      [],
      [makeL3({ type: 'banned-package', status: 'PROHIBITED' })],
      [],
    );

    const wrapped = findings.find((f) => f.ruleId === 'cross-banned-with-wrapper');
    expect(wrapped).toBeUndefined();
  });

  it('fires for human-oversight control too', () => {
    const findings = runCrossLayerChecks(
      [],
      [],
      [makeL3({ type: 'banned-package', status: 'PROHIBITED' })],
      [makeL4({ category: 'human-oversight', status: 'FOUND' })],
    );

    const wrapped = findings.find((f) => f.ruleId === 'cross-banned-with-wrapper');
    expect(wrapped).toBeDefined();
  });
});

describe('cross-logging-no-retention', () => {
  it('fires when logging in code but no retention config', () => {
    const findings = runCrossLayerChecks(
      [],
      [],
      [makeL3({ type: 'log-retention', status: 'WARNING' })],
      [makeL4({ category: 'logging', status: 'FOUND' })],
    );

    const noRetention = findings.find((f) => f.ruleId === 'cross-logging-no-retention');
    expect(noRetention).toBeDefined();
    expect(noRetention?.article).toBe('Art. 12');
  });

  it('does not fire when retention config is OK', () => {
    const findings = runCrossLayerChecks(
      [],
      [],
      [makeL3({ type: 'log-retention', status: 'OK' })],
      [makeL4({ category: 'logging', status: 'FOUND' })],
    );

    const noRetention = findings.find((f) => f.ruleId === 'cross-logging-no-retention');
    expect(noRetention).toBeUndefined();
  });

  it('does not fire when no logging code', () => {
    const findings = runCrossLayerChecks([], [], [], []);
    const noRetention = findings.find((f) => f.ruleId === 'cross-logging-no-retention');
    expect(noRetention).toBeUndefined();
  });
});

describe('cross-kill-switch-no-test', () => {
  it('fires when kill switch found but no test file in context', () => {
    const ctx = {
      projectPath: '/test',
      files: [
        { relativePath: 'src/kill-switch.ts', content: '', extension: '.ts' },
      ],
    };
    const findings = runCrossLayerChecks(
      [makeL1Fail('documentation')],
      [],
      [],
      [makeL4({ category: 'kill-switch', status: 'FOUND' })],
      ctx,
    );

    const noTest = findings.find((f) => f.ruleId === 'cross-kill-switch-no-test');
    expect(noTest).toBeDefined();
    expect(noTest?.severity).toBe('low');
  });

  it('does not fire when kill-switch test file exists in context', () => {
    const ctx = {
      projectPath: '/test',
      files: [
        { relativePath: 'src/kill-switch.ts', content: '', extension: '.ts' },
        { relativePath: 'src/kill-switch.test.ts', content: '', extension: '.ts' },
      ],
    };
    const findings = runCrossLayerChecks(
      [],
      [],
      [],
      [makeL4({ category: 'kill-switch', status: 'FOUND' })],
      ctx,
    );

    const noTest = findings.find((f) => f.ruleId === 'cross-kill-switch-no-test');
    expect(noTest).toBeUndefined();
  });

  it('fires when no context provided', () => {
    const findings = runCrossLayerChecks(
      [],
      [],
      [],
      [makeL4({ category: 'kill-switch', status: 'FOUND' })],
    );

    const noTest = findings.find((f) => f.ruleId === 'cross-kill-switch-no-test');
    expect(noTest).toBeDefined();
  });
});

describe('cross-passport-code-mismatch', () => {
  it('fires when passport exists + AI SDK in deps but no disclosure', () => {
    const findings = runCrossLayerChecks(
      [makeL1Pass('passport-presence')],
      [],
      [makeL3({ type: 'ai-sdk-detected' })],
      [], // No disclosure
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-passport-code-mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe('medium');
    expect(mismatch?.article).toBe('Art. 50(1)');
  });

  it('does not fire when passport exists and disclosure present', () => {
    const findings = runCrossLayerChecks(
      [makeL1Pass('passport-presence')],
      [],
      [makeL3({ type: 'ai-sdk-detected' })],
      [makeL4({ category: 'disclosure', status: 'FOUND' })],
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-passport-code-mismatch');
    expect(mismatch).toBeUndefined();
  });

  it('does not fire when no passport exists', () => {
    const findings = runCrossLayerChecks(
      [makeL1Fail('passport-presence')],
      [],
      [makeL3({ type: 'ai-sdk-detected' })],
      [],
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-passport-code-mismatch');
    expect(mismatch).toBeUndefined();
  });
});

describe('cross-permission-passport-mismatch', () => {
  it('fires when undeclared-permission fail exists', () => {
    const findings = runCrossLayerChecks(
      [
        makeL1Fail('undeclared-permission'),
        makeL1Fail('undeclared-permission'),
      ],
      [],
      [],
      [],
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-permission-passport-mismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe('high');
    expect(mismatch?.description).toContain('2 undeclared');
  });

  it('does not fire when no undeclared permissions', () => {
    const findings = runCrossLayerChecks(
      [makeL1Pass('passport-presence')],
      [],
      [],
      [],
    );

    const mismatch = findings.find((f) => f.ruleId === 'cross-permission-passport-mismatch');
    expect(mismatch).toBeUndefined();
  });
});

describe('runCrossLayerChecks', () => {
  it('returns empty for fully compliant project', () => {
    const findings = runCrossLayerChecks(
      [makeL1Pass('test-suite')],
      [makeL2({ document: 'monitoring-policy', status: 'VALID' })],
      [
        makeL3({ type: 'ai-sdk-detected' }),
        makeL3({ type: 'log-retention', status: 'OK' }),
      ],
      [
        makeL4({ category: 'disclosure', status: 'FOUND' }),
        makeL4({ category: 'deployer-monitoring', status: 'FOUND' }),
        makeL4({ category: 'logging', status: 'FOUND' }),
      ],
    );

    // No cross-layer issues when all layers are aligned
    expect(findings).toHaveLength(0);
  });

  it('can return multiple findings', () => {
    const findings = runCrossLayerChecks(
      [makeL1Fail('undeclared-permission')],
      [makeL2({ document: 'monitoring-policy', status: 'VALID' })],
      [],
      [makeL4({ category: 'logging', status: 'FOUND' })],
    );

    // Should fire at least: doc-code-mismatch + permission-passport-mismatch
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('crossLayerToCheckResults', () => {
  it('converts findings to fail CheckResults', () => {
    const findings = runCrossLayerChecks(
      [makeL1Fail('undeclared-permission')],
      [],
      [],
      [],
    );

    const checkResults = crossLayerToCheckResults(findings);
    expect(checkResults.length).toBeGreaterThan(0);
    expect(checkResults.every((r) => r.type === 'fail')).toBe(true);
  });

  it('preserves severity and article', () => {
    const checkResults = crossLayerToCheckResults([{
      ruleId: 'test-rule',
      description: 'Test finding',
      severity: 'high',
      layers: ['L3', 'L4'],
      obligationId: 'eu-ai-act-OBL-015',
      article: 'Art. 50(1)',
    }]);

    expect(checkResults).toHaveLength(1);
    if (checkResults[0].type === 'fail') {
      expect(checkResults[0].severity).toBe('high');
      expect(checkResults[0].articleReference).toBe('Art. 50(1)');
      expect(checkResults[0].obligationId).toBe('eu-ai-act-OBL-015');
    }
  });
});
