/**
 * US-S05-22: Compliance Debt Score HTTP Route
 *
 * GET /debt
 */

import { Hono } from 'hono';
import type { DebtService } from '../../services/debt-service.js';

export interface DebtRouteDeps {
  readonly debtService: DebtService;
}

export const createDebtRoute = (deps: DebtRouteDeps) => {
  const app = new Hono();

  app.get('/debt', async (c) => {
    try {
      const trend = c.req.query('trend') === 'true';
      const result = await deps.debtService.getDebt(trend);
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Debt calculation failed';
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
