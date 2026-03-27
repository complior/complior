import { Hono } from 'hono';
import { z } from 'zod';
import { runCommand } from '../../infra/shell-adapter.js';
import { parseBody } from '../utils/validation.js';

const ShellRequestSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  timeout: z.number().positive().max(30_000).optional(),
});

export const createShellRoute = () => {
  const app = new Hono();

  app.post('/shell', async (c) => {
    const data = await parseBody(c, ShellRequestSchema);

    const result = await runCommand(
      data.command,
      data.cwd,
      data.timeout,
    );
    return c.json(result);
  });

  return app;
};
