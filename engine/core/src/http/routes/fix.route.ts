import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { FixService } from '../../services/fix-service.js';
import type { UndoService } from '../../services/undo-service.js';
import { parseBody } from '../utils/validation.js';

const FixApplySchema = z.object({
  checkId: z.string().min(1),
  obligationId: z.string().optional(),
  useAi: z.boolean().optional(),
});

const FixApplyAllSchema = z.object({
  useAi: z.boolean().optional(),
  projectPath: z.string().optional(),
});

const FixUndoSchema = z.object({
  id: z.number().optional(),
});

export interface FixRouteDeps {
  readonly fixService: FixService;
  readonly undoService: UndoService;
}

export const createFixRoute = (deps: FixRouteDeps) => {
  const { fixService, undoService } = deps;
  const app = new Hono();

  // Preview all available fixes
  app.get('/fix/preview', (c) => {
    const plans = fixService.previewAll();
    return c.json({ fixes: plans, count: plans.length });
  });

  // Preview fix for a specific finding
  app.post('/fix/preview', async (c) => {
    const data = await parseBody(c, FixApplySchema);

    // Build a minimal finding to preview
    const plan = fixService.preview({
      checkId: data.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: data.obligationId,
    });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No fix available for this finding' }, 404);
    }

    return c.json(plan);
  });

  // Apply a specific fix
  app.post('/fix/apply', async (c) => {
    const data = await parseBody(c, FixApplySchema);

    const plan = fixService.preview({
      checkId: data.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: data.obligationId,
    });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No fix available for this finding' }, 404);
    }

    const result = await fixService.applyFix(plan, data.useAi);
    return c.json(result);
  });

  // Apply a fix and validate the result
  app.post('/fix/apply-and-validate', async (c) => {
    const data = await parseBody(c, FixApplySchema);

    const plan = fixService.preview({
      checkId: data.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: data.obligationId,
    });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No fix available for this finding' }, 404);
    }

    const result = await fixService.applyAndValidate(plan, data.useAi);
    return c.json({ result, validation: result.validation });
  });

  // Apply all available fixes (batch mode)
  app.post('/fix/apply-all', async (c) => {
    const data = await parseBody(c, FixApplyAllSchema);
    const useAi = data.useAi ?? false;
    const results = await fixService.applyAll(useAi, data.projectPath);
    const applied = results.filter((r) => r.applied).length;
    const failed = results.filter((r) => !r.applied).length;
    const currentScore = fixService.getCurrentScore();
    const scoreBefore = results[0]?.scoreBefore ?? currentScore;
    const scoreAfter = results.at(-1)?.scoreAfter ?? currentScore;

    const unfixedFindings = fixService.getUnfixedFindings();

    return c.json({
      results,
      summary: { total: results.length, applied, failed, scoreBefore, scoreAfter },
      unfixedFindings: unfixedFindings.map((f) => ({
        checkId: f.checkId,
        message: f.message,
        severity: f.severity,
        fix: f.fix,
      })),
    });
  });

  // Apply all fixes with SSE streaming progress
  app.post('/fix/apply-all/stream', async (c) => {
    const data = await parseBody(c, FixApplyAllSchema);
    const useAi = data.useAi ?? false;

    return streamSSE(c, async (stream) => {
      try {
        const plans = fixService.previewAll();
        const currentScore = fixService.getCurrentScore();

        // Emit start event
        await stream.writeSSE({
          event: 'fix:start',
          data: JSON.stringify({ total: plans.length, useAi, scoreBefore: currentScore }),
        });

        // Apply fixes with progress callback
        let index = 0;
        const onProgress = async (event: {
          type: 'applying' | 'applied' | 'failed';
          checkId: string;
          path: string;
          action?: string;
          scoreAfter?: number;
          error?: string;
        }): Promise<void> => {
          if (event.type === 'applying') {
            await stream.writeSSE({
              event: 'fix:progress',
              data: JSON.stringify({
                index, checkId: event.checkId, path: event.path,
                action: event.action ?? 'MODIFY', status: 'applying',
              }),
            });
          } else if (event.type === 'applied') {
            await stream.writeSSE({
              event: 'fix:applied',
              data: JSON.stringify({
                index, checkId: event.checkId, path: event.path,
                scoreAfter: event.scoreAfter,
              }),
            });
            index++;
          } else {
            await stream.writeSSE({
              event: 'fix:failed',
              data: JSON.stringify({ index, checkId: event.checkId, error: event.error }),
            });
            index++;
          }
        };

        const results = await fixService.applyAll(useAi, data.projectPath, onProgress);
        const applied = results.filter((r) => r.applied).length;
        const failed = results.filter((r) => !r.applied).length;
        const scoreBefore = results[0]?.scoreBefore ?? currentScore;
        const scoreAfter = results.at(-1)?.scoreAfter ?? currentScore;

        const unfixedFindings = fixService.getUnfixedFindings();

        await stream.writeSSE({
          event: 'fix:done',
          data: JSON.stringify({
            summary: { total: results.length, applied, failed, scoreBefore, scoreAfter },
            unfixedFindings: unfixedFindings.map((f) => ({
              checkId: f.checkId, message: f.message, severity: f.severity, fix: f.fix,
            })),
          }),
        });
      } catch (err) {
        await stream.writeSSE({
          event: 'fix:error',
          data: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
        });
      }
    });
  });

  // Undo a fix (last or by id)
  app.post('/fix/undo', async (c) => {
    const data = await parseBody(c, FixUndoSchema);

    const validation = data.id != null
      ? await undoService.undoById(data.id)
      : await undoService.undoLast();

    return c.json({ validation });
  });

  // Get fix history
  app.get('/fix/history', async (c) => {
    const history = await undoService.getHistory();
    return c.json(history);
  });

  return app;
};
