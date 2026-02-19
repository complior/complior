import type { BrowserPort } from '../ports/browser.port.js';
import type { PageData } from '../domain/scanner/external/types.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const createHeadlessBrowser = (): BrowserPort => {
  let browser: any = null;

  const ensureBrowser = async (): Promise<any> => {
    if (browser) return browser;
    try {
      // @ts-expect-error playwright is an optional dependency
      const pw = await import('playwright');
      browser = await pw.chromium.launch({ headless: true });
      return browser;
    } catch {
      throw new Error(
        'Playwright is not installed. Run `npm install playwright` and `npx playwright install chromium` to enable external scanning.',
      );
    }
  };

  const crawl = async (url: string, timeout = 30000): Promise<PageData> => {
    const b = await ensureBrowser();
    const context = await b.newContext({
      userAgent: 'Complior/0.1.0 (Compliance Scanner)',
    });
    const page = await context.newPage();

    try {
      const response = await page.goto(url, { timeout, waitUntil: 'networkidle' });
      const headers: Record<string, string> = {};
      if (response) {
        const allHeaders = await response.allHeaders() as Record<string, string>;
        for (const [k, v] of Object.entries(allHeaders)) {
          headers[k] = String(v);
        }
      }

      const html: string = await page.content();
      const title: string = await page.title();

      const metaTags: { name: string; content: string }[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('meta[name]')).map((m: Element) => ({
          name: m.getAttribute('name') ?? '',
          content: m.getAttribute('content') ?? '',
        })),
      );

      const images: { src: string; alt: string }[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img')).map((img: HTMLImageElement) => ({
          src: img.src,
          alt: img.alt,
        })),
      );

      const links: { href: string; text: string }[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map((a: Element) => ({
          href: a.getAttribute('href') ?? '',
          text: a.textContent?.trim() ?? '',
        })),
      );

      const scripts: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('script[src]')).map((s: Element) => s.getAttribute('src') ?? ''),
      );

      const hasWebSocket: boolean = await page.evaluate(() => {
        const h = document.documentElement.outerHTML;
        return h.includes('WebSocket') || h.includes('wss://') || h.includes('ws://');
      });

      const chatInputs: { placeholder: string; type: string }[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('input[type="text"], textarea')).map((el: Element) => ({
          placeholder: (el as HTMLInputElement).placeholder ?? '',
          type: el.tagName.toLowerCase(),
        })),
      );

      // Try .well-known/ai-compliance.json
      let wellKnownAiCompliance: string | null = null;
      try {
        const base = new URL(url);
        const wellKnownUrl = `${base.origin}/.well-known/ai-compliance.json`;
        wellKnownAiCompliance = await page.evaluate(async (u: string) => {
          try {
            const r = await fetch(u);
            if (r.ok) return await r.text();
            return null;
          } catch { return null; }
        }, wellKnownUrl);
      } catch {
        // ignore
      }

      // Try to find and fetch privacy policy
      const privacyLink = links.find((l: { href: string; text: string }) =>
        /privacy|datenschutz|confidential/i.test(l.text) ||
        /privacy/i.test(l.href),
      );
      let privacyPolicyUrl: string | null = privacyLink?.href ?? null;
      let privacyPolicyText: string | null = null;

      if (privacyPolicyUrl) {
        try {
          const base = new URL(url);
          const fullUrl = privacyPolicyUrl.startsWith('http') ? privacyPolicyUrl : `${base.origin}${privacyPolicyUrl}`;
          privacyPolicyUrl = fullUrl;
          const ppPage = await context.newPage();
          await ppPage.goto(fullUrl, { timeout: 10000, waitUntil: 'domcontentloaded' });
          privacyPolicyText = await ppPage.evaluate(() => document.body.innerText);
          await ppPage.close();
        } catch {
          // could not fetch privacy policy
        }
      }

      return {
        url,
        html,
        title,
        headers,
        metaTags,
        images,
        links,
        scripts,
        hasWebSocket,
        chatInputs,
        wellKnownAiCompliance,
        privacyPolicyUrl,
        privacyPolicyText,
      };
    } finally {
      await context.close();
    }
  };

  const screenshot = async (url: string, outputPath: string): Promise<string> => {
    const b = await ensureBrowser();
    const context = await b.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url, { timeout: 15000, waitUntil: 'networkidle' });
      await page.screenshot({ path: outputPath, fullPage: true });
      return outputPath;
    } finally {
      await context.close();
    }
  };

  const close = async (): Promise<void> => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  };

  return Object.freeze({ crawl, screenshot, close });
};
