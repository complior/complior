import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import type { FileSystemPort } from '../ports/storage.port.js';

export const createFileSystemAdapter = (): FileSystemPort => {
  const read = async (path: string): Promise<string> => {
    return readFile(path, 'utf-8');
  };

  const write = async (path: string, content: string): Promise<void> => {
    await writeFile(path, content, 'utf-8');
  };

  const readDir = async (path: string): Promise<readonly string[]> => {
    return readdir(path);
  };

  const exists = async (path: string): Promise<boolean> => {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  };

  const mkdirRecursive = async (path: string): Promise<void> => {
    await mkdir(path, { recursive: true });
  };

  return Object.freeze({
    readFile: read,
    writeFile: write,
    readDir: readDir,
    exists,
    mkdir: mkdirRecursive,
  });
};

export type FileSystemAdapter = ReturnType<typeof createFileSystemAdapter>;
