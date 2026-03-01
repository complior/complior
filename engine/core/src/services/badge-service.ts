import { resolve, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { ScanResult } from '../types/common.types.js';
import type { EventBusPort } from '../ports/events.port.js';
import { generateBadgeSvg } from '../domain/reporter/badge-generator.js';
import { generateComplianceMd } from '../domain/reporter/compliance-md.js';

export interface BadgeServiceDeps {
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly getVersion: () => string;
}

export const createBadgeService = (deps: BadgeServiceDeps) => {
  const { events, getProjectPath, getLastScanResult, getVersion } = deps;

  let cachedSvg = '';

  const generateBadge = async (): Promise<{ svg: string; md: string; embedCode: string }> => {
    const scanResult = getLastScanResult();
    if (!scanResult) {
      throw new Error('No scan result available. Run a scan first.');
    }

    const { score } = scanResult;
    const date = new Date().toISOString().split('T')[0]!;
    const svg = generateBadgeSvg(score.totalScore, score.zone, 'EU', date);
    const md = generateComplianceMd(scanResult, getVersion());

    const projectPath = getProjectPath();
    const badgePath = resolve(projectPath, '.complior', 'badge.svg');
    const mdPath = resolve(projectPath, 'COMPLIANCE.md');

    await mkdir(dirname(badgePath), { recursive: true });
    await writeFile(badgePath, svg, 'utf-8');
    await writeFile(mdPath, md, 'utf-8');

    cachedSvg = svg;

    events.emit('badge.generated', {
      path: badgePath,
      score: score.totalScore,
      zone: score.zone,
    });

    const embedCode = `![Compliance Badge](.complior/badge.svg)`;

    return { svg, md, embedCode };
  };

  const getBadgeSvg = (): string => {
    if (cachedSvg) return cachedSvg;

    const scanResult = getLastScanResult();
    if (!scanResult) return '';

    const { score } = scanResult;
    const date = new Date().toISOString().split('T')[0]!;
    cachedSvg = generateBadgeSvg(score.totalScore, score.zone, 'EU', date);
    return cachedSvg;
  };

  return Object.freeze({ generateBadge, getBadgeSvg });
};

export type BadgeService = ReturnType<typeof createBadgeService>;
