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

export interface PageData {
  readonly url: string;
  readonly html: string;
  readonly title: string;
  readonly headers: Record<string, string>;
  readonly metaTags: readonly { readonly name: string; readonly content: string }[];
  readonly images: readonly { readonly src: string; readonly alt: string }[];
  readonly links: readonly { readonly href: string; readonly text: string }[];
  readonly scripts: readonly string[];
  readonly hasWebSocket: boolean;
  readonly chatInputs: readonly { readonly placeholder: string; readonly type: string }[];
  readonly wellKnownAiCompliance: string | null;
  readonly privacyPolicyUrl: string | null;
  readonly privacyPolicyText: string | null;
}
