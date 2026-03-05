import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';

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

  return app;
};
