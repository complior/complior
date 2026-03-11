import { Hono } from 'hono';
import type { FrameworkService } from '../../services/framework-service.js';

interface FrameworksRouteDeps {
  readonly frameworkService: FrameworkService;
}

export const createFrameworksRoute = (deps: FrameworksRouteDeps) => {
  const app = new Hono();

  // GET /frameworks — list available and selected frameworks
  app.get('/frameworks', (c) => {
    return c.json({
      available: deps.frameworkService.listAvailable(),
      selected: deps.frameworkService.listSelected(),
    });
  });

  // GET /frameworks/scores — all selected framework scores
  app.get('/frameworks/scores', async (c) => {
    const result = await deps.frameworkService.getScores();
    return c.json(result);
  });

  // GET /frameworks/scores/:id — single framework score
  app.get('/frameworks/scores/:id', async (c) => {
    const id = c.req.param('id');
    const result = await deps.frameworkService.getScore(id);
    if (!result) {
      return c.json({ error: 'NOT_FOUND', message: `Framework '${id}' not found` }, 404);
    }
    return c.json(result);
  });

  return app;
};
