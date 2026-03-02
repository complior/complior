export type ExternalCheckStatus = 'PASS' | 'FAIL' | 'PARTIAL' | 'N_A';

export type ExternalScanLevel = 'L1' | 'L2' | 'L3';

export interface ExternalCheck {
  readonly name: string;
  readonly status: ExternalCheckStatus;
  readonly obligation: string;
  readonly article: string;
  readonly evidence: string;
  readonly confidence: number;
}

export interface ExternalScanResult {
  readonly url: string;
  readonly scanLevel: ExternalScanLevel;
  readonly score: number;
  readonly checks: readonly ExternalCheck[];
  readonly screenshots: readonly string[];
  readonly duration: number;
  readonly timestamp: string;
}

export interface ExternalScanConfig {
  readonly url: string;
  readonly level?: ExternalScanLevel;
  readonly timeout?: number;
  readonly screenshotsDir?: string;
}

// Re-export from ports for backward compatibility
export type { PageData } from '../../../ports/browser.port.js';
