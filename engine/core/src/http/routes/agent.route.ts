import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';

const InitRequestSchema = z.object({
  path: z.string().min(1),
  overrides: z.record(z.unknown()).optional(),
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

  // C.S02: Standalone autonomy analysis
  app.get('/agent/autonomy', async (c) => {
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }

    const result = await passportService.analyzeProjectAutonomy(path);
    return c.json(result);
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

  return app;
};
