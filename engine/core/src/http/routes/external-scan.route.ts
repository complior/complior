import { Hono } from 'hono';
import { z } from 'zod';
import type { ExternalScanService } from '../../services/external-scan-service.js';
import { ValidationError } from '../../types/errors.js';

const ExternalScanSchema = z.object({
  url: z.string().url(),
  level: z.enum(['L1', 'L2', 'L3']).optional(),
  timeout: z.number().int().min(5000).max(300000).optional(),
});

export const createExternalScanRoute = (externalScanService: ExternalScanService) => {
  const app = new Hono();

  app.post('/scan-url', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ExternalScanSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await externalScanService.scan(parsed.data);
    return c.json(result);
  });

  return app;
};
