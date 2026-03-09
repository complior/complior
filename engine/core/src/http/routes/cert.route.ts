import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';

const ReadinessQuerySchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
});

export const createCertRoute = (passportService: PassportService) => {
  const app = new Hono();

  // US-S05-19: AIUC-1 Readiness Score
  app.get('/cert/readiness', async (c) => {
    const parsed = ReadinessQuerySchema.safeParse({
      path: c.req.query('path'),
      name: c.req.query('name'),
    });
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await passportService.getReadiness(parsed.data.name, parsed.data.path);
    if (result === null) {
      throw new ValidationError(`Passport not found: ${parsed.data.name}`);
    }
    return c.json(result);
  });

  return app;
};
