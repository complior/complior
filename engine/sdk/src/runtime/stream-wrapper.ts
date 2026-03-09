import type { MiddlewareContext, MiddlewareResult } from '../types.js';
import type { Pipeline } from '../pipeline.js';
import { COMPLIOR_METADATA_KEY } from '../types.js';

export const isStreamResponse = (response: unknown): response is AsyncIterable<unknown> => {
  return response !== null &&
    response !== undefined &&
    typeof response === 'object' &&
    Symbol.asyncIterator in (response as object);
};

export const isStreamRequest = (params: Record<string, unknown>): boolean => {
  return params.stream === true;
};

/** Attach compliance metadata to an LLM response object. Shared by sync and stream paths. */
export const attachMetadata = (result: MiddlewareResult): void => {
  if (result.response && typeof result.response === 'object') {
    (result.response as Record<string, unknown>)[COMPLIOR_METADATA_KEY] = {
      metadata: result.metadata,
      headers: result.headers,
    };
  }
};

const extractDeltaText = (chunk: unknown): string => {
  if (!chunk || typeof chunk !== 'object') return '';
  const c = chunk as Record<string, unknown>;

  // OpenAI format: choices[0].delta.content
  if (Array.isArray(c.choices)) {
    const delta = (c.choices[0] as Record<string, unknown>)?.delta;
    if (delta && typeof delta === 'object') {
      const content = (delta as Record<string, unknown>).content;
      if (typeof content === 'string') return content;
    }
  }

  // Anthropic format: delta.text (covers both regular delta and content_block_delta)
  if (c.delta && typeof c.delta === 'object') {
    const text = (c.delta as Record<string, unknown>).text;
    if (typeof text === 'string') return text;
  }

  return '';
};

export async function* wrapStream(
  stream: AsyncIterable<unknown>,
  ctx: MiddlewareContext,
  pipeline: Pipeline,
): AsyncGenerator<unknown> {
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(extractDeltaText(chunk));
    yield chunk;
  }

  // After stream ends, run post-hooks with accumulated text (fire-and-forget)
  const fullText = chunks.join('');
  const syntheticResponse = { content: fullText, _streamed: true };

  try {
    const result = await pipeline.runPost(ctx, syntheticResponse);
    attachMetadata(result);
  } catch {
    // Post-hook errors on streamed content are non-fatal — content already delivered
  }
}
