import { Hono } from 'hono';
import type { StatusService } from '../../services/status-service.js';

export const createStatusRoute = (statusService: StatusService) => {
  const app = new Hono();

  app.get('/status', (c) => {
    return c.json(statusService.getStatus());
  });

  return app;
};
