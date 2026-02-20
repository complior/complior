import type { PageData } from '../domain/scanner/external/types.js';

export interface BrowserPort {
  readonly crawl: (url: string, timeout?: number) => Promise<PageData>;
  readonly screenshot: (url: string, outputPath: string) => Promise<string>;
  readonly close: () => Promise<void>;
}
