import { z } from 'zod';
import type { ToolDefinition } from './types.js';

const CreateFileParams = z.object({
  path: z.string().describe('File path relative to project root'),
  content: z.string().describe('File content'),
});

const EditFileParams = z.object({
  path: z.string().describe('File path'),
  oldContent: z.string().describe('Content to find'),
  newContent: z.string().describe('Replacement content'),
});

const ReadFileParams = z.object({
  path: z.string().describe('File path'),
  startLine: z.number().optional().describe('Start line (1-indexed)'),
  endLine: z.number().optional().describe('End line'),
});

const SearchCodeParams = z.object({
  pattern: z.string().describe('Search pattern (regex supported)'),
  glob: z.string().optional().describe('File glob filter (e.g., "*.ts")'),
  path: z.string().optional().describe('Search path'),
});

const RunCommandParams = z.object({
  command: z.string().describe('Shell command to run'),
  cwd: z.string().optional().describe('Working directory'),
  timeout: z.number().optional().describe('Timeout in ms (default: 30000)'),
});

const GitOperationParams = z.object({
  operation: z.enum(['diff', 'log', 'status', 'commit', 'add']).describe('Git operation'),
  args: z.string().optional().describe('Additional arguments'),
});

const ListFilesParams = z.object({
  pattern: z.string().optional().describe('Glob pattern'),
  path: z.string().optional().describe('Directory path'),
});

const ApplyDiffParams = z.object({
  path: z.string().describe('File to patch'),
  diff: z.string().describe('Unified diff content'),
});

export const createCodingTools = (deps: {
  readonly createFile: (path: string, content: string) => Promise<void>;
  readonly editFile: (path: string, old: string, replacement: string) => Promise<void>;
  readonly readFile: (path: string) => Promise<string>;
  readonly searchCode: (pattern: string, path: string) => Promise<unknown>;
  readonly runCommand: (cmd: string, cwd?: string) => Promise<unknown>;
  readonly gitOperation: (op: string, args?: Record<string, unknown>) => Promise<unknown>;
  readonly listFiles: (path: string, pattern?: string) => Promise<readonly string[]>;
}): readonly ToolDefinition[] => [
  {
    name: 'createFile',
    description: 'Create a new file with the given content. Triggers compliance re-scan.',
    category: 'coding',
    parameters: CreateFileParams,
    execute: async (raw) => {
      const args = CreateFileParams.parse(raw);
      await deps.createFile(args.path, args.content);
      return JSON.stringify({ success: true, path: args.path });
    },
  },
  {
    name: 'editFile',
    description: 'Edit a file using search & replace. Triggers compliance re-scan.',
    category: 'coding',
    parameters: EditFileParams,
    execute: async (raw) => {
      const args = EditFileParams.parse(raw);
      await deps.editFile(args.path, args.oldContent, args.newContent);
      return JSON.stringify({ success: true, path: args.path });
    },
  },
  {
    name: 'readFile',
    description: 'Read file contents.',
    category: 'coding',
    parameters: ReadFileParams,
    execute: async (raw) => {
      const args = ReadFileParams.parse(raw);
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
    parameters: SearchCodeParams,
    execute: async (raw) => {
      const args = SearchCodeParams.parse(raw);
      const results = await deps.searchCode(args.pattern, args.path ?? '.');
      return JSON.stringify({ results, count: Array.isArray(results) ? results.length : 0 });
    },
  },
  {
    name: 'runCommand',
    description: 'Execute a shell command in the project directory.',
    category: 'coding',
    parameters: RunCommandParams,
    execute: async (raw) => {
      const args = RunCommandParams.parse(raw);
      return JSON.stringify(await deps.runCommand(args.command, args.cwd));
    },
  },
  {
    name: 'gitOperation',
    description: 'Perform a git operation (diff, log, status, commit, add).',
    category: 'coding',
    parameters: GitOperationParams,
    execute: async (raw) => {
      const args = GitOperationParams.parse(raw);
      return JSON.stringify(await deps.gitOperation(args.operation, args.args ? { message: args.args } : undefined));
    },
  },
  {
    name: 'listFiles',
    description: 'List files in a directory with optional glob pattern.',
    category: 'coding',
    parameters: ListFilesParams,
    execute: async (raw) => {
      const args = ListFilesParams.parse(raw);
      const files = await deps.listFiles(args.path ?? '.', args.pattern);
      return JSON.stringify({ files, count: files.length });
    },
  },
  {
    name: 'applyDiff',
    description: 'Apply a unified diff patch to a file.',
    category: 'coding',
    parameters: ApplyDiffParams,
    execute: async (raw) => {
      const args = ApplyDiffParams.parse(raw);
      return JSON.stringify({ path: args.path, message: 'Diff application available in future release' });
    },
  },
];
