import { Hono } from 'hono';
import { z } from 'zod';
import type { ShareService } from '../../services/share-service.js';

const CreateShareSchema = z.object({
  jurisdiction: z.string().optional(),
  scanType: z.enum(['code', 'external']).optional(),
  expirationDays: z.number().int().min(1).max(365).optional(),
});

export const createShareRoute = (shareService: ShareService) => {
  const app = new Hono();

  app.post('/share', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateShareSchema.safeParse(body);
    const options = parsed.success ? parsed.data : {};

    const payload = await shareService.createShare(options);
    return c.json({
      id: payload.id,
      url: `https://complior.ai/share/${payload.id}`,
      expiresAt: payload.expiresAt,
      score: payload.score,
      findingsCount: payload.findingsCount,
    });
  });

  app.get('/share/:id', async (c) => {
    const id = c.req.param('id');
    const payload = await shareService.getShare(id);
    if (!payload) {
      return c.json({ error: 'NOT_FOUND', message: 'Share not found or expired' }, 404);
    }
    return c.json(payload);
  });

  app.get('/shares', async (c) => {
    const shares = await shareService.listShares();
    return c.json({ shares });
  });

  return app;
};
