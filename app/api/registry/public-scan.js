/**
 * Public Scan API — Free scan funnel for AI Registry.
 *
 * POST /api/registry/public-scan
 *   Body: { url, apiKey?, mode?, model?, email?, captchaToken? }
 *   Returns: scan report with evidence, citations, score
 *
 * Three modes:
 *   passive (default): Website URL -> 30 sec, $0, no registration
 *   det_security: API endpoint + key -> 2-3 min, $0, no registration
 *   full: API endpoint + key -> 5-10 min, ~$0.08, email required
 */
({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/public/registry/scan',

  method: async ({ body, headers }) => {
    // Validate input
    const url = body && body.url;
    if (!url || typeof url !== 'string') {
      throw new errors.ValidationError('URL is required', { url: ['Must provide a valid URL'] });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new errors.ValidationError('Invalid URL format', { url: ['Must be a valid URL'] });
    }

    const mode = body.mode || 'passive';
    if (!['passive', 'det_security', 'full'].includes(mode)) {
      throw new errors.ValidationError('Invalid mode', {
        mode: ['Must be: passive, det_security, or full'],
      });
    }

    // Full mode requires email for registration
    if (mode === 'full' && !body.email) {
      throw new errors.ValidationError('Email required for full eval', {
        email: ['Full evaluation requires email registration'],
      });
    }

    // API modes require apiKey
    if ((mode === 'det_security' || mode === 'full') && !body.apiKey) {
      throw new errors.ValidationError('API key required', {
        apiKey: ['API endpoint testing requires an API key'],
      });
    }

    // Extract client IP
    const ip = headers['x-forwarded-for']
      ? headers['x-forwarded-for'].split(',')[0].trim()
      : headers['x-real-ip'] || '0.0.0.0';

    // Build rate limiter (uses DB for state)
    const rateLimiter = domain.registry['scan-rate-limiter']
      ? domain.registry['scan-rate-limiter']({ db, config })
      : null;

    // Run the scan
    const result = await application.registry.runPublicScan.execute({
      db,
      config,
      console,
      passiveScanner: domain.registry['passive-scanner']
        ? domain.registry['passive-scanner']({ fetch, cheerio, config })
        : null,
      llmTester: domain.registry['llm-tester']
        ? domain.registry['llm-tester']({
          fetch, config, console,
          testCatalog: domain.registry['registry-test-catalog'],
          judge: domain.registry['llm-judge']
            ? domain.registry['llm-judge']({ fetch, config, console })
            : null,
        })
        : null,
      evidenceAnalyzer: domain.registry['evidence-analyzer']
        ? domain.registry['evidence-analyzer']()
        : null,
      scorer: domain.registry['registry-scorer']
        ? domain.registry['registry-scorer']({
          weights: config.scoringWeights || {},
          obligationMap: config.obligationMap || {},
        })
        : null,
      rateLimiter,
      obligationMap: config.obligationMap || {},
    }, {
      url: body.url,
      apiKey: body.apiKey || null,
      mode,
      model: body.model || null,
      email: body.email || null,
      captchaToken: body.captchaToken || null,
      ip,
      userId: null, // Public endpoint, no auth
    });

    if (!result.success) {
      if (result.error === 'rate_limited') {
        throw new errors.RateLimitError(result.message || 'Rate limit exceeded');
      }
      if (result.error === 'captcha_required') {
        return { _statusCode: 403, error: 'captcha_required', message: result.message };
      }
      throw new errors.ValidationError(result.message || 'Scan failed');
    }

    return {
      data: result,
    };
  },
})
