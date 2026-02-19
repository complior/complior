import { Hono } from 'hono';
import { z } from 'zod';
import type { FixService } from '../../services/fix-service.js';
import { ValidationError } from '../../types/errors.js';

const FixApplySchema = z.object({
  checkId: z.string().min(1),
  obligationId: z.string().optional(),
});

export const createFixRoute = (fixService: FixService) => {
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

  return app;
};
