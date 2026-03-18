import { describe, it, expect } from 'vitest';
import { importFromPromptfoo } from './promptfoo-importer.js';

const validInput = {
  version: 2,
  timestamp: '2026-03-17T10:00:00.000Z',
  results: {
    results: [
      {
        success: true,
        score: 1.0,
        metadata: { pluginId: 'prompt-extraction' },
        namedScores: {},
      },
      {
        success: false,
        score: 0.0,
        metadata: { pluginId: 'harmful:privacy' },
        namedScores: {},
      },
      {
        success: true,
        score: 1.0,
        metadata: { pluginId: 'shell-injection' },
        namedScores: {},
      },
    ],
    stats: {
      successes: 2,
      failures: 1,
    },
  },
};

describe('importFromPromptfoo', () => {
  it('imports valid Promptfoo JSON', () => {
    const result = importFromPromptfoo(validInput);
    expect(result.probesRun).toBe(3);
    expect(result.probesPassed).toBe(2);
    expect(result.probesFailed).toBe(1);
    expect(result.testResults).toHaveLength(3);
    expect(result.securityScore.score).toBeGreaterThan(0);
    expect(result.timestamp).toBe('2026-03-17T10:00:00.000Z');
  });

  it('calculates security score from results', () => {
    const result = importFromPromptfoo(validInput);
    expect(result.securityScore.grade).toBeTruthy();
    expect(result.securityScore.categories.length).toBeGreaterThan(0);
  });

  it('throws VALIDATION_ERROR on invalid input', () => {
    expect(() => importFromPromptfoo({ invalid: true })).toThrow('VALIDATION_ERROR');
  });

  it('throws VALIDATION_ERROR on non-object', () => {
    expect(() => importFromPromptfoo('not json')).toThrow('VALIDATION_ERROR');
  });

  it('throws VALIDATION_ERROR on null', () => {
    expect(() => importFromPromptfoo(null)).toThrow('VALIDATION_ERROR');
  });

  it('handles results with no metadata gracefully', () => {
    const input = {
      results: {
        results: [
          { success: true, score: 1.0 },
          { success: false, score: 0.0 },
        ],
      },
    };
    const result = importFromPromptfoo(input);
    expect(result.probesRun).toBe(2);
    expect(result.probesPassed).toBe(1);
    expect(result.probesFailed).toBe(1);
  });

  it('handles empty results array', () => {
    const input = {
      results: {
        results: [],
      },
    };
    const result = importFromPromptfoo(input);
    expect(result.probesRun).toBe(0);
    expect(result.securityScore.score).toBe(0);
    expect(result.securityScore.grade).toBe('F');
  });

  it('maps plugin IDs to OWASP categories', () => {
    const input = {
      results: {
        results: [
          { success: false, metadata: { pluginId: 'prompt-extraction' } },
        ],
      },
    };
    const result = importFromPromptfoo(input);
    // prompt-extraction maps to LLM01 (Prompt Injection)
    expect(result.testResults[0]!.owaspCategory).toBe('LLM01');
  });
});
