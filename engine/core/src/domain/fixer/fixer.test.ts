import { describe, it, expect } from 'vitest';
import type { Finding } from '../../types/common.types.js';
import { createFixer } from './create-fixer.js';
import { findStrategy } from './strategies/index.js';
import { generateUnifiedDiff, generateCreateDiff } from './diff.js';
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

// --- Diff tests ---

describe('generateUnifiedDiff', () => {
  it('generates diff for modified content', () => {
    const diff = generateUnifiedDiff('src/app.ts', 'line1\nline2\n', 'line1\nchanged\n');
    expect(diff).toContain('--- a/src/app.ts');
    expect(diff).toContain('+++ b/src/app.ts');
    expect(diff).toContain('-line2');
    expect(diff).toContain('+changed');
  });
});

describe('generateCreateDiff', () => {
  it('generates diff for new file', () => {
    const diff = generateCreateDiff('new.ts', 'const x = 1;\n');
    expect(diff).toContain('--- /dev/null');
    expect(diff).toContain('+++ b/new.ts');
    expect(diff).toContain('+const x = 1;');
  });
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

// --- Fixer factory tests ---

describe('createFixer', () => {
  const fixer = createFixer({
    getFramework: () => 'Next.js',
    getProjectPath: () => '/test/project',
    getExistingFiles: () => [],
  });

  it('generateFix returns plan for fixable finding', () => {
    const finding = makeFinding({ checkId: 'ai-disclosure' });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.framework).toBe('Next.js');
  });

  it('generateFix returns null for pass findings', () => {
    const finding: Finding = {
      checkId: 'ai-disclosure',
      type: 'pass',
      message: 'OK',
      severity: 'info',
    };
    const plan = fixer.generateFix(finding);
    expect(plan).toBeNull();
  });

  it('generateFixes processes multiple findings', () => {
    const findings: Finding[] = [
      makeFinding({ checkId: 'ai-disclosure' }),
      makeFinding({ checkId: 'interaction-logging' }),
      makeFinding({ checkId: 'unknown' }),
    ];
    const plans = fixer.generateFixes(findings);
    expect(plans).toHaveLength(2);
  });

  it('generateFixes deduplicates plans with same output path', () => {
    const findings: Finding[] = [
      makeFinding({ checkId: 'l4-security-risk' }),
      makeFinding({ checkId: 'l4-security-risk' }),
      makeFinding({ checkId: 'l4-ast-missing-error-handling' }),
    ];
    const plans = fixer.generateFixes(findings);
    // All three produce src/middleware/ai-error-handler.ts — should deduplicate to 1
    expect(plans).toHaveLength(1);
    expect(plans[0].checkId).toBe('l4-security-risk');
  });

  it('previewFix returns same as generateFix', () => {
    const finding = makeFinding({ checkId: 'content-marking' });
    const plan = fixer.previewFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('config_fix');
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

// --- Inline fix from fixDiff ---

describe('inline fix from fixDiff', () => {
  const fixer = createFixer({
    getFramework: () => 'generic',
    getProjectPath: () => '/test/project',
    getExistingFiles: () => [],
  });

  it('generates splice plan when finding has fixDiff', () => {
    const finding = makeFinding({
      checkId: 'l4-bare-llm',
      fixDiff: {
        filePath: 'src/ai.ts',
        startLine: 5,
        before: ['const client = new OpenAI();'],
        after: ['const client = complior(new OpenAI());'],
        importLine: "import { complior } from '@complior/sdk';",
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.actions[0].startLine).toBe(5);
    expect(plan!.actions[0].beforeLines).toEqual(['const client = new OpenAI();']);
    expect(plan!.actions[0].afterLines).toEqual(['const client = complior(new OpenAI());']);
    expect(plan!.actions[0].importLine).toBe("import { complior } from '@complior/sdk';");
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(6);
  });

  it('inline fix takes priority over scaffold strategy', () => {
    const finding = makeFinding({
      checkId: 'l4-bare-llm',
      fixDiff: {
        filePath: 'src/ai.ts',
        startLine: 10,
        before: ['const c = new Anthropic();'],
        after: ['const c = complior(new Anthropic());'],
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    // Should be splice (inline), not create (scaffold)
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.actions[0].path).toBe('src/ai.ts');
  });

  it('falls back to strategy when no fixDiff', () => {
    const finding = makeFinding({ checkId: 'l4-bare-llm' });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    // No fixDiff → scaffold strategy → create action
    expect(plan!.actions[0].type).toBe('create');
    expect(plan!.actions[0].path).toContain('compliance-wrapper');
  });

  it('dedup by path:startLine for splice — different lines produce 2 plans', () => {
    const findings = [
      makeFinding({
        checkId: 'l4-bare-llm',
        fixDiff: { filePath: 'src/ai.ts', startLine: 5, before: ['const a = new OpenAI();'], after: ['const a = complior(new OpenAI());'] },
      }),
      makeFinding({
        checkId: 'l4-bare-llm',
        fixDiff: { filePath: 'src/ai.ts', startLine: 20, before: ['const b = new OpenAI();'], after: ['const b = complior(new OpenAI());'] },
      }),
    ];
    const plans = fixer.generateFixes(findings);
    expect(plans).toHaveLength(2);
  });

  it('dedup catches identical splice — same file same line produces 1 plan', () => {
    const findings = [
      makeFinding({
        checkId: 'l4-bare-llm',
        fixDiff: { filePath: 'src/ai.ts', startLine: 5, before: ['const a = new OpenAI();'], after: ['const a = complior(new OpenAI());'] },
      }),
      makeFinding({
        checkId: 'l4-bare-llm',
        fixDiff: { filePath: 'src/ai.ts', startLine: 5, before: ['const a = new OpenAI();'], after: ['const a = complior(new OpenAI());'] },
      }),
    ];
    const plans = fixer.generateFixes(findings);
    expect(plans).toHaveLength(1);
  });
});

// --- Inline fix for new fix types ---

describe('NHI inline fix', () => {
  const fixer = createFixer({
    getFramework: () => 'generic',
    getProjectPath: () => '/test/project',
    getExistingFiles: () => [],
  });

  it('generates splice plan with process.env replacement', () => {
    const finding = makeFinding({
      checkId: 'l4-nhi-openai-key',
      fixDiff: {
        filePath: 'src/config.ts',
        startLine: 3,
        before: ["const API_KEY = 'sk-1234567890abcdef';"],
        after: ["const API_KEY = process.env.API_KEY ?? ''"],
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.description).toContain('externalize secret');
  });

  it('generates splice plan with os.environ for Python', () => {
    const finding = makeFinding({
      checkId: 'l4-nhi-generic-secret',
      fixDiff: {
        filePath: 'config.py',
        startLine: 5,
        before: ['API_KEY = "sk-1234"'],
        after: ["API_KEY = os.environ.get('API_KEY', '')"],
        importLine: 'import os',
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].importLine).toBe('import os');
  });
});

describe('security risk inline fix', () => {
  const fixer = createFixer({
    getFramework: () => 'generic',
    getProjectPath: () => '/test/project',
    getExistingFiles: () => [],
  });

  it('generates splice plan for security pattern', () => {
    const finding = makeFinding({
      checkId: 'l4-security-risk',
      fixDiff: {
        filePath: 'src/ml/pipeline.py',
        startLine: 10,
        before: ['model = pickle.load(f)'],
        after: ['model = json.load(f)'],
        importLine: 'import json',
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.description).toContain('security risk');
  });
});

describe('error handling inline fix', () => {
  const fixer = createFixer({
    getFramework: () => 'generic',
    getProjectPath: () => '/test/project',
    getExistingFiles: () => [],
  });

  it('generates splice plan with try/catch wrapping', () => {
    const finding = makeFinding({
      checkId: 'l4-ast-missing-error-handling',
      fixDiff: {
        filePath: 'src/chat/agent.ts',
        startLine: 15,
        before: ['  const result = await client.messages.create({ model: "claude-3" });'],
        after: [
          '  try {',
          '    const result = await client.messages.create({ model: "claude-3" });',
          '  } catch (err) {',
          "    console.error('LLM call failed:', err);",
          '    throw err;',
          '  }',
        ],
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.description).toContain('error handling');
  });
});

describe('banned dep inline fix', () => {
  const fixer = createFixer({
    getFramework: () => 'generic',
    getProjectPath: () => '/test/project',
    getExistingFiles: () => [],
  });

  it('generates splice plan removing banned dep line', () => {
    const finding = makeFinding({
      checkId: 'l3-banned-emotion-recognition',
      fixDiff: {
        filePath: 'package.json',
        startLine: 8,
        before: ['    "emotion-recognition": "^1.0.0",'],
        after: [],
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.actions[0].afterLines).toEqual([]);
    expect(plan!.description).toContain('banned dependency');
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
