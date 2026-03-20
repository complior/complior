import { describe, it, expect } from 'vitest';
import { checkPassportCompleteness } from './passport-completeness.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

// All 27 required deep-path fields from OBLIGATION_FIELD_MAP must be present and non-empty.
const fullManifest = JSON.stringify({
  agent_id: 'uuid-123',
  name: 'test-bot',
  display_name: 'Test Bot',
  version: '1.0.0',
  description: 'A test bot',
  type: 'assistant',
  autonomy_level: 'L2',
  autonomy_evidence: { human_approval_gates: 1, unsupervised_actions: 0, no_logging_actions: 0, auto_rated: true },
  framework: 'openai',
  model: { provider: 'openai', model_id: 'gpt-4', data_residency: 'us' },
  owner: { team: 'eng', contact: 'eng@co.com', responsible_person: 'Jane' },
  permissions: { tools: ['search'], denied: [] },
  constraints: { human_approval_required: ['deploy'], prohibited_actions: ['social_scoring'] },
  compliance: { eu_ai_act: { risk_class: 'limited' }, complior_score: 80, last_scan: '2026-03-01' },
  disclosure: { user_facing: true, disclosure_text: 'AI system', ai_marking: { responses_marked: true, method: 'badge' } },
  logging: { actions_logged: true, retention_days: 180 },
  lifecycle: { status: 'active', next_review: '2026-06-01', review_frequency_days: 90 },
  signature: { algorithm: 'ed25519', value: 'abc' },
  source: { mode: 'auto', confidence: 0.9 },
});

describe('checkPassportCompleteness', () => {
  it('passes for fully complete passport', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', fullManifest),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].message).toContain('100%');
  });

  it('fails for partially complete passport', () => {
    const partial = JSON.stringify({
      name: 'test-bot',
      version: '1.0.0',
      description: 'A test bot',
      compliance: { eu_ai_act: { risk_class: 'limited' } },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', partial),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].message).toMatch(/\d+%/);
    }
  });

  it('fails with high severity for mostly empty passport', () => {
    const minimal = JSON.stringify({
      name: 'test-bot',
      compliance: { eu_ai_act: { risk_class: 'high' } },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', minimal),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('high');
    }
  });

  it('checks deep paths — empty owner object counts as unfilled', () => {
    const emptyNested = JSON.stringify({
      name: 'test-bot',
      version: '1.0.0',
      description: 'A test bot',
      agent_id: 'uuid-123',
      type: 'assistant',
      framework: 'openai',
      autonomy_level: 'L2',
      model: {},           // empty — deep path model.provider not filled
      owner: {},           // empty — deep path owner.team not filled
      permissions: {},     // empty — deep path permissions.tools not filled
      constraints: [],     // empty array
      compliance: { eu_ai_act: { risk_class: 'limited' } },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', emptyNested),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    // Deep-path checking: owner.team/contact/responsible_person, model.provider/model_id all empty
    expect(results[0].message).toMatch(/\d+\/\d+ fields/);
  });

  it('requires oversight fields for high-risk passports', () => {
    // A high-risk passport without oversight should have more missing fields
    const highRiskNoOversight = JSON.stringify({
      ...JSON.parse(fullManifest),
      compliance: { eu_ai_act: { risk_class: 'high' }, complior_score: 80, last_scan: '2026-03-01' },
    });
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-bot-manifest.json', highRiskNoOversight),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    // Missing oversight.responsible_person and oversight.override_mechanism
    expect(results[0].message).toMatch(/\d+\/\d+ fields/);
  });

  it('returns empty for no manifest files', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(0);
  });
});
