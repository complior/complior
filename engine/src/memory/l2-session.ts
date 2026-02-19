import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export type SessionEventType = 'scan' | 'fix' | 'decision' | 'file_edit' | 'question' | 'mode_switch';

export interface SessionEvent {
  readonly id: number;
  readonly sessionId: string;
  readonly timestamp: string;
  readonly type: SessionEventType;
  readonly data: Record<string, unknown>;
  readonly importance: number;
}

export interface SessionInfo {
  readonly id: string;
  readonly startedAt: string;
  readonly lastActive: string;
  readonly mode: string;
  readonly summary?: string;
}

export interface MemoryContext {
  readonly sessionSummary: string;
  readonly recentEvents: readonly SessionEvent[];
  readonly keyDecisions: readonly SessionEvent[];
  readonly scoreHistory: readonly { score: number; timestamp: string }[];
  readonly activeFiles: readonly string[];
}

export interface SessionStore {
  sessions: SessionInfo[];
  events: SessionEvent[];
  nextEventId: number;
}

const MAX_WINDOW = 50;
const MAX_AGE_DAYS = 7;

export const createSessionMemory = (memoryDir: string) => {
  const filePath = join(memoryDir, 'session.json');
  let nextId = 1;

  const loadStore = async (): Promise<SessionStore> => {
    const content = await readFile(filePath, 'utf-8').catch(() => null);
    if (!content) return { sessions: [], events: [], nextEventId: 1 };
    const store = JSON.parse(content) as SessionStore;
    nextId = store.nextEventId ?? 1;
    return store;
  };

  const saveStore = async (store: SessionStore): Promise<void> => {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(store, null, 2), 'utf-8');
  };

  const ensureSession = async (sessionId: string, mode: string = 'build'): Promise<void> => {
    const store = await loadStore();
    const existing = store.sessions.find((s) => s.id === sessionId);
    if (!existing) {
      const now = new Date().toISOString();
      store.sessions.push({ id: sessionId, startedAt: now, lastActive: now, mode });
      await saveStore(store);
    }
  };

  const recordEvent = async (
    sessionId: string,
    type: SessionEventType,
    data: Record<string, unknown>,
    importance: number = 1,
  ): Promise<SessionEvent> => {
    const store = await loadStore();
    const event: SessionEvent = {
      id: nextId++,
      sessionId,
      timestamp: new Date().toISOString(),
      type,
      data,
      importance,
    };
    store.events.push(event);
    store.nextEventId = nextId;

    // Update session lastActive
    const session = store.sessions.find((s) => s.id === sessionId);
    if (session) {
      (session as { lastActive: string }).lastActive = event.timestamp;
    }

    await saveStore(store);
    return event;
  };

  const getRecentEvents = async (sessionId: string, limit: number = MAX_WINDOW): Promise<readonly SessionEvent[]> => {
    const store = await loadStore();
    return store.events
      .filter((e) => e.sessionId === sessionId)
      .slice(-limit);
  };

  const getContext = async (sessionId: string): Promise<MemoryContext> => {
    const store = await loadStore();
    const sessionEvents = store.events.filter((e) => e.sessionId === sessionId);
    const recentEvents = sessionEvents.slice(-MAX_WINDOW);
    const keyDecisions = sessionEvents.filter((e) => e.type === 'decision');
    const scoreHistory = sessionEvents
      .filter((e) => e.type === 'scan' && e.data['score'] !== undefined)
      .map((e) => ({ score: e.data['score'] as number, timestamp: e.timestamp }));
    const activeFiles = [...new Set(
      sessionEvents
        .filter((e) => e.type === 'file_edit' && e.data['file'])
        .map((e) => e.data['file'] as string),
    )];

    const eventCount = sessionEvents.length;
    const sessionSummary = eventCount > MAX_WINDOW
      ? `Session with ${eventCount} events. ${scoreHistory.length} scans, ${keyDecisions.length} decisions.`
      : `Active session with ${eventCount} events.`;

    return Object.freeze({ sessionSummary, recentEvents, keyDecisions, scoreHistory, activeFiles });
  };

  const cleanup = async (): Promise<number> => {
    const store = await loadStore();
    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const oldSessionIds = new Set(
      store.sessions.filter((s) => s.lastActive < cutoff).map((s) => s.id),
    );

    if (oldSessionIds.size === 0) return 0;

    const removedCount = store.events.filter((e) => oldSessionIds.has(e.sessionId)).length;
    store.events = store.events.filter((e) => !oldSessionIds.has(e.sessionId));
    store.sessions = store.sessions.filter((s) => !oldSessionIds.has(s.id));

    await saveStore(store);
    return removedCount;
  };

  const getStats = async (sessionId: string): Promise<{
    eventCount: number;
    filesTouched: number;
    scanCount: number;
    fixCount: number;
    decisionCount: number;
  }> => {
    const store = await loadStore();
    const events = store.events.filter((e) => e.sessionId === sessionId);
    const files = new Set(events.filter((e) => e.type === 'file_edit').map((e) => e.data['file'] as string));
    return {
      eventCount: events.length,
      filesTouched: files.size,
      scanCount: events.filter((e) => e.type === 'scan').length,
      fixCount: events.filter((e) => e.type === 'fix').length,
      decisionCount: events.filter((e) => e.type === 'decision').length,
    };
  };

  return Object.freeze({ ensureSession, recordEvent, getRecentEvents, getContext, cleanup, getStats, loadStore });
};

export type SessionMemory = ReturnType<typeof createSessionMemory>;
