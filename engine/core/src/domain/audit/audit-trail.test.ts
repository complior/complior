import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAuditStore } from './audit-trail.js';

const mockSign = (hash: string): string => `sig:${hash.slice(0, 8)}`;

describe('createAuditStore', () => {
  let tempDir: string;
  let trailPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'audit-'));
    trailPath = join(tempDir, 'audit', 'trail.jsonl');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty summary for empty trail', async () => {
    const store = createAuditStore(trailPath, mockSign);
    const summary = await store.getSummary();

    expect(summary.totalEntries).toBe(0);
    expect(summary.eventCounts).toEqual({});
    expect(summary.agentNames).toEqual([]);
    expect(summary.firstEntry).toBe('');
    expect(summary.lastEntry).toBe('');
  });

  it('appends entry with correct fields', async () => {
    const store = createAuditStore(trailPath, mockSign);
    const entry = await store.append('passport.created', { name: 'bot-a', path: '/tmp/test' }, 'bot-a');

    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.agentName).toBe('bot-a');
    expect(entry.eventType).toBe('passport.created');
    expect(entry.payload).toEqual({ name: 'bot-a', path: '/tmp/test' });
    expect(entry.signature).toBeTruthy();
  });

  it('generates unique IDs for each entry', async () => {
    const store = createAuditStore(trailPath, mockSign);
    const e1 = await store.append('passport.created', { n: 1 });
    const e2 = await store.append('scan.completed', { n: 2 });

    expect(e1.id).not.toBe(e2.id);
  });

  it('entries are signed (signature not empty)', async () => {
    const store = createAuditStore(trailPath, mockSign);
    const entry = await store.append('scan.completed', { score: 85 });

    expect(entry.signature).toBeTruthy();
    expect(entry.signature.startsWith('sig:')).toBe(true);
  });

  it('query filters by agentName', async () => {
    const store = createAuditStore(trailPath, mockSign);
    await store.append('passport.created', {}, 'bot-a');
    await store.append('passport.created', {}, 'bot-b');
    await store.append('scan.completed', {}, 'bot-a');

    const results = await store.query({ agentName: 'bot-a' });
    expect(results).toHaveLength(2);
    expect(results.every(e => e.agentName === 'bot-a')).toBe(true);
  });

  it('query filters by eventType', async () => {
    const store = createAuditStore(trailPath, mockSign);
    await store.append('passport.created', {}, 'bot-a');
    await store.append('scan.completed', { score: 80 });
    await store.append('scan.completed', { score: 90 });

    const results = await store.query({ eventType: 'scan.completed' });
    expect(results).toHaveLength(2);
    expect(results.every(e => e.eventType === 'scan.completed')).toBe(true);
  });

  it('query filters by since/until', async () => {
    const store = createAuditStore(trailPath, mockSign);
    await store.append('passport.created', {}, 'bot-a');
    // Small delay to get different timestamps
    await new Promise(r => setTimeout(r, 10));
    const e2 = await store.append('scan.completed', {});
    await new Promise(r => setTimeout(r, 10));
    await store.append('fria.generated', {});

    const results = await store.query({ since: e2.timestamp });
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('query respects limit', async () => {
    const store = createAuditStore(trailPath, mockSign);
    await store.append('passport.created', {});
    await store.append('scan.completed', {});
    await store.append('fria.generated', {});

    const results = await store.query({ limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('getSummary aggregates correctly', async () => {
    const store = createAuditStore(trailPath, mockSign);
    await store.append('passport.created', {}, 'bot-a');
    await store.append('passport.created', {}, 'bot-b');
    await store.append('scan.completed', {}, 'bot-a');

    const summary = await store.getSummary();
    expect(summary.totalEntries).toBe(3);
    expect(summary.eventCounts['passport.created']).toBe(2);
    expect(summary.eventCounts['scan.completed']).toBe(1);
    expect(summary.agentNames).toContain('bot-a');
    expect(summary.agentNames).toContain('bot-b');
    expect(summary.firstEntry).toBeTruthy();
    expect(summary.lastEntry).toBeTruthy();
  });
});
