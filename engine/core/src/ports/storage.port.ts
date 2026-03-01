import type { ProjectMemory, ScanRecord, FixRecord } from '../types/common.types.js';

export interface FileSystemPort {
  readonly readFile: (path: string) => Promise<string>;
  readonly writeFile: (path: string, content: string) => Promise<void>;
  readonly readDir: (path: string) => Promise<readonly string[]>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly mkdir: (path: string) => Promise<void>;
}

export interface MemoryPort {
  readonly load: () => Promise<ProjectMemory | null>;
  readonly save: (memory: ProjectMemory) => Promise<void>;
  readonly initialize: (projectPath: string) => ProjectMemory;
  readonly recordScan: (memory: ProjectMemory, scan: ScanRecord) => ProjectMemory;
  readonly recordFix: (memory: ProjectMemory, fix: FixRecord) => ProjectMemory;
}
