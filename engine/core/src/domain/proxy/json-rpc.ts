import { z } from 'zod';

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional().nullable(),
  result: z.unknown().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional(),
});

export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

export const parseJsonRpcLine = (line: string): JsonRpcRequest | JsonRpcResponse | null => {
  try {
    const parsed = JSON.parse(line);
    // Try request first
    const reqResult = JsonRpcRequestSchema.safeParse(parsed);
    if (reqResult.success) return reqResult.data;
    // Try response
    const resResult = JsonRpcResponseSchema.safeParse(parsed);
    if (resResult.success) return resResult.data;
    return null;
  } catch {
    return null;
  }
};

export const serializeJsonRpc = (msg: JsonRpcRequest | JsonRpcResponse): string =>
  JSON.stringify(msg);

export const isRequest = (msg: JsonRpcRequest | JsonRpcResponse): msg is JsonRpcRequest =>
  'method' in msg;

export const isResponse = (msg: JsonRpcRequest | JsonRpcResponse): msg is JsonRpcResponse =>
  'result' in msg || 'error' in msg;

export const createJsonRpcError = (id: string | number | undefined, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});
