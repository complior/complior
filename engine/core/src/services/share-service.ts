import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { ScanResult } from '../types/common.types.js';
import type { EventBusPort } from '../ports/events.port.js';
import { createSharePayload } from '../domain/reporter/share.js';
import type { SharePayload } from '../domain/reporter/share.js';

const ShareFindingSchema = z.object({
  obligationId: z.string(),
  article: z.string(),
  severity: z.string(),
  title: z.string(),
  recommendation: z.string(),
});

const SharePayloadSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  score: z.number(),
  jurisdiction: z.string(),
  findingsCount: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  topFindings: z.array(ShareFindingSchema),
  scanType: z.enum(['code', 'external']),
  compliorVersion: z.string(),
});

export interface ShareServiceDeps {
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getVersion: () => string;
}

export const createShareService = (deps: ShareServiceDeps) => {
  const { events, getProjectPath, getLastScanResult, getVersion } = deps;

  const getShareDir = () => resolve(getProjectPath(), '.complior', 'shares');

  const createShare = async (options?: {
    readonly jurisdiction?: string;
    readonly scanType?: 'code' | 'external';
    readonly expirationDays?: number;
  }): Promise<SharePayload> => {
    const scanResult = getLastScanResult();
    if (!scanResult) {
      throw new Error('No scan result available. Run a scan first.');
    }

    const payload = createSharePayload(scanResult, getVersion(), options);

    const dir = getShareDir();
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, `${payload.id}.json`), JSON.stringify(payload, null, 2));

    events.emit('scan.completed', { result: scanResult });
    return payload;
  };

  const getShare = async (id: string): Promise<SharePayload | null> => {
    try {
      const raw = await readFile(resolve(getShareDir(), `${id}.json`), 'utf-8');
      const payload = SharePayloadSchema.parse(JSON.parse(raw));
      if (new Date(payload.expiresAt) < new Date()) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  };

  const listShares = async (): Promise<readonly SharePayload[]> => {
    try {
      const dir = getShareDir();
      const files = await readdir(dir);
      const now = new Date();
      const results: SharePayload[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const raw = await readFile(resolve(dir, file), 'utf-8');
          const payload = SharePayloadSchema.parse(JSON.parse(raw));
          if (new Date(payload.expiresAt) >= now) {
            results.push(payload);
          }
        } catch {
          // skip corrupt files
        }
      }

      return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  };

  return Object.freeze({ createShare, getShare, listShares });
};

export type ShareService = ReturnType<typeof createShareService>;
