/**
 * Infra adapter for CacheStorage port.
 * File-based persistence for scan cache.
 * Domain port defined in: domain/scanner/scan-cache.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { CacheStorage, ScanCacheData } from '../domain/scanner/scan-cache.js';

export const createFileCacheStorage = (projectPath: string): CacheStorage => {
  const path = join(projectPath, '.complior', 'cache', 'scan-cache.json');

  return Object.freeze({
    load: (): ScanCacheData | undefined => {
      if (!existsSync(path)) return undefined;
      try {
        const raw = readFileSync(path, 'utf-8');
        const parsed: unknown = JSON.parse(raw);
        // Basic shape validation (Zod would be ideal for full validation)
        if (typeof parsed === 'object' && parsed !== null && 'version' in parsed && 'entries' in parsed) {
          return parsed as ScanCacheData;
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
    save: (data: ScanCacheData): void => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(data), 'utf-8');
    },
  });
};
