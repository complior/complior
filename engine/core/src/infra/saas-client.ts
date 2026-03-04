import { createLogger } from './logger.js';

const log = createLogger('saas-client');

export interface SyncPassportPayload {
  readonly name: string;
  readonly vendorName?: string;
  readonly vendorUrl?: string;
  readonly description?: string;
  readonly purpose?: string;
  readonly domain?: string;
  readonly riskLevel?: string;
  readonly slug?: string;
  readonly detectionPatterns?: unknown;
  readonly versions?: unknown;
  readonly autonomyLevel?: string;
  readonly framework?: string;
  readonly modelProvider?: string;
  readonly modelId?: string;
  readonly lifecycleStatus?: string;
  readonly compliorScore?: number;
  readonly manifestVersion?: string;
  readonly signature?: unknown;
  readonly extendedFields?: unknown;
}

export interface SyncScanPayload {
  readonly projectPath: string;
  readonly score?: number;
  readonly findings?: readonly { severity: string; message: string; tool?: string }[];
  readonly toolsDetected: readonly { name: string; version?: string; vendor?: string; category?: string }[];
}

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
  readonly syncStatus: (token: string) => Promise<Record<string, unknown>>;
  readonly fetchDataBundle: (etag?: string) => Promise<{ data: Record<string, unknown> | null; etag?: string }>;
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
    syncStatus: (token: string) => getJson('/api/sync/status', token),
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
