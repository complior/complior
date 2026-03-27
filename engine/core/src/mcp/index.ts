import type { ScanResult } from '../types/common.types.js';
import { loadRegulationData } from '../data/regulation/regulation-loader.js';
import { createLogger } from '../infra/logger.js';
import { createMcpStack } from './create-mcp-stack.js';

const main = async (): Promise<void> => {
  const regulationData = await loadRegulationData();
  const projectPath = process.env['COMPLIOR_PROJECT_PATH'] ?? process.cwd();
  const { ENGINE_VERSION } = await import('../version.js');

  let lastScanResult: ScanResult | null = null;

  const { mcpServer } = await createMcpStack({
    regulationData,
    projectPath,
    getLastScanResult: () => lastScanResult,
    setLastScanResult: (r) => { lastScanResult = r; },
    version: ENGINE_VERSION,
  });

  await mcpServer.start();
};

const log = createLogger('mcp');
main().catch((err: unknown) => {
  log.error('Complior MCP Server failed to start:', err);
  process.exit(1);
});
