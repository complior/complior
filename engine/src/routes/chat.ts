import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { ValidationError, LLMError } from '../types/errors.js';

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  model: z.string().optional(),
});

const app = new Hono();

app.post('/chat', async (c) => {
  const body = await c.req.json().catch(() => {
    throw new ValidationError('Invalid JSON body');
  });
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(`Invalid request: ${parsed.error.message}`);
  }

  const hasProvider =
    process.env['OPENAI_API_KEY'] !== undefined ||
    process.env['ANTHROPIC_API_KEY'] !== undefined;

  if (!hasProvider) {
    throw new LLMError(
      'No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
    );
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'message',
      data: JSON.stringify({
        role: 'assistant',
        content: `Received: "${parsed.data.message}". LLM streaming will be implemented in the next sprint.`,
      }),
    });
    await stream.writeSSE({ event: 'done', data: '{}' });
  });
});

export default app;
