import { describe, it, expect } from 'vitest';
import { checkPassportPresence } from './passport-presence.js';
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

describe('checkPassportPresence', () => {
  it('passes when passport manifest found', () => {
    const ctx = createCtx([
      createFile('.complior/agents/my-bot-manifest.json', '{"name":"my-bot"}'),
      createFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].message).toContain('Agent Passport found');
  });

  it('fails when AI SDK detected but no passport', () => {
    const ctx = createCtx([
      createFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
      createFile('src/app.ts', 'const x = 1;'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('high');
      expect(results[0].fix).toContain('complior agent init');
    }
  });

  it('skips when no AI SDK detected', () => {
    const ctx = createCtx([
      createFile('package.json', '{"dependencies":{"express":"^4.0.0"}}'),
      createFile('src/app.ts', 'const x = 1;'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skip');
  });

  it('detects multiple passport manifests', () => {
    const ctx = createCtx([
      createFile('.complior/agents/bot-a-manifest.json', '{"name":"bot-a"}'),
      createFile('.complior/agents/bot-b-manifest.json', '{"name":"bot-b"}'),
      createFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
    ]);

    const results = checkPassportPresence(ctx);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].message).toContain('2 manifest(s)');
  });
});
