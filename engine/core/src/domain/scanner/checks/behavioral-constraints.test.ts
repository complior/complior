import { describe, it, expect } from 'vitest';
import { checkBehavioralConstraints } from './behavioral-constraints.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

const makePassport = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    name: 'test-bot',
    compliance: { eu_ai_act: { risk_class: 'high' } },
    constraints: {
      escalation_rules: [
        { condition: 'action == "deploy"', action: 'require_approval', description: 'Deploy approval', timeout_minutes: 5 },
      ],
    },
    permissions: {
      tools: ['search'],
      data_boundaries: { pii_handling: 'redact' },
    },
    ...overrides,
  });

describe('checkBehavioralConstraints', () => {
  it('returns empty when no passport files', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', '{"dependencies":{}}'),
    ]);
    const results = checkBehavioralConstraints(ctx);
    expect(results).toHaveLength(0);
  });

  it('passes for high-risk with escalation rules and data boundaries', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', makePassport()),
    ]);
    const results = checkBehavioralConstraints(ctx);
    const passes = results.filter((r) => r.type === 'pass');
    expect(passes).toHaveLength(2);
    expect(results.every((r) => r.type === 'pass')).toBe(true);
  });

  it('fails high-risk missing escalation rules', () => {
    const passport = makePassport({
      constraints: { prohibited_actions: [] },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', passport),
    ]);
    const results = checkBehavioralConstraints(ctx);
    const fails = results.filter((r) => r.type === 'fail');
    expect(fails).toHaveLength(1);
    expect(fails[0].type === 'fail' && fails[0].severity).toBe('high');
    expect(fails[0].message).toContain('escalation rules');
  });

  it('fails high-risk missing data boundaries', () => {
    const passport = makePassport({
      permissions: { tools: ['search'] },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', passport),
    ]);
    const results = checkBehavioralConstraints(ctx);
    const dataBoundaryFail = results.find(
      (r) => r.type === 'fail' && r.message.includes('data boundaries'),
    );
    expect(dataBoundaryFail).toBeDefined();
    expect(dataBoundaryFail!.type === 'fail' && dataBoundaryFail!.severity).toBe('high');
  });

  it('does not require escalation rules for limited-risk', () => {
    const passport = makePassport({
      compliance: { eu_ai_act: { risk_class: 'limited' } },
      constraints: { prohibited_actions: [] },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', passport),
    ]);
    const results = checkBehavioralConstraints(ctx);
    const escalationFail = results.find(
      (r) => r.type === 'fail' && r.message.includes('escalation'),
    );
    expect(escalationFail).toBeUndefined();
  });

  it('fails limited-risk missing data boundaries with medium severity', () => {
    const passport = makePassport({
      compliance: { eu_ai_act: { risk_class: 'limited' } },
      permissions: { tools: ['search'] },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', passport),
    ]);
    const results = checkBehavioralConstraints(ctx);
    const dataBoundaryFail = results.find(
      (r) => r.type === 'fail' && r.message.includes('data boundaries'),
    );
    expect(dataBoundaryFail).toBeDefined();
    expect(dataBoundaryFail!.type === 'fail' && dataBoundaryFail!.severity).toBe('medium');
  });

  it('passes limited-risk with pii_handling defined', () => {
    const passport = makePassport({
      compliance: { eu_ai_act: { risk_class: 'limited' } },
      constraints: { prohibited_actions: [] },
      permissions: {
        tools: ['search'],
        data_boundaries: { pii_handling: 'block' },
      },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', passport),
    ]);
    const results = checkBehavioralConstraints(ctx);
    expect(results.every((r) => r.type === 'pass')).toBe(true);
  });

  it('handles invalid JSON without crashing', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/broken-manifest.json', '{ invalid json'),
    ]);
    const results = checkBehavioralConstraints(ctx);
    expect(results).toHaveLength(0);
  });

  it('treats minimal-risk same as limited — no escalation required, medium data boundary', () => {
    const passport = makePassport({
      compliance: { eu_ai_act: { risk_class: 'minimal' } },
      constraints: { prohibited_actions: [] },
      permissions: { tools: ['search'] },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', passport),
    ]);
    const results = checkBehavioralConstraints(ctx);
    const escalationFail = results.find(
      (r) => r.type === 'fail' && r.message.includes('escalation'),
    );
    expect(escalationFail).toBeUndefined();
    const dataBoundaryFail = results.find(
      (r) => r.type === 'fail' && r.message.includes('data boundaries'),
    );
    expect(dataBoundaryFail).toBeDefined();
    expect(dataBoundaryFail!.type === 'fail' && dataBoundaryFail!.severity).toBe('medium');
  });

  it('handles multiple passports independently', () => {
    const highRiskPassport = makePassport({
      name: 'high-bot',
      compliance: { eu_ai_act: { risk_class: 'high' } },
    });
    const limitedPassport = makePassport({
      name: 'limited-bot',
      compliance: { eu_ai_act: { risk_class: 'limited' } },
      constraints: { prohibited_actions: [] },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/high-bot-manifest.json', highRiskPassport),
      createScanFile('.complior/agents/limited-bot-manifest.json', limitedPassport),
    ]);
    const results = checkBehavioralConstraints(ctx);
    // high-risk: escalation pass + data boundary pass = 2
    // limited-risk: no escalation check + data boundary pass = 1
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.type === 'pass')).toBe(true);
    expect(results.some((r) => r.message.includes('high-bot'))).toBe(true);
    expect(results.some((r) => r.message.includes('limited-bot'))).toBe(true);
  });
});
