import { Hono } from 'hono';
import { z } from 'zod';
import type { ExternalScanService } from '../../services/external-scan-service.js';
import { parseBody } from '../utils/validation.js';

const ExternalScanSchema = z.object({
  url: z.string().url(),
  level: z.enum(['L1', 'L2', 'L3']).optional(),
  timeout: z.number().int().min(5000).max(300000).optional(),
});

export const createExternalScanRoute = (getExternalScanService: () => Promise<ExternalScanService>) => {
  const app = new Hono();

  app.post('/scan-url', async (c) => {
    const data = await parseBody(c, ExternalScanSchema);

    const externalScanService = await getExternalScanService();
    const result = await externalScanService.scan(data);
    return c.json(result);
  });

  return app;
};
