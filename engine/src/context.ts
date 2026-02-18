import type { RegulationData } from './data/regulation-loader.js';
import type { ProjectMemory, ScanResult } from './types/common.types.js';

export interface EngineContext {
  readonly regulationData: RegulationData;
  readonly projectPath: string;
  readonly startedAt: number;
  readonly version: string;
  lastScanResult: ScanResult | null;
  projectMemory: ProjectMemory | null;
}

let _ctx: EngineContext | null = null;

export const getEngineContext = (): EngineContext => {
  if (_ctx === null) {
    throw new Error('Engine context not initialized');
  }
  return _ctx;
};

export const initEngineContext = (
  regulationData: RegulationData,
  projectPath: string,
): EngineContext => {
  _ctx = {
    regulationData,
    projectPath,
    startedAt: Date.now(),
    version: '0.1.0',
    lastScanResult: null,
    projectMemory: null,
  };
  return _ctx;
};
