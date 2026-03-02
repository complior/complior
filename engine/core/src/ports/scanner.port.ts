import type { CheckResult } from '../types/common.types.js';

export interface FileInfo {
  readonly path: string;
  readonly content: string;
  readonly extension: string;
  readonly relativePath: string;
}

export interface ScanContext {
  readonly files: readonly FileInfo[];
  readonly projectPath: string;
}

export type CheckFunction = (ctx: ScanContext) => readonly CheckResult[];
