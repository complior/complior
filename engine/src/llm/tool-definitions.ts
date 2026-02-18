import { z } from 'zod';
import { tool } from 'ai';

export const scanProjectTool = tool({
  description: 'Scan a project directory for EU AI Act compliance issues',
  parameters: z.object({
    path: z.string().describe('Project directory path to scan'),
  }),
});

export const createFileTool = tool({
  description: 'Create a new file with the given content',
  parameters: z.object({
    path: z.string().describe('File path to create'),
    content: z.string().describe('File content'),
  }),
});

export const editFileTool = tool({
  description: 'Edit an existing file by replacing content',
  parameters: z.object({
    path: z.string().describe('File path to edit'),
    oldContent: z.string().describe('Content to find and replace'),
    newContent: z.string().describe('Replacement content'),
  }),
});

export const readFileTool = tool({
  description: 'Read the contents of a file',
  parameters: z.object({
    path: z.string().describe('File path to read'),
  }),
});

export const listFilesTool = tool({
  description: 'List files in a directory',
  parameters: z.object({
    path: z.string().describe('Directory path to list'),
    pattern: z.string().optional().describe('Optional filename pattern filter'),
  }),
});

export const searchCodeTool = tool({
  description: 'Search for a pattern in project files using ripgrep',
  parameters: z.object({
    pattern: z.string().describe('Search pattern (regex supported)'),
    path: z.string().describe('Directory to search in'),
  }),
});

export const runCommandTool = tool({
  description: 'Run a shell command in the project directory',
  parameters: z.object({
    command: z.string().describe('Shell command to run'),
    cwd: z.string().optional().describe('Working directory'),
  }),
});

export const gitOperationTool = tool({
  description: 'Perform a git operation',
  parameters: z.object({
    action: z.enum(['status', 'diff', 'log', 'add', 'commit', 'branch']).describe('Git action'),
    args: z.record(z.unknown()).optional().describe('Action-specific arguments'),
  }),
});

export const codingTools = {
  scan_project: scanProjectTool,
  create_file: createFileTool,
  edit_file: editFileTool,
  read_file: readFileTool,
  list_files: listFilesTool,
  search_code: searchCodeTool,
  run_command: runCommandTool,
  git_operation: gitOperationTool,
};
