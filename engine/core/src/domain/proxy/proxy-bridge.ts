import { spawn, type ChildProcess } from 'node:child_process';
import type { ProxyConfig } from './proxy-types.js';
import { parseJsonRpcLine, serializeJsonRpc, isRequest, isResponse, createJsonRpcError, type JsonRpcRequest, type JsonRpcResponse } from './json-rpc.js';
import type { ProxyInterceptor } from './proxy-interceptor.js';

export interface ProxyBridge {
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly isRunning: () => boolean;
  readonly sendRequest: (req: JsonRpcRequest) => Promise<JsonRpcResponse>;
}

export const createProxyBridge = (
  config: ProxyConfig,
  interceptor: ProxyInterceptor,
): ProxyBridge => {
  let child: ChildProcess | null = null;
  let running = false;
  const pendingRequests = new Map<string | number, {
    resolve: (res: JsonRpcResponse) => void;
    reject: (err: Error) => void;
    startTime: number;
    request: JsonRpcRequest;
  }>();

  const start = async (): Promise<void> => {
    if (running) return;

    child = spawn(config.upstream.command, config.upstream.args, {
      env: { ...process.env, ...config.upstream.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    running = true;

    let buffer = '';
    child.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = parseJsonRpcLine(line);
        if (!msg) continue;

        if (isResponse(msg)) {
          const id = msg.id;
          if (id != null) {
            const pending = pendingRequests.get(id);
            if (pending) {
              pendingRequests.delete(id);
              const durationMs = Date.now() - pending.startTime;
              const success = !msg.error;
              interceptor.recordCall(pending.request, durationMs, success, msg.error?.message);
              pending.resolve(msg);
            }
          }
        }
      }
    });

    child.on('exit', () => {
      running = false;
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error('MCP server process exited'));
        pendingRequests.delete(id);
      }
    });

    child.on('error', (err) => {
      running = false;
      for (const [_id, pending] of pendingRequests) {
        pending.reject(err);
      }
      pendingRequests.clear();
    });

    // Wait a bit for the process to start
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  };

  const stop = (): void => {
    if (child) {
      child.kill('SIGTERM');
      child = null;
      running = false;
    }
  };

  const sendRequest = async (req: JsonRpcRequest): Promise<JsonRpcResponse> => {
    if (!running || !child?.stdin) {
      throw new Error('Proxy bridge is not running');
    }

    // Intercept
    const decision = interceptor.interceptRequest(req);
    if (!decision.allow) {
      return createJsonRpcError(req.id, -32600, `Blocked by proxy policy: ${decision.reason}`);
    }

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const id = req.id ?? `auto-${Date.now()}`;
      const requestWithId = { ...req, id };

      pendingRequests.set(id, {
        resolve,
        reject,
        startTime: Date.now(),
        request: requestWithId,
      });

      const serialized = serializeJsonRpc(requestWithId) + '\n';
      const stdin = child?.stdin;
      if (stdin) {
        stdin.write(serialized);
      } else {
        reject(new Error('Proxy bridge stdin unavailable'));
      }
    });
  };

  return Object.freeze({ start, stop, isRunning: () => running, sendRequest });
};
