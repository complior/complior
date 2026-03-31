/**
 * Passive Scanner v3 — Three-State Evidence with Citations.
 *
 * 3-phase scan: core pages -> link discovery -> signal probes.
 * Budget: up to 20 pages per tool with early exit when all signals found.
 *
 * v3 additions:
 *  - Three-state evidence: confirmed / not_found / not_checked
 *  - Evidence citations: URL + snippet + pageTitle + checkedAt per signal
 *  - Scan quality metrics: pages_attempted/succeeded/blocked/timeout,
 *    signals_checked/confirmed/not_found/not_checked, overall_coverage
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
      '/legal', '/data-privacy', '/data-protection',
    ],
    terms: [
      '/terms', '/terms-of-service', '/tos', '/legal/terms',
      '/policies/terms-of-use', '/terms-of-use',
      '/legal/terms-of-service', '/eula',
    ],
    responsible_ai: [
      '/responsible-ai', '/safety', '/trust', '/ai-safety',
      '/responsible-use', '/ethics', '/ai-principles',
      '/trust-center', '/responsibility',
      '/about/ai', '/ai-ethics', '/responsible',
    ],
    eu_ai_act: [
      '/eu-ai-act', '/ai-act', '/compliance', '/compliance/eu-ai-act',
      '/legal/ai-act', '/trust/eu-ai-act',
      '/ai-governance', '/regulation',
    ],
    model_card: [
      '/model-card', '/research', '/docs/model-card',
      '/technical-report', '/documentation', '/models',
      '/system-card', '/safety-report', '/docs',
    ],
    about: [
      '/about', '/about-us', '/company', '/team',
      '/about/company',
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

  // ── Helper: extract snippet around a regex match ────────────────────
  const extractSnippet = (text, pattern, maxLen) => {
    if (!text) return null;
    const limit = maxLen || 200;
    const match = pattern.exec(text);
    if (!match) return null;
    const start = Math.max(0, match.index - 40);
    const end = Math.min(text.length, match.index + match[0].length + 40);
    let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (snippet.length > limit) snippet = snippet.slice(0, limit);
    return snippet;
  };

  // ── Helper: extract <title> from HTML ──────────────────────────────
  const extractTitle = (html) => {
    if (!html) return null;
    const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    return match ? match[1].trim().slice(0, 200) : null;
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
  // All return same shape as v2 (backward-compatible booleans).
  // Citation data is built separately in the assembly phase.

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

  // ── Known Provider Domain Mapping ──────────────────────────────────

  const KNOWN_PROVIDER_DOMAINS = {
    // OpenAI
    'chat.openai.com': 'openai.com',
    'chatgpt.com': 'openai.com',
    'platform.openai.com': 'openai.com',
    'api.openai.com': 'openai.com',
    'open.ai': 'openai.com',
    // Microsoft
    'copilot.microsoft.com': 'microsoft.com',
    'bing.com': 'microsoft.com',
    'azure.microsoft.com': 'microsoft.com',
    // Google
    'gemini.google.com': 'google.com',
    'bard.google.com': 'google.com',
    'ai.google': 'google.com',
    'cloud.google.com': 'google.com',
    'deepmind.google': 'google.com',
    'deepmind.com': 'google.com',
    // Anthropic
    'claude.ai': 'anthropic.com',
    'console.anthropic.com': 'anthropic.com',
    'api.anthropic.com': 'anthropic.com',
    // Mistral
    'chat.mistral.ai': 'mistral.ai',
    'le-chat.mistral.ai': 'mistral.ai',
    'console.mistral.ai': 'mistral.ai',
    // Meta
    'ai.meta.com': 'meta.com',
    'llama.meta.com': 'meta.com',
    // GitHub / Dev tools
    'github.com': 'github.com',
    'github.copilot.com': 'github.com',
    // Hugging Face
    'huggingface.co': 'huggingface.co',
    // Stability AI
    'dreamstudio.ai': 'stability.ai',
    'clipdrop.co': 'stability.ai',
    // Midjourney
    'www.midjourney.com': 'midjourney.com',
    // Cohere
    'dashboard.cohere.com': 'cohere.com',
    'coral.cohere.com': 'cohere.com',
    // Perplexity
    'www.perplexity.ai': 'perplexity.ai',
    // Jasper
    'app.jasper.ai': 'jasper.ai',
    // Notion
    'www.notion.so': 'notion.so',
    'notion.so': 'notion.so',
    // Grammarly
    'app.grammarly.com': 'grammarly.com',
    // Canva
    'www.canva.com': 'canva.com',
    // Salesforce
    'einstein.ai': 'salesforce.com',
    // Adobe
    'firefly.adobe.com': 'adobe.com',
    // Runway
    'app.runwayml.com': 'runwayml.com',
    // ElevenLabs
    'elevenlabs.io': 'elevenlabs.io',
    // Replicate
    'replicate.com': 'replicate.com',
    // Databricks
    'www.databricks.com': 'databricks.com',
    // DeepSeek
    'chat.deepseek.com': 'deepseek.com',
    // xAI
    'grok.x.ai': 'x.ai',
    'x.ai': 'x.ai',
    // Inflection
    'pi.ai': 'inflection.ai',
    // Character AI
    'character.ai': 'character.ai',
    'beta.character.ai': 'character.ai',
    // Together AI
    'api.together.xyz': 'together.ai',
    // Groq
    'console.groq.com': 'groq.com',
    // Writer
    'app.writer.com': 'writer.com',
    // Synthesia
    'www.synthesia.io': 'synthesia.io',
    // Descript
    'www.descript.com': 'descript.com',
  };

  const getProviderDomain = (toolUrl) => {
    try {
      const host = new URL(toolUrl).hostname;
      return KNOWN_PROVIDER_DOMAINS[host] || null;
    } catch {
      return null;
    }
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

  // ── Citation Builder ───────────────────────────────────────────────
  // Builds three-state citations from parse results + page data.

  const SIGNAL_DEFINITIONS = [
    {
      key: 'privacyPolicy',
      label: 'Privacy Policy',
      pageLabel: 'privacy',
      // eslint-disable-next-line max-len
      check: (ps) => ps.privacy_policy && (ps.privacy_policy.mentions_ai || ps.privacy_policy.mentions_eu || ps.privacy_policy.gdpr_compliant),
      // eslint-disable-next-line max-len
      snippetPattern: /(?:artificial intelligence|machine learning|ai\s+model|gdpr|general data protection|data protection officer|european union)[^.]{0,120}\./i,
    },
    {
      key: 'aiDisclosure',
      label: 'AI Disclosure',
      pageLabel: 'homepage',
      check: (ps) => ps.disclosure && ps.disclosure.visible,
      snippet: (ps) => ps.disclosure && ps.disclosure.text,
    },
    {
      key: 'termsOfService',
      label: 'Terms of Service',
      pageLabel: 'terms',
      check: (_, pageMap) => Boolean(pageMap['terms']),
      snippetPattern: /(?:terms|conditions|agreement|license)[^.]{0,80}\./i,
    },
    {
      key: 'responsibleAi',
      label: 'Responsible AI',
      pageLabel: 'responsible-ai',
      check: (ps) => ps.trust && ps.trust.has_responsible_ai_page,
      // eslint-disable-next-line max-len
      snippetPattern: /(?:responsible|fairness|bias|transparency|accountability|safety|ethics|governance)[^.]{0,100}\./i,
    },
    {
      key: 'euAiAct',
      label: 'EU AI Act Page',
      pageLabel: 'eu-ai-act',
      check: (ps) => ps.trust && ps.trust.has_eu_ai_act_page,
      // eslint-disable-next-line max-len
      snippetPattern: /(?:ai\s*act|artificial intelligence act|eu.*2024.*1689|regulation.*ai)[^.]{0,100}\./i,
    },
    {
      key: 'modelCard',
      label: 'Model Card / Technical Documentation',
      pageLabel: 'model-card',
      check: (ps) => ps.model_card && ps.model_card.has_model_card,
      // eslint-disable-next-line max-len
      snippetPattern: /(?:model\s*card|technical\s*report|system\s*card|model\s*spec|safety\s*report)[^.]{0,100}\./i,
    },
    {
      key: 'contentMarking',
      label: 'AI Content Marking (C2PA / Watermark)',
      pageLabel: 'homepage',
      // eslint-disable-next-line max-len
      check: (ps) => ps.content_marking && (ps.content_marking.c2pa || ps.content_marking.watermark),
      // eslint-disable-next-line max-len
      snippetPattern: /(?:c2pa|content credentials|content authenticity|watermark|synthid)[^.]{0,100}\./i,
    },
    {
      key: 'cookieConsent',
      label: 'Cookie Consent',
      pageLabel: 'homepage',
      check: (ps) => ps.infra && ps.infra.has_cookie_consent,
      snippetPattern: /(?:cookie|consent|onetrust|cookiebot)[^.]{0,80}\./i,
    },
    {
      key: 'biasAudit',
      label: 'Public Bias Audit',
      pageLabel: null,
      check: (ps) => ps.web_search && ps.web_search.has_public_bias_audit,
      // eslint-disable-next-line max-len
      snippetPattern: /(?:bias\s*audit|algorithmic\s*audit|fairness\s*assessment)[^.]{0,100}\./i,
    },
    {
      key: 'transparencyReport',
      label: 'Transparency Report',
      pageLabel: null,
      check: (ps) => ps.web_search && ps.web_search.has_transparency_report,
      snippetPattern: /(?:transparency\s*report|transparency\s*center)[^.]{0,100}\./i,
    },
    {
      key: 'robotsTxtAiBlocking',
      label: 'AI Crawler Blocking (robots.txt)',
      pageLabel: 'robots.txt',
      check: (ps) => ps.robots_txt && ps.robots_txt.blocks_ai_crawlers,
      snippet: (ps) => ps.robots_txt && ps.robots_txt.blocked_bots
        ? `Blocked bots: ${ps.robots_txt.blocked_bots.join(', ')}` : null,
    },
    {
      key: 'trainingOptOut',
      label: 'Training Opt-out',
      pageLabel: 'privacy',
      check: (ps) => ps.privacy_policy && ps.privacy_policy.training_opt_out,
      // eslint-disable-next-line max-len
      snippetPattern: /(?:opt.out.*training|training.*opt.out|do not.*train|exclude.*training)[^.]{0,80}\./i,
    },
    {
      key: 'deletionRight',
      label: 'Data Deletion Right',
      pageLabel: 'privacy',
      check: (ps) => ps.privacy_policy && ps.privacy_policy.deletion_right,
      // eslint-disable-next-line max-len
      snippetPattern: /(?:right.*delet|right.*eras|delete.*data|erase.*data|right to be forgotten)[^.]{0,80}\./i,
    },
    {
      key: 'dataRetention',
      label: 'Data Retention Policy',
      pageLabel: 'privacy',
      check: (ps) => ps.privacy_policy && ps.privacy_policy.retention_specified,
      snippetPattern: /(?:retention|retain.*data|data.*kept|store.*data)[^.]{0,80}\./i,
    },
    {
      key: 'certifications',
      label: 'Security Certifications',
      pageLabel: null,
      check: (ps) => ps.trust && ps.trust.certifications && ps.trust.certifications.length > 0,
      snippet: (ps) => ps.trust && ps.trust.certifications
        ? `Certifications: ${ps.trust.certifications.join(', ')}` : null,
    },
  ];

  // Determine whether a page was "checked" vs "not_checked"
  // status 200 = checked (content available)
  // status 0 (error/timeout) = not_checked
  // status 403/401 = not_checked (blocked)
  // status 404 = checked but not found (the page itself is missing)
  // status 3xx = depends on redirect handling (follow → re-check)
  const wasPageChecked = (pageEntry) => {
    if (!pageEntry) return false;
    const s = pageEntry.status;
    // 200 or 404 = we did reach the server and get a definitive answer
    return s === 200 || s === 404 || s === 410;
  };

  const buildCitations = (parsedResult, pagesData, pageTextMap, checkedAt) => {
    const citations = {};

    // Build a map: pageLabel -> best page entry (prefer 200, then any checked)
    const pageMap = {};
    for (const p of pagesData) {
      if (!p.label) continue;
      if (!pageMap[p.label] || p.status === 200) {
        pageMap[p.label] = p;
      }
    }

    for (const def of SIGNAL_DEFINITIONS) {
      const isConfirmed = def.check(parsedResult, pageMap);

      if (isConfirmed) {
        // Signal confirmed
        const sourcePageLabel = def.pageLabel;
        const sourcePage = sourcePageLabel ? pageMap[sourcePageLabel] : null;
        let snippet = null;

        // Extract snippet from the raw page text
        if (def.snippet) {
          snippet = def.snippet(parsedResult);
        } else if (def.snippetPattern && sourcePageLabel) {
          const rawText = pageTextMap[sourcePageLabel];
          if (rawText) {
            snippet = extractSnippet(rawText, def.snippetPattern, 200);
          }
        }

        citations[def.key] = {
          status: 'confirmed',
          url: sourcePage ? sourcePage.url : null,
          snippet: snippet || null,
          pageTitle: sourcePage && pageTextMap[sourcePageLabel]
            ? extractTitle(pageTextMap[sourcePageLabel]) : null,
          checkedAt,
        };
      } else {
        // Not confirmed — was it checked or not?
        const sourcePageLabel = def.pageLabel;

        if (!sourcePageLabel) {
          // Signal derived from multiple pages — check if any pages were loaded
          const anyPageChecked = pagesData.some((p) => wasPageChecked(p));
          citations[def.key] = {
            status: anyPageChecked ? 'not_found' : 'not_checked',
            url: null,
            snippet: null,
            pageTitle: null,
            checkedAt: anyPageChecked ? checkedAt : null,
          };
        } else {
          const sourcePage = pageMap[sourcePageLabel];
          if (sourcePage && wasPageChecked(sourcePage)) {
            // Page was loaded but signal not found
            citations[def.key] = {
              status: 'not_found',
              url: sourcePage.url,
              snippet: null,
              pageTitle: pageTextMap[sourcePageLabel]
                ? extractTitle(pageTextMap[sourcePageLabel]) : null,
              checkedAt,
            };
          } else {
            // Page could not be loaded
            const errorReason = sourcePage
              ? (sourcePage.error || `HTTP ${sourcePage.status}`)
              : 'page_not_fetched';
            citations[def.key] = {
              status: 'not_checked',
              url: sourcePage ? sourcePage.url : null,
              snippet: null,
              pageTitle: null,
              checkedAt: null,
              reason: errorReason,
            };
          }
        }
      }
    }

    return citations;
  };

  // ── Scan Quality Metrics ───────────────────────────────────────────

  const buildScanQuality = (pagesData, citations) => {
    const pagesAttempted = pagesData.length;
    const pagesSucceeded = pagesData.filter((p) => p.status === 200).length;
    const pagesBlocked = pagesData.filter((p) => p.status === 403 || p.status === 401).length;
    const pagesTimeout = pagesData.filter((p) => p.status === 0 && p.error).length;
    const pagesNotFound = pagesData.filter((p) => p.status === 404).length;

    const signalKeys = Object.keys(citations);
    const signalsChecked = signalKeys.length;
    const signalsConfirmed = signalKeys.filter((k) => citations[k].status === 'confirmed').length;
    const signalsNotFound = signalKeys.filter((k) => citations[k].status === 'not_found').length;
    const signalsNotChecked = signalKeys.filter((k) => citations[k].status === 'not_checked').length;

    const checkedCount = signalsConfirmed + signalsNotFound;
    const overallCoverage = signalsChecked > 0
      ? Math.round((checkedCount / signalsChecked) * 100) / 100
      : 0;

    let confidence = 'low';
    if (overallCoverage >= 0.8 && pagesSucceeded >= 5) confidence = 'high';
    else if (overallCoverage >= 0.5 && pagesSucceeded >= 3) confidence = 'medium';

    return {
      pages_attempted: pagesAttempted,
      pages_succeeded: pagesSucceeded,
      pages_blocked: pagesBlocked,
      pages_timeout: pagesTimeout,
      pages_not_found: pagesNotFound,
      signals_checked: signalsChecked,
      signals_confirmed: signalsConfirmed,
      signals_not_found: signalsNotFound,
      signals_not_checked: signalsNotChecked,
      overall_coverage: overallCoverage,
      confidence,
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
      } catch (err) {
        clearTimeout(timer);
        return { status: 0, text: null, error: err.message || 'fetch_failed' };
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
          pagesData.push({
            label, url: r.url, status: r.status,
            text: r.text, error: r.error || null,
          });
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
            pagesData.push({
              label, url, status: result.status, text: result.text, error: result.error || null,
            });

            if (result.status === 200 && result.text) {
              fetchedDocs[label] = result.text;
              foundSignals.add(signalType);
              break; // Found this signal, move to next type
            }
          }

          // Early exit if all signals found
          if (foundSignals.size === signalTypes.length) break;
        }

        // Cross-domain fallback: if signals missing, try provider domain
        const providerDomain = getProviderDomain(baseUrl);
        if (providerDomain && budget > 0 && foundSignals.size < signalTypes.length) {
          const providerBase = `https://${providerDomain}`;
          for (const signalType of signalTypes) {
            if (budget <= 0) break;
            if (foundSignals.has(signalType)) continue;

            const paths = SIGNAL_PROBE_PATHS[signalType] || [];
            for (const suffix of paths) {
              if (budget <= 0) break;
              const url = providerBase + suffix;
              const result = await fetchPage(url);
              budget--;

              const label = SIGNAL_TO_LABEL[signalType];
              pagesData.push({
                label, url, status: result.status, text: result.text, error: result.error || null,
              });

              if (result.status === 200 && result.text) {
                fetchedDocs[label] = result.text;
                foundSignals.add(signalType);
                break;
              }
            }
          }
        }

        // ── Assemble Result ─────────────────────────────────────
        // Parse each signal using minimal cheerio loads.
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

        // Build pages_detail for diagnostics (url + status + error)
        const pagesDetail = pagesData.map((p) => ({
          url: p.url,
          label: p.label,
          status: p.status,
          error: p.error || null,
        }));

        const checkedAt = new Date().toISOString();

        // ── v3: Build citations (three-state evidence) ──────────
        const parsedResult = {
          disclosure,
          privacy_policy: privacyPolicy,
          trust,
          model_card: modelCardResult,
          content_marking: contentMarking,
          robots_txt: robotsTxt,
          infra,
          web_search: webSearch,
        };

        const citations = buildCitations(parsedResult, pagesData, fetchedDocs, checkedAt);

        // ── v3: Build scan quality metrics ───────────────────────
        const scanQuality = buildScanQuality(pagesData, citations);

        // Clear heavy references to aid GC
        for (const p of pagesData) { p.text = null; }
        for (const k of Object.keys(fetchedDocs)) { fetchedDocs[k] = null; }

        return {
          // v2 backward-compatible fields
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
          pages_detail: pagesDetail,
          scanned_at: checkedAt,
          // v3 additions
          citations,
          scan_quality: scanQuality,
        };
      },
    };
  };
})()
