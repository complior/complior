import { Hono } from 'hono';
import { z } from 'zod';
import type { FixService } from '../../services/fix-service.js';
import type { UndoService } from '../../services/undo-service.js';
import { parseBody } from '../utils/validation.js';

const FixApplySchema = z.object({
  checkId: z.string().min(1),
  obligationId: z.string().optional(),
  useAi: z.boolean().optional(),
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
    const body = await c.req.json().catch(() => ({}));
    const useAi = typeof body === 'object' && body !== null && 'useAi' in body ? Boolean(body.useAi) : false;
    // Allow CLI to override project path for file writes
    if (typeof body === 'object' && body !== null && typeof body.projectPath === 'string' && body.projectPath) {
      fixService.overrideProjectPath(body.projectPath);
    }
    const results = await fixService.applyAll(useAi);
    const applied = results.filter((r) => r.applied).length;
    const failed = results.filter((r) => !r.applied).length;
    const scoreBefore = results[0]?.scoreBefore ?? 0;
    const scoreAfter = results.at(-1)?.scoreAfter ?? scoreBefore;

    return c.json({
      results,
      summary: { total: results.length, applied, failed, scoreBefore, scoreAfter },
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
