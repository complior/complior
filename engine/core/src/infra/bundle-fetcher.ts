import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createSaasClient } from './saas-client.js';
import { createLogger } from './logger.js';

const log = createLogger('bundle');

export interface BundleFetcher {
  readonly fetchIfUpdated: () => Promise<Record<string, unknown> | null>;
  readonly getBundle: () => Promise<Record<string, unknown> | null>;
}

export const createBundleFetcher = (saasUrl: string, cacheDir: string): BundleFetcher => {
  const client = createSaasClient(saasUrl);
  const bundlePath = join(cacheDir, 'bundle.json');
  const etagPath = join(cacheDir, 'bundle.etag');

  const readEtag = async (): Promise<string | undefined> => {
    try {
      return (await readFile(etagPath, 'utf-8')).trim();
    } catch {
      return undefined;
    }
  };

  const saveBundle = async (data: Record<string, unknown>, etag?: string): Promise<void> => {
    await mkdir(dirname(bundlePath), { recursive: true });
    await writeFile(bundlePath, JSON.stringify(data), 'utf-8');
    if (etag) {
      await writeFile(etagPath, etag, 'utf-8');
    }
  };

  const loadCachedBundle = async (): Promise<Record<string, unknown> | null> => {
    try {
      const content = await readFile(bundlePath, 'utf-8');
      const data: Record<string, unknown> = JSON.parse(content);
      return data;
    } catch {
      return null;
    }
  };

  return Object.freeze({
    fetchIfUpdated: async () => {
      try {
        const etag = await readEtag();
        const result = await client.fetchDataBundle(etag);
        if (result.data === null) {
          log.debug('Bundle not modified (304)');
          return null;
        }
        await saveBundle(result.data, result.etag);
        log.info('Bundle updated from SaaS');
        return result.data;
      } catch (err) {
        log.warn('Bundle fetch failed:', err);
        return null;
      }
    },

    getBundle: async () => {
      // Try fetch first, fallback to cache
      try {
        const etag = await readEtag();
        const result = await client.fetchDataBundle(etag);
        if (result.data !== null) {
          await saveBundle(result.data, result.etag);
          return result.data;
        }
      } catch {
        log.debug('Online fetch failed, using cache');
      }
      return loadCachedBundle();
    },
  });
};
