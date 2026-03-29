/**
 * LLM Tester v3 — Catalog-driven behavioral test suite for LLM models.
 *
 * Runs ~80 tests from registry-test-catalog across 8 categories.
 * Three evaluator types: deterministic (regex), llm-judge, ab-pair.
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

    const catalog = testCatalog || { CATALOG: [], LEGACY_ID_MAP: {} };
    const tests = catalog.CATALOG || [];
    const legacyIdMap = catalog.LEGACY_ID_MAP || {};

    // Reverse legacy map: new ID → old ID
    const reverseLegacyMap = {};
    for (const [oldId, newId] of Object.entries(legacyIdMap)) {
      reverseLegacyMap[newId] = oldId;
    }

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

    // ── Evaluators ──────────────────────────────────────────────

    const evaluateDeterministic = (response, testDef) => {
      const passMatch = testDef.passPatterns.length === 0
        || testDef.passPatterns.some((re) => re.test(response));
      const failMatch = testDef.failPatterns.length > 0
        && testDef.failPatterns.some((re) => re.test(response));
      return passMatch && !failMatch;
    };

    const runDeterministicTest = async (testDef, modelId, slug) => {
      try {
        const response = await callOpenRouter(modelId, testDef.probe);
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

    const runJudgeTest = async (testDef, modelId, slug) => {
      if (!judge || !llmJudgeEnabled) {
        return runDeterministicTest(testDef, modelId, slug);
      }

      try {
        const response = await callOpenRouter(modelId, testDef.probe);
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

    const runABPairTest = async (testDef, modelId, slug) => {
      if (!judge || !abBiasEnabled) {
        // Fallback: just run as deterministic
        return runDeterministicTest(testDef, modelId, slug);
      }

      try {
        // Send both probes
        const [responseA, responseB] = await Promise.all([
          callOpenRouter(modelId, testDef.probe),
          callOpenRouter(modelId, testDef.pairProbe),
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

    // ── Main Test Runner ────────────────────────────────────────

    return {
      async test(tool, modelId) {
        if (!modelId) {
          return null;
        }

        const slug = tool.slug || tool.name || 'unknown';
        const tasks = [];

        for (const testDef of tests) {
          switch (testDef.evaluator) {
          case 'deterministic':
            tasks.push(() => runDeterministicTest(testDef, modelId, slug));
            break;
          case 'llm-judge':
            tasks.push(() => runJudgeTest(testDef, modelId, slug));
            break;
          case 'ab-pair':
            tasks.push(() => runABPairTest(testDef, modelId, slug));
            break;
          default:
            tasks.push(() => runDeterministicTest(testDef, modelId, slug));
          }
        }

        // Run with concurrency limit
        const rawResults = await Promise.all(
          tasks.map((task) => concurrencyLimit(task)),
        );

        // Filter out null results (b-variant A/B pairs)
        return rawResults.filter(Boolean);
      },

      getPrompts() {
        return tests.map((t) => ({
          id: t.id,
          group: t.group,
          category: t.category,
          prompt: t.probe,
          evaluator: t.evaluator,
        }));
      },

      getTestCount() {
        return tests.length;
      },

      getLegacyIdMap() {
        return legacyIdMap;
      },
    };
  };
})()
