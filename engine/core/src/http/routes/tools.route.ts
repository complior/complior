import { Hono } from 'hono';
import type { ToolManager } from '../../infra/tool-manager.js';

export interface ToolsRouteDeps {
  readonly toolManager: ToolManager;
}

export const createToolsRoute = (deps: ToolsRouteDeps) => {
  const app = new Hono();
  const { toolManager } = deps;

  app.get('/tools/status', async (c) => {
    const uvAvailable = await toolManager.isUvAvailable();
    const statuses = await toolManager.getToolStatus();
    return c.json({
      uvAvailable,
      tools: statuses,
    });
  });

  app.post('/tools/update', async (c) => {
    const statuses = await toolManager.updateTools();
    return c.json({
      tools: statuses,
    });
  });

  return app;
};
