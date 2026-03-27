import { Hono } from 'hono';
import { z } from 'zod';
import { generateText } from 'ai';
import type { LlmPort } from '../../ports/llm.port.js';
import { complior } from '@complior/sdk';
import { parseBody } from '../utils/validation.js';

const VerifySchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'openrouter']),
  apiKey: z.string().min(1),
});

export const createProviderRoute = (llm: LlmPort) => {
  const app = new Hono();

  app.post('/provider/verify', async (c) => {
    const { provider, apiKey } = await parseBody(c, VerifySchema);

    try {
      const testModelId = provider === 'openrouter'
        ? 'anthropic/claude-haiku-4.5'
        : provider === 'anthropic'
          ? 'claude-haiku-4-5-20251001'
          : 'gpt-4o-mini';

      const model = await llm.getModel(provider, testModelId, apiKey);

      await complior(generateText)({
        model,
        prompt: 'Say "ok"',
        maxOutputTokens: 1,
      });

      return c.json({ valid: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ valid: false, error: message });
    }
  });

  return app;
};
