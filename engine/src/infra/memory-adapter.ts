import type { MemoryPort } from '../ports/storage.port.js';
import { createProjectMemoryManager } from '../memory/project-memory.js';

export const createMemoryAdapter = (memoryDir: string): MemoryPort => {
  const manager = createProjectMemoryManager(memoryDir);
  return Object.freeze({
    load: manager.load,
    save: manager.save,
    initialize: manager.initialize,
    recordScan: manager.recordScan,
    recordFix: manager.recordFix,
  });
};

export type MemoryAdapter = ReturnType<typeof createMemoryAdapter>;
