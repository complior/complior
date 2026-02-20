import { Hono } from 'hono';
import { z } from 'zod';
import type { FixService } from '../../services/fix-service.js';
import type { UndoService } from '../../services/undo-service.js';
import { ValidationError } from '../../types/errors.js';

const FixApplySchema = z.object({
  checkId: z.string().min(1),
  obligationId: z.string().optional(),
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
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = FixApplySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    // Build a minimal finding to preview
    const plan = fixService.preview({
      checkId: parsed.data.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: parsed.data.obligationId,
    });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No fix available for this finding' }, 404);
    }

    return c.json(plan);
  });

  // Apply a specific fix
  app.post('/fix/apply', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = FixApplySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const plan = fixService.preview({
      checkId: parsed.data.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: parsed.data.obligationId,
    });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No fix available for this finding' }, 404);
    }

    const result = await fixService.applyFix(plan);
    return c.json(result);
  });

  // Apply a fix and validate the result
  app.post('/fix/apply-and-validate', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = FixApplySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const plan = fixService.preview({
      checkId: parsed.data.checkId,
      type: 'fail',
      message: '',
      severity: 'high',
      obligationId: parsed.data.obligationId,
    });

    if (!plan) {
      return c.json({ error: 'NO_FIX', message: 'No fix available for this finding' }, 404);
    }

    const result = await fixService.applyAndValidate(plan);
    return c.json({ result, validation: result.validation });
  });

  // Apply all available fixes (batch mode)
  app.post('/fix/apply-all', async (c) => {
    const results = await fixService.applyAll();
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
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = FixUndoSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const validation = parsed.data.id != null
      ? await undoService.undoById(parsed.data.id)
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
