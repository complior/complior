/**
 * Infrastructure adapter for file collection.
 * Reads filesystem to build ScanContext. Domain stays I/O-free (Clean Architecture).
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import type { ScanContext, FileInfo } from '../ports/scanner.port.js';
import { ALL_SCANNABLE_EXTENSIONS, EXCLUDED_DIRS } from '../data/scanner-constants.js';
import limitsData from '../../data/scanner/limits.json' with { type: 'json' };

const MAX_FILES = limitsData.max_files;
const MAX_FILE_SIZE = limitsData.max_file_size_bytes;

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
    if (!ALL_SCANNABLE_EXTENSIONS.has(ext)) continue;

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
