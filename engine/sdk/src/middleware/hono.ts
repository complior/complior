/**
 * US-S05-06: Hono middleware adapter.
 * Usage: app.use('*', compliorHono())
 */
import { extractCompliorHeaders } from './types.js';
import type { MiddlewareOptions } from './types.js';

export interface HonoContext {
  header(name: string, value: string): void;
  res: { clone: () => { text: () => Promise<string> } };
}

export type HonoNext = () => Promise<void>;
export type HonoMiddleware = (c: HonoContext, next: HonoNext) => Promise<void>;

export const compliorHono = (options?: MiddlewareOptions): HonoMiddleware => {
  return async (c, next) => {
    await next();

    try {
      const cloned = c.res.clone();
      const body = await cloned.text();
      const headers = extractCompliorHeaders(body, options);
      for (const [key, value] of Object.entries(headers)) {
        c.header(key, value);
      }
    } catch {
      // Response may not be clonable (e.g. streaming) — skip header injection
    }
  };
};
