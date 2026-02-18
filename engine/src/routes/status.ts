import { Hono } from 'hono';
import { getEngineContext } from '../context.js';
import type { EngineStatus } from '../types/common.types.js';

const app = new Hono();

app.get('/status', (c) => {
  const ctx = getEngineContext();

  const status: EngineStatus = {
    ready: true,
    version: ctx.version,
    uptime: Date.now() - ctx.startedAt,
    lastScan: ctx.lastScanResult
      ? {
          score: ctx.lastScanResult.score.totalScore,
          zone: ctx.lastScanResult.score.zone,
          findingsCount: ctx.lastScanResult.findings.length,
          criticalCount: ctx.lastScanResult.findings.filter(
            (f) => f.severity === 'critical',
          ).length,
          timestamp: ctx.lastScanResult.scannedAt,
        }
      : undefined,
  };

  return c.json(status);
});

export default app;
