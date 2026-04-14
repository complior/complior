import { Hono } from 'hono';
import { z } from 'zod';
import type { ScanService } from '../../services/scan-service.js';
import type { ScanResult } from '../../types/common.types.js';
import { parseBody, requireQuery } from '../utils/validation.js';
import type { PriorityAction } from '../../domain/reporter/types.js';
import { buildScoreDisclaimer } from '../../domain/scanner/score-disclaimer.js';
import { buildCategoryBreakdown } from '../../domain/scanner/category-breakdown.js';
import { buildProfileAwareTopActions } from '../../domain/scanner/profile-priority.js';

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

/** V1-M10 T-3: Build topActions from scan result — delegates to pure buildProfileAwareTopActions(). */
const computeTopActions = (result: ScanResult): PriorityAction[] =>
  buildProfileAwareTopActions(result, result.filterContext ?? null);

export const createScanRoute = (deps: ScanRouteDeps) => {
  const app = new Hono();
  const { scanService } = deps;

  app.post('/scan', async (c) => {
    const data = await parseBody(c, ScanRequestSchema);
    const result = await scanService.scan(data.path);

    /** V1-M08 T-5: include top-5 priority actions in scan response */
    const topActions = computeTopActions(result);

    /** V1-M10 T-1: score disclaimer -- what the score does and doesn't cover */
    const coveredIds = Array.from(
      new Set(
        result.findings
          .filter((f) => f.type === 'pass' && f.obligationId !== undefined)
          .map((f) => f.obligationId!),
      ),
    );
    const scoreDisclaimer = buildScoreDisclaimer(result.score, result.filterContext ?? null, coveredIds);

    /** V1-M10 T-2: per-category breakdown with impact levels and top failures */
    const categoryBreakdown = buildCategoryBreakdown(result.score, result.findings);

    // Auto-sync: if saasToken provided, push scan to SaaS
    const saasToken = data.saasToken;
    if (saasToken) {
      try {
        const { createSaasClient } = await import('../../infra/saas-client.js');
        const saasUrl = data.saasUrl;
        if (!saasUrl) throw new Error('saasUrl required for auto-sync');
        const client = createSaasClient(saasUrl);
        await client.syncScan(saasToken, {
          projectPath: data.path,
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

    return c.json({ ...result, topActions, scoreDisclaimer, categoryBreakdown });
  });

  app.post('/scan/deep', async (c) => {
    const data = await parseBody(c, ScanRequestSchema);

    const result = await scanService.scanDeep(data.path);
    return c.json(result);
  });

  // US-S05-34: Compliance Diff -- delegates to scanService.scanDiff()
  app.post('/scan/diff', async (c) => {
    const data = await parseBody(c, ScanDiffRequestSchema);

    const result = await scanService.scanDiff(
      data.path,
      data.changedFiles,
      { markdown: data.markdown },
    );

    return c.json(result);
  });

  // E-115: Tier 2 scan -- external tools via uv
  app.post('/scan/tier2', async (c) => {
    const data = await parseBody(c, ScanRequestSchema);

    const result = await scanService.scanTier2(data.path);
    return c.json(result);
  });

  // Alias: POST /scan/llm -> scanDeep (L5 LLM analysis)
  app.post('/scan/llm', async (c) => {
    const data = await parseBody(c, ScanRequestSchema);

    const result = await scanService.scanDeep(data.path);
    return c.json(result);
  });

  app.get('/sbom', async (c) => {
    const path = requireQuery(c, 'path');

    const sbom = await scanService.getSbom(path);
    return c.json(sbom);
  });

  return app;
};
