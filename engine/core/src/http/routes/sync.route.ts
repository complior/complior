import { Hono } from 'hono';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { SyncPassportSchema, SyncScanSchema, SyncDocumentsSchema, SyncFriaSchema } from '@complior/contracts/sync';
import { createSaasClient, type SyncDocPayload } from '../../infra/saas-client.js';
import type { AgentPassport } from '../../types/passport.types.js';
import type { ScanResult } from '../../types/common.types.js';
import type { SyncPassportPayload } from '../../types/sync.types.js';
import type { PassportService } from '../../services/passport-service.js';
import type { AuditFilter, AuditEntry } from '../../domain/audit/audit-trail.js';
import { mapDomain } from '../../domain/passport/builder/domain-mapper.js';
import { createLogger } from '../../infra/logger.js';
import { parseBody } from '../utils/validation.js';

const log = createLogger('sync');

const parseManifest = (raw: string): AgentPassport | null => {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) return null;
  if (!('name' in parsed) || typeof parsed.name !== 'string') return null;
  // Validated: has required `name` field — safe to treat as manifest
  return parsed as AgentPassport;
};

const SyncRequestSchema = z.object({
  token: z.string().min(1),
  saasUrl: z.string().url('saasUrl is required — set PROJECT_API_URL or run `complior login`'),
});

// Map AgentPassport risk_class to SaaS riskLevel
const mapRiskLevel = (riskClass?: string): 'prohibited' | 'high' | 'limited' | 'minimal' | 'gpai' | undefined => {
  if (!riskClass) return undefined;
  const map: Record<string, 'prohibited' | 'high' | 'limited' | 'minimal' | 'gpai'> = {
    L1: 'minimal', L2: 'limited', L3: 'limited', L4: 'high', L5: 'high',
    minimal: 'minimal', limited: 'limited', high: 'high', prohibited: 'prohibited',
  };
  return map[riskClass];
};

