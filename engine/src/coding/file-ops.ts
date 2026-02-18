import { readFile as fsReadFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, resolve, relative, extname } from 'node:path';
import { ToolError, NotFoundError } from '../types/errors.js';

const BLOCKED_PATHS = ['/etc', '/usr', '/bin', '/sbin', '/var', '/proc', '/sys', '/dev'];

const validatePath = (filePath: string): string => {
  const resolved = resolve(filePath);

  for (const blocked of BLOCKED_PATHS) {
    if (resolved.startsWith(blocked)) {
      throw new ToolError(`Access denied: path ${resolved} is in a protected directory`);
    }
  }

  return resolved;
};

export const createFile = async (filePath: string, content: string): Promise<void> => {
  const resolved = validatePath(filePath);
  const dir = resolve(resolved, '..');
  await mkdir(dir, { recursive: true });
  await writeFile(resolved, content, 'utf-8');
};

export const editFile = async (
  filePath: string,
  oldContent: string,
  newContent: string,
): Promise<void> => {
  const resolved = validatePath(filePath);

  const existing = await fsReadFile(resolved, 'utf-8').catch(() => {
    throw new NotFoundError(`File not found: ${filePath}`);
  });

  if (!existing.includes(oldContent)) {
    throw new ToolError('oldContent not found in file');
  }

  const updated = existing.replace(oldContent, newContent);
  await writeFile(resolved, updated, 'utf-8');
};

export const readFile = async (filePath: string): Promise<string> => {
  const resolved = validatePath(filePath);

  return fsReadFile(resolved, 'utf-8').catch(() => {
    throw new NotFoundError(`File not found: ${filePath}`);
  });
};

const RELEVANT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md',
  '.yaml', '.yml', '.py', '.html', '.css', '.toml',
]);

export const listFiles = async (
  dirPath: string,
  pattern?: string,
): Promise<readonly string[]> => {
  const resolved = validatePath(dirPath);
  const results: string[] = [];

  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 10 || results.length > 1000) return;

    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(resolved, fullPath);

      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (pattern !== undefined) {
          if (entry.name.includes(pattern) || relPath.includes(pattern)) {
            results.push(relPath);
          }
        } else if (RELEVANT_EXTENSIONS.has(ext)) {
          results.push(relPath);
        }
      }
    }
  };

  await walk(resolved, 0);
  return results;
};
