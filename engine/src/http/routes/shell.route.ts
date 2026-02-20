import { Hono } from 'hono';
import { z } from 'zod';
import { runCommand } from '../../infra/shell-adapter.js';
import { ValidationError } from '../../types/errors.js';

const ShellRequestSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  timeout: z.number().positive().max(30_000).optional(),
});

export const createShellRoute = () => {
  const app = new Hono();

  app.post('/shell', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = ShellRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await runCommand(
      parsed.data.command,
      parsed.data.cwd,
      parsed.data.timeout,
    );
    return c.json(result);
  });

  return app;
};
