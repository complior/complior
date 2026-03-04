import { Hono } from 'hono';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { createSaasClient, type SyncPassportPayload, type SyncDocPayload } from '../../infra/saas-client.js';
import type { AgentManifest } from '../../types/passport.types.js';
import { createLogger } from '../../infra/logger.js';
import { ValidationError } from '../../types/errors.js';

const log = createLogger('sync');

const parseManifest = (raw: string): AgentManifest | null => {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  if (!('name' in parsed) || typeof parsed.name !== 'string') return null;
  // Validated: has required `name` field — safe to treat as manifest
  return parsed as AgentManifest;
};

const SyncRequestSchema = z.object({
  token: z.string().min(1),
  saasUrl: z.string().url().optional(),
});

const DEFAULT_SAAS_URL = 'https://app.complior.ai';

// Map AgentManifest risk_class to SaaS riskLevel
const mapRiskLevel = (riskClass?: string): string | undefined => {
  if (!riskClass) return undefined;
  const map: Record<string, string> = {
    L1: 'minimal', L2: 'limited', L3: 'limited', L4: 'high', L5: 'high',
    minimal: 'minimal', limited: 'limited', high: 'high', prohibited: 'prohibited',
  };
  return map[riskClass] ?? undefined;
};

// Map AgentManifest domain to SaaS domain
const mapDomain = (manifest: AgentManifest): string => {
  const type = manifest.type;
  if (type === 'autonomous') return 'analytics';
  const tools = manifest.permissions?.tools ?? [];
  if (tools.some((t) => t.includes('code') || t.includes('file'))) return 'coding';
  return 'other';
};

// Map manifest to SaaS passport payload
const mapPassport = (manifest: AgentManifest): SyncPassportPayload => ({
  name: manifest.name,
  vendorName: manifest.owner?.team ?? '',
  vendorUrl: manifest.owner?.contact ?? undefined,
  description: manifest.description,
  purpose: manifest.disclosure?.disclosure_text ?? '',
  domain: mapDomain(manifest),
  riskLevel: mapRiskLevel(manifest.compliance?.eu_ai_act?.risk_class),
  slug: manifest.agent_id,
  detectionPatterns: manifest.permissions?.tools ?? [],
  versions: { cli: manifest.version, manifest: manifest.manifest_version },
  autonomyLevel: manifest.autonomy_level,
  framework: manifest.framework,
  modelProvider: manifest.model?.provider,
  modelId: manifest.model?.model_id,
  lifecycleStatus: manifest.lifecycle?.status ?? undefined,
  compliorScore: manifest.compliance?.complior_score,
  manifestVersion: manifest.manifest_version,
  signature: manifest.signature,
  extendedFields: {
    owner: manifest.owner,
    constraints: manifest.constraints,
    permissions: manifest.permissions,
    logging: manifest.logging,
    interop: manifest.interop,
    source: manifest.source,
    autonomy_evidence: manifest.autonomy_evidence,
  },
});

// Document type mapping: CLI file patterns to SaaS document types
const DOC_TYPE_MAP: Record<string, string> = {
  'ai-literacy-policy': 'usage_policy',
  'art5-screening-report': 'risk_assessment',
  'technical-documentation': 'qms_template',
  'monitoring-policy': 'monitoring_plan',
  'worker-notification': 'employee_notification',
  'fria': 'fria',
  'declaration-of-conformity': 'transparency_notice',
  'incident-report': 'incident_report',
};

interface SyncRouteDeps {
  readonly getProjectPath: () => string;
  readonly getLastScan: () => import('../../types/common.types.js').ScanResult | null;
}

