/**
 * Eval Route — HTTP endpoints for `complior eval`.
 *
 * POST /eval/run              — Run eval against target (blocking JSON)
 * POST /eval/run/stream       — Run eval with SSE progress streaming
 * GET  /eval/last             — Get last eval result
 * GET  /eval/list             — List eval results
 * GET  /eval/remediation      — Get remediation actions for test IDs (US-REM-07)
 * POST /eval/remediation-report — Full remediation report (US-REM-08)
 * GET  /eval/findings         — Get eval failures as scanner findings (US-REM-09)
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { EvalService } from '../../services/eval-service.js';
import { EvalOptionsSchema } from '../../domain/eval/types.js';
import type { EvalProgress } from '../../domain/eval/types.js';
import { sseEvalStart, sseEvalHealth, sseEvalTest, sseEvalDone, sseError } from '../../llm/sse-protocol.js';
import { resolveIncludes } from '../../domain/eval/types.js';
import { parseBody, requireQuery } from '../utils/validation.js';

export interface EvalRouteDeps {
  readonly evalService: EvalService;
}

export const createEvalRoute = (deps: EvalRouteDeps) => {
  const app = new Hono();

  // POST /eval/run — run eval (blocking JSON response)
  app.post('/eval/run', async (c) => {
    const options = await parseBody(c, EvalOptionsSchema);
    const result = await deps.evalService.runEval(options);
    return c.json(result);
  });

  // POST /eval/run/stream — run eval with SSE progress streaming
  app.post('/eval/run/stream', async (c) => {
    const options = await parseBody(c, EvalOptionsSchema);
    const includes = resolveIncludes(options);
    const modeLabel = includes.deterministic && includes.llm && includes.security ? 'full'
      : includes.deterministic && includes.llm ? 'deterministic + LLM-judged'
      : includes.llm ? 'LLM-judged tests'
      : includes.security ? 'security probes'
      : 'deterministic tests';

    return streamSSE(c, async (stream) => {
      try {
        // Emit start event (pass model as judgeModel when LLM-judge is enabled)
        const judgeModel = (includes.llm || includes.security) ? options.model : undefined;
        const startPayload = sseEvalStart(options.target, options.model, modeLabel, judgeModel);
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
              ...(r.severity ? { severity: r.severity } : {}),
              ...(r.probe ? { probe: r.probe } : {}),
              ...(r.response ? { response: r.response } : {}),
              ...(r.reasoning ? { reasoning: r.reasoning } : {}),
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
    const judgeConfigured = !!(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
    return c.json({ results, judgeConfigured });
  });

  // GET /eval/remediation?testIds=CT-1-003,CT-1-005 — remediation for specific tests (US-REM-07)
  app.get('/eval/remediation', async (c) => {
    const testIdsParam = requireQuery(c, 'testIds');

    const result = await deps.evalService.getLastResult();
    if (!result) {
      return c.json({ error: 'NOT_FOUND', message: 'No eval results found. Run complior eval first.' }, 404);
    }

    const testIds = testIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const remediation = await deps.evalService.getRemediationForTests(testIds, result.results);
    return c.json(remediation);
  });

  // POST /eval/remediation-report — full remediation report (US-REM-08)
  app.post('/eval/remediation-report', async (c) => {
    const result = await deps.evalService.getLastResult();
    if (!result) {
      return c.json({ error: 'NOT_FOUND', message: 'No eval results found. Run complior eval first.' }, 404);
    }

    const report = await deps.evalService.generateRemediationReport(result);

    // Include markdown rendering for CLI disk persistence
    const { renderRemediationMarkdown } = await import('../../domain/eval/eval-remediation-report.js');
    const markdown_report = renderRemediationMarkdown(report);

    return c.json({ ...report, markdown_report });
  });

  // POST /eval/apply-fixes — apply Type B eval fixes, return Type A as manual guidance
  app.post('/eval/apply-fixes', async (c) => {
    const { applied, manual } = await deps.evalService.applyEvalFixes();
    return c.json({ applied, manual, appliedCount: applied.length, manualCount: manual.length });
  });

  // GET /eval/findings — eval failures as scanner findings (US-REM-09)
  app.get('/eval/findings', async (c) => {
    const result = await deps.evalService.getLastResult();
    if (!result) {
      return c.json({ error: 'NOT_FOUND', message: 'No eval results found. Run complior eval first.' }, 404);
    }

    const findings = await deps.evalService.getEvalFindings(result);
    return c.json({ findings });
  });

  return app;
};
