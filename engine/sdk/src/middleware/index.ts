/**
 * US-S05-06: HTTP Middleware adapters — unified entry point.
 */
export { compliorExpress } from './express.js';
export type { ExpressMiddleware, ExpressRequest, ExpressResponse } from './express.js';

export { compliorFastify } from './fastify.js';
export type { FastifyPlugin, FastifyInstance, FastifyRequest, FastifyReply } from './fastify.js';

export { compliorHono } from './hono.js';
export type { HonoMiddleware, HonoContext } from './hono.js';

export { compliorNextjs } from './nextjs.js';
export type { NextApiHandler, NextApiRequest, NextApiResponse } from './nextjs.js';

export { extractCompliorHeaders, filterHeaders, HEADER_KEYS, DEFAULT_HEADERS } from './types.js';
export type { MiddlewareOptions } from './types.js';
