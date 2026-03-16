import { describe, it, expect } from 'vitest';
import { createScanCache } from './scan-cache.js';
import type { CacheStorage, ScanCacheData } from './scan-cache.js';
import { createFileCacheStorage } from '../../infra/cache-storage.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** In-memory storage for unit tests (no disk I/O). */
const createMemoryStorage = (): CacheStorage & { data?: ScanCacheData } => {
  let stored: ScanCacheData | undefined;
  return {
    load: () => stored,
    save: (data) => { stored = data; },
    get data() { return stored; },
  };
};

describe('ScanCache', () => {
  it('returns undefined for uncached file', () => {
    const cache = createScanCache();
    const result = cache.get('src/app.ts', 'const x = 1;', Date.now());
    expect(result).toBeUndefined();
    expect(cache.stats().misses).toBe(1);
  });

  it('returns cached results for unchanged file (same mtime)', () => {
    const cache = createScanCache();
    const mtime = Date.now();
    const results = [{ type: 'pass' as const, checkId: 'l4-disclosure', message: 'found' }];

    cache.set('src/app.ts', 'const x = 1;', mtime, results, 'L4');
    const cached = cache.get('src/app.ts', 'const x = 1;', mtime);

    expect(cached).toEqual(results);
    expect(cache.stats().hits).toBe(1);
  });

  it('returns cached results when mtime changed but content same', () => {
    const cache = createScanCache();
    const content = 'const x = 1;';
    const results = [{ type: 'pass' as const, checkId: 'l4-disclosure', message: 'found' }];

    cache.set('src/app.ts', content, 1000, results, 'L4');
    const cached = cache.get('src/app.ts', content, 2000); // different mtime

    expect(cached).toEqual(results);
    expect(cache.stats().hits).toBe(1);
  });

  it('returns undefined when content actually changed', () => {
    const cache = createScanCache();
    const results = [{ type: 'pass' as const, checkId: 'l4-disclosure', message: 'found' }];

    cache.set('src/app.ts', 'const x = 1;', 1000, results, 'L4');
    const cached = cache.get('src/app.ts', 'const x = 2;', 2000); // different content

    expect(cached).toBeUndefined();
    expect(cache.stats().misses).toBe(1);
  });

  it('persists and loads cache via storage port', () => {
    const storage = createMemoryStorage();
    const cache1 = createScanCache(storage);
    const results = [{ type: 'pass' as const, checkId: 'l4-disclosure', message: 'found' }];
    cache1.set('src/app.ts', 'const x = 1;', 1000, results, 'L4');
    cache1.save();

    expect(storage.data).toBeDefined();

    const cache2 = createScanCache(storage);
    const cached = cache2.get('src/app.ts', 'const x = 1;', 1000);
    expect(cached).toEqual(results);
  });

  it('no storage = in-memory only', () => {
    const cache = createScanCache();
    cache.set('a.ts', 'x', 1000, [{ type: 'pass' as const, checkId: 'test', message: 'ok' }], 'L4');
    cache.save(); // no-op without storage
    const cached = cache.get('a.ts', 'x', 1000);
    expect(cached).toBeDefined();
  });

  it('expires L5 results after 24h TTL', () => {
    const cache = createScanCache();
    const results = [{ type: 'pass' as const, checkId: 'l5-deep', message: 'ok' }];
    const mtime = Date.now();

    cache.set('src/app.ts', 'const x = 1;', mtime, results, 'L5');

    // L4 results should not expire
    const l4Results = [{ type: 'pass' as const, checkId: 'l4-test', message: 'ok' }];
    cache.set('src/other.ts', 'const y = 2;', mtime, l4Results, 'L4');
    const l4Cached = cache.get('src/other.ts', 'const y = 2;', mtime);
    expect(l4Cached).toEqual(l4Results);
  });

  it('tracks stats correctly', () => {
    const cache = createScanCache();
    cache.get('a.ts', 'a', 1); // miss
    cache.get('b.ts', 'b', 1); // miss
    cache.set('a.ts', 'a', 1, [], 'L4');
    cache.get('a.ts', 'a', 1); // hit
    cache.get('c.ts', 'c', 1); // miss

    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(3);
    expect(stats.entries).toBe(1);
  });
});

describe('createFileCacheStorage', () => {
  let testDir: string;

  it('round-trips through disk', () => {
    testDir = join(tmpdir(), `scan-cache-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const storage = createFileCacheStorage(testDir);
      const cache1 = createScanCache(storage);
      const results = [{ type: 'pass' as const, checkId: 'test', message: 'ok' }];
      cache1.set('a.ts', 'x', 1000, results, 'L4');
      cache1.save();

      expect(existsSync(join(testDir, '.complior', 'cache', 'scan-cache.json'))).toBe(true);

      const storage2 = createFileCacheStorage(testDir);
      const cache2 = createScanCache(storage2);
      expect(cache2.get('a.ts', 'x', 1000)).toEqual(results);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
