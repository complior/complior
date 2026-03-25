import { describe, it, expect } from 'vitest';
import { generateRemediationReport, renderRemediationMarkdown } from './eval-remediation-report.js';
import type { EvalResult, EvalCategory, TestResult, CategoryScore } from './types.js';
import type { CategoryPlaybook, RemediationAction, RemediationReport } from './remediation-types.js';
import { CT_1_PLAYBOOK } from '../../data/eval/remediation/ct-1-transparency.js';
import { CT_7_PLAYBOOK } from '../../data/eval/remediation/ct-7-prohibited.js';
import { ALL_CT_PLAYBOOKS } from '../../data/eval/remediation/index.js';

// ── Helpers ──────────────────────────────────────────────────

const mockFailure = (testId: string, category: string, owaspCategory?: string): TestResult => ({
  testId,
  name: `Test ${testId}`,
  category: category as EvalCategory,
  method: 'deterministic' as const,
  verdict: 'fail' as const,
  score: 0,
  confidence: 75,
  reasoning: 'test failure',
  probe: 'test probe',
  response: 'test response',
  latencyMs: 100,
  timestamp: new Date().toISOString(),
  ...(owaspCategory ? { owaspCategory } : {}),
});

const mockPass = (testId: string, category: string): TestResult => ({
  testId,
  name: `Test ${testId}`,
  category: category as EvalCategory,
  method: 'deterministic' as const,
  verdict: 'pass' as const,
  score: 100,
  confidence: 90,
  reasoning: 'test passed',
  probe: 'test probe',
  response: 'good response',
  latencyMs: 50,
  timestamp: new Date().toISOString(),
});

const mockCategoryScore = (
  category: string,
  passed: number,
  failed: number,
  total?: number,
): CategoryScore => ({
  category: category as EvalCategory,
  score: total ? Math.round((passed / (total || 1)) * 100) : (failed === 0 ? 100 : 0),
  grade: failed === 0 ? 'A' : 'F',
  passed,
  failed,
  errors: 0,
  inconclusive: 0,
  skipped: 0,
  total: total ?? (passed + failed),
});

const mockEvalResult = (
  results: TestResult[],
  categories: CategoryScore[],
  overrides?: Partial<EvalResult>,
): EvalResult => ({
  target: 'http://localhost:3000',
  tier: 'basic',
  overallScore: overrides?.overallScore ?? 45,
  grade: overrides?.grade ?? 'F',
  categories,
  results,
  totalTests: results.length,
  passed: results.filter((r) => r.verdict === 'pass').length,
  failed: results.filter((r) => r.verdict === 'fail').length,
  errors: results.filter((r) => r.verdict === 'error').length,
  inconclusive: 0,
  skipped: 0,
  duration: 1234,
  timestamp: new Date().toISOString(),
  criticalCapped: false,
  ...overrides,
});

const makeAction = (
  id: string,
  priority: 'critical' | 'high' | 'medium' | 'low',
  type: 'system_prompt' | 'api_config' | 'infrastructure' | 'process' = 'system_prompt',
): RemediationAction => ({
  id,
  type,
  title: `Action ${id}`,
  description: `Description for ${id}`,
  example: `"Example instruction for ${id}"`,
  priority,
  effort: 'minimal',
  article_ref: 'Art.99',
  user_guidance: {
    why: `Reason for ${id}`,
    what_to_do: [`Step 1 for ${id}`, `Step 2 for ${id}`],
    verification: `Verify ${id}`,
    resources: ['https://example.com'],
  },
});

const makePlaybook = (categoryId: string, actions: RemediationAction[]): CategoryPlaybook => ({
  category_id: categoryId,
  label: `Category ${categoryId}`,
  article_ref: 'Art.99',
  description: `Playbook for ${categoryId}`,
  actions,
});

// ── generateRemediationReport ────────────────────────────────

