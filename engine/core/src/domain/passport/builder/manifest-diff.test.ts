import { describe, it, expect } from 'vitest';
import { computeManifestDiff } from './manifest-diff.js';

describe('computeManifestDiff', () => {
  it('detects no changes', () => {
    const result = computeManifestDiff('bot', { name: 'bot' }, { name: 'bot' });
    expect(result.totalChanges).toBe(0);
    expect(result.hasBreakingChanges).toBe(false);
  });

  it('detects added fields', () => {
    const result = computeManifestDiff('bot', {}, { name: 'bot', version: '1.0' });
    expect(result.added).toBe(2);
    expect(result.removed).toBe(0);
    expect(result.modified).toBe(0);
    expect(result.totalChanges).toBe(2);
  });

  it('detects removed fields', () => {
    const result = computeManifestDiff('bot', { name: 'bot', version: '1.0' }, {});
    expect(result.removed).toBe(2);
    expect(result.added).toBe(0);
  });

  it('detects modified fields', () => {
    const result = computeManifestDiff('bot', { name: 'bot' }, { name: 'new-bot' });
    expect(result.modified).toBe(1);
    expect(result.changes[0]!.changeType).toBe('modified');
  });

  it('detects nested changes', () => {
    const result = computeManifestDiff('bot',
      { model: { provider: 'openai' } },
      { model: { provider: 'anthropic' } },
    );
    expect(result.modified).toBe(1);
    expect(result.changes[0]!.path).toBe('model.provider');
  });

  it('detects deeply nested additions', () => {
    const result = computeManifestDiff('bot',
      { model: { provider: 'openai' } },
      { model: { provider: 'openai', deployment: 'us-east' } },
    );
    expect(result.added).toBe(1);
    expect(result.changes[0]!.path).toBe('model.deployment');
  });

  it('flags breaking changes for high-severity fields', () => {
    const result = computeManifestDiff('bot',
      { permissions: { tools: ['read'] } },
      { permissions: { tools: ['read', 'write'] } },
    );
    expect(result.hasBreakingChanges).toBe(true);
  });

  it('flags no breaking changes for low-severity fields', () => {
    const result = computeManifestDiff('bot',
      { description: 'old' },
      { description: 'new' },
    );
    expect(result.hasBreakingChanges).toBe(false);
    expect(result.changes[0]!.severity).toBe('low');
  });

  it('assigns medium severity to model changes', () => {
    const result = computeManifestDiff('bot',
      { model: 'gpt-4' },
      { model: 'claude-3' },
    );
    expect(result.changes[0]!.severity).toBe('medium');
  });

  it('assigns high severity to constraints changes', () => {
    const result = computeManifestDiff('bot',
      { constraints: { budget: 100 } },
      { constraints: { budget: 200 } },
    );
    expect(result.hasBreakingChanges).toBe(true);
    expect(result.changes[0]!.severity).toBe('high');
  });

  it('detects array changes as modified', () => {
    const result = computeManifestDiff('bot',
      { tags: ['a', 'b'] },
      { tags: ['a', 'c'] },
    );
    expect(result.modified).toBe(1);
  });

  it('preserves agent name in result', () => {
    const result = computeManifestDiff('my-agent', {}, {});
    expect(result.agentName).toBe('my-agent');
  });

  it('returns frozen result', () => {
    const result = computeManifestDiff('bot', {}, {});
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns frozen changes array', () => {
    const result = computeManifestDiff('bot', {}, { name: 'bot' });
    expect(Object.isFrozen(result.changes)).toBe(true);
  });
});
