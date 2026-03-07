/**
 * US-S05-06: Express middleware adapter.
 * Usage: app.use(compliorExpress())
 */
import { extractCompliorHeaders } from './types.js';
import type { MiddlewareOptions } from './types.js';

export interface ExpressRequest {
  [key: string]: unknown;
}

export interface ExpressResponse {
  setHeader(name: string, value: string): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  write: (chunk: unknown, ...args: unknown[]) => boolean;
  end: (...args: unknown[]) => void;
}

export type ExpressNext = () => void;
export type ExpressMiddleware = (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => void;

export const compliorExpress = (options?: MiddlewareOptions): ExpressMiddleware => {
  return (_req, res, next) => {
    const originalEnd = res.end;
    let body = '';

    // Intercept write to capture body
    const originalWrite = res.write;
    res.write = (chunk: unknown, ...args: unknown[]) => {
      if (typeof chunk === 'string') body += chunk;
      else if (chunk instanceof Buffer) body += chunk.toString();
      return originalWrite.call(res, chunk, ...args);
    };

    // Intercept end to inject headers before finishing
    res.end = (...args: unknown[]) => {
      const firstArg = args[0];
      if (typeof firstArg === 'string') body += firstArg;
      else if (firstArg instanceof Buffer) body += firstArg.toString();

      const headers = extractCompliorHeaders(body, options);
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }

      return originalEnd.call(res, ...args);
    };

    next();
  };
};
