import { describe, it, expect } from 'vitest';
import type { Finding } from '../../types/common.types.js';
import { findStrategy } from './strategies/index.js';
import type { FixContext } from './types.js';

// --- Helpers ---

const makeContext = (overrides?: Partial<FixContext>): FixContext => ({
  projectPath: '/test/project',
  framework: 'generic',
  existingFiles: [],
  ...overrides,
});

const makeFinding = (overrides: Partial<Finding> & { checkId: string }): Finding => ({
  type: 'fail',
  message: 'Test finding',
  severity: 'high',
  ...overrides,
});

// --- Strategy tests ---

describe('findStrategy', () => {
  it('generates disclosure fix for ai-disclosure finding', () => {
    const finding = makeFinding({
      checkId: 'ai-disclosure',
      obligationId: 'eu-ai-act-OBL-015',
      articleReference: 'Art. 50(1)',
    });

    const plan = findStrategy(finding, makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.commitMessage).toContain('Art. 50.1');
    expect(plan!.actions.length).toBeGreaterThan(0);
    expect(plan!.diff).toBeTruthy();
  });

  it('generates React component for Next.js framework', () => {
    const finding = makeFinding({ checkId: 'ai-disclosure' });
    const plan = findStrategy(finding, makeContext({ framework: 'Next.js' }));
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].path).toContain('AIDisclosure.tsx');
  });

  it('generates middleware for Express framework', () => {
    const finding = makeFinding({ checkId: 'ai-disclosure' });
    const plan = findStrategy(finding, makeContext({ framework: 'Express' }));
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].path).toContain('middleware');
  });

  it('generates content marking fix', () => {
    const finding = makeFinding({ checkId: 'content-marking' });
    const plan = findStrategy(finding, makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('config_fix');
    expect(plan!.actions[0].path).toContain('content-marking');
  });

  it('generates logging fix', () => {
    const finding = makeFinding({ checkId: 'interaction-logging' });
    const plan = findStrategy(finding, makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.actions[0].path).toContain('logger');
  });

  it('generates documentation fix from template map', () => {
    const finding = makeFinding({
      checkId: 'ai-literacy',
      obligationId: 'eu-ai-act-OBL-001',
    });
    const plan = findStrategy(finding, makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('template_generation');
    expect(plan!.actions[0].path).toContain('ai-literacy-policy.md');
  });

  it('generates metadata fix', () => {
    const finding = makeFinding({ checkId: 'compliance-metadata' });
    const plan = findStrategy(finding, makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('metadata_generation');
    expect(plan!.actions[0].path).toContain('.well-known');
  });

  it('skips documentation fix when output file already exists', () => {
    const finding = makeFinding({
      checkId: 'ai-literacy',
      obligationId: 'eu-ai-act-OBL-001',
    });
    const plan = findStrategy(finding, makeContext({
      existingFiles: ['/test/docs/compliance/ai-literacy-policy.md'],
    }));
    expect(plan).toBeNull();
  });

  it('returns null for unknown checkId without obligationId', () => {
    const finding = makeFinding({ checkId: 'unknown-check' });
    const plan = findStrategy(finding, makeContext());
    expect(plan).toBeNull();
  });
});

// --- New strategy tests (13 strategies + 2 variant tests) ---

describe('new fix strategies', () => {
  it('generates SDK wrapper fix for l4-bare-llm', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-bare-llm' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(6);
    expect(plan!.actions[0].path).toContain('compliance-wrapper');
  });

  it('generates React hook for l4-bare-llm with Next.js framework', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-bare-llm' }), makeContext({ framework: 'Next.js' }));
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].path).toContain('useCompliorAI');
  });

  it('generates permission guard fix for l4-human-oversight', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-human-oversight' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(5);
    expect(plan!.actions[0].path).toContain('human-approval-gate');
  });

  it('generates kill switch fix for l4-kill-switch', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-kill-switch' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(5);
    expect(plan!.actions[0].path).toContain('kill-switch');
  });

  it('generates error handler fix for l4-security-risk', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-security-risk' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(4);
    expect(plan!.actions[0].path).toContain('ai-error-handler');
  });

  it('generates HITL gate fix for l4-conformity-assessment', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-conformity-assessment' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(5);
    expect(plan!.actions[0].path).toContain('conformity-checklist');
  });

  it('generates data governance fix for l4-data-governance', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-data-governance' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(5);
    expect(plan!.actions[0].path).toContain('data-governance');
  });

  it('generates secret rotation fix for l4-nhi-openai-key', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-nhi-openai-key' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('config_fix');
    expect(plan!.scoreImpact).toBe(6);
    expect(plan!.actions).toHaveLength(2);
    expect(plan!.actions[0].path).toBe('.gitignore');
    expect(plan!.actions[1].path).toBe('.env.example');
  });

  it('skips secret rotation for l4-nhi-clean', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-nhi-clean' }), makeContext());
    expect(plan).toBeNull();
  });

  it('generates bandit fix for ext-bandit-b301', () => {
    const plan = findStrategy(makeFinding({ checkId: 'ext-bandit-b301' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('template_generation');
    expect(plan!.scoreImpact).toBe(4);
    expect(plan!.actions[0].path).toBe('complior-security-fixes.md');
  });

  it('generates CVE upgrade plan for l3-dep-vuln', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l3-dep-vuln', message: 'CVE-2024-1234 in lodash' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('dependency_fix');
    expect(plan!.scoreImpact).toBe(5);
    expect(plan!.actions[0].path).toBe('complior-upgrade-plan.md');
  });

  it('generates license fix for l3-dep-license', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l3-dep-license' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('dependency_fix');
    expect(plan!.scoreImpact).toBe(4);
    expect(plan!.actions[0].path).toBe('complior-license-review.md');
  });

  it('generates CI compliance workflow for l3-ci-compliance', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l3-ci-compliance' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('config_fix');
    expect(plan!.scoreImpact).toBe(4);
    expect(plan!.actions[0].path).toContain('compliance-check.yml');
  });

  it('generates bias testing config for l3-missing-bias-testing', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l3-missing-bias-testing' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('config_fix');
    expect(plan!.scoreImpact).toBe(4);
    expect(plan!.actions[0].path).toBe('bias-testing.config.json');
  });

  it('generates doc-code sync report for cross-doc-code-mismatch', () => {
    const plan = findStrategy(makeFinding({ checkId: 'cross-doc-code-mismatch' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('template_generation');
    expect(plan!.scoreImpact).toBe(5);
    expect(plan!.actions[0].path).toBe('complior-doc-sync-report.md');
  });
});

// FRIA fix via documentationStrategy (OBL-013 in template-registry)

describe('FRIA template fix', () => {
  const ctx = makeContext();

  it('triggers on obligationId eu-ai-act-OBL-013', () => {
    const finding = makeFinding({ checkId: 'fria', obligationId: 'eu-ai-act-OBL-013' });
    const plan = findStrategy(finding, ctx);
    expect(plan).not.toBeNull();
    expect(plan!.article).toBe('Art. 27');
    expect(plan!.fixType).toBe('template_generation');
    expect(plan!.obligationId).toBe('eu-ai-act-OBL-013');
  });

  it('skips if output file already exists', () => {
    const finding = makeFinding({ checkId: 'fria', obligationId: 'eu-ai-act-OBL-013' });
    const ctxWithFria = makeContext({ existingFiles: ['docs/compliance/fria.md'] });
    const plan = findStrategy(finding, ctxWithFria);
    expect(plan).toBeNull();
  });
});

describe('R2: kill-switch test strategy', () => {
  it('generates test file for cross-kill-switch-no-test', () => {
    const plan = findStrategy(makeFinding({ checkId: 'cross-kill-switch-no-test' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(4);
    expect(plan!.actions[0].path).toContain('kill-switch.test.ts');
    expect(plan!.actions[0].type).toBe('create');
  });

  it('returns null for unrelated checkIds', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-kill-switch' }), makeContext());
    // l4-kill-switch is handled by killSwitchStrategy, not killSwitchTestStrategy
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].path).not.toContain('kill-switch.test.ts');
  });
});

describe('N2: log-retention strategy', () => {
  it('generates docker-compose override for cross-logging-no-retention', () => {
    const plan = findStrategy(makeFinding({ checkId: 'cross-logging-no-retention' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('config_fix');
    expect(plan!.scoreImpact).toBe(4);
    expect(plan!.actions[0].path).toBe('docker-compose.override.yml');
    expect(plan!.actions[0].content).toContain('max-size');
    expect(plan!.actions[0].content).toContain('max-file');
  });

  it('returns null for unrelated checkIds', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-logging' }), makeContext());
    expect(plan).not.toBeNull();
    // l4-logging is handled by loggingStrategy, not logRetentionStrategy
    expect(plan!.actions[0].path).not.toBe('docker-compose.override.yml');
  });
});

describe('N5: L4 logging and record-keeping strategies', () => {
  it('generates logging fix for l4-logging (not just interaction-logging)', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-logging' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.actions[0].path).toContain('logger');
  });

  it('logging scaffold includes L4-recognizable patterns (auditLog, logAiCall)', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-logging' }), makeContext());
    expect(plan).not.toBeNull();
    const content = plan!.actions[0].content ?? '';
    expect(content).toContain('auditLog');
    expect(content).toContain('logAiCall');
    expect(content).toContain('aiLogger');
  });

  it('generates record-keeping fix for l4-record-keeping', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-record-keeping' }), makeContext());
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.actions[0].path).toContain('audit-trail');
  });

  it('record-keeping scaffold includes L4-recognizable patterns (persistAudit, complianceRecord)', () => {
    const plan = findStrategy(makeFinding({ checkId: 'l4-record-keeping' }), makeContext());
    expect(plan).not.toBeNull();
    const content = plan!.actions[0].content ?? '';
    expect(content).toContain('persistAudit');
    expect(content).toContain('complianceRecord');
  });
});
