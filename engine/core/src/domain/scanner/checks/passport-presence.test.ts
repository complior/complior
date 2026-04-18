import { describe, it, expect } from 'vitest';
import { checkPassportPresence } from './passport-presence.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

describe('checkPassportPresence', () => {
  it('passes when passport manifest found', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/my-bot-manifest.json', '{"name":"my-bot"}'),
      createScanFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].message).toContain('Agent Passport found');
  });

  it('fails when AI SDK detected but no passport', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
      createScanFile('src/app.ts', 'const x = 1;'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('high');
      expect(results[0].fix).toContain('complior passport init');
    }
  });

  it('skips when no AI SDK detected', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', '{"dependencies":{"express":"^4.0.0"}}'),
      createScanFile('src/app.ts', 'const x = 1;'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skip');
  });

  it('detects multiple passport manifests', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/bot-a-manifest.json', '{"name":"bot-a"}'),
      createScanFile('.complior/agents/bot-b-manifest.json', '{"name":"bot-b"}'),
      createScanFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].message).toContain('2 manifest(s)');
  });
});
