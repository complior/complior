import { resolve } from 'node:path';
import { z } from 'zod';
import { createFile, editFile, readFile, listFiles } from '../coding/file-ops.js';
import { search } from '../coding/search.js';
import { runCommand } from '../coding/shell.js';
import { gitOperation } from '../coding/git.js';
import { collectFiles } from '../domain/scanner/file-collector.js';
import { createScanner } from '../domain/scanner/create-scanner.js';
import { getEngineContext } from '../context.js';

export type ToolExecutor = (args: Record<string, unknown>) => Promise<string>;

const ScanArgs = z.object({ path: z.string().default('.') });
const FileArgs = z.object({ path: z.string(), content: z.string() });
const EditArgs = z.object({ path: z.string(), oldContent: z.string(), newContent: z.string() });
const PathArgs = z.object({ path: z.string() });
const ListArgs = z.object({ path: z.string(), pattern: z.string().optional() });
const SearchArgs = z.object({ pattern: z.string(), path: z.string().default('.') });
const CmdArgs = z.object({ command: z.string(), cwd: z.string().optional() });
const GitArgs = z.object({ action: z.string(), args: z.record(z.unknown()).optional() });

export const createToolExecutors = (projectPath: string): Record<string, ToolExecutor> => ({
  scan_project: async (raw) => {
    const args = ScanArgs.parse(raw);
    const scanPath = resolve(projectPath, args.path);
    const ctx = getEngineContext();
    const scoringData = ctx.regulationData.scoring?.scoring;
    const scanContext = await collectFiles(scanPath);
    const scanner = createScanner(scoringData);
    const result = scanner.scan(scanContext);
    ctx.lastScanResult = result;
    return JSON.stringify({ score: result.score.totalScore, zone: result.score.zone, findings: result.findings.length, filesScanned: result.filesScanned });
  },
  create_file: async (raw) => {
    const args = FileArgs.parse(raw);
    const filePath = resolve(projectPath, args.path);
    await createFile(filePath, args.content);
    return JSON.stringify({ success: true, path: filePath });
  },
  edit_file: async (raw) => {
    const args = EditArgs.parse(raw);
    const filePath = resolve(projectPath, args.path);
    await editFile(filePath, args.oldContent, args.newContent);
    return JSON.stringify({ success: true, path: filePath });
  },
  read_file: async (raw) => {
    const args = PathArgs.parse(raw);
    const filePath = resolve(projectPath, args.path);
    const content = await readFile(filePath);
    return JSON.stringify({ content, path: filePath });
  },
  list_files: async (raw) => {
    const args = ListArgs.parse(raw);
    const dirPath = resolve(projectPath, args.path);
    const files = await listFiles(dirPath, args.pattern);
    return JSON.stringify({ files, count: files.length });
  },
  search_code: async (raw) => {
    const args = SearchArgs.parse(raw);
    const searchPath = resolve(projectPath, args.path);
    const results = await search(args.pattern, searchPath);
    return JSON.stringify({ results, count: results.length });
  },
  run_command: async (raw) => {
    const args = CmdArgs.parse(raw);
    const cwd = args.cwd ? resolve(projectPath, args.cwd) : projectPath;
    const result = await runCommand(args.command, cwd);
    return JSON.stringify(result);
  },
  git_operation: async (raw) => {
    const args = GitArgs.parse(raw);
    const result = await gitOperation(args.action, args.args, projectPath);
    return JSON.stringify(result);
  },
});
