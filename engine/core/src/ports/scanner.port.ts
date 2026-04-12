import type { CheckResult } from '../types/common.types.js';

export interface FileInfo {
  readonly path: string;
  readonly content: string;
  readonly extension: string;
  readonly relativePath: string;
}

export interface PassportManifest {
  readonly content: string;
}

export interface ScanContext {
  readonly files: readonly FileInfo[];
  readonly projectPath: string;
  readonly passportManifests?: readonly PassportManifest[];
}

export type CheckFunction = (ctx: ScanContext) => readonly CheckResult[];