export const createSyncRoute = (deps: SyncRouteDeps) => {
  const app = new Hono();

  // POST /sync/passport — push all passports to SaaS
  app.post('/sync/passport', async (c) => {
    const body = await c.req.json().catch(() => { throw new ValidationError('Invalid JSON body'); });
    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(`Invalid request: ${parsed.error.message}`);

    const { token, saasUrl } = parsed.data;
    const client = createSaasClient(saasUrl ?? DEFAULT_SAAS_URL);
    const projectPath = deps.getProjectPath();
    const passportsDir = join(projectPath, '.complior', 'passports');

    let files: string[];
    try {
      files = (await readdir(passportsDir)).filter((f) => f.endsWith('.json'));
    } catch {
      return c.json({ synced: 0, created: 0, updated: 0, conflicts: 0, results: [], message: 'No passports found' });
    }

    const results: Record<string, unknown>[] = [];
    let created = 0;
    let updated = 0;
    let conflicts = 0;

    for (const file of files) {
      try {
        const content = await readFile(join(passportsDir, file), 'utf-8');
        const manifest = parseManifest(content);
        if (!manifest) { results.push({ name: file, action: 'error', error: 'Invalid manifest' }); continue; }
        const payload = mapPassport(manifest);
        const result = await client.syncPassport(token, payload);
        results.push({ name: manifest.name, ...result });
        if (result.action === 'created') created++;
        if (result.action === 'updated') updated++;
        if (Array.isArray(result.conflicts) && result.conflicts.length > 0) conflicts++;
      } catch (err) {
        log.error(`Failed to sync passport ${file}:`, err);
        results.push({ name: file, action: 'error', error: String(err) });
      }
    }

    return c.json({ synced: files.length, created, updated, conflicts, results });
  });

  // POST /sync/scan — push last scan results to SaaS
  app.post('/sync/scan', async (c) => {
    const body = await c.req.json().catch(() => { throw new ValidationError('Invalid JSON body'); });
    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(`Invalid request: ${parsed.error.message}`);

    const { token, saasUrl } = parsed.data;
    const client = createSaasClient(saasUrl ?? DEFAULT_SAAS_URL);
    const lastScan = deps.getLastScan();

    if (!lastScan) {
      return c.json({ processed: 0, tools: [], message: 'No scan results. Run a scan first.' });
    }

    // Read passports for tool detection
    const projectPath = deps.getProjectPath();
    const passportsDir = join(projectPath, '.complior', 'passports');
    const toolsDetected: { name: string; version?: string; vendor?: string; category?: string }[] = [];

    try {
      const files = (await readdir(passportsDir)).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = await readFile(join(passportsDir, file), 'utf-8');
          const manifest = parseManifest(content);
          if (!manifest) continue;
          toolsDetected.push({
            name: manifest.name,
            version: manifest.version,
            vendor: manifest.owner?.team,
            category: manifest.type,
          });
        } catch (parseErr) { log.debug(`Skipping invalid passport ${file}:`, parseErr); }
      }
    } catch { /* no passports dir — expected when no agents discovered */ }

    if (toolsDetected.length === 0) {
      toolsDetected.push({ name: 'unknown-project', category: 'other' });
    }

    const payload = {
      projectPath,
      score: lastScan.score?.totalScore,
      findings: lastScan.findings?.map((f) => ({
        severity: f.severity ?? 'info',
        message: f.message ?? '',
        tool: f.checkId,
      })) ?? [],
      toolsDetected,
    };

    const result = await client.syncScan(token, payload);
    return c.json(result);
  });

  // POST /sync/documents — push compliance docs to SaaS
  app.post('/sync/documents', async (c) => {
    const body = await c.req.json().catch(() => { throw new ValidationError('Invalid JSON body'); });
    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(`Invalid request: ${parsed.error.message}`);

    const { token, saasUrl } = parsed.data;
    const client = createSaasClient(saasUrl ?? DEFAULT_SAAS_URL);
    const projectPath = deps.getProjectPath();
    const docsDir = join(projectPath, 'docs', 'compliance');

    let files: string[];
    try {
      files = (await readdir(docsDir)).filter((f) => f.endsWith('.md'));
    } catch {
      return c.json({ synced: 0, created: 0, updated: 0, results: [], message: 'No compliance docs found' });
    }

    const documents: SyncDocPayload[] = [];
    for (const file of files) {
      const baseName = file.replace('.md', '');
      const docType = DOC_TYPE_MAP[baseName];
      if (!docType) continue;

      try {
        const content = await readFile(join(docsDir, file), 'utf-8');
        documents.push({
          type: docType,
          title: baseName.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
          content,
        });
      } catch {
        log.warn(`Failed to read doc: ${file}`);
      }
    }

    if (documents.length === 0) {
      return c.json({ synced: 0, created: 0, updated: 0, results: [], message: 'No mappable docs found' });
    }

    const result = await client.syncDocuments(token, documents);
    return c.json(result);
  });

  // GET /sync/status — proxy SaaS sync status
  app.get('/sync/status', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') ?? c.req.query('token') ?? '';
    const saasUrl = c.req.query('saasUrl') ?? DEFAULT_SAAS_URL;

    if (!token) {
      return c.json({ authenticated: false, stats: null });
    }

    try {
      const client = createSaasClient(saasUrl);
      const status = await client.syncStatus(token);
      return c.json({ authenticated: true, ...status });
    } catch {
      return c.json({ authenticated: false, stats: null });
    }
  });

  return app;
};
