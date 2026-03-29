import { describe, it, expect } from 'vitest';
import type { Finding } from '../../types/common.types.js';
import { createFixer } from './create-fixer.js';
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

// --- Inline fix from fixDiff ---

describe('inline fix from fixDiff', () => {
  const fixer = createFixer({
    getFramework: () => 'generic',
    getProjectPath: () => '/test/project',
    getExistingFiles: () => [],
  });

  it('generates splice plan when finding has fixDiff', () => {
    const finding = makeFinding({
      checkId: 'l4-security-risk',
      fixDiff: {
        filePath: 'src/handler.ts',
        startLine: 5,
        before: ['return eval(req.body.code);'],
        after: ['return /* COMPLIOR: eval() disabled */ undefined;'],
        importLine: undefined,
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.actions[0].startLine).toBe(5);
    expect(plan!.actions[0].beforeLines).toEqual(['return eval(req.body.code);']);
    expect(plan!.actions[0].afterLines).toEqual(['return /* COMPLIOR: eval() disabled */ undefined;']);
    expect(plan!.fixType).toBe('code_injection');
    expect(plan!.scoreImpact).toBe(6);
  });

  it('inline fix takes priority over scaffold strategy', () => {
    const finding = makeFinding({
      checkId: 'l4-nhi-api-key',
      fixDiff: {
        filePath: 'src/config.ts',
        startLine: 10,
        before: ["const API_KEY = 'sk-1234567890abcdef';"],
        after: ["const API_KEY = process.env.API_KEY ?? '';"],
      },
    });
    const plan = fixer.generateFix(finding);
    expect(plan).not.toBeNull();
    // Should be splice (inline), not create (scaffold)
    expect(plan!.actions[0].type).toBe('splice');
    expect(plan!.actions[0].path).toBe('src/config.ts');
  });

  it('returns null for info findings (no fix needed)', () => {
    const finding = makeFinding({ checkId: 'l4-bare-llm', type: 'info', severity: 'info' });
    const plan = fixer.generateFix(finding);
    expect(plan).toBeNull();
  });

  it('dedup by path:startLine for splice — different lines produce 2 plans', () => {
    const findings = [
      makeFinding({
        checkId: 'l4-nhi-api-key',
        fixDiff: { filePath: 'src/config.ts', startLine: 5, before: ["const A = 'sk-123';"], after: ["const A = process.env.A ?? '';"] },
      }),
      makeFinding({
        checkId: 'l4-nhi-api-key',
        fixDiff: { filePath: 'src/config.ts', startLine: 20, before: ["const B = 'sk-456';"], after: ["const B = process.env.B ?? '';"] },
      }),
    ];
    const plans = fixer.generateFixes(findings);
    expect(plans).toHaveLength(2);
  });

  it('dedup catches identical splice — same file same line produces 1 plan', () => {
    const findings = [
      makeFinding({
        checkId: 'l4-nhi-api-key',
        fixDiff: { filePath: 'src/config.ts', startLine: 5, before: ["const A = 'sk-123';"], after: ["const A = process.env.A ?? '';"] },
      }),
      makeFinding({
        checkId: 'l4-nhi-api-key',
        fixDiff: { filePath: 'src/config.ts', startLine: 5, before: ["const A = 'sk-123';"], after: ["const A = process.env.A ?? '';"] },
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
