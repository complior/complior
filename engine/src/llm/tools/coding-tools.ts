import { z } from 'zod';
import type { ToolDefinition } from './types.js';

export const createCodingTools = (deps: {
  readonly createFile: (path: string, content: string) => Promise<void>;
  readonly editFile: (path: string, old: string, replacement: string) => Promise<void>;
  readonly readFile: (path: string) => Promise<string>;
  readonly searchCode: (pattern: string, path: string) => Promise<any>;
  readonly runCommand: (cmd: string, cwd?: string) => Promise<any>;
  readonly gitOperation: (op: string, args?: any) => Promise<any>;
  readonly listFiles: (path: string, pattern?: string) => Promise<readonly string[]>;
}): readonly ToolDefinition[] => [
  {
    name: 'createFile',
    description: 'Create a new file with the given content. Triggers compliance re-scan.',
    category: 'coding',
    parameters: z.object({
      path: z.string().describe('File path relative to project root'),
      content: z.string().describe('File content'),
    }),
    execute: async (args) => {
      await deps.createFile(args.path, args.content);
      return JSON.stringify({ success: true, path: args.path });
    },
  },
  {
    name: 'editFile',
    description: 'Edit a file using search & replace. Triggers compliance re-scan.',
    category: 'coding',
    parameters: z.object({
      path: z.string().describe('File path'),
      oldContent: z.string().describe('Content to find'),
      newContent: z.string().describe('Replacement content'),
    }),
    execute: async (args) => {
      await deps.editFile(args.path, args.oldContent, args.newContent);
      return JSON.stringify({ success: true, path: args.path });
    },
  },
  {
    name: 'readFile',
    description: 'Read file contents.',
    category: 'coding',
    parameters: z.object({
      path: z.string().describe('File path'),
      startLine: z.number().optional().describe('Start line (1-indexed)'),
      endLine: z.number().optional().describe('End line'),
    }),
    execute: async (args) => {
      const content = await deps.readFile(args.path);
      if (args.startLine || args.endLine) {
        const lines = content.split('\n');
        const start = (args.startLine ?? 1) - 1;
        const end = args.endLine ?? lines.length;
        return JSON.stringify({ content: lines.slice(start, end).join('\n'), path: args.path });
      }
      return JSON.stringify({ content, path: args.path });
    },
  },
  {
    name: 'searchCode',
    description: 'Search code using ripgrep patterns.',
    category: 'coding',
    parameters: z.object({
      pattern: z.string().describe('Search pattern (regex supported)'),
      glob: z.string().optional().describe('File glob filter (e.g., "*.ts")'),
      path: z.string().optional().describe('Search path'),
    }),
    execute: async (args) => {
      const results = await deps.searchCode(args.pattern, args.path ?? '.');
      return JSON.stringify({ results, count: Array.isArray(results) ? results.length : 0 });
    },
  },
  {
    name: 'runCommand',
    description: 'Execute a shell command in the project directory.',
    category: 'coding',
    parameters: z.object({
      command: z.string().describe('Shell command to run'),
      cwd: z.string().optional().describe('Working directory'),
      timeout: z.number().optional().describe('Timeout in ms (default: 30000)'),
    }),
    execute: async (args) => JSON.stringify(await deps.runCommand(args.command, args.cwd)),
  },
  {
    name: 'gitOperation',
    description: 'Perform a git operation (diff, log, status, commit, add).',
    category: 'coding',
    parameters: z.object({
      operation: z.enum(['diff', 'log', 'status', 'commit', 'add']).describe('Git operation'),
      args: z.string().optional().describe('Additional arguments'),
    }),
    execute: async (args) => JSON.stringify(await deps.gitOperation(args.operation, args.args ? { message: args.args } : undefined)),
  },
  {
    name: 'listFiles',
    description: 'List files in a directory with optional glob pattern.',
    category: 'coding',
    parameters: z.object({
      pattern: z.string().optional().describe('Glob pattern'),
      path: z.string().optional().describe('Directory path'),
    }),
    execute: async (args) => {
      const files = await deps.listFiles(args.path ?? '.', args.pattern);
      return JSON.stringify({ files, count: files.length });
    },
  },
  {
    name: 'applyDiff',
    description: 'Apply a unified diff patch to a file.',
    category: 'coding',
    parameters: z.object({
      path: z.string().describe('File to patch'),
      diff: z.string().describe('Unified diff content'),
    }),
    execute: async (args) => JSON.stringify({ path: args.path, message: 'Diff application available in future release' }),
  },
];
