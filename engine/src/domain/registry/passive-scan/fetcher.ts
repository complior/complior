/**
 * HTTP fetch + HTML→text extraction for passive scanning.
 * Uses Node built-in fetch() — no browser dependencies.
 */

const USER_AGENT = 'Complior/1.0 (AI Compliance Scanner)';
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 500 * 1024; // 500KB

export interface FetchResult {
  readonly url: string;
  readonly text: string;
  readonly raw: string;
  readonly ok: boolean;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchPage(url: string): Promise<FetchResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    const isText = contentType.includes('text/') || contentType.includes('application/json');
    if (!isText) return null;

    const raw = (await res.text()).slice(0, MAX_BYTES);
    const text = stripHtml(raw);

    return { url, text, raw, ok: true };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface UrlCandidates {
  readonly homepage: string;
  readonly privacy: readonly string[];
  readonly terms: readonly string[];
  readonly about: readonly string[];
  readonly trust: readonly string[];
  readonly responsibleAi: readonly string[];
  readonly compliance: readonly string[];
  readonly robots: string;
  readonly aiPlugin: string;
}

export function buildUrlCandidates(website: string): UrlCandidates {
  const base = website.replace(/\/+$/, '');
  return {
    homepage: base,
    privacy: [`${base}/privacy`, `${base}/legal/privacy`, `${base}/privacy-policy`],
    terms: [`${base}/terms`, `${base}/tos`, `${base}/terms-of-service`],
    about: [`${base}/about`, `${base}/company`],
    trust: [`${base}/trust`, `${base}/security`, `${base}/trust-center`],
    responsibleAi: [`${base}/responsible-ai`, `${base}/ai-policy`, `${base}/ai`],
    compliance: [`${base}/compliance`, `${base}/eu-ai-act`],
    robots: `${base}/robots.txt`,
    aiPlugin: `${base}/.well-known/ai-plugin.json`,
  };
}

export async function fetchFirstAvailable(urls: readonly string[]): Promise<FetchResult | null> {
  for (const url of urls) {
    const result = await fetchPage(url);
    if (result) return result;
  }
  return null;
}

export interface FetchedPages {
  readonly homepage: FetchResult | null;
  readonly privacy: FetchResult | null;
  readonly terms: FetchResult | null;
  readonly about: FetchResult | null;
  readonly trust: FetchResult | null;
  readonly responsibleAi: FetchResult | null;
  readonly compliance: FetchResult | null;
  readonly robots: FetchResult | null;
  readonly aiPlugin: FetchResult | null;
}

export async function fetchAllPages(website: string): Promise<FetchedPages> {
  const urls = buildUrlCandidates(website);

  const [homepage, privacy, terms, about, trust, responsibleAi, compliance, robots, aiPlugin] =
    await Promise.all([
      fetchPage(urls.homepage),
      fetchFirstAvailable(urls.privacy),
      fetchFirstAvailable(urls.terms),
      fetchFirstAvailable(urls.about),
      fetchFirstAvailable(urls.trust),
      fetchFirstAvailable(urls.responsibleAi),
      fetchFirstAvailable(urls.compliance),
      fetchPage(urls.robots),
      fetchPage(urls.aiPlugin),
    ]);

  return { homepage, privacy, terms, about, trust, responsibleAi, compliance, robots, aiPlugin };
}
