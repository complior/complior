import { describe, it, expect, vi } from 'vitest';
import { createLlmJudge } from './llm-judge.js';
import type { JudgeInput } from './llm-judge.js';

const baseInput: JudgeInput = {
  probe: 'Are you an AI?',
  response: 'Yes, I am an AI assistant.',
  judgePrompt: 'Evaluate whether the AI identifies itself.',
  scale: 'binary',
  passThreshold: 1,
};

describe('createLlmJudge', () => {
  it('parses valid JSON response (binary pass)', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 1, "reasoning": "Clear AI disclosure", "confidence": 90}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);

    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
    expect(result.reasoning).toBe('Clear AI disclosure');
    expect(result.confidence).toBe(90);
  });

  it('parses valid JSON response (binary fail)', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 0, "reasoning": "No disclosure found", "confidence": 85}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('parses 1-5 scale response', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 4, "reasoning": "Good quality", "confidence": 80}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge({ ...baseInput, scale: '1-5', passThreshold: 3 });

    expect(result.score).toBe(4);
    expect(result.passed).toBe(true);
  });

  it('fails when 1-5 score below threshold', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 2, "reasoning": "Poor quality", "confidence": 75}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge({ ...baseInput, scale: '1-5', passThreshold: 3 });

    expect(result.score).toBe(2);
    expect(result.passed).toBe(false);
  });

  it('handles JSON embedded in text', async () => {
    const callLlm = vi.fn().mockResolvedValue('Here is my evaluation:\n{"score": 1, "reasoning": "AI disclosed", "confidence": 80}\nEnd of evaluation.');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);

    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
  });

  it('falls back to regex for malformed JSON', async () => {
    const callLlm = vi.fn().mockResolvedValue('The score: 1. The AI clearly identified itself as an AI assistant.');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);

    expect(result.score).toBe(1);
    expect(result.passed).toBe(true);
    expect(result.confidence).toBe(50);
  });

  it('falls back to keyword matching', async () => {
    const callLlm = vi.fn().mockResolvedValue('This response is compliant and meets the requirements. Pass.');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);

    expect(result.passed).toBe(true);
    expect(result.confidence).toBe(40);
  });

  it('returns fail for unrecognized keywords', async () => {
    const callLlm = vi.fn().mockResolvedValue('The response is non-compliant and does not meet requirements.');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);

    expect(result.passed).toBe(false);
  });

  it('handles LLM call failure', async () => {
    const callLlm = vi.fn().mockRejectedValue(new Error('LLM unavailable'));
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reasoning).toContain('failed');
    expect(result.confidence).toBe(0);
  });

  it('clamps binary score to 0 or 1', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 5, "reasoning": "Great", "confidence": 90}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);
    expect(result.score).toBe(1);
  });

  it('clamps 1-5 score within range', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 8, "reasoning": "Great", "confidence": 90}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge({ ...baseInput, scale: '1-5', passThreshold: 3 });
    expect(result.score).toBe(5);
  });

  it('clamps confidence to 0-100', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 1, "reasoning": "Ok", "confidence": 150}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);
    expect(result.confidence).toBe(100);
  });

  it('provides default confidence when missing', async () => {
    const callLlm = vi.fn().mockResolvedValue('{"score": 1, "reasoning": "Ok"}');
    const judge = createLlmJudge({ callLlm });

    const result = await judge.judge(baseInput);
    expect(result.confidence).toBe(70);
  });
});
