import { resolve } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';

/**
 * Create a timestamped backup of a project file.
 * Returns the backup path. If the source file doesn't exist (e.g. a create action),
 * the backup is silently skipped but the path is still returned for undo tracking.
 */
export const backupFile = async (
  filePath: string,
  projectPath: string,
): Promise<string> => {
  const backupDir = resolve(projectPath, '.complior', 'backups');
  await mkdir(backupDir, { recursive: true });
  const timestamp = Date.now();
  const backupPath = resolve(backupDir, `${timestamp}-${filePath.replace(/[\\/]/g, '_')}`);
  try {
    await copyFile(resolve(projectPath, filePath), backupPath);
  } catch {
    // File doesn't exist yet (create action) — no backup needed
  }
  return backupPath;
};
