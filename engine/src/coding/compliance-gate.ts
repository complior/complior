// Re-export from new domain location
import type { EngineContext } from '../context.js';
import { collectFiles } from '../domain/scanner/file-collector.js';
import { createScanner } from '../domain/scanner/create-scanner.js';
import { createComplianceGate as createGate } from '../domain/gate/compliance-gate.js';

export const createComplianceGate = (ctx: EngineContext) => {
  const scanner = createScanner(ctx.regulationData.scoring?.scoring);
  const gate = createGate({
    scanner,
    collectFiles,
    getLastScanResult: () => ctx.lastScanResult,
    setLastScanResult: (result) => { ctx.lastScanResult = result; },
  });
  return gate;
};
