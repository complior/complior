/**
 * Run Public Scan — Use case: orchestrate free scan for a URL or API endpoint.
 *
 * Three modes:
 *   A) Website URL -> passive scan only (30 sec, $0)
 *   B) API endpoint + key -> det + security tests (2-3 min, $0)
 *   C) API endpoint + key -> full eval with LLM judge (5-10 min, ~$0.08)
 *
 * VM sandbox compatible — IIFE, no require().
 */
(() => {
  /**
   * Detect scan mode from input.
   * - URL with no apiKey -> mode 'passive'
   * - URL with apiKey, mode not 'full' -> mode 'det_security'
   * - URL with apiKey, mode 'full' -> mode 'full'
   */
  const detectMode = (input) => {
    if (input.mode === 'full' && input.apiKey) return 'full';
    if (input.apiKey) return 'det_security';
    return 'passive';
  };

  /**
   * Try to find existing registry tool by URL or create a placeholder slug.
   */
  /**
   * Race a promise against a timeout. Returns { result, timedOut }.
   */
  const withTimeout = (promise, ms) => {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ result: null, timedOut: true }), ms);
    });
    const wrapped = promise
      .then((result) => ({ result, timedOut: false }))
      .catch((err) => ({ result: null, timedOut: false, error: err }));
    return Promise.race([wrapped, timeout]).finally(() => clearTimeout(timer));
  };

  // Global timeout for passive scan (Caddy proxy_read_timeout is ~60s)
  const PASSIVE_SCAN_TIMEOUT_MS = 25000;

  const findOrCreateSlug = (url) => {
    // URL constructor unavailable in VM sandbox — use regex
    const match = url.match(/^https?:\/\/([^/?#]+)/i);
    if (!match) return 'unknown-tool';
    const hostname = match[1].toLowerCase();
    const parts = hostname.split('.');
    const filtered = parts.filter((p) => p !== 'www' && p !== 'api' && p !== 'app');
    return filtered.join('-').replace(/[^a-z0-9-]/g, '') || 'unknown-tool';
  };

  return {
    /**
     * Execute a public scan.
     *
     * @param {Object} ctx - Sandbox context
     * @param {Object} input - { url, apiKey?, mode?, email?, ip }
     * @returns {Object} - Scan report with evidence, citations, score
     */
    async execute({
      db, console,
      passiveScanner, llmTester, evidenceAnalyzer, scorer,
      rateLimiter, docGrader,
    }, input) {
      const { url, apiKey, ip } = input;
      const userId = input.userId || null;
      const mode = detectMode(input);

      // 1. Rate limit check
      if (rateLimiter) {
        const check = await rateLimiter.check(ip, url, userId);
        if (!check.allowed) {
          return {
            success: false,
            error: 'rate_limited',
            reason: check.reason,
            message: check.message,
          };
        }
        if (check.requireCaptcha && !input.captchaToken) {
          return {
            success: false,
            error: 'captcha_required',
            message: 'Please complete the CAPTCHA to continue.',
          };
        }
      }

      console.log(`Public scan: ${mode} mode for ${url}`);
      const startTime = Date.now();
      const evidence = {};
      const enrichmentLog = [];
      let slug = findOrCreateSlug(url);

      // 2. Check if tool already exists in registry
      let existingTool = null;
      const existing = await db.query(
        'SELECT * FROM "RegistryTool" WHERE website = $1 OR "websiteUrl" = $1 LIMIT 1',
        [url],
      );
      if (existing.rows.length > 0) {
        existingTool = existing.rows[0];
        slug = existingTool.slug;
        // Parse existing evidence
        if (typeof existingTool.evidence === 'string') {
          try { existingTool.evidence = JSON.parse(existingTool.evidence); } catch { /* ok */ }
        }
        if (typeof existingTool.assessments === 'string') {
          try {
            existingTool.assessments = JSON.parse(existingTool.assessments);
          } catch { /* ok */ }
        }
      }

      // 3. Mode A: Passive scan (always runs for URLs, with global timeout)
      if (passiveScanner) {
        try {
          const scanOutcome = await withTimeout(
            passiveScanner.scan({ website: url, slug }),
            PASSIVE_SCAN_TIMEOUT_MS,
          );
          if (scanOutcome.timedOut) {
            enrichmentLog.push(`passive_scan: timeout after ${PASSIVE_SCAN_TIMEOUT_MS}ms`);
          } else if (scanOutcome.error) {
            enrichmentLog.push(`passive_scan: error - ${scanOutcome.error.message}`);
          } else if (scanOutcome.result) {
            evidence.passive_scan = scanOutcome.result;
            enrichmentLog.push(`passive_scan: ${scanOutcome.result.pages_fetched} pages`);
          }
        } catch (err) {
          enrichmentLog.push(`passive_scan: error - ${err.message}`);
        }
      }

      // 4. Mode B: Det + Security tests (468 tests, $0)
      if ((mode === 'det_security' || mode === 'full') && llmTester && apiKey) {
        try {
          const testResults = await llmTester.test(
            { slug, website: url },
            // Pass endpoint config with API key
            { endpoint: url, apiKey, model: input.model || null },
            { modes: ['deterministic', 'security'] },
          );
          if (testResults && testResults.length > 0) {
            evidence.llm_tests = testResults;
            const passed = testResults.filter((t) => t.passed).length;
            enrichmentLog.push(`det_security: ${passed}/${testResults.length} passed`);
          }
        } catch (err) {
          enrichmentLog.push(`det_security: error - ${err.message}`);
        }
      }

      // 5. Mode C: Full eval with LLM judge (680 tests, ~$0.08)
      if (mode === 'full' && llmTester && apiKey) {
        try {
          const judgeResults = await llmTester.test(
            { slug, website: url },
            { endpoint: url, apiKey, model: input.model || null },
            { modes: ['llm_judged'] },
          );
          if (judgeResults && judgeResults.length > 0) {
            // Merge with existing det+security results
            const existing = evidence.llm_tests || [];
            evidence.llm_tests = [...existing, ...judgeResults];
            const passed = judgeResults.filter((t) => t.passed).length;
            enrichmentLog.push(`llm_judge: ${passed}/${judgeResults.length} passed`);
          }
        } catch (err) {
          enrichmentLog.push(`llm_judge: error - ${err.message}`);
        }
      }

      evidence.enriched_at = new Date().toISOString();

      // 6. Run evidence analysis + scoring
      let scoreResult = null;
      const toolForScoring = existingTool || {
        slug,
        name: slug,
        website: url,
        evidence,
        assessments: {},
        categories: [],
        level: 'classified',
        provider: null,
      };
      toolForScoring.evidence = evidence;

      if (evidenceAnalyzer && scorer) {
        try {
          const analysisResult = evidenceAnalyzer.analyze(toolForScoring);
          scoreResult = scorer.calculate(toolForScoring, analysisResult);
        } catch (err) {
          enrichmentLog.push(`scoring: error - ${err.message}`);
        }
      }

      // 6b. Run doc grader (always, independent of scorer)
      let docGradeResult = null;
      if (docGrader) {
        try {
          docGradeResult = docGrader.grade(toolForScoring);
          enrichmentLog.push(`doc_grader: grade ${docGradeResult.grade}`);
        } catch (err) {
          enrichmentLog.push(`doc_grader: error - ${err.message}`);
        }
      }

      const durationMs = Date.now() - startTime;

      // Extract transparency from scorer (always computed, even when score=null)
      const transparencyGrade = scoreResult ? (scoreResult.transparencyGrade || null) : null;
      const transparencyScore = scoreResult ? (scoreResult.transparencyScore || null) : null;
      const scoreReason = (scoreResult && scoreResult.score === null)
        ? (scoreResult.reason || null)
        : null;

      // 7. Log the scan (rich entry for analytics)
      if (rateLimiter) {
        await rateLimiter.log({
          ip, url, userId,
          denied: false,
          mode,
          userAgent: input.userAgent || null,
          referrer: input.referrer || null,
          success: true,
          slug,
          isExistingTool: Boolean(existingTool),
          grade: scoreResult ? scoreResult.grade : (docGradeResult ? docGradeResult.grade : null),
          score: scoreResult ? scoreResult.score : null,
          coverage: scoreResult ? scoreResult.coverage : null,
          durationMs,
        });
      }

      // 8. Update lastPublicScanAt if tool exists
      if (existingTool) {
        await db.query(
          'UPDATE "RegistryTool" SET "lastPublicScanAt" = NOW() WHERE slug = $1',
          [slug],
        );
      }

      // 9. Build report
      return {
        success: true,
        mode,
        slug,
        url,
        isExistingTool: Boolean(existingTool),
        evidence: {
          citations: evidence.passive_scan ? evidence.passive_scan.citations : null,
          scan_quality: evidence.passive_scan ? evidence.passive_scan.scan_quality : null,
          llm_tests_summary: evidence.llm_tests ? {
            total: evidence.llm_tests.length,
            passed: evidence.llm_tests.filter((t) => t.passed).length,
            failed: evidence.llm_tests.filter((t) => !t.passed).length,
          } : null,
        },
        docGrade: docGradeResult ? {
          grade: docGradeResult.grade,
          weightedPercent: docGradeResult.weightedPercent,
          requiredFound: docGradeResult.requiredFound,
          requiredTotal: docGradeResult.requiredTotal,
          bpFound: docGradeResult.bpFound,
          bpTotal: docGradeResult.bpTotal,
          items: docGradeResult.items,
          checklist: docGradeResult.checklist,
        } : null,
        transparencyGrade,
        transparencyScore,
        score: (scoreResult && scoreResult.score !== null) ? {
          value: scoreResult.score,
          grade: scoreResult.grade,
          zone: scoreResult.zone,
          coverage: scoreResult.coverage,
          confidence: scoreResult.confidence,
          scanCoverage: scoreResult.scanCoverage || null,
        } : null,
        scoreReason,
        enrichmentLog,
        durationMs,
        scannedAt: evidence.enriched_at,
      };
    },
  };
})()
