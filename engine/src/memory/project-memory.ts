import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { ProjectMemory, ScanRecord, FixRecord } from '../types/common.types.js';

export interface ProjectMemoryManager {
  readonly load: () => Promise<ProjectMemory | null>;
  readonly save: (memory: ProjectMemory) => Promise<void>;
  readonly initialize: (projectPath: string) => ProjectMemory;
  readonly recordScan: (memory: ProjectMemory, scan: ScanRecord) => ProjectMemory;
  readonly recordFix: (memory: ProjectMemory, fix: FixRecord) => ProjectMemory;
}

export const createProjectMemoryManager = (memoryDir: string): ProjectMemoryManager => {
  const filePath = join(memoryDir, 'memory.json');

  const load = async (): Promise<ProjectMemory | null> => {
    const content = await readFile(filePath, 'utf-8').catch(() => null);
    if (content === null) return null;
    return JSON.parse(content) as ProjectMemory;
  };

  const save = async (memory: ProjectMemory): Promise<void> => {
    await mkdir(dirname(filePath), { recursive: true });
    const updated: ProjectMemory = { ...memory, updatedAt: new Date().toISOString() };
    await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
  };

  const initialize = (projectPath: string): ProjectMemory => ({
    version: '1.0.0',
    projectPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scanHistory: [],
    fixHistory: [],
  });

  const recordScan = (memory: ProjectMemory, scan: ScanRecord): ProjectMemory => ({
    ...memory,
    scanHistory: [...memory.scanHistory, scan],
  });

  const recordFix = (memory: ProjectMemory, fix: FixRecord): ProjectMemory => ({
    ...memory,
    fixHistory: [...memory.fixHistory, fix],
  });

  return { load, save, initialize, recordScan, recordFix };
};
