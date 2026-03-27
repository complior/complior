/**
 * HTTP request validation helpers.
 * Replaces repeated json().catch() + safeParse() boilerplate in route files.
 */
import type { Context } from 'hono';
import type { ZodType, z } from 'zod';
import { ValidationError } from '../../types/errors.js';

/** Parse and validate JSON body against a Zod schema. Throws ValidationError on failure. */
export const parseBody = async <S extends ZodType>(c: Context, schema: S): Promise<z.output<S>> => {
  const body = await c.req.json().catch(() => {
    throw new ValidationError('Invalid JSON body');
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(`Invalid request: ${parsed.error.message}`);
  return parsed.data;
};

/** Validate query parameters against a Zod schema. Throws ValidationError on failure. */
export const parseQuery = <S extends ZodType>(c: Context, schema: S): z.output<S> => {
  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) throw new ValidationError(`Invalid query: ${parsed.error.message}`);
  return parsed.data;
};
