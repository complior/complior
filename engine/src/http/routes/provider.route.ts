import { Hono } from 'hono';
import { z } from 'zod';
import { generateText } from 'ai';
import { ValidationError } from '../../types/errors.js';
import type { LlmPort } from '../../ports/llm.port.js';

const VerifySchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'openrouter']),
  apiKey: z.string().min(1),
});

export const createProviderRoute = (llm: LlmPort) => {
  const app = new Hono();

  app.post('/provider/verify', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ValidationError('Invalid JSON body');
    });
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(`Invalid request: ${parsed.error.message}`);
    }

    const { provider, apiKey } = parsed.data;

    try {
      const testModelId = provider === 'openrouter'
        ? 'anthropic/claude-haiku-4-5-20251001'
        : provider === 'anthropic'
          ? 'claude-haiku-4-5-20251001'
          : 'gpt-4o-mini';

      const model = await llm.getModel(provider, testModelId, apiKey);

      await generateText({
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
