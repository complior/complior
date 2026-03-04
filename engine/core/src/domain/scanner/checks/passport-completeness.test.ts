import { describe, it, expect } from 'vitest';
import { checkPassportCompleteness } from './passport-completeness.js';
import type { ScanContext, FileInfo } from '../../../ports/scanner.port.js';

const createFile = (relativePath: string, content: string): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

const fullManifest = JSON.stringify({
  name: 'test-bot',
  display_name: 'Test Bot',
  version: '1.0.0',
  description: 'A test bot',
  agent_id: 'uuid-123',
  type: 'assistant',
  framework: 'openai',
  autonomy_level: 'L2',
  model: { provider: 'openai', model_id: 'gpt-4' },
  owner: { team: 'eng', responsible_person: 'Jane' },
  permissions: { tools: ['search'] },
  constraints: { human_approval_required: [] },
  compliance: { eu_ai_act: { risk_class: 'limited' }, complior_score: 80 },
  signature: { algorithm: 'ed25519', value: 'abc' },
  source: { mode: 'auto', confidence: 0.9 },
  autonomy_evidence: { human_approval_gates: 1 },
  logging: { retention_days: 180 },
  lifecycle: { status: 'active' },
});

describe('checkPassportCompleteness', () => {
  it('passes for fully complete passport', () => {
    const ctx = createCtx([
      createFile('.complior/agents/test-bot-manifest.json', fullManifest),
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
    const ctx = createCtx([
      createFile('.complior/agents/test-bot-manifest.json', partial),
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
    const ctx = createCtx([
      createFile('.complior/agents/test-bot-manifest.json', minimal),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('high');
    }
  });

  it('does not count empty objects or arrays as filled', () => {
    const emptyNested = JSON.stringify({
      name: 'test-bot',
      version: '1.0.0',
      description: 'A test bot',
      agent_id: 'uuid-123',
      type: 'assistant',
      framework: 'openai',
      autonomy_level: 'L2',
      model: {},           // empty object — should NOT count
      owner: {},           // empty object — should NOT count
      permissions: {},     // empty object — should NOT count
      constraints: [],     // empty array — should NOT count
      compliance: { eu_ai_act: { risk_class: 'limited' } },
    });
    const ctx = createCtx([
      createFile('.complior/agents/test-bot-manifest.json', emptyNested),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    // 7 filled (name..autonomy_level, no display_name) out of 12 limited fields
    // model/owner/permissions/constraints are empty objects/arrays — not counted
    expect(results[0].message).toContain('7/12');
  });

  it('returns empty for no manifest files', () => {
    const ctx = createCtx([
      createFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
    ]);

    const results = checkPassportCompleteness(ctx);
    expect(results).toHaveLength(0);
  });
});
