'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const loadModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const createMockFetch = (responses = {}) => {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, options: opts });
    const handler = responses[url];
    if (handler) {
      if (typeof handler === 'function') return handler(url, opts);
      return {
        ok: true,
        status: 200,
        text: async () => (typeof handler === 'string' ? handler : ''),
      };
    }
    return { ok: false, status: 404, text: async () => '' };
  };
  fn.calls = calls;
  return fn;
};

describe('Passive Scanner', () => {
  let scannerFactory;
  let mockConsole;
  let testConfig;

  beforeEach(() => {
    scannerFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/passive-scanner.js'),
    );
    mockConsole = { log: () => {}, error: () => {}, warn: () => {} };
    // Use fast config for tests (no rate limiting delay)
    testConfig = {
      enrichment: {
        passiveScanner: {
          ratePerSec: 10000,
          timeoutMs: 5000,
          maxPagesPerTool: 100, // High budget so tests aren't limited by probe exhaustion
          concurrency: 10,
          enableLinkDiscovery: true,
          enableSitemapParsing: true,
        },
      },
    };
  });

  // ── Disclosure Detection ────────────────────────────────────────

  it('detects AI disclosure in hero section', async () => {
    const html = '<div class="hero"><h1>AI-Powered Writing Assistant</h1></div>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.disclosure.visible, true);
    assert.strictEqual(result.disclosure.location, 'hero');
  });

  it('detects AI disclosure in meta description', async () => {
    const html = '<html><head><meta name="description" content="Generative AI platform for content creation"></head><body><p>Welcome</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.disclosure.visible, true);
    assert.strictEqual(result.disclosure.location, 'meta');
  });

  it('detects AI disclosure in footer', async () => {
    const html = '<html><body><main><p>Hello world</p></main><footer>Powered by artificial intelligence</footer></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.disclosure.visible, true);
    assert.strictEqual(result.disclosure.location, 'footer');
  });

  it('returns visible=false when no AI keywords found', async () => {
    const html = '<html><body><h1>Cloud Storage Solution</h1><p>Store your files safely</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.disclosure.visible, false);
  });

  // ── Privacy Policy ──────────────────────────────────────────────

  it('extracts 6 privacy policy signals', async () => {
    const privacyHtml = `<html><body>
      <p>We use artificial intelligence and machine learning models.</p>
      <p>Compliant with the European Union GDPR and General Data Protection Regulation.</p>
      <p>You may opt out of training data usage.</p>
      <p>You have the right to delete your data.</p>
      <p>Data retained for 30 days.</p>
    </body></html>`;
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/privacy': privacyHtml,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.privacy_policy.mentions_ai, true);
    assert.strictEqual(result.privacy_policy.mentions_eu, true);
    assert.strictEqual(result.privacy_policy.gdpr_compliant, true);
    assert.strictEqual(result.privacy_policy.training_opt_out, true);
    assert.strictEqual(result.privacy_policy.deletion_right, true);
    assert.strictEqual(result.privacy_policy.retention_specified, true);
  });

  it('returns all false when privacy page is missing', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.privacy_policy.mentions_ai, false);
    assert.strictEqual(result.privacy_policy.gdpr_compliant, false);
  });

  // ── Trust Signals ───────────────────────────────────────────────

  it('detects certifications (ISO 42001, SOC 2)', async () => {
    const html = '<html><body><p>We are ISO 42001 certified and maintain SOC 2 Type II compliance.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.ok(result.trust.certifications.includes('ISO 42001'));
    assert.ok(result.trust.certifications.includes('SOC 2'));
  });

  it('detects AI Act mentions', async () => {
    const html = '<html><body><p>We comply with the EU AI Act regulation.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.trust.mentions_ai_act, true);
  });

  it('detects EU AI Act page when status 200', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/eu-ai-act': '<html><body>Our AI Act compliance</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.trust.has_eu_ai_act_page, true);
  });

  it('detects responsible AI topics', async () => {
    const html = '<html><body><p>Our responsible AI framework covers fairness, transparency, accountability, privacy, and safety measures with training programs.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
      'https://example.com/responsible-ai': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.trust.has_responsible_ai_page, true);
    assert.ok(result.trust.responsible_ai_topics.includes('fairness'));
    assert.ok(result.trust.responsible_ai_topics.includes('transparency'));
  });

  // ── Model Card ──────────────────────────────────────────────────

  it('detects model card with 4 sections', async () => {
    const modelCardHtml = `<html><body>
      <h1>Model Card for GPT-X</h1>
      <h2>Limitations</h2><p>Known limitations include...</p>
      <h2>Bias and Fairness</h2><p>Bias analysis shows...</p>
      <h2>Training Data</h2><p>Pre-trained on diverse corpus...</p>
      <h2>Evaluation</h2><p>Benchmark accuracy of 95%...</p>
    </body></html>`;
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/model-card': modelCardHtml,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.model_card.has_model_card, true);
    assert.strictEqual(result.model_card.has_limitations, true);
    assert.strictEqual(result.model_card.has_bias_info, true);
    assert.strictEqual(result.model_card.has_training_data, true);
    assert.strictEqual(result.model_card.has_evaluation, true);
  });

  // ── Robots.txt ──────────────────────────────────────────────────

  it('detects AI crawler blocking in robots.txt', async () => {
    const robotsTxt = `User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n`;
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/robots.txt': robotsTxt,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.robots_txt.blocks_ai_crawlers, true);
    assert.ok(result.robots_txt.blocked_bots.includes('GPTBot'));
    assert.ok(result.robots_txt.blocked_bots.includes('ClaudeBot'));
  });

  // ── Cookie Consent & Public API ─────────────────────────────────

  it('detects cookie consent banner', async () => {
    const html = '<html><body><div class="cookie-consent">Accept cookies</div></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.infra.has_cookie_consent, true);
  });

  // ── Company Size ────────────────────────────────────────────────

  it('estimates enterprise company size', async () => {
    const html = '<html><body><p>Listed on NASDAQ with 5000+ employees worldwide</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.social.estimated_company_size, 'enterprise');
  });

  it('estimates startup company size', async () => {
    const html = '<html><body><p>A seed-funded startup with a small team</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.social.estimated_company_size, 'startup');
  });

  // ── Integration ─────────────────────────────────────────────────

  it('returns null for tools without a website', async () => {
    const mockFetch = createMockFetch({});
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ slug: 'no-website-tool' });

    assert.strictEqual(result, null);
  });

  it('full scan returns complete evidence structure', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body><div class="hero"><h1>AI-Powered Tool</h1></div></body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'full-test' });

    assert.ok(result.disclosure);
    assert.ok(result.privacy_policy);
    assert.ok(result.trust);
    assert.ok(result.model_card);
    assert.ok(result.content_marking);
    assert.ok(result.robots_txt);
    assert.ok(result.infra);
    assert.ok(result.social);
    assert.ok(result.web_search);
    assert.ok(typeof result.pages_fetched === 'number');
    assert.ok(result.scanned_at);
  });

  it('counts pages_fetched correctly', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/privacy': '<html><body>Privacy</body></html>',
      'https://example.com/about': '<html><body>About</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // homepage (200) + robots.txt (404) + sitemap.xml (404) + privacy probe (200) + about probe (200)
    assert.strictEqual(result.pages_fetched, 3);
  });

  // ── v2: Multi-Path Discovery ────────────────────────────────────

  it('discovers privacy at /policies/privacy-policy when /privacy is 404', async () => {
    const privacyHtml = '<html><body><p>Our privacy policy covers artificial intelligence data.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/policies/privacy-policy': privacyHtml,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.privacy_policy.mentions_ai, true);
  });

  it('discovers responsible AI at /safety when /responsible-ai is 404', async () => {
    const safetyHtml = '<html><body><p>Our AI safety program covers fairness, transparency, and accountability.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/safety': safetyHtml,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.trust.has_responsible_ai_page, true);
    assert.ok(result.trust.responsible_ai_topics.includes('fairness'));
  });

  it('discovers model card at /research when /model-card is 404', async () => {
    const researchHtml = `<html><body>
      <h1>Technical Report: System Card</h1>
      <h2>Limitations</h2><p>Known limitations include hallucinations</p>
      <h2>Bias</h2><p>Bias analysis results</p>
      <h2>Training Data</h2><p>Pre-trained on web corpus</p>
      <h2>Evaluation</h2><p>Benchmark accuracy of 92%</p>
    </body></html>`;
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/research': researchHtml,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.model_card.has_model_card, true);
    assert.strictEqual(result.model_card.has_limitations, true);
  });

  it('extracts links from homepage and classifies by signal type', async () => {
    const homepageHtml = `<html><body>
      <h1>Our AI Platform</h1>
      <nav>
        <a href="/policies/privacy-policy">Privacy Policy</a>
        <a href="/trust">Trust Center</a>
        <a href="/about-us">About Us</a>
      </nav>
    </body></html>`;
    const privacyHtml = '<html><body><p>We handle artificial intelligence data under GDPR.</p></body></html>';
    const trustHtml = '<html><body><p>Our responsible AI commitment covers fairness and ethics.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': homepageHtml,
      'https://example.com/policies/privacy-policy': privacyHtml,
      'https://example.com/trust': trustHtml,
      'https://example.com/about-us': '<html><body>About us</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // Privacy discovered via homepage link, not hardcoded path
    assert.strictEqual(result.privacy_policy.mentions_ai, true);
    assert.strictEqual(result.trust.has_responsible_ai_page, true);
  });

  it('parses sitemap.xml and extracts signal URLs', async () => {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/legal/privacy</loc></url>
      <url><loc>https://example.com/responsible-use</loc></url>
      <url><loc>https://example.com/blog/hello</loc></url>
    </urlset>`;
    const privacyHtml = '<html><body><p>artificial intelligence data processing under GDPR</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/sitemap.xml': sitemapXml,
      'https://example.com/legal/privacy': privacyHtml,
      'https://example.com/responsible-use': '<html><body><p>Responsible AI governance</p></body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.privacy_policy.mentions_ai, true);
    assert.strictEqual(result.trust.has_responsible_ai_page, true);
  });

  it('respects maxPagesPerTool budget', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
    });
    const budgetConfig = {
      enrichment: {
        passiveScanner: {
          ratePerSec: 10000,
          timeoutMs: 5000,
          maxPagesPerTool: 5,
          concurrency: 10,
          enableLinkDiscovery: true,
          enableSitemapParsing: true,
        },
      },
    };
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: budgetConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // maxPagesPerTool=5: 3 core + max 2 probes
    // Total fetch calls should not exceed 5
    assert.ok(mockFetch.calls.length <= 5, `Expected <= 5 fetches, got ${mockFetch.calls.length}`);
  });

  it('stops probing signal type after first 200', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/privacy': '<html><body>Privacy Page</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // Should NOT try /privacy-policy, /policies/privacy-policy etc. after /privacy returns 200
    const privacyCalls = mockFetch.calls.filter((c) =>
      c.url.includes('privacy') && !c.url.includes('robots') && !c.url.includes('sitemap'),
    );
    assert.strictEqual(privacyCalls.length, 1, `Expected 1 privacy fetch, got ${privacyCalls.length}`);
  });

  it('stops all probing when all signals found', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/privacy': '<html><body>Privacy</body></html>',
      'https://example.com/terms': '<html><body>Terms</body></html>',
      'https://example.com/responsible-ai': '<html><body>Responsible AI</body></html>',
      'https://example.com/eu-ai-act': '<html><body>EU AI Act</body></html>',
      'https://example.com/model-card': '<html><body>Model Card</body></html>',
      'https://example.com/about': '<html><body>About</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // 3 core + 6 signal probes (one hit each) = 9 total
    assert.strictEqual(mockFetch.calls.length, 9, `Expected 9 fetches, got ${mockFetch.calls.length}`);
    assert.strictEqual(result.pages_fetched, 7); // homepage + 6 signals (robots.txt & sitemap 404)
  });

  it('handles sitemap.xml 404 gracefully', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.ok(result);
    assert.ok(result.disclosure);
    assert.ok(result.privacy_policy);
  });

  it('finds homepage link in footer', async () => {
    const homepageHtml = `<html><body>
      <main><h1>Welcome</h1></main>
      <footer>
        <a href="/legal/privacy-policy">Privacy</a>
        <a href="/company">About Us</a>
      </footer>
    </body></html>`;
    const privacyHtml = '<html><body><p>GDPR compliant, general data protection regulation</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': homepageHtml,
      'https://example.com/legal/privacy-policy': privacyHtml,
      'https://example.com/company': '<html><body>About our company</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // Footer link discovered → privacy found at /legal/privacy-policy
    assert.strictEqual(result.privacy_policy.gdpr_compliant, true);
  });

  it('batch fetch works correctly', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/robots.txt': 'User-agent: *\nAllow: /',
      'https://example.com/sitemap.xml': '<?xml version="1.0"?><urlset></urlset>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // Core pages fetched in batch
    const coreUrls = mockFetch.calls.slice(0, 3).map((c) => c.url);
    assert.ok(coreUrls.includes('https://example.com'));
    assert.ok(coreUrls.includes('https://example.com/robots.txt'));
    assert.ok(coreUrls.includes('https://example.com/sitemap.xml'));
  });

  it('legacy scan works when link discovery and sitemap disabled', async () => {
    const legacyConfig = {
      enrichment: {
        passiveScanner: {
          ratePerSec: 10000,
          timeoutMs: 5000,
          maxPagesPerTool: 100,
          concurrency: 10,
          enableLinkDiscovery: false,
          enableSitemapParsing: false,
        },
      },
    };
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/privacy': '<html><body>Privacy Page</body></html>',
      'https://example.com/about': '<html><body>About Page</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: legacyConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.ok(result);
    // Core: homepage + robots.txt (no sitemap) = 2, then signal probes
    const calledUrls = mockFetch.calls.map((c) => c.url);
    assert.ok(!calledUrls.includes('https://example.com/sitemap.xml'));
    assert.strictEqual(result.pages_fetched, 3); // homepage, privacy, about
  });

  it('pages_fetched counts unique 200s', async () => {
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/robots.txt': 'User-agent: *\nAllow: /',
      'https://example.com/privacy': '<html><body>Privacy</body></html>',
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // homepage (200) + robots.txt (200) + sitemap.xml (404) + privacy (200) = 3
    assert.strictEqual(result.pages_fetched, 3);
  });

  it('broader regex detects "system card" as model card', async () => {
    const html = `<html><body>
      <h1>GPT-4 System Card</h1>
      <p>This system card describes the limitations of the model.</p>
      <p>Bias assessment shows demographic fairness.</p>
      <p>Training data includes diverse corpus.</p>
      <p>Evaluation benchmark accuracy.</p>
    </body></html>`;
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/model-card': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.model_card.has_model_card, true);
    assert.strictEqual(result.model_card.has_limitations, true);
  });

  it('discovered URL takes priority over hardcoded probe', async () => {
    // Homepage links to /policies/privacy-policy (non-standard path)
    const homepageHtml = `<html><body>
      <nav><a href="/policies/privacy-policy">Our Privacy Policy</a></nav>
    </body></html>`;
    const customPrivacyHtml = '<html><body><p>GDPR compliant AI data handling</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': homepageHtml,
      'https://example.com/policies/privacy-policy': customPrivacyHtml,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    // The discovered URL (/policies/privacy-policy) should be tried first
    assert.strictEqual(result.privacy_policy.gdpr_compliant, true);

    // Should NOT have fetched /privacy since discovered link was tried first and succeeded
    const privacyStandardCalls = mockFetch.calls.filter((c) => c.url === 'https://example.com/privacy');
    assert.strictEqual(privacyStandardCalls.length, 0, 'Should not fetch /privacy when discovered URL succeeds');
  });

  // ── v2: Expanded Privacy Regex ──────────────────────────────────

  it('broader privacy regex detects "neural network" and "generative ai"', async () => {
    const privacyHtml = '<html><body><p>Our generative ai platform uses neural network technology.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': '<html><body>Home</body></html>',
      'https://example.com/privacy': privacyHtml,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.strictEqual(result.privacy_policy.mentions_ai, true);
  });

  // ── v2: Expanded Responsible AI Topics ──────────────────────────

  it('detects expanded responsible AI topics', async () => {
    const html = '<html><body><p>We focus on responsible ai, trustworthy ai, and ai governance in our model governance framework.</p></body></html>';
    const mockFetch = createMockFetch({
      'https://example.com': html,
      'https://example.com/responsible-ai': html,
    });
    const scanner = scannerFactory({ fetch: mockFetch, cheerio, config: testConfig, console: mockConsole });
    const result = await scanner.scan({ website: 'https://example.com', slug: 'test' });

    assert.ok(result.trust.responsible_ai_topics.includes('responsible ai'));
    assert.ok(result.trust.responsible_ai_topics.includes('trustworthy ai'));
    assert.ok(result.trust.responsible_ai_topics.includes('ai governance'));
    assert.ok(result.trust.responsible_ai_topics.includes('model governance'));
  });
});
