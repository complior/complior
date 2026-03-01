export interface RegulationVersion {
  readonly regulation: string;
  readonly version: string;
  readonly rulesVersion: string;
  readonly checkCount: number;
  readonly lastUpdated: string;
}

export const SCANNER_RULES_VERSION = '1.0.0';

export const REGULATION_INFO = {
  regulation: 'eu-ai-act',
  version: '2024.1689',
  lastUpdated: '2026-02-26',
} as const;

export const createRegulationVersion = (checkCount: number): RegulationVersion => ({
  regulation: REGULATION_INFO.regulation,
  version: REGULATION_INFO.version,
  rulesVersion: SCANNER_RULES_VERSION,
  checkCount,
  lastUpdated: REGULATION_INFO.lastUpdated,
});
