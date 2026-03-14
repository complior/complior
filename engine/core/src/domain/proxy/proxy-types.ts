import { z } from 'zod';

export const ProxyConfigSchema = z.object({
  upstream: z.object({
    command: z.string(),
    args: z.array(z.string()).default([]),
    env: z.record(z.string()).optional(),
  }),
  logCalls: z.boolean().default(true),
  enrichPassport: z.boolean().default(true),
  maxConcurrentCalls: z.number().int().min(1).default(10),
});

export type ProxyConfig = z.infer<typeof ProxyConfigSchema>;

export interface McpCallLog {
  readonly id: string;
  readonly timestamp: string;
  readonly method: string;
  readonly toolName?: string;
  readonly args?: Record<string, unknown>;
  readonly durationMs: number;
  readonly success: boolean;
  readonly error?: string;
}

export interface ProxyStats {
  readonly startedAt: string;
  readonly totalCalls: number;
  readonly successfulCalls: number;
  readonly failedCalls: number;
  readonly uniqueTools: readonly string[];
  readonly avgDurationMs: number;
  readonly isRunning: boolean;
}
