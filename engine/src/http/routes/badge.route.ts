import { Hono } from 'hono';
import type { BadgeService } from '../../services/badge-service.js';

export const createBadgeRoute = (badgeService: BadgeService) => {
  const app = new Hono();

  // Get badge SVG
  app.get('/badge', (c) => {
    const svg = badgeService.getBadgeSvg();
    if (!svg) {
      return c.json({ error: 'NO_BADGE', message: 'No scan result available' }, 404);
    }
    return c.body(svg, 200, { 'Content-Type': 'image/svg+xml' });
  });

  // Generate badge + COMPLIANCE.md
  app.post('/badge/generate', async (c) => {
    const result = await badgeService.generateBadge();
    return c.json(result);
  });

  return app;
};
