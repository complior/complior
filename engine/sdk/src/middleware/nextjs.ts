/**
 * US-S05-06: Next.js API route wrapper adapter.
 * Usage: export default compliorNextjs(handler)
 */
import { extractCompliorHeaders } from './types.js';
import type { MiddlewareOptions } from './types.js';

export interface NextApiRequest {
  [key: string]: unknown;
}

export interface NextApiResponse {
  setHeader(name: string, value: string | string[]): void;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  end: (...args: unknown[]) => void;
}

export type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;

const injectHeaders = (
  res: NextApiResponse,
  body: unknown,
  options?: MiddlewareOptions,
): void => {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  const headers = extractCompliorHeaders(bodyStr, options);
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
};

export const compliorNextjs = (
  handler: NextApiHandler,
  options?: MiddlewareOptions,
): NextApiHandler => {
  return async (req, res) => {
    const originalJson = res.json;
    const originalSend = res.send;

    res.json = (body: unknown) => {
      injectHeaders(res, body, options);
      return originalJson.call(res, body);
    };

    res.send = (body: unknown) => {
      injectHeaders(res, body, options);
      return originalSend.call(res, body);
    };

    await handler(req, res);
  };
};
