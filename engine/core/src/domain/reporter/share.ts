import type { ScanResult, Finding } from '../../types/common.types.js';

export interface ShareFinding {
  readonly obligationId: string;
  readonly article: string;
  readonly severity: string;
  readonly title: string;
  readonly recommendation: string;
}

export interface SharePayload {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly score: number;
  readonly jurisdiction: string;
  readonly findingsCount: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
  };
  readonly topFindings: readonly ShareFinding[];
  readonly scanType: 'code' | 'external';
  readonly compliorVersion: string;
}

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const generateShareId = (): string => {
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)];
  }
  return `cpl_sh_${id}`;
};

const findingToShareFinding = (f: Finding): ShareFinding => ({
  obligationId: f.obligationId ?? f.checkId,
  article: f.articleReference ?? '',
  severity: f.severity,
  title: f.message,
  recommendation: f.fix ?? 'Review and address this finding.',
});

export const createSharePayload = (
  scanResult: ScanResult,
  version: string,
  options?: { readonly jurisdiction?: string; readonly scanType?: 'code' | 'external'; readonly expirationDays?: number },
): SharePayload => {
  const now = new Date();
  const expirationDays = options?.expirationDays ?? 30;
  const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

  const findings = scanResult.findings.filter((f) => f.type === 'fail');
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const high = findings.filter((f) => f.severity === 'high').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;

  const topFindings = findings
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    })
    .slice(0, 5)
    .map(findingToShareFinding);

  return {
    id: generateShareId(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    score: scanResult.score.totalScore,
    jurisdiction: options?.jurisdiction ?? 'EU AI Act',
    findingsCount: { critical, high, medium, low },
    topFindings,
    scanType: options?.scanType ?? 'code',
    compliorVersion: version,
  };
};
