import { describe, it, expect } from 'vitest';
import { buildPermissionsMatrix } from './permissions-matrix.js';
import type { AgentPassport } from '../../types/passport.types.js';

const makePassport = (overrides: Partial<AgentPassport> & { name: string }): AgentPassport => ({
  $schema: 'https://complior.dev/schemas/agent-passport-v1.json',
  manifest_version: '1.0.0',
  agent_id: `agent-${overrides.name}`,
  name: overrides.name,
  display_name: overrides.name,
  description: 'test agent',
  version: '1.0.0',
  created: '2026-01-01T00:00:00Z',
  updated: '2026-01-01T00:00:00Z',
  owner: { team: 'test', contact: 'test@test.com', responsible_person: 'Test' },
  type: 'assistive',
  autonomy_level: 'L2',
  autonomy_evidence: { human_approval_gates: 1, unsupervised_actions: 0, no_logging_actions: 0, auto_rated: true },
  framework: 'openai',
  model: { provider: 'openai', model_id: 'gpt-4', deployment: 'cloud', data_residency: 'EU' },
  permissions: {
    tools: [],
    data_access: { read: [], write: [], delete: [] },
    denied: [],
  },
  constraints: { rate_limits: { max_actions_per_minute: 60 }, budget: { max_cost_per_session_usd: 10 }, human_approval_required: [], prohibited_actions: [] },
  compliance: { eu_ai_act: { risk_class: 'limited', applicable_articles: [], deployer_obligations_met: [], deployer_obligations_pending: [] }, complior_score: 50, last_scan: '2026-01-01' },
  disclosure: { user_facing: true, disclosure_text: 'AI', ai_marking: { responses_marked: true, method: 'prefix' } },
  logging: { actions_logged: true, retention_days: 90, includes_decision_rationale: false },
  lifecycle: { status: 'active', deployed_since: '2026-01-01', next_review: '2026-07-01', review_frequency_days: 180 },
  interop: { mcp_servers: [] },
  source: { mode: 'auto', generated_by: 'complior', code_analyzed: true, fields_auto_filled: [], fields_manual: [], confidence: 0.8 },
  signature: { algorithm: 'ed25519', public_key: 'test', signed_at: '2026-01-01T00:00:00Z', hash: 'abc', value: 'sig' },
  ...overrides,
});

describe('buildPermissionsMatrix', () => {
  it('returns empty matrix for empty array', () => {
    const result = buildPermissionsMatrix([]);
    expect(result.agents).toEqual([]);
    expect(result.permissions).toEqual([]);
    expect(Object.keys(result.matrix)).toHaveLength(0);
    expect(result.conflicts).toEqual([]);
  });

  it('builds correct matrix for single agent', () => {
    const passport = makePassport({
      name: 'bot-a',
      permissions: {
        tools: ['file_read', 'web_search'],
        data_access: { read: ['users'], write: [], delete: [] },
        denied: ['file_delete'],
      },
    });

    const result = buildPermissionsMatrix([passport]);
    expect(result.agents).toEqual(['bot-a']);
    expect(result.permissions).toContain('file_read');
    expect(result.permissions).toContain('web_search');
    expect(result.permissions).toContain('file_delete');

    const agentPerms = result.matrix['bot-a'];
    expect(agentPerms?.['file_read']).toBe(true);
    expect(agentPerms?.['web_search']).toBe(true);
    expect(agentPerms?.['file_delete']).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('handles two agents without conflicts', () => {
    const a = makePassport({
      name: 'bot-a',
      permissions: { tools: ['read'], data_access: { read: ['users'], write: [], delete: [] }, denied: [] },
    });
    const b = makePassport({
      name: 'bot-b',
      permissions: { tools: ['write'], data_access: { read: [], write: ['logs'], delete: [] }, denied: [] },
    });

    const result = buildPermissionsMatrix([a, b]);
    expect(result.agents).toEqual(['bot-a', 'bot-b']);
    expect(result.conflicts).toEqual([]);
  });

  it('detects self_contradiction: tool in both tools and denied', () => {
    const passport = makePassport({
      name: 'bot-conflict',
      permissions: {
        tools: ['file_write', 'web_search'],
        data_access: { read: [], write: [], delete: [] },
        denied: ['file_write'],
      },
    });

    const result = buildPermissionsMatrix([passport]);
    const contradiction = result.conflicts.find(c => c.type === 'self_contradiction');
    expect(contradiction).toBeDefined();
    expect(contradiction!.agentA).toBe('bot-conflict');
    expect(contradiction!.permission).toBe('file_write');
  });

  it('detects overlapping_write: two agents write same entity', () => {
    const a = makePassport({
      name: 'bot-a',
      permissions: { tools: [], data_access: { read: [], write: ['users'], delete: [] }, denied: [] },
    });
    const b = makePassport({
      name: 'bot-b',
      permissions: { tools: [], data_access: { read: [], write: ['users'], delete: [] }, denied: [] },
    });

    const result = buildPermissionsMatrix([a, b]);
    const overlap = result.conflicts.find(c => c.type === 'overlapping_write');
    expect(overlap).toBeDefined();
    expect(overlap!.permission).toBe('users');
    expect(overlap!.agentA).toBe('bot-a');
    expect(overlap!.agentB).toBe('bot-b');
  });

  it('detects denied_but_used: agent A denies X, agent B uses X', () => {
    const a = makePassport({
      name: 'bot-a',
      permissions: { tools: ['safe_tool'], data_access: { read: [], write: [], delete: [] }, denied: ['dangerous_tool'] },
    });
    const b = makePassport({
      name: 'bot-b',
      permissions: { tools: ['dangerous_tool'], data_access: { read: [], write: [], delete: [] }, denied: [] },
    });

    const result = buildPermissionsMatrix([a, b]);
    const denied = result.conflicts.find(c => c.type === 'denied_but_used');
    expect(denied).toBeDefined();
    expect(denied!.agentA).toBe('bot-a');
    expect(denied!.agentB).toBe('bot-b');
    expect(denied!.permission).toBe('dangerous_tool');
  });
});
