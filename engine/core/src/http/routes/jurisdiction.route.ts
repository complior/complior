import { Hono } from 'hono';
import { listJurisdictions, getJurisdiction } from '../../data/regulation/jurisdiction-data.js';
import { NotFoundError } from '../../types/errors.js';

export const createJurisdictionRoute = () => {
  const app = new Hono();

  app.get('/jurisdictions', (c) => {
    return c.json({ jurisdictions: listJurisdictions() });
  });

  app.get('/jurisdictions/:code', (c) => {
    const code = c.req.param('code');
    const jurisdiction = getJurisdiction(code);
    if (!jurisdiction) {
      throw new NotFoundError(`Jurisdiction not found: ${code}`);
    }
    return c.json(jurisdiction);
  });

  return app;
};