describe('generateRemediationReport', () => {
  it('generates a report with all required fields from failures across 2 categories', () => {
    const results: TestResult[] = [
      mockFailure('CT-1-001', 'transparency'),
      mockFailure('CT-1-002', 'transparency'),
      mockFailure('CT-7-001', 'prohibited'),
      mockPass('CT-1-003', 'transparency'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('transparency', 1, 2, 3),
      mockCategoryScore('prohibited', 0, 1, 1),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 30, grade: 'F' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-1-001': [CT_1_PLAYBOOK.actions[0]],
      'CT-1-002': [CT_1_PLAYBOOK.actions[0], CT_1_PLAYBOOK.actions[1]],
      'CT-7-001': [CT_7_PLAYBOOK.actions[0]],
    };

    const report = generateRemediationReport(evalResult, remediation, [CT_1_PLAYBOOK, CT_7_PLAYBOOK]);

    expect(report.score).toBe(30);
    expect(report.grade).toBe('F');
    expect(report.total_failures).toBe(3);
    expect(report.actions.length).toBeGreaterThan(0);
    expect(report.critical_gaps.length).toBeGreaterThan(0);
    expect(report.timestamp).toBeTruthy();
    expect(typeof report.timestamp).toBe('string');
    // timestamp is ISO-8601
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('report actions have all required fields', () => {
    const results: TestResult[] = [
      mockFailure('CT-1-001', 'transparency'),
      mockFailure('CT-1-002', 'transparency'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('transparency', 0, 2, 2),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 20, grade: 'F' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-1-001': [CT_1_PLAYBOOK.actions[0]],
      'CT-1-002': [CT_1_PLAYBOOK.actions[1]],
    };

    const report = generateRemediationReport(evalResult, remediation, [CT_1_PLAYBOOK]);

    for (const action of report.actions) {
      expect(action.id).toBeTruthy();
      expect(typeof action.title).toBe('string');
      expect(action.title.length).toBeGreaterThan(0);
      expect(typeof action.description).toBe('string');
      expect(action.description.length).toBeGreaterThan(0);
      expect(typeof action.example).toBe('string');
      expect(['critical', 'high', 'medium', 'low']).toContain(action.priority);
      expect(['minimal', 'moderate', 'significant']).toContain(action.effort);
      expect(typeof action.article_ref).toBe('string');
      expect(action.article_ref.length).toBeGreaterThan(0);
      expect(typeof action.affected_tests).toBe('number');
      expect(action.affected_tests).toBeGreaterThanOrEqual(1);
      expect(typeof action.timeline).toBe('string');
      expect(['this week', 'next week', 'this month', 'backlog']).toContain(action.timeline);
      expect(Array.isArray(action.steps)).toBe(true);
      expect(action.steps.length).toBeGreaterThan(0);
    }
  });

  it('sorts actions by priority: critical before high before medium', () => {
    const criticalAction = makeAction('CRIT-1', 'critical');
    const highAction = makeAction('HIGH-1', 'high');
    const mediumAction = makeAction('MED-1', 'medium');

    const playbookA = makePlaybook('cat-a', [mediumAction]);
    const playbookB = makePlaybook('cat-b', [highAction]);
    const playbookC = makePlaybook('cat-c', [criticalAction]);

    const results: TestResult[] = [
      mockFailure('T-001', 'cat-a' as EvalCategory),
      mockFailure('T-002', 'cat-b' as EvalCategory),
      mockFailure('T-003', 'cat-c' as EvalCategory),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('cat-a', 0, 1, 1),
      mockCategoryScore('cat-b', 0, 1, 1),
      mockCategoryScore('cat-c', 0, 1, 1),
    ];
    const evalResult = mockEvalResult(results, categories);

    const remediation: Record<string, RemediationAction[]> = {
      'T-001': [mediumAction],
      'T-002': [highAction],
      'T-003': [criticalAction],
    };

    const report = generateRemediationReport(evalResult, remediation, [playbookA, playbookB, playbookC]);

    expect(report.actions.length).toBe(3);
    expect(report.actions[0].priority).toBe('critical');
    expect(report.actions[1].priority).toBe('high');
    expect(report.actions[2].priority).toBe('medium');
  });

  it('limits actions to maximum 10', () => {
    // Create 15 unique actions across multiple categories
    const actions: RemediationAction[] = [];
    for (let i = 1; i <= 15; i++) {
      actions.push(makeAction(`ACT-${i}`, 'high'));
    }

    const playbooks: CategoryPlaybook[] = [];
    const results: TestResult[] = [];
    const remediation: Record<string, RemediationAction[]> = {};
    const categories: CategoryScore[] = [];

    for (let i = 0; i < 15; i++) {
      const catId = `cat-${i}` as EvalCategory;
      playbooks.push(makePlaybook(catId, [actions[i]]));
      const testId = `T-${i + 1}`;
      results.push(mockFailure(testId, catId));
      remediation[testId] = [actions[i]];
      categories.push(mockCategoryScore(catId, 0, 1, 1));
    }

    const evalResult = mockEvalResult(results, categories);
    const report = generateRemediationReport(evalResult, remediation, playbooks);

    expect(report.actions.length).toBe(10);
  });

  it('detects critical gaps for category with pass rate < 0.20', () => {
    // accuracy: 1 passed, 9 failed = 10% pass rate → critical gap
    const results: TestResult[] = [
      mockPass('CT-5-001', 'accuracy'),
      ...Array.from({ length: 9 }, (_, i) => mockFailure(`CT-5-${i + 2}`, 'accuracy')),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('accuracy', 1, 9, 10),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 10, grade: 'F' });

    const remediation: Record<string, RemediationAction[]> = {};
    for (const r of results.filter((r) => r.verdict === 'fail')) {
      remediation[r.testId] = [makeAction('ACC-A1', 'high')];
    }

    const report = generateRemediationReport(evalResult, remediation, []);

    expect(report.critical_gaps).toContain('accuracy');
  });

  it('detects critical gaps for transparency with any failure', () => {
    // transparency: 9 passed, 1 failed = 90% pass rate, but transparency is always critical on failure
    const results: TestResult[] = [
      ...Array.from({ length: 9 }, (_, i) => mockPass(`CT-1-${i + 1}`, 'transparency')),
      mockFailure('CT-1-010', 'transparency'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('transparency', 9, 1, 10),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 90, grade: 'A' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-1-010': [CT_1_PLAYBOOK.actions[0]],
    };

    const report = generateRemediationReport(evalResult, remediation, [CT_1_PLAYBOOK]);

    expect(report.critical_gaps).toContain('transparency');
  });

  it('detects critical gaps for prohibited with any failure', () => {
    const results: TestResult[] = [
      ...Array.from({ length: 8 }, (_, i) => mockPass(`CT-7-${i + 1}`, 'prohibited')),
      mockFailure('CT-7-009', 'prohibited'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('prohibited', 8, 1, 9),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 85, grade: 'B' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-7-009': [CT_7_PLAYBOOK.actions[0]],
    };

    const report = generateRemediationReport(evalResult, remediation, [CT_7_PLAYBOOK]);

    expect(report.critical_gaps).toContain('prohibited');
  });

  it('does not flag non-critical categories with decent pass rate as critical gaps', () => {
    // accuracy: 8 passed, 2 failed = 80% pass rate, not critical
    const results: TestResult[] = [
      ...Array.from({ length: 8 }, (_, i) => mockPass(`CT-5-${i + 1}`, 'accuracy')),
      mockFailure('CT-5-009', 'accuracy'),
      mockFailure('CT-5-010', 'accuracy'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('accuracy', 8, 2, 10),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 80, grade: 'B' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-5-009': [makeAction('ACC-A1', 'medium')],
      'CT-5-010': [makeAction('ACC-A1', 'medium')],
    };

    const report = generateRemediationReport(evalResult, remediation, []);

    expect(report.critical_gaps).not.toContain('accuracy');
  });

  it('includes system_prompt_patch when system_prompt type actions exist in playbooks', () => {
    const results: TestResult[] = [
      mockFailure('CT-1-001', 'transparency'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('transparency', 0, 1, 1),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 0, grade: 'F' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-1-001': [CT_1_PLAYBOOK.actions[0]],
    };

    const report = generateRemediationReport(evalResult, remediation, [CT_1_PLAYBOOK]);

    expect(report.system_prompt_patch).toBeDefined();
    expect(typeof report.system_prompt_patch).toBe('string');
    expect(report.system_prompt_patch!.length).toBeGreaterThan(0);
    expect(report.system_prompt_patch).toContain('System Prompt Compliance Patch');
  });

  it('includes api_config_patch when relevant categories (transparency) fail', () => {
    // CT_1_PLAYBOOK has an api_config action (CT-1-A3) which triggers transparency headers
    const results: TestResult[] = [
      mockFailure('CT-1-001', 'transparency'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('transparency', 0, 1, 1),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 0, grade: 'F' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-1-001': [CT_1_PLAYBOOK.actions[2]], // CT-1-A3 is api_config
    };

    const report = generateRemediationReport(evalResult, remediation, [CT_1_PLAYBOOK]);

    expect(report.api_config_patch).toBeDefined();
    expect(report.api_config_patch!.headers['X-AI-Generated']).toBe('true');
  });

  it('omits api_config_patch when no api_config relevant categories fail', () => {
    // Use a playbook with only system_prompt and process actions
    const processOnlyPlaybook = makePlaybook('custom-cat', [
      makeAction('PROC-1', 'high', 'process'),
    ]);

    const results: TestResult[] = [
      mockFailure('T-001', 'custom-cat' as EvalCategory),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('custom-cat', 0, 1, 1),
    ];
    const evalResult = mockEvalResult(results, categories);

    const remediation: Record<string, RemediationAction[]> = {
      'T-001': [makeAction('PROC-1', 'high', 'process')],
    };

    const report = generateRemediationReport(evalResult, remediation, [processOnlyPlaybook]);

    expect(report.api_config_patch).toBeUndefined();
  });

  it('deduplicates actions shared across multiple test failures', () => {
    const sharedAction = makeAction('SHARED-1', 'critical');
    const playbook = makePlaybook('cat-x', [sharedAction]);

    const results: TestResult[] = [
      mockFailure('T-001', 'cat-x' as EvalCategory),
      mockFailure('T-002', 'cat-x' as EvalCategory),
      mockFailure('T-003', 'cat-x' as EvalCategory),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('cat-x', 0, 3, 3),
    ];
    const evalResult = mockEvalResult(results, categories);

    const remediation: Record<string, RemediationAction[]> = {
      'T-001': [sharedAction],
      'T-002': [sharedAction],
      'T-003': [sharedAction],
    };

    const report = generateRemediationReport(evalResult, remediation, [playbook]);

    // Deduplicated: one action, but affected_tests = 3
    expect(report.actions.length).toBe(1);
    expect(report.actions[0].id).toBe('SHARED-1');
    expect(report.actions[0].affected_tests).toBe(3);
  });

  it('assigns correct timelines based on priority', () => {
    const critAction = makeAction('C-1', 'critical');
    const highAction = makeAction('H-1', 'high');
    const medAction = makeAction('M-1', 'medium');
    const lowAction = makeAction('L-1', 'low');

    const pb = makePlaybook('mixed', [critAction, highAction, medAction, lowAction]);

    const results: TestResult[] = [
      mockFailure('T-1', 'mixed' as EvalCategory),
      mockFailure('T-2', 'mixed' as EvalCategory),
      mockFailure('T-3', 'mixed' as EvalCategory),
      mockFailure('T-4', 'mixed' as EvalCategory),
    ];
    const categories: CategoryScore[] = [mockCategoryScore('mixed', 0, 4, 4)];
    const evalResult = mockEvalResult(results, categories);

    const remediation: Record<string, RemediationAction[]> = {
      'T-1': [critAction],
      'T-2': [highAction],
      'T-3': [medAction],
      'T-4': [lowAction],
    };

    const report = generateRemediationReport(evalResult, remediation, [pb]);

    const byId = new Map(report.actions.map((a) => [a.id, a]));
    expect(byId.get('C-1')?.timeline).toBe('this week');
    expect(byId.get('H-1')?.timeline).toBe('next week');
    expect(byId.get('M-1')?.timeline).toBe('this month');
    expect(byId.get('L-1')?.timeline).toBe('backlog');
  });

  it('returns frozen report object', () => {
    const results: TestResult[] = [mockFailure('T-1', 'transparency')];
    const categories: CategoryScore[] = [mockCategoryScore('transparency', 0, 1, 1)];
    const evalResult = mockEvalResult(results, categories);

    const remediation: Record<string, RemediationAction[]> = {
      'T-1': [CT_1_PLAYBOOK.actions[0]],
    };

    const report = generateRemediationReport(evalResult, remediation, [CT_1_PLAYBOOK]);

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.actions)).toBe(true);
    expect(Object.isFrozen(report.critical_gaps)).toBe(true);
  });

  it('works with real playbook data from ALL_CT_PLAYBOOKS', () => {
    const results: TestResult[] = [
      mockFailure('CT-1-001', 'transparency'),
      mockFailure('CT-7-001', 'prohibited'),
    ];
    const categories: CategoryScore[] = [
      mockCategoryScore('transparency', 0, 1, 1),
      mockCategoryScore('prohibited', 0, 1, 1),
    ];
    const evalResult = mockEvalResult(results, categories, { overallScore: 25, grade: 'F' });

    const remediation: Record<string, RemediationAction[]> = {
      'CT-1-001': [...CT_1_PLAYBOOK.actions],
      'CT-7-001': [...CT_7_PLAYBOOK.actions],
    };

    const report = generateRemediationReport(evalResult, remediation, ALL_CT_PLAYBOOKS);

    expect(report.actions.length).toBeGreaterThan(0);
    expect(report.actions.length).toBeLessThanOrEqual(10);
    expect(report.critical_gaps).toContain('transparency');
    expect(report.critical_gaps).toContain('prohibited');
    // Should have system prompt patch from transparency + prohibited system_prompt actions
    expect(report.system_prompt_patch).toBeDefined();
  });

  it('skips categories with total=0 in critical gap detection', () => {
    const results: TestResult[] = [mockFailure('T-1', 'accuracy')];
    const categories: CategoryScore[] = [
      mockCategoryScore('accuracy', 0, 1, 1),
      // Empty category should be skipped
      { category: 'transparency' as EvalCategory, score: 0, grade: 'F', passed: 0, failed: 0, errors: 0, inconclusive: 0, skipped: 0, total: 0 },
    ];
    const evalResult = mockEvalResult(results, categories);
    const remediation: Record<string, RemediationAction[]> = {
      'T-1': [makeAction('A-1', 'high')],
    };

    const report = generateRemediationReport(evalResult, remediation, []);

    // transparency has total=0, should not appear in critical_gaps despite being a critical category
    expect(report.critical_gaps).not.toContain('transparency');
    // accuracy: 0/1 = 0% pass rate < 0.20 → critical gap
    expect(report.critical_gaps).toContain('accuracy');
  });

  it('counts error verdicts as failures', () => {
    const errorResult: TestResult = {
      testId: 'T-ERR',
      name: 'Error Test',
      category: 'accuracy' as EvalCategory,
      method: 'deterministic',
      verdict: 'error',
      score: 0,
      confidence: 0,
      reasoning: 'timeout',
      probe: 'probe',
      response: '',
      latencyMs: 5000,
      timestamp: new Date().toISOString(),
    };

    const results: TestResult[] = [errorResult, mockFailure('T-001', 'accuracy')];
    const categories: CategoryScore[] = [mockCategoryScore('accuracy', 0, 2, 2)];
    const evalResult = mockEvalResult(results, categories);

    const remediation: Record<string, RemediationAction[]> = {
      'T-ERR': [makeAction('A-1', 'high')],
      'T-001': [makeAction('A-1', 'high')],
    };

    const report = generateRemediationReport(evalResult, remediation, []);

    expect(report.total_failures).toBe(2);
  });
});

// ── renderRemediationMarkdown ────────────────────────────────

describe('renderRemediationMarkdown', () => {
  const makeReport = (overrides?: Partial<RemediationReport>): RemediationReport => ({
    score: 35,
    grade: 'F',
    total_failures: 5,
    critical_gaps: ['transparency', 'prohibited'],
    actions: [
      {
        id: 'CT-1-A1',
        title: 'AI Disclosure & Identity',
        description: 'Add mandatory AI disclosure to system prompt',
        example: '"You are an AI assistant."',
        priority: 'critical',
        effort: 'minimal',
        article_ref: 'Art.50(1)',
        affected_tests: 3,
        timeline: 'this week',
        steps: ['Open your system prompt', 'Add disclosure instruction', 'Re-run eval'],
      },
      {
        id: 'CT-7-A1',
        title: 'Anti-Manipulation Guardrails',
        description: 'Ensure no subliminal techniques',
        example: '"Never use manipulative techniques"',
        priority: 'high',
        effort: 'minimal',
        article_ref: 'Art.5(1)(a)',
        affected_tests: 2,
        timeline: 'next week',
        steps: ['Add anti-manipulation instructions', 'Audit outputs'],
      },
    ],
    system_prompt_patch: '# System Prompt Compliance Patch\n\nAdd these instructions.',
    timestamp: '2026-03-23T12:00:00.000Z',
    ...overrides,
  });

  it('returns a markdown string with executive summary', () => {
    const md = renderRemediationMarkdown(makeReport());

    expect(typeof md).toBe('string');
    expect(md).toContain('# Complior Eval');
    expect(md).toContain('Remediation Report');
    expect(md).toContain('## Executive Summary');
    expect(md).toContain('Critical compliance gaps');
    expect(md).toContain('transparency');
    expect(md).toContain('prohibited');
  });

  it('includes action plan section with numbered actions and steps', () => {
    const md = renderRemediationMarkdown(makeReport());

    expect(md).toContain('## Prioritized Action Plan');
    expect(md).toContain('2 remediation actions identified');
    // Numbered action headers
    expect(md).toContain('### 1. [CRITICAL] AI Disclosure & Identity');
    expect(md).toContain('### 2. [HIGH] Anti-Manipulation Guardrails');
    // Action metadata
    expect(md).toContain('**Article:** Art.50(1)');
    expect(md).toContain('**Affected tests:** 3');
    expect(md).toContain('**Effort:** minimal');
    expect(md).toContain('**Timeline:** this week');
    // Steps
    expect(md).toContain('**Steps:**');
    expect(md).toContain('1. Open your system prompt');
    expect(md).toContain('1. Add disclosure instruction');
    expect(md).toContain('1. Re-run eval');
  });

  it('includes system prompt patch section when present', () => {
    const md = renderRemediationMarkdown(makeReport());

    expect(md).toContain('## System Prompt Patch');
    expect(md).toContain('System Prompt Compliance Patch');
    expect(md).toContain('Add these instructions.');
  });

  it('omits system prompt patch section when not present', () => {
    const md = renderRemediationMarkdown(makeReport({ system_prompt_patch: undefined }));

    expect(md).not.toContain('## System Prompt Patch');
  });

  it('includes API configuration patch section when present', () => {
    const apiPatch = {
      headers: { 'X-AI-Generated': 'true' },
      inputValidation: { bannedPatterns: ['jailbreak'] as readonly string[] },
      outputValidation: {},
      providerExamples: {},
    };

    const md = renderRemediationMarkdown(makeReport({ api_config_patch: apiPatch }));

    expect(md).toContain('## API Configuration Patch');
    expect(md).toContain('```json');
    expect(md).toContain('X-AI-Generated');
  });

  it('omits API configuration patch section when not present', () => {
    const md = renderRemediationMarkdown(makeReport({ api_config_patch: undefined }));

    expect(md).not.toContain('## API Configuration Patch');
  });

  it('includes score, grade, and date in header', () => {
    const md = renderRemediationMarkdown(makeReport());

    expect(md).toContain('**Score:** 35/100 (Grade F)');
    expect(md).toContain('**Date:** 2026-03-23');
    expect(md).toContain('**Total failures:** 5');
  });

  it('renders alternative summary when no critical gaps', () => {
    const md = renderRemediationMarkdown(makeReport({ critical_gaps: [] }));

    expect(md).not.toContain('Critical compliance gaps');
    expect(md).toContain('No critical compliance gaps detected');
    expect(md).toContain('Focus on improving pass rates');
  });

  it('includes footer with complior branding', () => {
    const md = renderRemediationMarkdown(makeReport());

    expect(md).toContain('---');
    expect(md).toContain('complior eval --remediation');
  });

  it('renders correctly with empty actions list', () => {
    const md = renderRemediationMarkdown(makeReport({ actions: [] }));

    expect(md).toContain('0 remediation actions identified');
    // Should still have all other sections
    expect(md).toContain('## Executive Summary');
    expect(md).toContain('## Prioritized Action Plan');
  });
});
