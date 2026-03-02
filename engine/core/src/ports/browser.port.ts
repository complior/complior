/** PageData — the shape of data produced by a headless browser crawl */
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

/** BrowserPort — contract for headless browser capabilities */
export interface BrowserPort {
  readonly crawl: (url: string, timeout?: number) => Promise<PageData>;
  readonly screenshot: (url: string, outputPath: string) => Promise<string>;
  readonly close: () => Promise<void>;
}
