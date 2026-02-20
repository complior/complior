import { Hono } from 'hono';
import {
  getDisclaimer,
  getReportFooter,
  containsBannedPhrase,
  BANNED_PHRASES,
  type DisclaimerContext,
} from '../../domain/disclaimer.js';

const VALID_CONTEXTS = new Set<string>([
  'system_prompt', 'report_footer', 'compliance_md', 'commit_message', 'chat_response',
]);

const isDisclaimerContext = (s: string): s is DisclaimerContext => VALID_CONTEXTS.has(s);

export interface DisclaimerRouteDeps {
  readonly getVersion: () => string;
}

export const createDisclaimerRoute = (deps: DisclaimerRouteDeps) => {
  const app = new Hono();

  // GET /disclaimer — list all contexts
  app.get('/disclaimer', (c) => {
    return c.json({
      contexts: [...VALID_CONTEXTS],
      bannedPhrases: BANNED_PHRASES,
    });
  });

  // GET /disclaimer/:context — get disclaimer text for a specific context
  app.get('/disclaimer/:context', (c) => {
    const ctx = c.req.param('context');
    if (!isDisclaimerContext(ctx)) {
      return c.json(
        { error: 'INVALID_CONTEXT', message: `Valid contexts: ${[...VALID_CONTEXTS].join(', ')}` },
        400,
      );
    }

    if (ctx === 'report_footer') {
      return c.json({ context: ctx, text: getReportFooter(deps.getVersion()) });
    }

    return c.json({ context: ctx, text: getDisclaimer(ctx) });
  });

  // POST /disclaimer/check — check text for banned phrases
  app.post('/disclaimer/check', async (c) => {
    const body: Record<string, unknown> = await c.req.json().catch(() => ({}));
    const text = typeof body['text'] === 'string' ? body['text'] : '';

    if (!text) {
      return c.json({ error: 'MISSING_TEXT', message: 'Provide "text" field to check' }, 400);
    }

    return c.json({
      hasBannedPhrase: containsBannedPhrase(text),
      bannedPhrases: BANNED_PHRASES,
    });
  });

  return app;
};
