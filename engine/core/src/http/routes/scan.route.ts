import { Hono } from 'hono';
import { z } from 'zod';
import type { ScanService } from '../../services/scan-service.js';
import { ValidationError } from '../../types/errors.js';

const ScanRequestSchema = z.object({
  path: z.string().min(1),
  saasToken: z.string().min(1).optional(),
  saasUrl: z.string().url().optional(),
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

    // Auto-sync: if saasToken provided, push scan to SaaS
    const saasToken = parsed.data.saasToken;
    if (saasToken) {
      try {
        const { createSaasClient } = await import('../../infra/saas-client.js');
        const client = createSaasClient(parsed.data.saasUrl ?? 'https://app.complior.ai');
        await client.syncScan(saasToken, {
          projectPath: parsed.data.path,
          score: result.score?.totalScore,
          findings: result.findings?.map((f) => ({
            severity: f.severity ?? 'info',
            message: f.message ?? '',
            tool: f.checkId,
          })) ?? [],
          toolsDetected: [{ name: 'scanned-project', category: 'other' }],
        });
      } catch (syncErr) {
        const { createLogger } = await import('../../infra/logger.js');
        createLogger('scan').warn('Auto-sync to SaaS failed (non-blocking):', syncErr);
      }
    }

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
