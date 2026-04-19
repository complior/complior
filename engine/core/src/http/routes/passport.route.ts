import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';
import { parseBody, parseQuery } from '../utils/validation.js';

const AUDIT_EVENT_TYPES = [
  'passport.created', 'passport.updated', 'passport.exported',
  'fria.generated', 'scan.completed', 'fix.applied',
  'evidence.verified', 'worker_notification.generated',
  'policy.generated',
  'readiness.computed',
] as const;

const AuditQuerySchema = z.object({
  agent: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  type: z.enum(AUDIT_EVENT_TYPES).optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const InitRequestSchema = z.object({
  path: z.string().min(1),
  overrides: z.record(z.unknown()).optional(),
  force: z.boolean().optional(),
  // T-13: Filter init to only a specific agent name (passport init <name>)
  agentName: z.string().optional(),
});

export const createPassportRoute = (passportService: PassportService) => {
  const app = new Hono();

  app.post('/passport/init', async (c) => {
    const data = await parseBody(c, InitRequestSchema);

    const result = await passportService.initPassport(
      data.path,
      data.overrides,
      data.force,
      data.agentName,
    );
    return c.json(result);
  });

  app.get('/passport/list', async (c) => {
    const path = c.req.query('path');
    const manifests = await passportService.listPassports(path);
    return c.json(manifests);
  });

  app.get('/passport/show', async (c) => {
    const path = c.req.query('path');
    const name = c.req.query('name');
    if (!name) throw new ValidationError('Missing required query param: name');
    const manifest = await passportService.showPassport(name, path);
    if (manifest === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(manifest);
  });

  app.post('/passport/rename', async (c) => {
    const data = await parseBody(c, z.object({
      path: z.string().min(1),
      oldName: z.string().min(1),
      newName: z.string().min(1),
    }));

    await passportService.renamePassport(
      data.oldName,
      data.newName,
      data.path,
    );
    return c.json({ success: true, newName: data.newName });
  });

  // C.S02: Standalone autonomy analysis (per-agent breakdown)
  app.get('/passport/autonomy', async (c) => {
    const path = c.req.query('path');

    const manifests = await passportService.listPassports(path ?? undefined);

    /** Normalize autonomy level to a number (handles both string 'L3' and numeric 3). */
    const toLevel = (al: unknown): number => {
      if (typeof al === 'number' && Number.isInteger(al)) return al;
      if (typeof al === 'string') return parseInt(al.replace(/^L/, ''), 10);
      return 0;
    };

    if (manifests.length > 0) {
      const agents = manifests.map(m => ({
        name: m.name,
        level: toLevel(m.autonomy_level),
        agentType: m.type,
        evidence: m.autonomy_evidence ?? {
          human_approval_gates: 0,
          unsupervised_actions: 0,
          no_logging_actions: 0,
          auto_rated: true,
        },
      }));
      const projectAnalysis = await passportService.analyzeProjectAutonomy(path ?? undefined);
      return c.json({ agents, summary: projectAnalysis });
    }

    const result = await passportService.analyzeProjectAutonomy(path ?? undefined);
    return c.json({ agents: [], summary: result });
  });

  // C.S07: Passport validation (schema + signature + completeness)
  app.get('/passport/validate', async (c) => {
    const path = c.req.query('path');
    const name = c.req.query('name');
    if (!name) throw new ValidationError('Missing required query param: name');
    const result = await passportService.validatePassportByName(name, path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json({
      valid: result.valid,
      schemaValid: result.schemaValid,
      signatureValid: result.signatureValid,
      completeness: result.completeness.score,
      issues: result.errors.map(e => e.message),
      errors: result.errors,
      warnings: result.warnings,
    });
  });

  // C.S09: Passport completeness score
  app.get('/passport/completeness', async (c) => {
    const path = c.req.query('path');
    const name = c.req.query('name');
    if (!name) throw new ValidationError('Missing required query param: name');
    const result = await passportService.getPassportCompleteness(name, path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json({
      completeness: result.score,
      completed_fields: result.filledCount,
      total_fields: result.totalRequired,
      score: result.score,
      filledCount: result.filledCount,
      totalRequired: result.totalRequired,
      filledFields: result.filledFields,
      missingFields: result.missingFields,
    });
  });

  // C.S08: Export passport to external format (A2A, AIUC-1, NIST)
  app.get('/passport/export', async (c) => {
    const path = c.req.query('path');
    const name = c.req.query('name');
    if (!name) throw new ValidationError('Missing required query param: name');
    const format = c.req.query('format') as string | undefined;

    const validFormats = ['a2a', 'aiuc-1', 'nist'] as const;
    const parsed = validFormats.find(f => f === format);
    if (!parsed) {
      throw new ValidationError('Invalid "format" — must be a2a, aiuc-1, or nist');
    }

    const result = await passportService.exportPassportToFormat(name, parsed, path);
    if (result === null) throw new ValidationError(`Passport not found: ${name}`);
    return c.json(result);
  });

  // C.R20: Evidence chain summary
  app.get('/passport/evidence', async (c) => {
    const path = c.req.query('path');
    const [summary, chainData] = await Promise.all([
      passportService.getEvidenceChainSummary(path ?? undefined),
      passportService.getEvidenceChain(),
    ]);
    const flattenedEntries = (chainData.entries as Array<Record<string, unknown>>).map((entry) => {
      const ev = entry['evidence'] as Record<string, unknown> | undefined;
      return ev ? { source: ev['source'], layer: ev['layer'], findingId: ev['findingId'], ...entry } : entry;
    });
    return c.json({ ...summary, entries: flattenedEntries });
  });

  // C.R20: Evidence chain verification
  app.get('/passport/evidence/verify', async (c) => {
    const path = c.req.query('path');
    const result = await passportService.verifyEvidenceChain(path ?? undefined);
    return c.json({
      valid: result.valid,
      verified: result.valid,
      entries: result.valid ? 1 : 0,
      brokenAt: result.brokenAt,
      issues: result.issues,
    });
  });

  // US-S05-13: Agent Registry
  app.get('/passport/registry', async (c) => {
    const path = c.req.query('path');
    const entries = await passportService.getAgentRegistry(path ?? undefined);
    const agents = entries.map(e => ({ ...e, completeness: e.passportCompleteness }));
    return c.json(agents);
  });

  // US-S05-14: Permissions matrix
  app.get('/passport/permissions', async (c) => {
    const path = c.req.query('path');
    const result = await passportService.getPermissionsMatrix(path ?? undefined);
    // matrix must be Record<string, Record<string, boolean>> for Rust CLI to parse with as_object()
    const matrixObj: Record<string, Record<string, boolean>> = {};
    for (const agentName of result.agents) {
      matrixObj[agentName] = result.matrix[agentName] ?? {};
    }
    return c.json({
      agents: result.agents,
      permissions: result.permissions,
      matrix: matrixObj,
      conflicts: result.conflicts,
    });
  });

  // US-S05-14: Audit trail query
  app.get('/passport/audit', async (c) => {
    const data = parseQuery(c, AuditQuerySchema);

    const entries = await passportService.getAuditTrail({
      agentName: data.agent,
      since: data.since,
      until: data.until,
      eventType: data.type,
      limit: data.limit,
    });
    return c.json(entries);
  });

  // US-S05-14: Audit trail summary
  app.get('/passport/audit/summary', async (c) => {
    const result = await passportService.getAuditSummary();
    return c.json({
      total_events: result.totalEntries,
      by_type: result.eventCounts,
      by_agent: {},
      totalEntries: result.totalEntries,
      eventCounts: result.eventCounts,
      agentNames: result.agentNames,
      firstEntry: result.firstEntry,
      lastEntry: result.lastEntry,
    });
  });

  // US-S05-19: AIUC-1 Readiness Score
  app.get('/passport/readiness', async (c) => {
    const name = c.req.query('name');
    if (!name) throw new ValidationError('Missing required query param: name');
    const path = c.req.query('path');
    const result = await passportService.getReadiness(name, path);
    if (!result) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(result);
  });

  // US-S06-11: Import passport from external format
  app.post('/passport/import', async (c) => {
    const data = await parseBody(c, z.object({
      format: z.enum(['a2a']),
      data: z.record(z.unknown()),
      path: z.string().optional(),
    }));

    const result = await passportService.importPassport(
      data.format,
      data.data,
      data.path,
    );
    return c.json(result);
  });

  // US-S06-12: Audit package export
  app.get('/passport/audit-package', async (c) => {
    const path = c.req.query('path');
    const result = await passportService.generateAuditPackage(path);
    return new Response(result.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="complior-audit-${Date.now()}.tar.gz"`,
      },
    });
  });

  // US-S06-12: Audit package metadata
  app.get('/passport/audit-package/meta', async (c) => {
    const path = c.req.query('path');
    const result = await passportService.generateAuditPackage(path);
    return c.json({
      manifest: result.manifest,
      totalFiles: result.totalFiles,
      sizeBytes: result.buffer.length,
    });
  });

  // US-S05-24: Compare passport versions
  app.get('/passport/diff', async (c) => {
    const name = c.req.query('name');
    if (!name) throw new ValidationError('Missing required query param: name');
    const path = c.req.query('path');
    const result = await passportService.diffPassport(name, path);
    return c.json(result);
  });

  return app;
};
