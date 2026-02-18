import { Hono } from 'hono';
import { z } from 'zod';
import { gitOperation } from '../../coding/git.js';
import { ValidationError } from '../../types/errors.js';

const GitRequestSchema = z.object({
  action: z.enum(['status', 'diff', 'log', 'add', 'commit', 'branch']),
  args: z.record(z.unknown()).optional(),
  cwd: z.string().optional(),
});

export const createGitRoute = () => {
  const app = new Hono();

  app.post('/git', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = GitRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const result = await gitOperation(
      parsed.data.action,
      parsed.data.args,
      parsed.data.cwd,
    );
    return c.json(result);
  });

  return app;
};
