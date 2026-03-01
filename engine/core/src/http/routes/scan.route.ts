import { Hono } from 'hono';
import { z } from 'zod';
import type { ScanService } from '../../services/scan-service.js';
import { ValidationError } from '../../types/errors.js';

const ScanRequestSchema = z.object({
  path: z.string().min(1),
});

export const createScanRoute = (scanService: ScanService) => {
  const app = new Hono();

  app.post('/scan', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ScanRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await scanService.scan(parsed.data.path);
    return c.json(result);
  });

  app.post('/scan/deep', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ScanRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await scanService.scanDeep(parsed.data.path);
    return c.json(result);
  });

  app.get('/sbom', async (c) => {
    const path = c.req.query('path');
    if (!path) {
      throw new ValidationError('Missing "path" query parameter');
    }

    const sbom = await scanService.getSbom(path);
    return c.json(sbom);
  });

  return app;
};
