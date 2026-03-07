/**
 * US-S05-06: Fastify plugin adapter.
 * Usage: fastify.register(compliorFastify())
 */
import { extractCompliorHeaders } from './types.js';
import type { MiddlewareOptions } from './types.js';

export interface FastifyRequest {
  [key: string]: unknown;
}

export interface FastifyReply {
  header(name: string, value: string): FastifyReply;
  getSerializerFunction?: () => unknown;
}

export interface FastifyInstance {
  addHook(
    hook: string,
    handler: (request: FastifyRequest, reply: FastifyReply, payload: unknown) => Promise<unknown>,
  ): void;
}

export type FastifyPlugin = (
  instance: FastifyInstance,
  opts: Record<string, unknown>,
  done: () => void,
) => void;

export const compliorFastify = (options?: MiddlewareOptions): FastifyPlugin => {
  return (instance, _opts, done) => {
    instance.addHook('onSend', async (_request, reply, payload) => {
      const body = typeof payload === 'string' ? payload : '';
      const headers = extractCompliorHeaders(body, options);
      for (const [key, value] of Object.entries(headers)) {
        reply.header(key, value);
      }
      return payload;
    });

    done();
  };
};
