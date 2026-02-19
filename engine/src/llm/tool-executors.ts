import { resolve } from 'node:path';
import { createFile, editFile, readFile, listFiles } from '../coding/file-ops.js';
import { search } from '../coding/search.js';
import { runCommand } from '../coding/shell.js';
import { gitOperation } from '../coding/git.js';
import { collectFiles } from '../domain/scanner/file-collector.js';
import { createScanner } from '../domain/scanner/create-scanner.js';
import { getEngineContext } from '../context.js';

export type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;

export const createToolExecutors = (projectPath: string): Record<string, ToolExecutor> => ({
  scan_project: async (args) => {
    const scanPath = resolve(projectPath, (args.path as string) || '.');
    const ctx = getEngineContext();
    const scoringData = ctx.regulationData.scoring?.scoring;
    const scanContext = await collectFiles(scanPath);
    const scanner = createScanner(scoringData);
    const result = scanner.scan(scanContext);
    ctx.lastScanResult = result;
    return JSON.stringify({ score: result.score.totalScore, zone: result.score.zone, findings: result.findings.length, filesScanned: result.filesScanned });
  },
  create_file: async (args) => {
    const filePath = resolve(projectPath, args.path as string);
    await createFile(filePath, args.content as string);
    return JSON.stringify({ success: true, path: filePath });
  },
  edit_file: async (args) => {
    const filePath = resolve(projectPath, args.path as string);
    await editFile(filePath, args.oldContent as string, args.newContent as string);
    return JSON.stringify({ success: true, path: filePath });
  },
  read_file: async (args) => {
    const filePath = resolve(projectPath, args.path as string);
    const content = await readFile(filePath);
    return JSON.stringify({ content, path: filePath });
  },
  list_files: async (args) => {
    const dirPath = resolve(projectPath, args.path as string);
    const files = await listFiles(dirPath, args.pattern as string | undefined);
    return JSON.stringify({ files, count: files.length });
  },
  search_code: async (args) => {
    const searchPath = resolve(projectPath, (args.path as string) || '.');
    const results = await search(args.pattern as string, searchPath);
    return JSON.stringify({ results, count: results.length });
  },
  run_command: async (args) => {
    const cwd = args.cwd ? resolve(projectPath, args.cwd as string) : projectPath;
    const result = await runCommand(args.command as string, cwd);
    return JSON.stringify(result);
  },
  git_operation: async (args) => {
    const result = await gitOperation(args.action as string, args.args as Record<string, unknown> | undefined, projectPath);
    return JSON.stringify(result);
  },
});
