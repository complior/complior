import { describe, it, expect } from 'vitest';
import {
  parseJsonRpcLine, serializeJsonRpc, isRequest, isResponse, createJsonRpcError,
  type JsonRpcRequest, type JsonRpcResponse,
} from './json-rpc.js';

describe('parseJsonRpcLine', () => {
  it('parses a valid JSON-RPC request', () => {
    const line = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_file"}}';
    const result = parseJsonRpcLine(line);
    expect(result).not.toBeNull();
    expect(isRequest(result!)).toBe(true);
    expect((result as JsonRpcRequest).method).toBe('tools/call');
  });

  it('parses a valid JSON-RPC response', () => {
    const line = '{"jsonrpc":"2.0","id":1,"result":{"content":"hello"}}';
    const result = parseJsonRpcLine(line);
    expect(result).not.toBeNull();
    expect(isResponse(result!)).toBe(true);
  });

  it('parses an error response', () => {
    const line = '{"jsonrpc":"2.0","id":1,"error":{"code":-32600,"message":"Invalid"}}';
    const result = parseJsonRpcLine(line);
    expect(result).not.toBeNull();
    expect((result as JsonRpcResponse).error?.code).toBe(-32600);
  });

  it('returns null for invalid JSON', () => {
    expect(parseJsonRpcLine('not json')).toBeNull();
  });

  it('returns null for non-JSON-RPC JSON', () => {
    expect(parseJsonRpcLine('{"foo":"bar"}')).toBeNull();
  });

  it('handles request without id (notification)', () => {
    const line = '{"jsonrpc":"2.0","method":"notifications/initialized"}';
    const result = parseJsonRpcLine(line);
    expect(result).not.toBeNull();
    expect(isRequest(result!)).toBe(true);
  });
});

describe('serializeJsonRpc', () => {
  it('serializes a request', () => {
    const req: JsonRpcRequest = { jsonrpc: '2.0', id: 1, method: 'test' };
    const result = serializeJsonRpc(req);
    expect(JSON.parse(result)).toEqual(req);
  });

  it('serializes a response', () => {
    const res: JsonRpcResponse = { jsonrpc: '2.0', id: 1, result: { ok: true } };
    expect(JSON.parse(serializeJsonRpc(res))).toEqual(res);
  });
});

describe('createJsonRpcError', () => {
  it('creates an error response', () => {
    const err = createJsonRpcError(1, -32600, 'Bad request');
    expect(err.jsonrpc).toBe('2.0');
    expect(err.id).toBe(1);
    expect(err.error?.code).toBe(-32600);
    expect(err.error?.message).toBe('Bad request');
  });

  it('handles undefined id', () => {
    const err = createJsonRpcError(undefined, -32600, 'Bad');
    expect(err.id).toBeNull();
  });
});
