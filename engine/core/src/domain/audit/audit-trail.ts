import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export type AuditEventType =
  | 'passport.created' | 'passport.updated' | 'passport.exported'
  | 'fria.generated' | 'scan.completed' | 'fix.applied'
  | 'evidence.verified' | 'worker_notification.generated';

export interface AuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly agentName?: string;
  readonly eventType: AuditEventType;
  readonly payload: Record<string, unknown>;
  readonly signature: string;
}

export interface AuditFilter {
  readonly agentName?: string;
  readonly since?: string;
  readonly until?: string;
  readonly eventType?: AuditEventType;
  readonly limit?: number;
}

export interface AuditTrailSummary {
  readonly totalEntries: number;
  readonly eventCounts: Record<string, number>;
  readonly agentNames: readonly string[];
  readonly firstEntry: string;
  readonly lastEntry: string;
}

export interface AuditStore {
  readonly append: (eventType: AuditEventType, payload: Record<string, unknown>, agentName?: string) => Promise<AuditEntry>;
  readonly query: (filter: AuditFilter) => Promise<readonly AuditEntry[]>;
  readonly getSummary: () => Promise<AuditTrailSummary>;
}

const isAuditEntry = (v: unknown): v is AuditEntry =>
  typeof v === 'object' && v !== null
  && 'id' in v && typeof v.id === 'string'
  && 'eventType' in v && typeof v.eventType === 'string'
  && 'signature' in v && typeof v.signature === 'string';

const parseEntries = (content: string, onError?: (line: string, error: unknown) => void): AuditEntry[] => {
  const entries: AuditEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isAuditEntry(parsed)) entries.push(parsed);
    } catch (err) {
      onError?.(trimmed, err);
    }
  }
  return entries;
};

export const createAuditStore = (
  trailPath: string,
  signHash: (hash: string) => string,
  onParseError?: (line: string, error: unknown) => void,
): AuditStore => {
  const append = async (eventType: AuditEventType, payload: Record<string, unknown>, agentName?: string): Promise<AuditEntry> => {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    const unsigned = { id, timestamp, agentName, eventType, payload };
    const hash = createHash('sha256').update(JSON.stringify(unsigned)).digest('hex');
    const signature = signHash(hash);

    const entry: AuditEntry = { ...unsigned, signature };

    await mkdir(dirname(trailPath), { recursive: true });
    await appendFile(trailPath, JSON.stringify(entry) + '\n');

    return entry;
  };

  const readAll = async (): Promise<AuditEntry[]> => {
    try {
      const content = await readFile(trailPath, 'utf-8');
      return parseEntries(content, onParseError);
    } catch {
      // File does not exist yet — expected on first run
      return [];
    }
  };

  const query = async (filter: AuditFilter): Promise<readonly AuditEntry[]> => {
    let entries = await readAll();

    if (filter.agentName) {
      entries = entries.filter(e => e.agentName === filter.agentName);
    }
    if (filter.eventType) {
      entries = entries.filter(e => e.eventType === filter.eventType);
    }
    if (filter.since) {
      entries = entries.filter(e => e.timestamp >= filter.since!);
    }
    if (filter.until) {
      entries = entries.filter(e => e.timestamp <= filter.until!);
    }
    if (filter.limit !== undefined && filter.limit > 0) {
      entries = entries.slice(-filter.limit);
    }

    return entries;
  };

  const getSummary = async (): Promise<AuditTrailSummary> => {
    const entries = await readAll();

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        eventCounts: {},
        agentNames: [],
        firstEntry: '',
        lastEntry: '',
      };
    }

    const eventCounts: Record<string, number> = {};
    const agentSet = new Set<string>();

    for (const e of entries) {
      eventCounts[e.eventType] = (eventCounts[e.eventType] ?? 0) + 1;
      if (e.agentName) agentSet.add(e.agentName);
    }

    const timestamps = entries.map(e => e.timestamp).sort();

    return {
      totalEntries: entries.length,
      eventCounts,
      agentNames: [...agentSet].sort(),
      firstEntry: timestamps[0]!,
      lastEntry: timestamps[timestamps.length - 1]!,
    };
  };

  return Object.freeze({ append, query, getSummary });
};
