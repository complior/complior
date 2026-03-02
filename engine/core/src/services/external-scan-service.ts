import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EventBusPort } from '../ports/events.port.js';
import type { BrowserPort } from '../ports/browser.port.js';
import type { ExternalScanConfig, ExternalScanResult } from '../domain/scanner/external/types.js';
import { runL1Checks, buildExternalScanResult } from '../domain/scanner/external/external-scanner.js';

export interface ExternalScanServiceDeps {
  readonly browser: BrowserPort;
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
}

export const createExternalScanService = (deps: ExternalScanServiceDeps) => {
  const { browser, events, getProjectPath } = deps;

  const scan = async (config: ExternalScanConfig): Promise<ExternalScanResult> => {
    const start = Date.now();

    // L1: Passive Crawl (L2/L3 planned for future)
    const page = await browser.crawl(config.url, config.timeout);

    const checks = runL1Checks(page);

    // Save screenshot
    const screenshots: string[] = [];
    const scansDir = resolve(getProjectPath(), '.complior', 'external-scans');
    await mkdir(scansDir, { recursive: true });

    try {
      const screenshotPath = resolve(
        config.screenshotsDir ?? scansDir,
        `screenshot-${Date.now()}.png`,
      );
      await browser.screenshot(config.url, screenshotPath);
      screenshots.push(screenshotPath);
    } catch {
      // screenshot is best-effort
    }

    const duration = Date.now() - start;
    const result = buildExternalScanResult(config.url, checks, screenshots, duration);

    // Persist result
    const resultPath = resolve(scansDir, `scan-${Date.now()}.json`);
    await writeFile(resultPath, JSON.stringify(result, null, 2));

    events.emit('external-scan.completed', { url: config.url, score: result.score });

    return result;
  };

  const close = async (): Promise<void> => {
    await browser.close();
  };

  return Object.freeze({ scan, close });
};

export type ExternalScanService = ReturnType<typeof createExternalScanService>;
