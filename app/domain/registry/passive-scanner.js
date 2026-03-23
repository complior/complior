/**
 * Passive Scanner v2 — Smart Discovery for AI Registry.
 *
 * 3-phase scan: core pages → link discovery → signal probes.
 * Budget: up to 20 pages per tool with early exit when all signals found.
 *
 * VM sandbox compatible — IIFE returns factory function.
 */
(() => {
  const AI_KEYWORDS = [
    'artificial intelligence', 'ai-powered', 'ai powered', 'machine learning',
    'deep learning', 'neural network', 'large language model', 'llm',
    'generative ai', 'gen ai', 'genai', 'powered by ai', 'uses ai',
    'ai model', 'ai system', 'ai-generated', 'ai generated',
  ];

  const CERT_PATTERNS = [
    { pattern: /iso\s*42001/i, name: 'ISO 42001' },
    { pattern: /iso\s*27001/i, name: 'ISO 27001' },
    { pattern: /soc\s*2/i, name: 'SOC 2' },
    { pattern: /soc\s*ii/i, name: 'SOC 2' },
    { pattern: /gdpr\s*complian/i, name: 'GDPR' },
    { pattern: /hipaa/i, name: 'HIPAA' },
    { pattern: /fedramp/i, name: 'FedRAMP' },
    { pattern: /c5\s*attestation/i, name: 'C5' },
  ];

  const RESPONSIBLE_AI_TOPICS = [
    'fairness', 'bias', 'transparency', 'accountability',
    'safety', 'privacy', 'training', 'education', 'ethics',
    'governance', 'human oversight', 'explainability',
    'responsible ai', 'responsible use', 'ai principles',
    'trustworthy ai', 'ai governance', 'model governance',
  ];

  const AI_CRAWLER_BOTS = [
    'GPTBot', 'ChatGPT-User', 'CCBot', 'Google-Extended',
    'anthropic-ai', 'ClaudeBot', 'Bytespider', 'Amazonbot',
  ];

  const SIGNAL_PROBE_PATHS = {
    privacy: [
      '/privacy', '/privacy-policy', '/policies/privacy-policy',
      '/legal/privacy', '/legal/privacy-policy', '/privacypolicy',
    ],
    terms: [
      '/terms', '/terms-of-service', '/tos', '/legal/terms',
      '/policies/terms-of-use', '/terms-of-use',
    ],
    responsible_ai: [
      '/responsible-ai', '/safety', '/trust', '/ai-safety',
      '/responsible-use', '/ethics', '/ai-principles',
      '/trust-center', '/responsibility',
    ],
    eu_ai_act: [
      '/eu-ai-act', '/ai-act', '/compliance', '/compliance/eu-ai-act',
      '/legal/ai-act', '/trust/eu-ai-act',
    ],
    model_card: [
      '/model-card', '/research', '/docs/model-card',
      '/technical-report', '/documentation', '/models',
    ],
    about: [
      '/about', '/about-us', '/company', '/team',
    ],
  };

  const LINK_CLASSIFY_KEYWORDS = {
    privacy: ['privacy', 'data-protection', 'datenschutz', 'gdpr'],
    terms: ['terms', 'tos', 'legal', 'conditions'],
    responsible_ai: ['safety', 'responsible', 'ethics', 'trust', 'principles', 'governance'],
    eu_ai_act: ['ai-act', 'eu-ai', 'compliance', 'regulation'],
    model_card: ['model-card', 'technical-report', 'research', 'system-card', 'documentation'],
    about: ['about', 'company', 'team'],
  };

  const SIGNAL_TO_LABEL = {
    privacy: 'privacy',
    terms: 'terms',
    responsible_ai: 'responsible-ai',
    eu_ai_act: 'eu-ai-act',
    model_card: 'model-card',
    about: 'about',
  };

  // ── Link Discovery (pure, zero HTTP) ─────────────────────────────

  const discoverLinksFromHomepage = ($, baseUrl) => {
    const discovered = {};
    const seen = new Set();
    let host;
    try { host = new URL(baseUrl).hostname; } catch { return discovered; }

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      let url;
      try { url = new URL(href, baseUrl); } catch { return; }
      if (url.hostname !== host) return;

      const normalized = url.origin + url.pathname.replace(/\/+$/, '');
      if (seen.has(normalized) || normalized === baseUrl.replace(/\/+$/, '')) return;
      seen.add(normalized);

      const pathLower = url.pathname.toLowerCase();
      const textLower = ($(el).text() || '').toLowerCase();
      const combined = pathLower + ' ' + textLower;

      for (const [signalType, keywords] of Object.entries(LINK_CLASSIFY_KEYWORDS)) {
        if (keywords.some((kw) => combined.includes(kw))) {
          if (!discovered[signalType]) discovered[signalType] = [];
          discovered[signalType].push(normalized);
        }
      }
    });
    return discovered;
  };

  const parseSitemap = (text, baseUrl) => {
    const discovered = {};
    if (!text) return discovered;
    const truncated = text.length > 512000 ? text.slice(0, 512000) : text;
    let host;
    try { host = new URL(baseUrl).hostname; } catch { return discovered; }

    const locPattern = /<loc>\s*(https?:\/\/[^<]+?)\s*<\/loc>/gi;
    let match;
    while ((match = locPattern.exec(truncated)) !== null) {
      let url;
      try { url = new URL(match[1]); } catch { continue; }
      if (url.hostname !== host) continue;
      const pathLower = url.pathname.toLowerCase();
      for (const [signalType, keywords] of Object.entries(LINK_CLASSIFY_KEYWORDS)) {
        if (keywords.some((kw) => pathLower.includes(kw))) {
          if (!discovered[signalType]) discovered[signalType] = [];
          discovered[signalType].push(url.origin + url.pathname.replace(/\/+$/, ''));
        }
      }
    }
    return discovered;
  };

  const mergeCandidateUrls = (homepageLinks, sitemapLinks, probePaths, baseUrl) => {
    const merged = {};
    const base = baseUrl.replace(/\/+$/, '');

    for (const signalType of Object.keys(probePaths)) {
      const seen = new Set();
      const urls = [];

      // Priority 1: homepage-discovered links
      for (const u of (homepageLinks[signalType] || [])) {
        if (!seen.has(u)) { seen.add(u); urls.push(u); }
      }
      // Priority 2: sitemap-discovered links
      for (const u of (sitemapLinks[signalType] || [])) {
        if (!seen.has(u)) { seen.add(u); urls.push(u); }
      }
      // Priority 3: hardcoded probe paths
      for (const suffix of probePaths[signalType]) {
        const u = base + suffix;
        if (!seen.has(u)) { seen.add(u); urls.push(u); }
      }

      merged[signalType] = urls;
    }
    return merged;
  };

  const createBatchFetcher = (fetchPage, concurrency) => {
    return async (urls) => {
      const results = [];
      for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map((url) => fetchPage(url)));
        results.push(...batchResults.map((r, j) => ({ url: batch[j], ...r })));
      }
      return results;
    };
  };

  // ── Parse Functions ────────────────────────────────────────────────

  const parseDisclosure = ($) => {
    if (!$) return { visible: false, location: null, text: null };

    const lowerHtml = $.html().toLowerCase();
    const hasAiKeyword = AI_KEYWORDS.some((kw) => lowerHtml.includes(kw));
    if (!hasAiKeyword) return { visible: false, location: null, text: null };

    // Check hero / banner area
    const heroSelectors = ['[class*="hero"]', '[class*="banner"]', '[class*="jumbotron"]', 'header h1', 'header h2'];
    for (const sel of heroSelectors) {
      const el = $(sel);
      if (el.length > 0) {
        const text = el.text().toLowerCase();
        if (AI_KEYWORDS.some((kw) => text.includes(kw))) {
          return { visible: true, location: 'hero', text: el.text().slice(0, 200) };
        }
      }
    }

    // Check main description / about
    const descSelectors = ['[class*="description"]', '[class*="subtitle"]', 'main p:first-of-type', '.about p'];
    for (const sel of descSelectors) {
      const el = $(sel);
      if (el.length > 0) {
        const text = el.text().toLowerCase();
        if (AI_KEYWORDS.some((kw) => text.includes(kw))) {
          return { visible: true, location: 'description', text: el.text().slice(0, 200) };
        }
      }
    }

    // Check meta tags
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    if (AI_KEYWORDS.some((kw) => metaDesc.toLowerCase().includes(kw))) {
      return { visible: true, location: 'meta', text: metaDesc.slice(0, 200) };
    }

    // Check footer
    const footer = $('footer').text().toLowerCase();
    if (AI_KEYWORDS.some((kw) => footer.includes(kw))) {
      return { visible: true, location: 'footer', text: $('footer').text().slice(0, 200) };
    }

    return { visible: false, location: null, text: null };
  };

  const parsePrivacyPolicy = ($) => {
    if (!$) {
      return {
        mentions_ai: false, mentions_eu: false, gdpr_compliant: false,
        training_opt_out: false, deletion_right: false, retention_specified: false,
      };
    }
    const text = $.text().toLowerCase();
    return {
      // eslint-disable-next-line max-len
      mentions_ai: /artificial intelligence|machine learning|ai model|ai system|ai.powered|neural network|large language model|llm|generative ai/i.test(text),
      mentions_eu: /european union|eu regulation|eu law|gdpr|general data protection/i.test(text),
      gdpr_compliant: /gdpr|general data protection regulation|data protection officer/i.test(text),
      // eslint-disable-next-line max-len
      training_opt_out: /opt.out.*training|training.*opt.out|do not.*train|exclude.*training/i.test(text),
      // eslint-disable-next-line max-len
      deletion_right: /right.*delet|right.*eras|delete.*data|erase.*data|right to be forgotten/i.test(text),
      // eslint-disable-next-line max-len
      retention_specified: /retention|retain.*data.*\d|data.*kept.*\d|store.*data.*\d|days|months|years/i.test(text),
    };
  };

  const parseTrustSignals = ($, pages) => {
    const result = {
      certifications: [],
      has_eu_ai_act_page: false,
      mentions_ai_act: false,
      has_responsible_ai_page: false,
      responsible_ai_topics: [],
    };
    if (!$) return result;

    const allText = $.text();

    // Certifications
    const foundCerts = new Set();
    for (const cert of CERT_PATTERNS) {
      if (cert.pattern.test(allText)) {
        foundCerts.add(cert.name);
      }
    }
    result.certifications = [...foundCerts];

    // EU AI Act page
    result.has_eu_ai_act_page = pages.some((p) => p.label === 'eu-ai-act' && p.status === 200);

    // AI Act mentions
    // eslint-disable-next-line max-len
    result.mentions_ai_act = /ai\s*act|artificial intelligence act|eu.*2024.*1689|regulation.*ai/i.test(allText);

    // Responsible AI page
    result.has_responsible_ai_page = pages.some((p) => p.label === 'responsible-ai' && p.status === 200);

    // Responsible AI topics
    const lowerText = allText.toLowerCase();
    for (const topic of RESPONSIBLE_AI_TOPICS) {
      if (lowerText.includes(topic)) {
        result.responsible_ai_topics.push(topic);
      }
    }

    return result;
  };

  const parseModelCard = ($) => {
    if (!$) {
      return {
        has_model_card: false, has_limitations: false,
        has_bias_info: false, has_training_data: false,
        has_evaluation: false,
      };
    }
    const text = $.text().toLowerCase();
    // eslint-disable-next-line max-len
    const hasModelCard = /model\s*card|model\s*documentation|technical\s*report|system\s*card|model\s*spec|model\s*overview|safety\s*report/i.test(text);
    if (!hasModelCard) {
      return {
        has_model_card: false, has_limitations: false,
        has_bias_info: false, has_training_data: false,
        has_evaluation: false,
      };
    }
    return {
      has_model_card: true,
      has_limitations: /limitation|known issue|failure mode|out.of.scope/i.test(text),
      has_bias_info: /bias|fairness|demographic|stereotyp|discriminat/i.test(text),
      has_training_data: /training data|dataset|corpus|pre.train|fine.tun/i.test(text),
      has_evaluation: /evaluation|benchmark|performance|accuracy|metric/i.test(text),
    };
  };

  const parseContentMarking = ($) => {
    if (!$) return { c2pa: false, watermark: false, exif_ai_tag: false };
    const text = $.text().toLowerCase();
    const html = $.html().toLowerCase();
    return {
      c2pa: /c2pa|content credentials|content authenticity|coalition for content/i.test(text),
      watermark: /watermark|synthid|invisible mark|digital watermark/i.test(text),
      exif_ai_tag: /exif.*ai|digitalsourcetype|trainedalgorithmicmedia|iptc.*ai/i.test(html),
    };
  };

  const parseRobotsTxt = (text) => {
    if (!text) return { blocks_ai_crawlers: false, blocked_bots: [] };
    const lines = text.split('\n');
    const blockedBots = [];
    let currentAgent = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('User-agent:')) {
        currentAgent = trimmed.slice(11).trim();
      }
      if (trimmed.startsWith('Disallow:') && trimmed.includes('/')) {
        for (const bot of AI_CRAWLER_BOTS) {
          if (currentAgent === bot || currentAgent === '*') {
            // Only count if * has broad disallow
            if (currentAgent === '*' && trimmed === 'Disallow: /') {
              // Blocks everything — not specifically AI
              continue;
            }
            if (currentAgent !== '*') {
              blockedBots.push(bot);
            }
          }
        }
      }
    }

    return {
      blocks_ai_crawlers: blockedBots.length > 0,
      blocked_bots: [...new Set(blockedBots)],
    };
  };

  const parseInfraSignals = ($) => {
    if (!$) return { has_cookie_consent: false, has_public_api: false };
    const html = $.html().toLowerCase();
    return {
      // eslint-disable-next-line max-len
      has_cookie_consent: /cookie.consent|cookie.banner|cookiebot|onetrust|cookie.policy|accept.*cookie/i.test(html),
      // eslint-disable-next-line max-len
      has_public_api: /api\..*\.com|\/api\/v\d|developer.*doc|api.*reference|swagger|openapi/i.test(html),
    };
  };

  const estimateCompanySize = ($) => {
    if (!$) return 'unknown';
    const text = $.text().toLowerCase();
    if (/fortune\s*500|nasdaq|nyse|s&p\s*500|\d{4,}\+?\s*employees|global.*enterprise/i.test(text)) return 'enterprise';
    if (/series\s*[c-z]|\d{3}\+?\s*employees|growing\s*team/i.test(text)) return 'medium';
    if (/seed|series\s*[ab]|small\s*team|startup|founded\s*20[2-9]/i.test(text)) return 'startup';
    return 'unknown';
  };

  const extractWebSearchSignals = ($, pages) => {
    if (!$) {
      return {
        has_public_bias_audit: false, bias_audit_url: null,
        has_transparency_report: false,
        gdpr_enforcement_history: [],
        security_incidents: [],
      };
    }
    const allText = pages.map((p) => p.text || '').join(' ').toLowerCase();
    return {
      has_public_bias_audit:
        /bias\s*audit|algorithmic\s*audit|fairness\s*assessment/i.test(allText),
      bias_audit_url: null,
      has_transparency_report: /transparency\s*report|transparency\s*center/i.test(allText),
      gdpr_enforcement_history: [],
      security_incidents: [],
    };
  };

  // ── Rate Limiter ───────────────────────────────────────────────────

  const createRateLimiter = (ratePerSec) => {
    const intervalMs = 1000 / ratePerSec;
    let lastRequest = 0;
    return async () => {
      const now = Date.now();
      const elapsed = now - lastRequest;
      if (elapsed < intervalMs) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs - elapsed));
      }
      lastRequest = Date.now();
    };
  };

  // ── Main Factory ──────────────────────────────────────────────────

  return ({ fetch, cheerio, config }) => {
    const scanConfig = (config && config.enrichment && config.enrichment.passiveScanner) || {};
    const ratePerSec = scanConfig.ratePerSec || 2;
    const timeoutMs = scanConfig.timeoutMs || 10000;
    const maxPages = scanConfig.maxPagesPerTool || 20;
    const concurrency = scanConfig.concurrency || 3;
    const enableLinkDiscovery = scanConfig.enableLinkDiscovery !== false;
    const enableSitemapParsing = scanConfig.enableSitemapParsing !== false;
    const userAgent = scanConfig.userAgent || 'CompliorBot/1.0';
    const rateLimiter = createRateLimiter(ratePerSec);

    const fetchPage = async (url) => {
      await rateLimiter();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': userAgent },
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timer);
        const text = response.status === 200 ? await response.text() : null;
        return {
          status: response.status,
          text: text && text.length > 1048576 ? text.slice(0, 1048576) : text,
        };
      } catch {
        clearTimeout(timer);
        return { status: 0, text: null };
      }
    };

    const batchFetch = createBatchFetcher(fetchPage, concurrency);

    return {
      async scan(tool) {
        const website = tool.website;
        if (!website) {
          return null;
        }

        const baseUrl = website.replace(/\/+$/, '');
        const pagesData = [];
        const fetchedDocs = {};
        let budget = maxPages;

        // ── Phase 1: Core Pages ─────────────────────────────────
        const coreUrls = [baseUrl, `${baseUrl}/robots.txt`];
        if (enableSitemapParsing) coreUrls.push(`${baseUrl}/sitemap.xml`);

        const coreResults = await batchFetch(coreUrls);
        budget -= coreUrls.length;

        for (const r of coreResults) {
          const label = r.url === baseUrl ? 'homepage'
            : r.url.endsWith('/robots.txt') ? 'robots.txt'
              : 'sitemap.xml';
          pagesData.push({ label, url: r.url, status: r.status, text: r.text });
          if (r.text) fetchedDocs[label] = r.text;
        }

        // Parse homepage for disclosure, infra, content_marking, company_size
        const homepageHtml = fetchedDocs['homepage'] || null;
        const homepage$ = homepageHtml ? cheerio.load(homepageHtml) : null;

        // ── Phase 2: Link Discovery (zero HTTP cost) ────────────
        let homepageLinks = {};
        let sitemapLinks = {};

        if (enableLinkDiscovery && homepage$) {
          homepageLinks = discoverLinksFromHomepage(homepage$, baseUrl);
        }

        if (enableSitemapParsing && fetchedDocs['sitemap.xml']) {
          sitemapLinks = parseSitemap(fetchedDocs['sitemap.xml'], baseUrl);
        }

        const candidateUrls = mergeCandidateUrls(
          homepageLinks, sitemapLinks, SIGNAL_PROBE_PATHS, baseUrl,
        );

        // ── Phase 3: Signal Probes ──────────────────────────────
        const signalTypes = Object.keys(SIGNAL_PROBE_PATHS);
        const foundSignals = new Set();

        for (const signalType of signalTypes) {
          if (budget <= 0) break;
          if (foundSignals.has(signalType)) continue;

          const candidates = candidateUrls[signalType] || [];
          for (const url of candidates) {
            if (budget <= 0) break;

            const result = await fetchPage(url);
            budget--;

            const label = SIGNAL_TO_LABEL[signalType];
            pagesData.push({ label, url, status: result.status, text: result.text });

            if (result.status === 200 && result.text) {
              fetchedDocs[label] = result.text;
              foundSignals.add(signalType);
              break; // Found this signal, move to next type
            }
          }

          // Early exit if all signals found
          if (foundSignals.size === signalTypes.length) break;
        }

        // ── Assemble Result ─────────────────────────────────────
        // Parse each signal using minimal cheerio loads.
        // Use text-only analysis where possible to reduce memory.
        const privacyHtml = fetchedDocs['privacy'] || null;
        const responsibleAiHtml = fetchedDocs['responsible-ai'] || null;
        const modelCardHtml = fetchedDocs['model-card'] || null;
        const aboutHtml = fetchedDocs['about'] || null;

        // 1) Disclosure — needs homepage$ (already loaded)
        const disclosure = parseDisclosure(homepage$);

        // 2) Privacy — load once, parse, discard
        const privacy$ = privacyHtml ? cheerio.load(privacyHtml) : null;
        const privacyPolicy = parsePrivacyPolicy(privacy$);

        // 3) Trust — combine text, load once
        const trustHtml = [homepageHtml, aboutHtml, responsibleAiHtml].filter(Boolean).join('');
        const trust$ = trustHtml ? cheerio.load(trustHtml) : homepage$;
        const trust = parseTrustSignals(trust$, pagesData);

        // 4) Model card — reuse responsibleAi if no model-card page
        const modelCard$ = modelCardHtml ? cheerio.load(modelCardHtml)
          : responsibleAiHtml ? cheerio.load(responsibleAiHtml) : null;
        const modelCardResult = parseModelCard(modelCard$);

        // 5) Content marking — use homepage$ (DOM already loaded)
        const contentMarking = parseContentMarking(homepage$);

        // 6) Infra — use homepage$ (DOM already loaded)
        const infra = parseInfraSignals(homepage$);

        // 7) Company size — combine text, load once
        const aboutOrHome$ = aboutHtml ? cheerio.load(aboutHtml) : homepage$;
        const estimatedCompanySize = estimateCompanySize(aboutOrHome$);

        // 8) Web search — text-only from pagesData
        const webSearch = extractWebSearchSignals(homepage$, pagesData);

        // 9) Robots
        const robotsTxt = parseRobotsTxt(fetchedDocs['robots.txt'] || null);

        // Count successful fetches
        const pagesFetched = pagesData.filter((p) => p.status === 200).length;

        // Clear heavy references to aid GC
        for (const p of pagesData) { p.text = null; }
        for (const k of Object.keys(fetchedDocs)) { fetchedDocs[k] = null; }

        return {
          disclosure,
          privacy_policy: privacyPolicy,
          trust,
          model_card: modelCardResult,
          content_marking: contentMarking,
          robots_txt: robotsTxt,
          infra,
          social: { estimated_company_size: estimatedCompanySize },
          web_search: webSearch,
          pages_fetched: pagesFetched,
          scanned_at: new Date().toISOString(),
        };
      },
    };
  };
})()
