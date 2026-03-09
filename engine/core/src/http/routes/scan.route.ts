import { Hono } from 'hono';
import { z } from 'zod';
import type { ScanService } from '../../services/scan-service.js';
import type { ScanResult } from '../../types/common.types.js';
import { ValidationError } from '../../types/errors.js';
import { computeComplianceDiff, formatDiffMarkdown } from '../../domain/scanner/compliance-diff.js';

const ScanRequestSchema = z.object({
  path: z.string().min(1),
  saasToken: z.string().min(1).optional(),
  saasUrl: z.string().url().optional(),
});

const ScanDiffRequestSchema = z.object({
  path: z.string().min(1),
  changedFiles: z.array(z.string()).optional(),
  markdown: z.boolean().optional(),
});

export interface ScanRouteDeps {
  readonly scanService: ScanService;
  readonly getLastScan: () => ScanResult | null;
}

export const createScanRoute = (deps: ScanRouteDeps) => {
  const app = new Hono();
  const { scanService, getLastScan } = deps;

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
        const saasUrl = parsed.data.saasUrl;
        if (!saasUrl) throw new Error('saasUrl required for auto-sync');
        const client = createSaasClient(saasUrl);
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

  // US-S05-34: Compliance Diff
  app.post('/scan/diff', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ScanDiffRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    // Get baseline (previous scan result)
    const baseline = getLastScan();

    // Run fresh scan
    const current = await scanService.scan(parsed.data.path);

    // Compute diff
    const diff = computeComplianceDiff(baseline, current, parsed.data.changedFiles);

    if (parsed.data.markdown) {
      const md = formatDiffMarkdown(diff);
      return c.json({ ...diff, markdown: md });
    }

    return c.json(diff);
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
