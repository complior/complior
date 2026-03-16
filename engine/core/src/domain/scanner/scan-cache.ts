/**
 * E-11: Incremental scan cache.
 * Domain-pure cache logic — I/O delegated to CacheStorage port.
 */

import { createHash } from 'node:crypto';
import type { CheckResult } from '../../types/common.types.js';

export interface CacheEntry {
  readonly sha256: string;
  readonly mtime: number;
  readonly results: readonly CheckResult[];
  readonly timestamp: number; // ms since epoch
  readonly layer: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
}

export interface ScanCacheData {
  readonly version: number;
  readonly entries: Record<string, CacheEntry>; // key = relativePath
}

/** Port for cache persistence — keeps domain I/O-free. */
export interface CacheStorage {
  readonly load: () => ScanCacheData | undefined;
  readonly save: (data: ScanCacheData) => void;
}

const CACHE_VERSION = 1;
const L5_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ScanCache {
  readonly get: (relativePath: string, content: string, mtime: number) => readonly CheckResult[] | undefined;
  readonly set: (relativePath: string, content: string, mtime: number, results: readonly CheckResult[], layer: CacheEntry['layer']) => void;
  readonly save: () => void;
  readonly stats: () => { hits: number; misses: number; entries: number };
}

const computeHash = (content: string): string =>
  createHash('sha256').update(content).digest('hex');

export const createScanCache = (storage?: CacheStorage): ScanCache => {
  const loaded = storage?.load();
  const initial: ScanCacheData = (loaded && loaded.version === CACHE_VERSION)
    ? loaded
    : { version: CACHE_VERSION, entries: {} };

  const entries = new Map<string, CacheEntry>(Object.entries(initial.entries));
  let hits = 0;
  let misses = 0;

  const get = (relativePath: string, content: string, mtime: number): readonly CheckResult[] | undefined => {
    const cached = entries.get(relativePath);
    if (!cached) {
      misses++;
      return undefined;
    }

    // Fast-check: mtime unchanged → use cache without re-hashing
    if (cached.mtime === mtime) {
      if (cached.layer === 'L5') {
        const age = Date.now() - cached.timestamp;
        if (age > L5_TTL_MS) {
          misses++;
          return undefined;
        }
      }
      hits++;
      return cached.results;
    }

    // mtime changed — verify by hash
    const hash = computeHash(content);
    if (cached.sha256 === hash) {
      entries.set(relativePath, { ...cached, mtime });
      hits++;
      return cached.results;
    }

    misses++;
    return undefined;
  };

  const set = (
    relativePath: string,
    content: string,
    mtime: number,
    results: readonly CheckResult[],
    layer: CacheEntry['layer'],
  ): void => {
    entries.set(relativePath, {
      sha256: computeHash(content),
      mtime,
      results,
      timestamp: Date.now(),
      layer,
    });
  };

  const save = (): void => {
    storage?.save({
      version: CACHE_VERSION,
      entries: Object.fromEntries(entries),
    });
  };

  const stats = () => ({
    hits,
    misses,
    entries: entries.size,
  });

  return Object.freeze({ get, set, save, stats });
};

// Infra adapter: see infra/cache-storage.ts (createFileCacheStorage)
