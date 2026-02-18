import type { ProjectMemory, ScanRecord, FixRecord } from '../types/common.types.js';
import type { MemoryPort } from '../ports/storage.port.js';

export interface MemoryServiceDeps {
  readonly storage: MemoryPort;
}

export const createMemoryService = (deps: MemoryServiceDeps) => {
  const { storage } = deps;

  const load = async (): Promise<ProjectMemory | null> => {
    return storage.load();
  };

  const save = async (memory: ProjectMemory): Promise<void> => {
    return storage.save(memory);
  };

  const initialize = (projectPath: string): ProjectMemory => {
    return storage.initialize(projectPath);
  };

  const recordScan = (memory: ProjectMemory, scan: ScanRecord): ProjectMemory => {
    return storage.recordScan(memory, scan);
  };

  const recordFix = (memory: ProjectMemory, fix: FixRecord): ProjectMemory => {
    return storage.recordFix(memory, fix);
  };

  return Object.freeze({ load, save, initialize, recordScan, recordFix });
};

export type MemoryService = ReturnType<typeof createMemoryService>;
