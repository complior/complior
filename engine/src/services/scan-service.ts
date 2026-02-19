import type { ScanResult } from '../types/common.types.js';
import type { ScanContext } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { Scanner } from '../domain/scanner/create-scanner.js';

export interface ScanServiceDeps {
  readonly scanner: Scanner;
  readonly collectFiles: (projectPath: string) => Promise<ScanContext>;
  readonly events: EventBusPort;
  readonly getLastScanResult: () => ScanResult | null;
  readonly setLastScanResult: (result: ScanResult) => void;
}

export const createScanService = (deps: ScanServiceDeps) => {
  const { scanner, collectFiles, events, setLastScanResult } = deps;

  const scan = async (projectPath: string): Promise<ScanResult> => {
    events.emit('scan.started', { projectPath });

    const ctx = await collectFiles(projectPath);
    const result = scanner.scan(ctx);

    setLastScanResult(result);
    events.emit('scan.completed', { result });

    return result;
  };

  return Object.freeze({ scan });
};

export type ScanService = ReturnType<typeof createScanService>;
