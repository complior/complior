import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';

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
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = InitRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await passportService.initPassport(
      parsed.data.path,
      parsed.data.overrides,
      parsed.data.force,
    );
    return c.json(result);
  });

  app.get('/agent/list', async (c) => {
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }

    const manifests = await passportService.listPassports(path);
    return c.json(manifests);
  });

  app.get('/agent/show', async (c) => {
    const path = c.req.query('path');
    const name = c.req.query('name');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }
    if (!name) {
      throw new ValidationError('Missing "name" query parameter');
    }

    const manifest = await passportService.showPassport(name, path);
    if (manifest === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(manifest);
  });

  // C.S02: Standalone autonomy analysis (per-agent breakdown)
  app.get('/agent/autonomy', async (c) => {
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }

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
    const path = c.req.query('path');
    const name = c.req.query('name');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }
    if (!name) {
      throw new ValidationError('Missing "name" query parameter');
    }

    const result = await passportService.validatePassportByName(name, path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(result);
  });

  // C.S09: Passport completeness score
  app.get('/agent/completeness', async (c) => {
    const path = c.req.query('path');
    const name = c.req.query('name');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }
    if (!name) {
      throw new ValidationError('Missing "name" query parameter');
    }

    const result = await passportService.getPassportCompleteness(name, path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${name}`);
    }
    return c.json(result);
  });

  // C.D01: Generate FRIA from passport
  app.post('/agent/fria', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      organization: z.string().optional(),
      assessor: z.string().optional(),
      impact: z.string().optional(),
      mitigation: z.string().optional(),
      approval: z.string().optional(),
    }).safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await passportService.generateFriaReport(
      parsed.data.name,
      parsed.data.path,
      {
        organization: parsed.data.organization,
        assessor: parsed.data.assessor,
        impact: parsed.data.impact,
        mitigation: parsed.data.mitigation,
        approval: parsed.data.approval,
      },
    );
    if (result === null) {
      throw new ValidationError(`Passport not found: ${parsed.data.name}`);
    }
    return c.json(result);
  });

  // C.D02: Generate Worker Notification from passport (Art.26(7))
  app.post('/agent/notify', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      deploymentDate: z.string().optional(),
      affectedRoles: z.string().optional(),
      impactDescription: z.string().optional(),
    }).safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await passportService.generateWorkerNotification(
      parsed.data.name,
      parsed.data.path,
      {
        companyName: parsed.data.companyName,
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        deploymentDate: parsed.data.deploymentDate,
        affectedRoles: parsed.data.affectedRoles,
        impactDescription: parsed.data.impactDescription,
      },
    );
    if (result === null) {
      throw new ValidationError(`Passport not found: ${parsed.data.name}`);
    }
    return c.json(result);
  });

  // C.S08: Export passport to external format (A2A, AIUC-1, NIST)
  app.get('/agent/export', async (c) => {
    const path = c.req.query('path');
    const name = c.req.query('name');
    const format = c.req.query('format');
    if (!path) throw new ValidationError('Missing "path" query parameter');
    if (!name) throw new ValidationError('Missing "name" query parameter');

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
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }
    return c.json(await passportService.getEvidenceChainSummary(path));
  });

  // C.R20: Evidence chain verification
  app.get('/agent/evidence/verify', async (c) => {
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }
    return c.json(await passportService.verifyEvidenceChain(path));
  });

  // US-S05-13: Agent Registry — per-agent compliance dashboard
  app.get('/agent/registry', async (c) => {
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }
    return c.json(await passportService.getAgentRegistry(path));
  });

  // US-S05-14: Permissions matrix
  app.get('/agent/permissions', async (c) => {
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }
    return c.json(await passportService.getPermissionsMatrix(path));
  });

  // US-S05-14: Audit trail query
  app.get('/agent/audit', async (c) => {
    const parsed = AuditQuerySchema.safeParse(c.req.query());
    if (!parsed.success) throw new ValidationError(`Invalid query: ${parsed.error.message}`);

    const entries = await passportService.getAuditTrail({
      agentName: parsed.data.agent,
      since: parsed.data.since,
      until: parsed.data.until,
      eventType: parsed.data.type,
      limit: parsed.data.limit,
    });
    return c.json(entries);
  });

  // US-S05-14: Audit trail summary
  app.get('/agent/audit/summary', async (c) => {
    return c.json(await passportService.getAuditSummary());
  });

  // US-S05-15: Generate industry-specific AI usage policy
  app.post('/agent/policy', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const VALID_INDUSTRIES = ['hr', 'finance', 'healthcare', 'education', 'legal'] as const;
    const parsed = z.object({
      path: z.string().min(1),
      name: z.string().min(1),
      industry: z.enum(VALID_INDUSTRIES),
      organization: z.string().optional(),
      approver: z.string().optional(),
    }).safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await passportService.generatePolicy(
      parsed.data.name,
      parsed.data.industry,
      parsed.data.path,
      {
        organization: parsed.data.organization,
        approver: parsed.data.approver,
      },
    );
    if (result === null) {
      throw new ValidationError(`Passport not found: ${parsed.data.name}`);
    }
    return c.json(result);
  });

  // US-S05-24: Generate compliance test suite from passport constraints
  app.post('/agent/test-gen', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = z.object({
      name: z.string().min(1),
      path: z.string().optional(),
    }).safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await passportService.generateTestSuite(parsed.data.name, parsed.data.path);
    return c.json(result);
  });

  // US-S05-19: AIUC-1 Readiness Score
  app.get('/agent/readiness', async (c) => {
    const name = c.req.query('name');
    const path = c.req.query('path');
    if (!name) {
      throw new ValidationError('Missing "name" query parameter');
    }

    const result = await passportService.getReadiness(name, path || undefined);
    if (!result) {
      return c.json({ error: 'not_found', message: `Passport "${name}" not found` }, 404);
    }
    return c.json(result);
  });

  // US-S05-24: Compare passport versions (diff)
  app.get('/agent/diff', async (c) => {
    const name = c.req.query('name');
    const path = c.req.query('path');
    if (!name) {
      throw new ValidationError('Missing "name" query parameter');
    }

    const result = await passportService.diffPassport(name, path || undefined);
    return c.json(result);
  });

  return app;
};
