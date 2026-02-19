import { describe, it, expect, beforeEach } from 'vitest';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSessionMemory } from './l2-session.js';

const TEST_DIR = join(tmpdir(), `complior-test-l2-${Date.now()}`);

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

describe('Session Memory L2', () => {
  it('records and retrieves events', async () => {
    const mem = createSessionMemory(TEST_DIR);
    await mem.ensureSession('sess-1');

    await mem.recordEvent('sess-1', 'scan', { score: 42, findings: 5 });
    await mem.recordEvent('sess-1', 'fix', { checkId: 'ai-disclosure', file: 'src/app.tsx' });
    await mem.recordEvent('sess-1', 'decision', { skip: 'OBL-045', reason: 'not applicable' }, 5);

    const events = await mem.getRecentEvents('sess-1');
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('scan');
    expect(events[1].type).toBe('fix');
    expect(events[2].type).toBe('decision');
    expect(events[2].importance).toBe(5);
  });

  it('sliding window limits to 50 events', async () => {
    const mem = createSessionMemory(TEST_DIR);
    await mem.ensureSession('sess-2');

    for (let i = 0; i < 60; i++) {
      await mem.recordEvent('sess-2', 'scan', { score: i });
    }

    const events = await mem.getRecentEvents('sess-2', 50);
    expect(events).toHaveLength(50);
    // Should return the last 50
    expect(events[0].data['score']).toBe(10);
    expect(events[49].data['score']).toBe(59);
  });

  it('getContext aggregates session data', async () => {
    const mem = createSessionMemory(TEST_DIR);
    await mem.ensureSession('sess-3');

    await mem.recordEvent('sess-3', 'scan', { score: 35 });
    await mem.recordEvent('sess-3', 'file_edit', { file: 'src/app.tsx' });
    await mem.recordEvent('sess-3', 'fix', { checkId: 'disclosure' });
    await mem.recordEvent('sess-3', 'scan', { score: 52 });
    await mem.recordEvent('sess-3', 'decision', { action: 'skip OBL-045' });

    const ctx = await mem.getContext('sess-3');
    expect(ctx.recentEvents).toHaveLength(5);
    expect(ctx.scoreHistory).toHaveLength(2);
    expect(ctx.scoreHistory[0].score).toBe(35);
    expect(ctx.scoreHistory[1].score).toBe(52);
    expect(ctx.activeFiles).toContain('src/app.tsx');
    expect(ctx.keyDecisions).toHaveLength(1);
  });

  it('cleanup removes old events', async () => {
    const mem = createSessionMemory(TEST_DIR);

    // Write a store with old session
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const store = {
      sessions: [
        { id: 'old-sess', startedAt: oldDate, lastActive: oldDate, mode: 'build' },
        { id: 'new-sess', startedAt: new Date().toISOString(), lastActive: new Date().toISOString(), mode: 'build' },
      ],
      events: [
        { id: 1, sessionId: 'old-sess', timestamp: oldDate, type: 'scan', data: { score: 10 }, importance: 1 },
        { id: 2, sessionId: 'new-sess', timestamp: new Date().toISOString(), type: 'scan', data: { score: 50 }, importance: 1 },
      ],
      nextEventId: 3,
    };
    await writeFile(join(TEST_DIR, 'session.json'), JSON.stringify(store));

    const removed = await mem.cleanup();
    expect(removed).toBe(1);

    const remaining = await mem.loadStore();
    expect(remaining.events).toHaveLength(1);
    expect(remaining.events[0].sessionId).toBe('new-sess');
  });

  it('getStats returns session statistics', async () => {
    const mem = createSessionMemory(TEST_DIR);
    await mem.ensureSession('sess-4');

    await mem.recordEvent('sess-4', 'scan', { score: 42 });
    await mem.recordEvent('sess-4', 'fix', { checkId: 'test' });
    await mem.recordEvent('sess-4', 'file_edit', { file: 'a.ts' });
    await mem.recordEvent('sess-4', 'file_edit', { file: 'b.ts' });

    const stats = await mem.getStats('sess-4');
    expect(stats.eventCount).toBe(4);
    expect(stats.scanCount).toBe(1);
    expect(stats.fixCount).toBe(1);
    expect(stats.filesTouched).toBe(2);
  });
});
