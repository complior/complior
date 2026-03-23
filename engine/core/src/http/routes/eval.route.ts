/**
 * Eval Route — HTTP endpoints for `complior eval`.
 *
 * POST /eval/run         — Run eval against target (blocking JSON)
 * POST /eval/run/stream  — Run eval with SSE progress streaming
 * GET  /eval/last        — Get last eval result
 * GET  /eval/list        — List eval results
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { EvalService } from '../../services/eval-service.js';
import { EvalOptionsSchema } from '../../domain/eval/types.js';
import type { EvalProgress } from '../../domain/eval/types.js';
import { sseEvalStart, sseEvalHealth, sseEvalTest, sseEvalDone, sseError } from '../../llm/sse-protocol.js';
import { resolveIncludes } from '../../domain/eval/types.js';

export interface EvalRouteDeps {
  readonly evalService: EvalService;
}

export const createEvalRoute = (deps: EvalRouteDeps) => {
  const app = new Hono();

  // POST /eval/run — run eval (blocking JSON response)
  app.post('/eval/run', async (c) => {
    const body = await c.req.json();
    const parsed = EvalOptionsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.message }, 400);
    }

    const result = await deps.evalService.runEval(parsed.data);
    return c.json(result);
  });

  // POST /eval/run/stream — run eval with SSE progress streaming
  app.post('/eval/run/stream', async (c) => {
    const body = await c.req.json();
    const parsed = EvalOptionsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'VALIDATION', message: parsed.error.message }, 400);
    }

    const options = parsed.data;
    const includes = resolveIncludes(options);
    const modeLabel = includes.deterministic && includes.llm && includes.security ? 'full'
      : includes.deterministic && includes.llm ? 'deterministic + LLM-judged'
      : includes.llm ? 'LLM-judged tests'
      : includes.security ? 'security probes'
      : 'deterministic tests';

    return streamSSE(c, async (stream) => {
      try {
        // Emit start event
        const startPayload = sseEvalStart(options.target, options.model, modeLabel);
        await stream.writeSSE({ event: startPayload.event, data: startPayload.data });

        let healthEmitted = false;

        const onProgress = async (progress: EvalProgress): Promise<void> => {
          // Emit health check result
          if (progress.phase === 'health' && progress.completed === 1 && !healthEmitted) {
            healthEmitted = true;
            const healthPayload = sseEvalHealth(true);
            await stream.writeSSE({ event: healthPayload.event, data: healthPayload.data });
          }

          // Emit per-test result
          if (progress.lastResult && progress.completed > 0) {
            const r = progress.lastResult;
            const testPayload = sseEvalTest({
              testId: r.testId,
              name: r.name,
              category: r.category,
              method: r.method,
              verdict: r.verdict,
              score: r.score,
              latencyMs: r.latencyMs,
              phase: progress.phase,
              completed: progress.completed,
              total: progress.total,
              ...(r.owaspCategory ? { owaspCategory: r.owaspCategory } : {}),
            });
            await stream.writeSSE({ event: testPayload.event, data: testPayload.data });
          }
        };

        const result = await deps.evalService.runEval(options, onProgress);

        // Emit final result
        const donePayload = sseEvalDone(result);
        await stream.writeSSE({ event: donePayload.event, data: donePayload.data });
      } catch (err) {
        const errPayload = sseError(err instanceof Error ? err.message : String(err));
        await stream.writeSSE({ event: errPayload.event, data: errPayload.data });
      }
    });
  });

  // GET /eval/last — get last eval result
  app.get('/eval/last', async (c) => {
    const result = await deps.evalService.getLastResult();
    if (!result) {
      return c.json({ error: 'NOT_FOUND', message: 'No eval results found' }, 404);
    }
    return c.json(result);
  });

  // GET /eval/list — list eval result files
  app.get('/eval/list', async (c) => {
    const results = await deps.evalService.listResults();
    const judgeConfigured = !!process.env.COMPLIOR_JUDGE_API_KEY;
    return c.json({ results, judgeConfigured });
  });

  return app;
};
