import { describe, it, expect } from 'vitest';
import { selectPromptType, extractSnippets, buildL5Prompt, createLayer5 } from './layer5-llm.js';
import type { Finding } from '../../../types/common.types.js';

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  checkId: 'ai-disclosure',
  type: 'fail',
  message: 'No AI disclosure found',
  severity: 'high',
  confidence: 55,
  confidenceLevel: 'UNCERTAIN',
  ...overrides,
});

describe('Scanner L5 — LLM Deep Analysis', () => {
  it('selectPromptType maps disclosure to code_pattern_check', () => {
    expect(selectPromptType(makeFinding({ checkId: 'ai-disclosure' }))).toBe('code_pattern_check');
  });

  it('selectPromptType maps documentation to documentation_check', () => {
    expect(selectPromptType(makeFinding({ checkId: 'documentation', message: 'Missing documentation' }))).toBe('documentation_check');
  });

  it('selectPromptType maps monitoring to architecture_check', () => {
    expect(selectPromptType(makeFinding({ checkId: 'monitoring', message: 'No monitoring found' }))).toBe('architecture_check');
  });

  it('selectPromptType maps data-related to data_handling_check', () => {
    expect(selectPromptType(makeFinding({ checkId: 'data-retention', message: 'No data retention policy' }))).toBe('data_handling_check');
  });

  it('extractSnippets returns relevant code', () => {
    const files = new Map([
      ['src/app.tsx', 'export function App() { return <AIDisclosure />; }'],
      ['src/utils.ts', 'export const add = (a: number, b: number) => a + b;'],
      ['src/compliance.ts', 'export const disclosure = "This service uses AI";'],
    ]);

    const snippets = extractSnippets(makeFinding(), files);
    expect(snippets.length).toBeGreaterThan(0);
    expect(snippets[0].relevance).toBeGreaterThan(0);
  });

  it('extractSnippets limits to 500 lines', () => {
    const longFile = Array(600).fill('const x = 1;').join('\n');
    const files = new Map([['src/long.ts', longFile]]);

    const snippets = extractSnippets(makeFinding(), files);
    if (snippets.length > 0) {
      expect(snippets[0].endLine).toBeLessThanOrEqual(500);
    }
  });

  it('buildL5Prompt includes finding info and snippets', () => {
    const snippets = [{ file: 'src/app.tsx', startLine: 1, endLine: 5, content: 'const x = 1;', relevance: 0.8 }];
    const prompt = buildL5Prompt('code_pattern_check', makeFinding(), snippets);

    expect(prompt).toContain('ai-disclosure');
    expect(prompt).toContain('No AI disclosure found');
    expect(prompt).toContain('src/app.tsx');
    expect(prompt).toContain('implementation patterns');
  });

  it('isUncertain identifies uncertain findings', () => {
    const l5 = createLayer5({
      callLlm: async () => ({ text: '{}', inputTokens: 0, outputTokens: 0 }),
      readFile: async () => '',
      calculateCost: () => 0,
    });

    expect(l5.isUncertain(makeFinding({ confidence: 55 }))).toBe(true);
    expect(l5.isUncertain(makeFinding({ confidence: 95 }))).toBe(false);
    expect(l5.isUncertain(makeFinding({ confidence: 20 }))).toBe(false);
  });

  it('analyzeFindings processes uncertain findings', async () => {
    const l5 = createLayer5({
      callLlm: async () => ({
        text: JSON.stringify({
          verdict: 'pass',
          confidence: 85,
          reasoning: 'Disclosure component found',
          evidence: ['src/app.tsx:1 — AIDisclosure component'],
        }),
        inputTokens: 500,
        outputTokens: 200,
      }),
      readFile: async () => '',
      calculateCost: () => 0.01,
    });

    const findings: Finding[] = [
      makeFinding({ confidence: 55 }),
      makeFinding({ checkId: 'logging', confidence: 45, message: 'No logging found' }),
      makeFinding({ checkId: 'certain', confidence: 95, message: 'Already certain' }),
    ];

    const files = new Map([['src/app.tsx', 'const disclosure = true;']]);
    const results = await l5.analyzeFindings(findings, files);

    // Only 2 uncertain findings should be analyzed (confidence 40-70)
    expect(results).toHaveLength(2);
    expect(results[0].verdict).toBe('pass');
    expect(results[0].newConfidence).toBe(85);
  });

  it('applyResults updates findings', () => {
    const l5 = createLayer5({
      callLlm: async () => ({ text: '{}', inputTokens: 0, outputTokens: 0 }),
      readFile: async () => '',
      calculateCost: () => 0,
    });

    const findings: Finding[] = [makeFinding({ confidence: 55 })];
    const l5Results = [{
      findingId: 'ai-disclosure',
      originalConfidence: 55,
      newConfidence: 85,
      verdict: 'pass' as const,
      reasoning: 'Found',
      evidence: [],
      promptType: 'code_pattern_check' as const,
      cost: 0.01,
    }];

    const updated = l5.applyResults(findings, l5Results);
    expect(updated[0].type).toBe('pass');
    expect(updated[0].confidence).toBe(85);
    expect(updated[0].severity).toBe('info');
  });

  it('handles LLM errors gracefully', async () => {
    const l5 = createLayer5({
      callLlm: async () => { throw new Error('LLM timeout'); },
      readFile: async () => '',
      calculateCost: () => 0,
    });

    const findings: Finding[] = [makeFinding({ confidence: 55 })];
    const results = await l5.analyzeFindings(findings, new Map());

    expect(results).toHaveLength(1);
    expect(results[0].verdict).toBe('uncertain');
    expect(results[0].reasoning).toContain('failed');
  });
});
