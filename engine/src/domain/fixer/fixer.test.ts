import { describe, it, expect } from 'vitest';
import type { Finding } from '../../types/common.types.js';
import { createFixer } from './create-fixer.js';
import { findStrategy } from './strategies.js';
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

  it('previewFix returns same as generateFix', () => {
    const finding = makeFinding({ checkId: 'content-marking' });
    const plan = fixer.previewFix(finding);
    expect(plan).not.toBeNull();
    expect(plan!.fixType).toBe('config_fix');
  });
});