// Map manifest to SaaS passport payload (Groups A-F, no extendedFields)
const mapPassport = (manifest: AgentPassport): SyncPassportPayload => ({
  name: manifest.name,
  slug: manifest.agent_id,
  description: manifest.description,
  purpose: manifest.disclosure?.disclosure_text ?? '',
  domain: mapDomain(manifest),
  vendorName: manifest.owner?.team ?? '',
  vendorUrl: manifest.owner?.contact ?? undefined,
  framework: manifest.framework,
  modelProvider: manifest.model?.provider,
  modelId: manifest.model?.model_id,
  dataResidency: manifest.model?.data_residency ?? undefined,
  riskLevel: mapRiskLevel(manifest.compliance?.eu_ai_act?.risk_class),
  compliorScore: manifest.compliance?.complior_score != null ? Math.round(manifest.compliance.complior_score) : undefined,
  projectScore: manifest.compliance?.project_score,
  lifecycleStatus: manifest.lifecycle?.status ?? undefined,
  friaCompleted: manifest.compliance?.fria_completed,
  friaDate: manifest.compliance?.fria_date,
  workerNotificationSent: manifest.compliance?.worker_notification_sent,
  policyGenerated: manifest.compliance?.policy_generated,
  scanSummary: manifest.compliance?.scan_summary ? {
    totalChecks: manifest.compliance.scan_summary.total_checks,
    passed: manifest.compliance.scan_summary.passed,
    failed: manifest.compliance.scan_summary.failed,
    skipped: manifest.compliance.scan_summary.skipped,
    failedChecks: [...manifest.compliance.scan_summary.failed_checks],
    scanDate: manifest.compliance.scan_summary.scan_date,
  } : undefined,
  multiFramework: manifest.compliance?.multi_framework?.map(f => ({
    frameworkId: f.framework_id,
    frameworkName: f.framework_name,
    score: f.score,
    grade: f.grade,
  })),
  // Group D: Autonomy
  autonomyLevel: manifest.autonomy_level,
  autonomyEvidence: manifest.autonomy_evidence ? {
    humanApprovalGates: manifest.autonomy_evidence.human_approval_gates,
    unsupervisedActions: manifest.autonomy_evidence.unsupervised_actions,
    noLoggingActions: manifest.autonomy_evidence.no_logging_actions,
    autoRated: manifest.autonomy_evidence.auto_rated,
  } : undefined,
  agentType: manifest.type,
  // Group E: Permissions
  owner: manifest.owner ? {
    team: manifest.owner.team,
    contact: manifest.owner.contact,
    responsiblePerson: manifest.owner.responsible_person,
  } : undefined,
  permissions: manifest.permissions ? {
    tools: manifest.permissions.tools as string[],
    dataAccess: {
      read: manifest.permissions.data_access.read as string[],
      write: manifest.permissions.data_access.write as string[],
      delete: manifest.permissions.data_access.delete as string[],
    },
    denied: manifest.permissions.denied as string[],
    ...(manifest.permissions.data_boundaries ? {
      dataBoundaries: {
        piiHandling: manifest.permissions.data_boundaries.pii_handling,
        geographicRestrictions: manifest.permissions.data_boundaries.geographic_restrictions as string[] | undefined,
        retentionDays: manifest.permissions.data_boundaries.retention_days,
      },
    } : {}),
  } : undefined,
  constraints: manifest.constraints ? {
    rateLimits: { maxActionsPerMinute: manifest.constraints.rate_limits.max_actions_per_minute },
    budget: { maxCostPerSessionUsd: manifest.constraints.budget.max_cost_per_session_usd },
    humanApprovalRequired: manifest.constraints.human_approval_required as string[],
    prohibitedActions: manifest.constraints.prohibited_actions as string[],
    ...(manifest.constraints.escalation_rules ? {
      escalationRules: manifest.constraints.escalation_rules.map(r => ({
        condition: r.condition,
        action: r.action,
        description: r.description,
      })),
    } : {}),
  } : undefined,
  oversight: manifest.oversight ? {
    responsiblePerson: manifest.oversight.responsible_person,
    role: manifest.oversight.role,
    contact: manifest.oversight.contact,
    overrideMechanism: manifest.oversight.override_mechanism,
    escalationProcedure: manifest.oversight.escalation_procedure,
  } : undefined,
  disclosure: manifest.disclosure ? {
    userFacing: manifest.disclosure.user_facing,
    disclosureText: manifest.disclosure.disclosure_text,
    aiMarking: { responsesMarked: manifest.disclosure.ai_marking.responses_marked, method: manifest.disclosure.ai_marking.method },
  } : undefined,
  logging: manifest.logging ? {
    actionsLogged: manifest.logging.actions_logged,
    retentionDays: manifest.logging.retention_days,
    includesDecisionRationale: manifest.logging.includes_decision_rationale,
  } : undefined,
  // Group F: Metadata
  manifestVersion: manifest.manifest_version,
  detectionPatterns: [...manifest.permissions?.tools ?? []],
  versions: { cli: manifest.version, manifest: manifest.manifest_version },
  sourceFiles: manifest.source_files ? [...manifest.source_files] : undefined,
  endpoints: manifest.endpoints ? [...manifest.endpoints] : undefined,
  signature: manifest.signature ? {
    algorithm: manifest.signature.algorithm,
    publicKey: manifest.signature.public_key,
    signedAt: manifest.signature.signed_at,
    hash: manifest.signature.hash,
    value: manifest.signature.value,
  } : undefined,
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
  readonly getLastScan: () => ScanResult | null;
  readonly passportService?: PassportService;
  readonly getAuditEntries?: (filter: AuditFilter) => Promise<readonly AuditEntry[]>;
}

export const createSyncRoute = (deps: SyncRouteDeps) => {
  const app = new Hono();

  // POST /sync/passport — push all passports to SaaS
  app.post('/sync/passport', async (c) => {
    const { token, saasUrl } = await parseBody(c, SyncRequestSchema);
    const client = createSaasClient(saasUrl);
    const projectPath = deps.getProjectPath();
    const agentsDir = join(projectPath, '.complior', 'agents');

    let files: string[];
    try {
      files = (await readdir(agentsDir)).filter((f) => f.endsWith('-manifest.json'));
    } catch {
      return c.json({ synced: 0, created: 0, updated: 0, conflicts: 0, results: [], message: 'No passports found' });
    }

    const results: Record<string, unknown>[] = [];
    let created = 0;
    let updated = 0;
    let conflicts = 0;

    for (const file of files) {
      try {
        const content = await readFile(join(agentsDir, file), 'utf-8');
        const manifest = parseManifest(content);
        if (!manifest) { results.push({ name: file, action: 'error', error: 'Invalid manifest' }); continue; }
        const payload = mapPassport(manifest);
        const parseResult = SyncPassportSchema.safeParse(payload);
        if (!parseResult.success) {
          log.warn(`Passport ${file} validation failed, skipping: ${parseResult.error.message}`);
          results.push({ name: manifest.name ?? file, action: 'skipped', error: `Validation failed: ${parseResult.error.message}` });
          continue;
        }
        const result = await client.syncPassport(token, parseResult.data);
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
    const { token, saasUrl } = await parseBody(c, SyncRequestSchema);
    const client = createSaasClient(saasUrl);
    const lastScan = deps.getLastScan();

    if (!lastScan) {
      return c.json({ processed: 0, tools: [], message: 'No scan results. Run a scan first.' });
    }

    // Read passports for tool detection
    const projectPath = deps.getProjectPath();
    const agentsDir2 = join(projectPath, '.complior', 'agents');
    const toolsDetected: { name: string; version?: string; vendor?: string; category?: string }[] = [];

    try {
      const files = (await readdir(agentsDir2)).filter((f) => f.endsWith('-manifest.json'));
      for (const file of files) {
        try {
          const content = await readFile(join(agentsDir2, file), 'utf-8');
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
        checkId: f.checkId,
        severity: f.severity ?? 'info',
        message: f.message ?? '',
      })) ?? [],
      toolsDetected,
    };

    const parseResult = SyncScanSchema.safeParse(payload);
    if (!parseResult.success) {
      log.warn(`Scan sync validation failed: ${parseResult.error.message}`);
      return c.json({ processed: 0, tools: [], message: `Validation failed: ${parseResult.error.message}` });
    }

    const result = await client.syncScan(token, parseResult.data);
    return c.json(result);
  });

  // POST /sync/fria — push structured FRIA assessments to SaaS
  app.post('/sync/fria', async (c) => {
    const { token, saasUrl } = await parseBody(c, SyncRequestSchema);
    const client = createSaasClient(saasUrl);
    const projectPath = deps.getProjectPath();
    const reportsDir = join(projectPath, '.complior', 'reports');

    let friaFiles: string[];
    try {
      friaFiles = (await readdir(reportsDir)).filter((f) => f.startsWith('fria-') && f.endsWith('.json'));
    } catch {
      return c.json({ synced: 0, created: 0, updated: 0, results: [], message: 'No FRIA reports found' });
    }

    const results: Record<string, unknown>[] = [];
    let created = 0;
    let updated = 0;

    for (const file of friaFiles) {
      try {
        const content = await readFile(join(reportsDir, file), 'utf-8');
        const payload: Record<string, unknown> = JSON.parse(content);
        // Validate FRIA payload against contracts schema before sync
        const friaParseResult = SyncFriaSchema.safeParse(payload);
        if (!friaParseResult.success) {
          log.warn(`FRIA ${file} validation failed, skipping: ${friaParseResult.error.message}`);
          results.push({ name: file, action: 'skipped', error: `Validation failed: ${friaParseResult.error.message}` });
          continue;
        }
        const result = await client.syncFria(token, friaParseResult.data);
        const name = (payload['toolSlug'] as string) ?? file;
        results.push({ name, ...result });
        if (result.action === 'created') created++;
        if (result.action === 'updated') updated++;
      } catch (err) {
        log.error(`Failed to sync FRIA ${file}:`, err);
        results.push({ name: file, action: 'error', error: String(err) });
      }
    }

    return c.json({ synced: friaFiles.length, created, updated, results });
  });

  // POST /sync/documents — push compliance docs to SaaS
  app.post('/sync/documents', async (c) => {
    const { token, saasUrl } = await parseBody(c, SyncRequestSchema);
    const client = createSaasClient(saasUrl);
    const projectPath = deps.getProjectPath();
    const reportsDir = join(projectPath, '.complior', 'reports');

    let files: string[];
    try {
      files = (await readdir(reportsDir)).filter((f) => f.endsWith('.md'));
    } catch {
      return c.json({ synced: 0, created: 0, updated: 0, results: [], message: 'No compliance docs found' });
    }

    const documents: SyncDocPayload[] = [];
    for (const file of files) {
      // Strip fria- prefix and .md extension for type mapping
      const baseName = file.replace(/^fria-/, '').replace(/-manifest/, '').replace('.md', '');
      const docType = file.startsWith('fria-') ? 'fria' : DOC_TYPE_MAP[baseName];
      if (!docType) continue;

      try {
        const content = await readFile(join(reportsDir, file), 'utf-8');
        documents.push({
          type: docType,
          title: file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
          content,
        });
      } catch {
        log.warn(`Failed to read doc: ${file}`);
      }
    }

    if (documents.length === 0) {
      return c.json({ synced: 0, created: 0, updated: 0, results: [], message: 'No mappable docs found' });
    }

    const parseResult = SyncDocumentsSchema.safeParse({ documents });
    if (!parseResult.success) {
      log.warn(`Documents sync validation failed, skipping: ${parseResult.error.message}`);
      return c.json({ synced: 0, created: 0, updated: 0, results: [], message: `Validation failed: ${parseResult.error.message}` });
    }

    const result = await client.syncDocuments(token, parseResult.data.documents);
    return c.json(result);
  });

  // POST /sync/audit — push audit trail entries to SaaS
  app.post('/sync/audit', async (c) => {
    const { token, saasUrl } = await parseBody(c, SyncRequestSchema);
    const client = createSaasClient(saasUrl);

    const entries = deps.getAuditEntries
      ? await deps.getAuditEntries({})
      : [];

    if (entries.length === 0) {
      return c.json({ synced: 0, message: 'No audit entries to sync' });
    }

    const serializable = entries.map(e => ({ ...e }));
    const result = await client.syncAudit(token, serializable);
    return c.json(result);
  });

  // POST /sync/evidence — push evidence chain summary to SaaS
  app.post('/sync/evidence', async (c) => {
    const { token, saasUrl } = await parseBody(c, SyncRequestSchema);
    const client = createSaasClient(saasUrl);

    const summary = deps.passportService
      ? await deps.passportService.getEvidenceChainSummary()
      : { totalEntries: 0, scanCount: 0, firstEntry: '', lastEntry: '', chainValid: true, uniqueFindings: 0 };

    const result = await client.syncEvidence(token, { ...summary });
    return c.json(result);
  });

  // POST /sync/registry — push agent registry scores to SaaS
  app.post('/sync/registry', async (c) => {
    const { token, saasUrl } = await parseBody(c, SyncRequestSchema);
    const client = createSaasClient(saasUrl);

    const entries = deps.passportService
      ? await deps.passportService.getAgentRegistry()
      : [];

    if (entries.length === 0) {
      return c.json({ synced: 0, message: 'No registry entries to sync' });
    }

    const serializable = entries.map(e => ({ ...e }));
    const result = await client.syncRegistry(token, serializable);
    return c.json(result);
  });

  // GET /sync/status — proxy SaaS sync status
  app.get('/sync/status', async (c) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') ?? c.req.query('token') ?? '';
    const saasUrl = c.req.query('saasUrl') ?? '';

    if (!token || !saasUrl) {
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
