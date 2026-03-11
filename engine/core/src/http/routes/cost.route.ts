/**
 * US-S05-27: Cost Estimation HTTP Route
 *
 * GET /cost-estimate?hourlyRate=150&agent=my-bot
 */

import { Hono } from 'hono';
import type { CostService } from '../../services/cost-service.js';

export interface CostRouteDeps {
  readonly costService: CostService;
}

export const createCostRoute = (deps: CostRouteDeps) => {
  const app = new Hono();

  app.get('/cost-estimate', async (c) => {
    const hourlyRate = Number(c.req.query('hourlyRate')) || 150;
    const agentName = c.req.query('agent') || undefined;

    try {
      const result = await deps.costService.estimate(hourlyRate, agentName);
      return c.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Cost estimation failed';
      return c.json({ error: message }, 500);
    }
  });

  return app;
};
