import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import type { ScanContext, FileInfo } from '../../ports/scanner.port.js';

const EXCLUDED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', '__pycache__',
]);

const INCLUDED_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yaml', '.yml', '.py', '.html', '.css',
]);

const MAX_FILES = 500;
const MAX_FILE_SIZE = 1_048_576; // 1MB

const collectFilesRecursive = async (
  dirPath: string,
  projectPath: string,
  accumulated: FileInfo[],
): Promise<void> => {
  if (accumulated.length >= MAX_FILES) return;

  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (accumulated.length >= MAX_FILES) return;

    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await collectFilesRecursive(fullPath, projectPath, accumulated);
      }
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = extname(entry.name).toLowerCase();
    if (!INCLUDED_EXTENSIONS.has(ext)) continue;

    const fileStat = await stat(fullPath);
    if (fileStat.size > MAX_FILE_SIZE) continue;

    const content = await readFile(fullPath, 'utf-8');
    accumulated.push({
      path: fullPath,
      content,
      extension: ext,
      relativePath: relative(projectPath, fullPath),
    });
  }
};

export const collectFiles = async (projectPath: string): Promise<ScanContext> => {
  const files: FileInfo[] = [];
  await collectFilesRecursive(projectPath, projectPath, files);

  return {
    files,
    projectPath,
  };
};
