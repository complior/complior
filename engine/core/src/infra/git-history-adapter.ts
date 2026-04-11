/**
 * Infra adapter for GitHistoryPort.
 * Uses child_process.execSync for git log analysis.
 * Domain port defined in: domain/scanner/checks/git-history.ts
 */

import { execSync } from 'node:child_process';
import type { GitHistoryPort } from '../domain/scanner/checks/git-history.js';

export const createGitHistoryAdapter = (): GitHistoryPort => Object.freeze({
  isGitRepo: (projectPath: string): boolean => {
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: projectPath, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  },
  listTrackedFiles: (projectPath: string): readonly string[] => {
    try {
      const output = execSync('git ls-files', { cwd: projectPath, encoding: 'utf-8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  },
  getFileLog: (projectPath: string, filePath: string): readonly { hash: string; date: string; author: string }[] => {
    try {
      const output = execSync(
        `git log --follow --format="%H|%aI|%an" -- "${filePath}"`,
        { cwd: projectPath, encoding: 'utf-8', timeout: 5000 },
      );
      return output.trim().split('\n').filter(Boolean).map((line) => {
        const [hash = '', date = '', author = ''] = line.split('|');
        return { hash, date, author };
      });
    } catch {
      return [];
    }
  },
});
