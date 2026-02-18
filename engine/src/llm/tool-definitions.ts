import { z } from 'zod';
import { tool } from 'ai';
import { createToolExecutors, type ToolExecutor } from './tool-executors.js';

export const createCodingTools = (projectPath: string) => {
  const executors = createToolExecutors(projectPath);

  const safeExec = (executor: ToolExecutor) =>
    async (args: Record<string, unknown>): Promise<string> => {
      try {
        return await executor(args);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return JSON.stringify({ error: true, message });
      }
    };

  return {
    scan_project: tool({
      description: 'Scan a project directory for EU AI Act compliance issues',
      inputSchema: z.object({
        path: z.string().describe('Project directory path to scan'),
      }),
      execute: async (args) => safeExec(executors.scan_project!)(args),
    }),
    create_file: tool({
      description: 'Create a new file with the given content',
      inputSchema: z.object({
        path: z.string().describe('File path to create'),
        content: z.string().describe('File content'),
      }),
      execute: async (args) => safeExec(executors.create_file!)(args),
    }),
    edit_file: tool({
      description: 'Edit an existing file by replacing content',
      inputSchema: z.object({
        path: z.string().describe('File path to edit'),
        oldContent: z.string().describe('Content to find and replace'),
        newContent: z.string().describe('Replacement content'),
      }),
      execute: async (args) => safeExec(executors.edit_file!)(args),
    }),
    read_file: tool({
      description: 'Read the contents of a file',
      inputSchema: z.object({
        path: z.string().describe('File path to read'),
      }),
      execute: async (args) => safeExec(executors.read_file!)(args),
    }),
    list_files: tool({
      description: 'List files in a directory',
      inputSchema: z.object({
        path: z.string().describe('Directory path to list'),
        pattern: z.string().optional().describe('Optional filename pattern filter'),
      }),
      execute: async (args) => safeExec(executors.list_files!)(args),
    }),
    search_code: tool({
      description: 'Search for a pattern in project files using ripgrep',
      inputSchema: z.object({
        pattern: z.string().describe('Search pattern (regex supported)'),
        path: z.string().describe('Directory to search in'),
      }),
      execute: async (args) => safeExec(executors.search_code!)(args),
    }),
    run_command: tool({
      description: 'Run a shell command in the project directory',
      inputSchema: z.object({
        command: z.string().describe('Shell command to run'),
        cwd: z.string().optional().describe('Working directory'),
      }),
      execute: async (args) => safeExec(executors.run_command!)(args),
    }),
    git_operation: tool({
      description: 'Perform a git operation',
      inputSchema: z.object({
        action: z.enum(['status', 'diff', 'log', 'add', 'commit', 'branch']).describe('Git action'),
        args: z.record(z.unknown()).optional().describe('Action-specific arguments'),
      }),
      execute: async (args) => safeExec(executors.git_operation!)(args),
    }),
  };
};

// Keep backward-compat static export for non-chat usage (tests, etc.)
export { createCodingTools as codingTools };
