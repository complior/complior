import type { z } from 'zod';

export type ToolCategory = 'compliance' | 'coding';

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly parameters: z.ZodType;
  readonly execute: (args: Record<string, unknown>) => Promise<string>;
}

export type AgentMode = 'build' | 'comply' | 'audit' | 'learn';
