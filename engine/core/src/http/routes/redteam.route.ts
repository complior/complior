/**
 * Red-team route — runs security probes against LLM and returns reports.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRedteamRunner } from '../../domain/certification/redteam-runner.js';
import type { RedteamRunnerDeps } from '../../domain/certification/redteam-runner.js';
import { parseBody } from '../utils/validation.js';

const RedteamRunSchema = z.object({
  agentName: z.string().min(1).default('default'),
  categories: z.array(z.string()).optional(),
  maxProbes: z.number().int().positive().optional(),
});

export interface RedteamRouteDeps {
  readonly callLlm: (prompt: string, systemPrompt?: string) => Promise<string>;
  readonly evidenceStore?: RedteamRunnerDeps['evidenceStore'];
  readonly auditStore?: RedteamRunnerDeps['auditStore'];
  readonly getProjectPath: () => string;
}

export const createRedteamRoute = (deps: RedteamRouteDeps) => {
  const app = new Hono();

  const runner = createRedteamRunner({
    callLlm: deps.callLlm,
    evidenceStore: deps.evidenceStore,
    auditStore: deps.auditStore,
    getProjectPath: deps.getProjectPath,
  });

  /**
   * POST /redteam/run
   * Body: { agentName: string, categories?: string[], maxProbes?: number }
   * Returns: RedteamReport
   */
  app.post('/redteam/run', async (c) => {
    const data = await parseBody(c, RedteamRunSchema);

    const report = await runner.runRedteam(data.agentName, {
      categories: data.categories,
      maxProbes: data.maxProbes,
    });

    return c.json(report);
  });

  /**
   * GET /redteam/last
   * Returns the most recent red-team report, or 404 if none exists.
   */
  app.get('/redteam/last', async (c) => {
    const reportsDir = resolve(deps.getProjectPath(), '.complior', 'reports');
    try {
      const files = await readdir(reportsDir);
      const redteamFiles = files
        .filter((f) => f.startsWith('redteam-') && f.endsWith('.json'));

      if (redteamFiles.length === 0) {
        return c.json({ error: 'NOT_FOUND', message: 'No red-team reports found' }, 404);
      }

      // Sort by file modification time (most recent first)
      const withMtime = await Promise.all(
        redteamFiles.map(async (f) => {
          const s = await stat(resolve(reportsDir, f));
          return { name: f, mtime: s.mtimeMs };
        }),
      );
      withMtime.sort((a, b) => b.mtime - a.mtime);

      const raw = await readFile(resolve(reportsDir, withMtime[0]!.name), 'utf-8');
      return c.json(JSON.parse(raw));
    } catch {
      return c.json({ error: 'NOT_FOUND', message: 'No red-team reports found' }, 404);
    }
  });

  return app;
};
