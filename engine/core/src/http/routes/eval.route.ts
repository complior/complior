/**
 * Eval Route — HTTP endpoints for `complior eval`.
 *
 * POST /eval/run  — Run eval against target
 * GET  /eval/last — Get last eval result
 * GET  /eval/list — List eval results
 */

import { Hono } from 'hono';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EvalService } from '../../services/eval-service.js';
import { EvalOptionsSchema } from '../../domain/eval/types.js';

export interface EvalRouteDeps {
  readonly evalService: EvalService;
  readonly getProjectPath: () => string;
}

export const createEvalRoute = (deps: EvalRouteDeps) => {
  const app = new Hono();

  // POST /eval/run — run eval
  app.post('/eval/run', async (c) => {
    const body = await c.req.json();
    const parsed = EvalOptionsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.message }, 400);
    }

    const result = await deps.evalService.runEval(parsed.data);
    return c.json(result);
  });

  // GET /eval/last — get last eval result
  app.get('/eval/last', async (c) => {
    try {
      const latestPath = resolve(deps.getProjectPath(), '.complior', 'eval', 'latest.json');
      const raw = await readFile(latestPath, 'utf-8');
      return c.json(JSON.parse(raw));
    } catch {
      return c.json({ error: 'NOT_FOUND', message: 'No eval results found' }, 404);
    }
  });

  // GET /eval/list — list eval result files
  app.get('/eval/list', async (c) => {
    try {
      const evalDir = resolve(deps.getProjectPath(), '.complior', 'eval');
      const files = await readdir(evalDir);
      const evalFiles = files
        .filter((f) => f.startsWith('eval-') && f.endsWith('.json') && f !== 'latest.json')
        .sort()
        .reverse();
      return c.json({ results: evalFiles });
    } catch {
      return c.json({ results: [] });
    }
  });

  return app;
};
