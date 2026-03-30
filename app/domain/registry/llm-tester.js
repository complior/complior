/**
 * LLM Tester v4 — 3-mode behavioral test suite for LLM models.
 *
 * Supports three composable test modes:
 *   deterministic: 176 regex-based tests ($0 LLM cost)
 *   security: ~75 security probe tests ($0 regex)
 *   llm_judged: 80 legacy + 212 LLM-as-judge tests (~$0.04-0.06)
 *
 * Two target types:
 *   - OpenRouter model ID (string): for scheduled refresh pipeline
 *   - Direct endpoint (object): for public scan funnel
 *
 * Dependencies injected: fetch, config, console, testCatalog, judge.
 *
 * VM sandbox compatible — IIFE returns factory function.
 */
(() => {
  // ── Rate Limiter (sliding window) ─────────────────────────────
  const createSlidingWindowLimiter = (maxPerMin) => {
    const timestamps = [];
    return async () => {
      const now = Date.now();
      while (timestamps.length > 0 && now - timestamps[0] > 60000) {
        timestamps.shift();
      }
      if (timestamps.length >= maxPerMin) {
        const waitMs = 60000 - (now - timestamps[0]) + 100;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      timestamps.push(Date.now());
    };
  };

  // ── Concurrency limiter ───────────────────────────────────────
  const createConcurrencyLimiter = (maxConcurrent) => {
    let running = 0;
    const queue = [];

    const release = () => {
      running--;
      if (queue.length > 0) {
        const next = queue.shift();
        running++;
        next();
      }
    };

    return (fn) => new Promise((resolve, reject) => {
      const run = () => {
        fn().then(resolve, reject).finally(release);
      };
      if (running < maxConcurrent) {
        running++;
        run();
      } else {
        queue.push(run);
      }
    });
  };

  // ── Main Factory ──────────────────────────────────────────────
  return ({ fetch, config, console, testCatalog, judge }) => {
    const orConfig = (config && config.enrichment && config.enrichment.openRouter) || {};
    const features = (config && config.enrichment && config.enrichment.features) || {};
    const apiKey = orConfig.apiKey || '';
    const baseUrl = orConfig.baseUrl || 'https://openrouter.ai/api/v1';
    const maxTokens = orConfig.maxTokens || 512;
    const temperature = orConfig.temperature || 0.3;
    const timeoutMs = orConfig.timeoutMs || 30000;
    const rateLimitPerMin = orConfig.rateLimitPerMin || 50;
    const rateLimiter = createSlidingWindowLimiter(rateLimitPerMin);
    const concurrencyLimit = createConcurrencyLimiter(5);

    const llmJudgeEnabled = features.llmJudge !== false;
    const abBiasEnabled = features.abBiasTests !== false;

    // ── Legacy catalog (IIFE domain module, 80 tests) ─────────
    const legacyCatalog = testCatalog || { CATALOG: [], LEGACY_ID_MAP: {} };
    const legacyTests = legacyCatalog.CATALOG || [];

    // ── Extended catalog (config-loaded, 680+ tests) ──────────
    const extCatalog = (config && config.llmTestCatalog) || {};
    const extDeterministic = extCatalog.deterministic || [];
    const extSecurity = extCatalog.security || [];

    // ── API Callers ───────────────────────────────────────────

    /**
     * Call OpenRouter API (for scheduled refresh pipeline).
     */
    const callOpenRouter = async (modelId, prompt) => {
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured');
      }

      await rateLimiter();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://complior.eu',
            'X-Title': 'Complior AI Registry',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenRouter ${response.status}: ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    /**
     * Call a direct API endpoint (OpenAI-compatible, for public scan).
     */
    const callDirectEndpoint = async (endpointConfig, prompt) => {
      const { endpoint, apiKey: epKey, model: epModel } = endpointConfig;
      if (!epKey) {
        throw new Error('API key not provided for direct endpoint');
      }

      await rateLimiter();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Normalize endpoint: ensure it ends with /chat/completions
      let apiUrl = endpoint;
      if (!apiUrl.endsWith('/chat/completions')) {
        apiUrl = apiUrl.replace(/\/+$/, '') + '/chat/completions';
      }

      try {
        const body = {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        };
        if (epModel) body.model = epModel;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${epKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Endpoint ${response.status}: ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    /**
     * Unified LLM caller — dispatches to OpenRouter or direct endpoint.
     */
    const callLLM = async (target, prompt) => {
      if (typeof target === 'string') {
        return callOpenRouter(target, prompt);
      }
      if (target && typeof target === 'object' && target.endpoint) {
        return callDirectEndpoint(target, prompt);
      }
      throw new Error('Invalid target: must be modelId string or endpoint config object');
    };

    // ── Evaluators ──────────────────────────────────────────────

    const evaluateDeterministic = (response, testDef) => {
      const patterns = testDef.passPatterns || [];
      const failPats = testDef.failPatterns || [];

      const passMatch = patterns.length === 0
        || patterns.some((re) => re.test(response));
      const failMatch = failPats.length > 0
        && failPats.some((re) => re.test(response));
      return passMatch && !failMatch;
    };

    const runDeterministicTest = async (testDef, target, slug) => {
      try {
        const response = await callLLM(target, testDef.probe);
        const passed = evaluateDeterministic(response, testDef);
        return {
          id: testDef.id,
          group: testDef.group,
          category: testDef.category,
          prompt: testDef.probe,
          passed,
          evaluator: 'deterministic',
          response_snippet: response.slice(0, 500),
          judgeScore: null,
          judgeReasoning: null,
          judgeConfidence: null,
          pairId: null,
          scoreDiff: null,
        };
      } catch (err) {
        console.error(`  LLM test ${testDef.id} failed for ${slug}: ${err.message}`);
        return {
          id: testDef.id,
          group: testDef.group,
          category: testDef.category,
          prompt: testDef.probe,
          passed: false,
          evaluator: 'deterministic',
          error: err.message,
          response_snippet: null,
          judgeScore: null,
          judgeReasoning: null,
          judgeConfidence: null,
          pairId: null,
          scoreDiff: null,
        };
      }
    };

    const runJudgeTest = async (testDef, target, slug) => {
      if (!judge || !llmJudgeEnabled) {
        return runDeterministicTest(testDef, target, slug);
      }

      try {
        const response = await callLLM(target, testDef.probe);
        const judgeResult = await judge.judge({
          probe: testDef.probe,
          response,
          judgePrompt: testDef.judgePrompt,
        });

        return {
          id: testDef.id,
          group: testDef.group,
          category: testDef.category,
          prompt: testDef.probe,
          passed: judgeResult.passed,
          evaluator: 'llm-judge',
          response_snippet: response.slice(0, 500),
          judgeScore: judgeResult.score,
          judgeReasoning: judgeResult.reasoning,
          judgeConfidence: judgeResult.confidence,
          pairId: null,
          scoreDiff: null,
        };
      } catch (err) {
        console.error(`  LLM judge test ${testDef.id} failed for ${slug}: ${err.message}`);
        return {
          id: testDef.id,
          group: testDef.group,
          category: testDef.category,
          prompt: testDef.probe,
          passed: false,
          evaluator: 'llm-judge',
          error: err.message,
          response_snippet: null,
          judgeScore: null,
          judgeReasoning: null,
          judgeConfidence: null,
          pairId: null,
          scoreDiff: null,
        };
      }
    };

    const runABPairTest = async (testDef, target, slug) => {
      if (!judge || !abBiasEnabled) {
        return runDeterministicTest(testDef, target, slug);
      }

      try {
        const [responseA, responseB] = await Promise.all([
          callLLM(target, testDef.probe),
          callLLM(target, testDef.pairProbe),
        ]);

        const judgeResult = await judge.judgeABPair({
          probe: testDef.probe,
          responseA,
          responseB,
          judgePrompt: testDef.judgePrompt,
        });

        return {
          id: testDef.id,
          group: testDef.group,
          category: testDef.category,
          prompt: testDef.probe,
          passed: judgeResult.passed,
          evaluator: 'ab-pair',
          response_snippet: responseA.slice(0, 250) + ' ||| ' + responseB.slice(0, 250),
          judgeScore: null,
          judgeReasoning: judgeResult.reasoning,
          judgeConfidence: judgeResult.confidence,
          pairId: testDef.pairId,
          scoreDiff: judgeResult.scoreDiff,
        };
      } catch (err) {
        console.error(`  A/B pair ${testDef.id} failed for ${slug}: ${err.message}`);
        return {
          id: testDef.id,
          group: testDef.group,
          category: testDef.category,
          prompt: testDef.probe,
          passed: false,
          evaluator: 'ab-pair',
          error: err.message,
          response_snippet: null,
          judgeScore: null,
          judgeReasoning: null,
          judgeConfidence: null,
          pairId: testDef.pairId,
          scoreDiff: null,
        };
      }
    };

    // ── Test Selection ──────────────────────────────────────────

    /**
     * Select tests based on mode array.
     *
     * Modes:
     *   'deterministic' — 176 regex tests from extended catalog ($0)
     *   'security'      — ~75 security probes from extended catalog ($0)
     *   'llm_judged'    — 80 legacy judge+ab tests (~$0.04-0.06)
     *
     * When no modes specified, falls back to legacy 80-test catalog.
     */
    const selectTests = (modes) => {
      if (!modes || modes.length === 0) {
        // Legacy: run all 80 tests from old catalog
        return legacyTests;
      }

      const selected = [];

      if (modes.includes('deterministic')) {
        selected.push(...extDeterministic);
      }

      if (modes.includes('security')) {
        selected.push(...extSecurity);
      }

      if (modes.includes('llm_judged')) {
        // Use legacy catalog's judge + ab-pair tests
        const judgeTests = legacyTests.filter(
          (t) => t.evaluator === 'llm-judge' || t.evaluator === 'ab-pair',
        );
        selected.push(...judgeTests);
      }

      return selected;
    };

    // ── Main Test Runner ────────────────────────────────────────
    return {
      /**
       * Run behavioral tests on a target LLM.
       *
       * @param {Object} tool - { slug, name, website }
       * @param {string|Object} target - OpenRouter modelId (string)
       *   OR direct endpoint config { endpoint, apiKey, model }
       * @param {Object} [options] - { modes?: string[] }
       *   modes: subset of ['deterministic', 'security', 'llm_judged']
       *   If omitted, runs legacy 80-test catalog.
       * @returns {Array|null} - Test results array, or null if no target
       */
      async test(tool, target, options) {
        if (!target) {
          return null;
        }

        const slug = tool.slug || tool.name || 'unknown';
        const modes = (options && options.modes) || null;
        const tests = selectTests(modes);

        if (tests.length === 0) {
          console.log(`  No tests selected for ${slug} (modes: ${JSON.stringify(modes)})`);
          return [];
        }

        console.log(`  Running ${tests.length} tests on ${slug} (modes: ${JSON.stringify(modes || 'legacy')})`);

        const tasks = [];
        for (const testDef of tests) {
          switch (testDef.evaluator) {
          case 'llm-judge':
            tasks.push(() => runJudgeTest(testDef, target, slug));
            break;
          case 'ab-pair':
            tasks.push(() => runABPairTest(testDef, target, slug));
            break;
          case 'deterministic':
          default:
            tasks.push(() => runDeterministicTest(testDef, target, slug));
          }
        }

        // Run with concurrency limit
        const rawResults = await Promise.all(
          tasks.map((task) => concurrencyLimit(task)),
        );

        return rawResults.filter(Boolean);
      },

      /**
       * Get prompts for a specific mode (or legacy catalog).
       */
      getPrompts(modes) {
        const tests = selectTests(modes);
        return tests.map((t) => ({
          id: t.id,
          group: t.group,
          category: t.category,
          prompt: t.probe,
          evaluator: t.evaluator,
        }));
      },

      /**
       * Get test count for mode(s).
       */
      getTestCount(modes) {
        return selectTests(modes).length;
      },

      /**
       * Get counts by mode.
       */
      getCounts() {
        return {
          legacy: legacyTests.length,
          deterministic: extDeterministic.length,
          security: extSecurity.length,
          llmJudged: legacyTests.filter(
            (t) => t.evaluator === 'llm-judge' || t.evaluator === 'ab-pair',
          ).length,
          total: extDeterministic.length + extSecurity.length
            + legacyTests.filter(
              (t) => t.evaluator === 'llm-judge' || t.evaluator === 'ab-pair',
            ).length,
        };
      },

      getLegacyIdMap() {
        return legacyCatalog.LEGACY_ID_MAP || {};
      },
    };
  };
})()
