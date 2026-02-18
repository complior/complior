import { Hono } from 'hono';
import type { ProjectMemory } from '../../types/common.types.js';

export interface MemoryRouteDeps {
  readonly getProjectMemory: () => ProjectMemory | null;
}

export const createMemoryRoute = (deps: MemoryRouteDeps) => {
  const app = new Hono();

  app.get('/memory', (c) => {
    const memory = deps.getProjectMemory();

    if (memory === null) {
      return c.json({ initialized: false, message: 'No project memory loaded' });
    }

    return c.json(memory);
  });

  return app;
};
