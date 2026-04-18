import { createLogger } from './logger.js';
import type { SyncPassportPayload, SyncScanPayload } from '../types/sync.types.js';

const log = createLogger('saas-client');

// SyncPassportPayload, SyncScanPayload, SyncDocPayload now come from
// @complior/contracts via src/types/sync.types.ts (single source of truth)

export interface SyncDocPayload {
  readonly type: string;
  readonly title: string;
  readonly content: string;
  readonly obligationId?: string;
  readonly toolSlug?: string;
}

export interface SaasClient {
  readonly syncPassport: (token: string, payload: SyncPassportPayload) => Promise<Record<string, unknown>>;
  readonly syncScan: (token: string, payload: SyncScanPayload) => Promise<Record<string, unknown>>;
  readonly syncDocuments: (token: string, documents: readonly SyncDocPayload[]) => Promise<Record<string, unknown>>;
  readonly syncFria: (token: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly syncStatus: (token: string) => Promise<Record<string, unknown>>;
  readonly fetchDataBundle: (etag?: string) => Promise<{ data: Record<string, unknown> | null; etag?: string }>;
  readonly syncAudit: (token: string, entries: readonly Record<string, unknown>[]) => Promise<Record<string, unknown>>;
  readonly syncEvidence: (token: string, summary: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly syncRegistry: (token: string, entries: readonly Record<string, unknown>[]) => Promise<Record<string, unknown>>;
}

export const createSaasClient = (baseUrl: string): SaasClient => {
  const url = baseUrl.replace(/\/$/, '');

  const postJson = async (endpoint: string, token: string, body: unknown): Promise<Record<string, unknown>> => {
    log.debug(`POST ${endpoint}`);
    const resp = await fetch(`${url}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`SaaS ${endpoint} failed (${resp.status}): ${text}`);
    }
    const data: Record<string, unknown> = await resp.json();
    return data;
  };

  const getJson = async (endpoint: string, token: string): Promise<Record<string, unknown>> => {
    log.debug(`GET ${endpoint}`);
    const resp = await fetch(`${url}${endpoint}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`SaaS ${endpoint} failed (${resp.status}): ${text}`);
    }
    const data: Record<string, unknown> = await resp.json();
    return data;
  };

  return Object.freeze({
    syncPassport: (token: string, payload: SyncPassportPayload) => postJson('/api/sync/passport', token, payload),
    syncScan: (token: string, payload: SyncScanPayload) => postJson('/api/sync/scan', token, payload),
    syncDocuments: (token: string, documents: readonly SyncDocPayload[]) => postJson('/api/sync/documents', token, { documents }),
    syncFria: (token: string, payload: Record<string, unknown>) => postJson('/api/sync/fria', token, payload),
    syncStatus: (token: string) => getJson('/api/sync/status', token),
    syncAudit: (token: string, entries: readonly Record<string, unknown>[]) => postJson('/api/sync/audit', token, { entries }),
    syncEvidence: (token: string, summary: Record<string, unknown>) => postJson('/api/sync/evidence', token, summary),
    syncRegistry: (token: string, entries: readonly Record<string, unknown>[]) => postJson('/api/sync/registry', token, { entries }),
    fetchDataBundle: async (etag?: string) => {
      log.debug('Fetching data bundle');
      const headers: Record<string, string> = {};
      if (etag) headers['If-None-Match'] = etag;

      const resp = await fetch(`${url}/v1/data/bundle`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(30_000),
      });

      if (resp.status === 304) {
        return { data: null, etag };
      }
      if (!resp.ok) {
        throw new Error(`Data bundle fetch failed (${resp.status})`);
      }
      const newEtag = resp.headers.get('etag') ?? undefined;
      const data: Record<string, unknown> = await resp.json();
      return { data, etag: newEtag };
    },
  });
};
