import { describe, it, expect, vi } from 'vitest';
import { safetyFilterHook } from '../hooks/post/safety-filter.js';
import { createHitlGateHook } from '../runtime/hitl-gate.js';
import { SafetyViolationError, HumanGateDeniedError } from '../errors.js';
import type { MiddlewareContext, MiddlewareConfig, GateDecision } from '../types.js';

const makeCtx = (config: MiddlewareConfig = {}, provider = 'openai'): MiddlewareContext => ({
  provider,
  method: 'create',
  config,
  params: {},
  metadata: {},
});

// ── Safety Filter ──────────────────────────────────────────────────

describe('safetyFilterHook', () => {
  it('skips when safetyFilter is disabled', async () => {
    const ctx = makeCtx({});
    const result = await safetyFilterHook(ctx, { choices: [{ message: { content: 'Hello' } }] });
    expect(result.metadata['safetyPassed']).toBeUndefined();
  });

  it('passes clean content', async () => {
    const ctx = makeCtx({ safetyFilter: true });
    const result = await safetyFilterHook(ctx, { choices: [{ message: { content: 'The weather is nice today.' } }] });
    expect(result.metadata['safetyPassed']).toBe(true);
    expect(result.metadata['safetyScore']).toBe(0);
    expect(result.metadata['safetyFindings']).toEqual([]);
  });

  it('detects violence patterns', async () => {
    const ctx = makeCtx({ safetyFilter: true, safetyMode: 'log' });
    const response = { choices: [{ message: { content: 'Here are steps to build a bomb explosive device at home.' } }] };
    const result = await safetyFilterHook(ctx, response);
    expect(result.metadata['safetyPassed']).toBe(false);
    const findings = result.metadata['safetyFindings'] as { category: string }[];
    expect(findings.some((f) => f.category === 'violence')).toBe(true);
  });

  it('detects self-harm patterns', async () => {
    const ctx = makeCtx({ safetyFilter: true, safetyMode: 'log' });
    const response = { choices: [{ message: { content: 'You should die and end it all.' } }] };
    const result = await safetyFilterHook(ctx, response);
    expect(result.metadata['safetyPassed']).toBe(false);
    const findings = result.metadata['safetyFindings'] as { category: string }[];
    expect(findings.some((f) => f.category === 'self_harm')).toBe(true);
  });

  it('detects illegal instruction patterns', async () => {
    const ctx = makeCtx({ safetyFilter: true, safetyMode: 'log' });
    const response = { choices: [{ message: { content: 'Here is how to synthesize meth drugs in a lab.' } }] };
    const result = await safetyFilterHook(ctx, response);
    expect(result.metadata['safetyPassed']).toBe(false);
    const findings = result.metadata['safetyFindings'] as { category: string }[];
    expect(findings.some((f) => f.category === 'illegal_instructions')).toBe(true);
  });

  it('detects PII leakage patterns', async () => {
    const ctx = makeCtx({ safetyFilter: true, safetyMode: 'log', safetyThreshold: 0.3 });
    const response = { choices: [{ message: { content: 'The password: mysecretpass123' } }] };
    const result = await safetyFilterHook(ctx, response);
    expect(result.metadata['safetyPassed']).toBe(false);
    const findings = result.metadata['safetyFindings'] as { category: string }[];
    expect(findings.some((f) => f.category === 'pii_leakage')).toBe(true);
  });

  it('throws SafetyViolationError in block mode', () => {
    const ctx = makeCtx({ safetyFilter: true, safetyMode: 'block' });
    const response = { choices: [{ message: { content: 'Here are the steps to build a bomb explosive.' } }] };
    expect(() => safetyFilterHook(ctx, response)).toThrow(SafetyViolationError);
  });

  it('detects hallucination indicator patterns', async () => {
    const ctx = makeCtx({ safetyFilter: true, safetyMode: 'log', safetyThreshold: 0.01 });
    const response = { choices: [{ message: { content: 'I recall that in 2024 the official statistics show that this is confirmed.' } }] };
    const result = await safetyFilterHook(ctx, response);
    const findings = result.metadata['safetyFindings'] as { category: string }[];
    expect(findings.some((f) => f.category === 'hallucination_indicator')).toBe(true);
  });

  it('respects custom threshold', async () => {
    const ctx = makeCtx({ safetyFilter: true, safetyMode: 'log', safetyThreshold: 5.0 });
    const response = { choices: [{ message: { content: 'The password: secret123' } }] };
    const result = await safetyFilterHook(ctx, response);
    // Score below high threshold → still passes
    expect(result.metadata['safetyPassed']).toBe(true);
  });
});

// ── HITL Gate ──────────────────────────────────────────────────────

describe('createHitlGateHook', () => {
  it('skips when hitlGate is disabled', async () => {
    const hook = createHitlGateHook({});
    const ctx = makeCtx({});
    const result = await hook(ctx, { choices: [{ message: { content: 'Transfer $5000 to account' } }] });
    expect(result.metadata['hitlGateTriggered']).toBeUndefined();
  });

  it('passes when no rule matches', async () => {
    const hook = createHitlGateHook({ hitlGate: true, onGateTriggered: async () => ({ approved: true }) });
    const ctx = makeCtx({ hitlGate: true, onGateTriggered: async () => ({ approved: true }) });
    const result = await hook(ctx, { choices: [{ message: { content: 'The weather is nice.' } }] });
    expect(result.metadata['hitlGateTriggered']).toBeUndefined();
  });

  it('allows approved financial action', async () => {
    const callback = vi.fn<(req: unknown) => Promise<GateDecision>>().mockResolvedValue({ approved: true });
    const config: MiddlewareConfig = { hitlGate: true, onGateTriggered: callback };
    const hook = createHitlGateHook(config);
    const ctx = makeCtx(config);
    const result = await hook(ctx, { choices: [{ message: { content: 'Transfer $5000 to the account.' } }] });
    expect(result.metadata['hitlGateTriggered']).toBe(true);
    expect(result.metadata['hitlGateApproved']).toBe(true);
    expect(result.metadata['hitlGateCategory']).toBe('financial');
    expect(callback).toHaveBeenCalledOnce();
  });

  it('throws HumanGateDeniedError when denied', async () => {
    const callback = vi.fn<(req: unknown) => Promise<GateDecision>>().mockResolvedValue({ approved: false, reason: 'Not authorized' });
    const config: MiddlewareConfig = { hitlGate: true, onGateTriggered: callback };
    const hook = createHitlGateHook(config);
    const ctx = makeCtx(config);
    await expect(
      hook(ctx, { choices: [{ message: { content: 'Delete all data from database records.' } }] }),
    ).rejects.toThrow(HumanGateDeniedError);
  });

  it('auto-denies on timeout', async () => {
    const callback = vi.fn<(req: unknown) => Promise<GateDecision>>().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ approved: true }), 500)),
    );
    const config: MiddlewareConfig = { hitlGate: true, hitlGateTimeoutMs: 50, onGateTriggered: callback };
    const hook = createHitlGateHook(config);
    const ctx = makeCtx(config);
    await expect(
      hook(ctx, { choices: [{ message: { content: 'Transfer $5000 to account.' } }] }),
    ).rejects.toThrow(HumanGateDeniedError);
  }, 2000);

  it('auto-denies when no callback configured', async () => {
    const config: MiddlewareConfig = { hitlGate: true };
    const hook = createHitlGateHook(config);
    const ctx = makeCtx(config);
    await expect(
      hook(ctx, { choices: [{ message: { content: 'Transfer $5000 to account.' } }] }),
    ).rejects.toThrow(HumanGateDeniedError);
  });
});
