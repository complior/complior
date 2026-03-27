import { Hono } from 'hono';
import { z } from 'zod';
import { gitOperation } from '../../infra/git-adapter.js';
import { parseBody } from '../utils/validation.js';

const GitRequestSchema = z.object({
  action: z.enum(['status', 'diff', 'log', 'add', 'commit', 'branch']),
  args: z.record(z.unknown()).optional(),
  cwd: z.string().optional(),
});

export const createGitRoute = () => {
  const app = new Hono();

  app.post('/git', async (c) => {
    const data = await parseBody(c, GitRequestSchema);

    const result = await gitOperation(
      data.action,
      data.args,
      data.cwd,
    );
    return c.json(result);
  });

  return app;
};
