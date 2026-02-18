import { Hono } from 'hono';
import { getEngineContext } from '../context.js';

const app = new Hono();

app.get('/memory', (c) => {
  const ctx = getEngineContext();

  if (ctx.projectMemory === null) {
    return c.json({ initialized: false, message: 'No project memory loaded' });
  }

  return c.json(ctx.projectMemory);
});

export default app;
