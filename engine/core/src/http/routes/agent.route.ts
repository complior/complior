import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';
import { ALL_DOC_TYPES } from '../../domain/documents/document-generator.js';
import { parseBody, parseQuery, requireQuery } from '../utils/validation.js';

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
});

export const createAgentRoute = (passportService: PassportService) => {
  const app = new Hono();

  app.post('/agent/init', async (c) => {
    const data = await parseBody(c, InitRequestSchema);

    const result = await passportService.initPassport(
      data.path,
      data.overrides,
      data.force,
    );
    return c.json(result);
  });

  app.get('/agent/list', async (c) => {
    const path = requireQuery(c, 'path');
    const manifests = await passportService.listPassports(path);
    return c.json(manifests);
  });

  app.get('/agent/show', async (c) => {
    const path = requireQuery(c, 'path');
    const name = requireQuery(c, 'name');
    const manifest = await passportService.showPassport(name, path);
    if (manifest === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(manifest);
  });

  app.post('/agent/rename', async (c) => {
    const data = await parseBody(c, z.object({
      path: z.string().min(1),
      oldName: z.string().min(1),
      newName: z.string().min(1),
    }));

    const result = await passportService.renamePassport(
      data.oldName,
      data.newName,
      data.path,
    );
    return c.json(result);
  });

  // C.S02: Standalone autonomy analysis (per-agent breakdown)
  app.get('/agent/autonomy', async (c) => {
    const path = requireQuery(c, 'path');

    // Return per-agent breakdown from existing passports
    const manifests = await passportService.listPassports(path);
    if (manifests.length > 0) {
      const agents = manifests.map(m => ({
        name: m.name,
        level: m.autonomy_level,
        agentType: m.type,
        evidence: m.autonomy_evidence ?? {
          human_approval_gates: 0,
          unsupervised_actions: 0,
          no_logging_actions: 0,
          auto_rated: true,
        },
      }));
      // Also include project-level summary
      const projectAnalysis = await passportService.analyzeProjectAutonomy(path);
      return c.json({ agents, summary: projectAnalysis });
    }

    // No passports — return project-level analysis only
    const result = await passportService.analyzeProjectAutonomy(path);
    return c.json({ agents: [], summary: result });
  });

  // C.S07: Passport validation (schema + signature + completeness)
  app.get('/agent/validate', async (c) => {
    const path = requireQuery(c, 'path');
    const name = requireQuery(c, 'name');
    const result = await passportService.validatePassportByName(name, path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(result);
  });

  // C.S09: Passport completeness score
  app.get('/agent/completeness', async (c) => {
    const path = requireQuery(c, 'path');
    const name = requireQuery(c, 'name');
    const result = await passportService.getPassportCompleteness(name, path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(result);
  });

  // C.D01: Generate FRIA from passport
  app.post('/agent/fria', async (c) => {
    const data = await parseBody(c, z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      organization: z.string().optional(),
      assessor: z.string().optional(),
      impact: z.string().optional(),
      mitigation: z.string().optional(),
      approval: z.string().optional(),
    }));

    const result = await passportService.generateFriaReport(
      data.name,
      data.path,
      {
        organization: data.organization,
        assessor: data.assessor,
        impact: data.impact,
        mitigation: data.mitigation,
        approval: data.approval,
      },
    );
    if (result === null) {
      throw new ValidationError(`Passport not found: ${data.name}`);
    }
    return c.json(result);
  });

  // C.D02: Generate Worker Notification from passport (Art.26(7))
  app.post('/agent/notify', async (c) => {
    const data = await parseBody(c, z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      deploymentDate: z.string().optional(),
      affectedRoles: z.string().optional(),
      impactDescription: z.string().optional(),
    }));

    const result = await passportService.generateWorkerNotification(
      data.name,
      data.path,
      {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        deploymentDate: data.deploymentDate,
        affectedRoles: data.affectedRoles,
        impactDescription: data.impactDescription,
      },
    );
    if (result === null) {
      throw new ValidationError(`Passport not found: ${data.name}`);
    }
    return c.json(result);
  });

  // C.S08: Export passport to external format (A2A, AIUC-1, NIST)
  app.get('/agent/export', async (c) => {
    const path = requireQuery(c, 'path');
    const name = requireQuery(c, 'name');
    const format = c.req.query('format');

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
  app.get('/agent/evidence', async (c) => {
    const path = requireQuery(c, 'path');
    return c.json(await passportService.getEvidenceChainSummary(path));
  });

  // C.R20: Evidence chain verification
  app.get('/agent/evidence/verify', async (c) => {
    const path = requireQuery(c, 'path');
    return c.json(await passportService.verifyEvidenceChain(path));
  });

  // US-S05-13: Agent Registry — per-agent compliance dashboard
  app.get('/agent/registry', async (c) => {
    const path = requireQuery(c, 'path');
    return c.json(await passportService.getAgentRegistry(path));
  });

  // US-S05-14: Permissions matrix
  app.get('/agent/permissions', async (c) => {
    const path = requireQuery(c, 'path');
    return c.json(await passportService.getPermissionsMatrix(path));
  });

  // US-S05-14: Audit trail query
  app.get('/agent/audit', async (c) => {
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
  app.get('/agent/audit/summary', async (c) => {
    return c.json(await passportService.getAuditSummary());
  });

  // US-S05-15: Generate industry-specific AI usage policy
  app.post('/agent/policy', async (c) => {
    const VALID_INDUSTRIES = ['hr', 'finance', 'healthcare', 'education', 'legal'] as const;
    const data = await parseBody(c, z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      industry: z.enum(VALID_INDUSTRIES),
      organization: z.string().optional(),
      approver: z.string().optional(),
    }));

    const result = await passportService.generatePolicy(
      data.name,
      data.industry,
      data.path,
      {
        organization: data.organization,
        approver: data.approver,
      },
    );
    if (result === null) {
      throw new ValidationError(`Passport not found: ${data.name}`);
    }
    return c.json(result);
  });

  // US-S05-24: Generate compliance test suite from passport constraints
  app.post('/agent/test-gen', async (c) => {
    const data = await parseBody(c, z.object({
      name: z.string().min(1),
      path: z.string().optional(),
    }));

    const result = await passportService.generateTestSuite(data.name, data.path);
    return c.json(result);
  });

  // US-S05-19: AIUC-1 Readiness Score
  app.get('/agent/readiness', async (c) => {
    const name = requireQuery(c, 'name');
    const path = c.req.query('path');
    const result = await passportService.getReadiness(name, path || undefined);
    if (!result) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(result);
  });

  // US-S06-11: Import passport from external format (A2A)
  app.post('/agent/import', async (c) => {
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

  // US-S06-12: Audit package export (tar.gz for auditors)
  app.get('/agent/audit-package', async (c) => {
    const path = c.req.query('path');
    const result = await passportService.generateAuditPackage(path || undefined);
    return new Response(result.buffer, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="complior-audit-${Date.now()}.tar.gz"`,
      },
    });
  });

  // US-S06-12: Audit package metadata (JSON)
  app.get('/agent/audit-package/meta', async (c) => {
    const path = c.req.query('path');
    const result = await passportService.generateAuditPackage(path || undefined);
    return c.json({
      manifest: result.manifest,
      totalFiles: result.totalFiles,
      sizeBytes: result.buffer.length,
    });
  });

  // US-S05-24: Compare passport versions (diff)
  app.get('/agent/diff', async (c) => {
    const name = requireQuery(c, 'name');
    const path = c.req.query('path');
    const result = await passportService.diffPassport(name, path || undefined);
    return c.json(result);
  });

  // US-S06-06: Generate a single compliance document by type
  app.post('/agent/doc', async (c) => {
    const data = await parseBody(c, z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      docType: z.enum(ALL_DOC_TYPES),
      organization: z.string().optional(),
    }));

    const result = await passportService.generateDocByType(
      data.name,
      data.docType,
      data.path,
      { organization: data.organization },
    );
    if (result === null) {
      throw new ValidationError(`Passport not found: ${data.name}`);
    }
    return c.json(result);
  });

  // US-S06-06: Generate ALL required compliance documents
  app.post('/agent/doc/all', async (c) => {
    const data = await parseBody(c, z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      organization: z.string().optional(),
    }));

    const result = await passportService.generateAllDocs(
      data.name,
      data.path,
      { organization: data.organization },
    );
    return c.json(result);
  });

  return app;
};
