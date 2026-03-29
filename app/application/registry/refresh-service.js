/**
 * Registry Refresh Service — Enrichment Pipeline Orchestrator.
 *
 * Coordinates 3 evidence collection modules:
 * - passive-scanner: website scraping for disclosure, privacy, trust signals
 * - llm-tester: behavioral tests via OpenRouter for LLM models
 * - media-tester: C2PA/watermark detection for media generators
 *
 * After enrichment, re-scores via evidence-analyzer + registry-scorer.
 *
 * VM sandbox compatible — IIFE, no require().
 */

(() => {
  /**
   * Build minimal detection patterns from tool category.
   * Returns null if no heuristic applies.
   */
  const buildPatternsFromCategory = (tool) => {
    const category = tool.category;

    const envVarsByCategory = {
      recruitment: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
      analytics: ['OPENAI_API_KEY'],
      customer_service: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
      marketing: ['OPENAI_API_KEY', 'JASPER_API_KEY', 'COPY_AI_API_KEY'],
      medical: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'HF_TOKEN'],
      legal: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
      finance: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
      education: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
      coding: ['OPENAI_API_KEY', 'GITHUB_TOKEN', 'ANTHROPIC_API_KEY'],
      writing: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    };

    if (!category || !envVarsByCategory[category]) {
      return null;
    }

    return {
      npm: [],
      pip: [],
      imports: [],
      env_vars: envVarsByCategory[category],
      api_calls: [],
      domains: [],
    };
  };

  return {
    /**
     * Refresh classified tools with real enrichment data.
     *
     * @param {Object} ctx - {
     *   db, console, config,
     *   passiveScanner, llmTester, mediaTester,
     *   evidenceAnalyzer, scorer
     * }
     */
    async refreshClassifiedTools({
      db, console, config,
      passiveScanner, llmTester, mediaTester,
      evidenceAnalyzer, scorer,
    }) {
      console.log('🔄 Starting registry refresh (enrichment pipeline)...');

      const features = (config && config.enrichment && config.enrichment.features) || {};
      const modelMap = (config && config.llmModels && config.llmModels.MODEL_MAP) || {};
      const mediaCats = (config && config.llmModels && config.llmModels.MEDIA_CATEGORIES) || [];
      const mediaApiMap = (config && config.llmModels && config.llmModels.MEDIA_API_MAP) || {};

      try {
        const limit = (config && config.registry && config.registry.refreshBatchSize) || 100;
        const refreshIntervalDays = (config && config.registry && config.registry.refreshIntervalDays) || 30;

        // Fetch tools prioritizing: verified (freshness re-scan), scanned, classified
        // Smart refresh: skip tools scored within refreshIntervalDays unless classified (never scored)
        const tools = await db.query(
          `SELECT "registryToolId", slug, name, website, categories,
                  level, evidence, assessments, provider, "priorityScore"
           FROM "RegistryTool"
           WHERE active = true
             AND level IN ('classified', 'scanned', 'verified')
             AND (
               level = 'classified'
               OR assessments->'eu-ai-act'->>'scored_at' IS NULL
               OR (assessments->'eu-ai-act'->>'scored_at')::timestamptz
                  < NOW() - ($2 || ' days')::interval
             )
           ORDER BY
             CASE level
               WHEN 'classified' THEN 1
               WHEN 'scanned' THEN 2
               WHEN 'verified' THEN 3
             END,
             "priorityScore" DESC
           LIMIT $1`,
          [limit, String(refreshIntervalDays)]
        );

        if (tools.rows.length === 0) {
          console.log('✅ No tools to refresh');
          return { updated: 0, failed: 0, skipped: 0, total: 0 };
        }

        console.log(`📊 Found ${tools.rows.length} tools to enrich`);

        let updated = 0;
        let failed = 0;
        let skipped = 0;

        for (const tool of tools.rows) {
          try {
            // Parse existing evidence if stored as string
            let existingEvidence = tool.evidence || {};
            if (typeof existingEvidence === 'string') {
              try {
                existingEvidence = JSON.parse(existingEvidence);
              } catch { existingEvidence = {}; }
            }

            const evidence = { ...existingEvidence };
            let enriched = false;

            // 1. Passive scan (if tool has website and feature enabled)
            if (features.passiveScan !== false && passiveScanner && tool.website) {
              try {
                const scanResult = await passiveScanner.scan(tool);
                if (scanResult) {
                  evidence.passive_scan = scanResult;
                  enriched = true;
                  console.log(`  ✓ Passive scan: ${tool.slug} (${scanResult.pages_fetched} pages)`);
                }
              } catch (err) {
                console.error(`  ✗ Passive scan failed for ${tool.slug}: ${err.message}`);
              }
            }

            // 2. LLM test (if tool slug in MODEL_MAP and feature enabled)
            if (features.llmTests !== false && llmTester && modelMap[tool.slug]) {
              try {
                const testResults = await llmTester.test(tool, modelMap[tool.slug]);
                if (testResults && testResults.length > 0) {
                  evidence.llm_tests = testResults;
                  enriched = true;
                  const passed = testResults.filter((t) => t.passed).length;
                  console.log(`  ✓ LLM tests: ${tool.slug} (${passed}/${testResults.length} passed)`);
                }
              } catch (err) {
                console.error(`  ✗ LLM tests failed for ${tool.slug}: ${err.message}`);
              }
            }

            // 3. Media test (if tool has media categories and feature enabled)
            const toolCats = tool.categories || [];
            const isMediaTool = toolCats.some((c) => mediaCats.includes(c));

            if (features.mediaTests !== false && mediaTester && isMediaTool) {
              const apiConfig = mediaApiMap[tool.slug] || null;
              if (apiConfig && apiConfig.type !== 'none') {
                try {
                  const mediaResults = await mediaTester.test(tool, apiConfig);
                  if (mediaResults && mediaResults.length > 0) {
                    evidence.media_tests = mediaResults;
                    enriched = true;
                    console.log(`  ✓ Media tests: ${tool.slug} (${mediaResults.length} tests)`);
                  }
                } catch (err) {
                  console.error(`  ✗ Media tests failed for ${tool.slug}: ${err.message}`);
                }
              }
            }

            if (!enriched) {
              skipped++;
              continue;
            }

            evidence.enriched_at = new Date().toISOString();

            // 4. Determine new level
            let newLevel = tool.level;
            const hasPassiveScan = Boolean(evidence.passive_scan);
            const hasLlmTests = evidence.llm_tests && evidence.llm_tests.length > 0;
            const hasMediaTests = evidence.media_tests && evidence.media_tests.length > 0;

            if (hasLlmTests || hasMediaTests) {
              newLevel = 'verified';
            } else if (hasPassiveScan && newLevel === 'classified') {
              newLevel = 'scanned';
            }

            // 5. Update evidence in DB
            await db.query(
              `UPDATE "RegistryTool"
               SET evidence = $1, level = $2
               WHERE slug = $3`,
              [JSON.stringify(evidence), newLevel, tool.slug]
            );

            // 6. Re-score with evidence-analyzer + scorer
            if (evidenceAnalyzer && scorer) {
              try {
                const fullTool = await db.query(
                  'SELECT * FROM "RegistryTool" WHERE slug = $1',
                  [tool.slug],
                );
                if (fullTool.rows.length > 0) {
                  const toolData = fullTool.rows[0];
                  // Parse evidence if needed
                  if (typeof toolData.evidence === 'string') {
                    try {
                      toolData.evidence = JSON.parse(toolData.evidence);
                    } catch { /* keep as-is */ }
                  }
                  if (typeof toolData.assessments === 'string') {
                    try {
                      toolData.assessments = JSON.parse(toolData.assessments);
                    } catch { /* keep as-is */ }
                  }

                  const analysisResult = evidenceAnalyzer.analyze(toolData);
                  const scoreResult = await scorer.calculate(toolData, analysisResult);

                  // v3: store score (even null), coverage, transparencyGrade, algorithm
                  const scoreVal = scoreResult.score;
                  const coverageVal = (
                    scoreResult.coverage !== null
                    && scoreResult.coverage !== undefined
                  ) ? scoreResult.coverage : 0;
                  const tGrade = scoreResult.transparencyGrade || null;

                  await db.query(
                    `UPDATE "RegistryTool"
                     SET assessments = jsonb_set(
                       jsonb_set(
                         jsonb_set(
                           jsonb_set(
                             COALESCE(assessments, '{}'::jsonb),
                             '{eu-ai-act,score}',
                             $1::jsonb
                           ),
                           '{eu-ai-act,coverage}',
                           $2::jsonb
                         ),
                         '{eu-ai-act,transparencyGrade}',
                         $3::jsonb
                       ),
                       '{eu-ai-act,scored_at}',
                       $4::jsonb
                     )
                     WHERE slug = $5`,
                    [
                      JSON.stringify(scoreVal),
                      JSON.stringify(coverageVal),
                      JSON.stringify(tGrade),
                      JSON.stringify(new Date().toISOString()),
                      tool.slug,
                    ],
                  );
                }
              } catch (err) {
                console.error(`  ✗ Re-score failed for ${tool.slug}: ${err.message}`);
              }
            }

            updated++;

            if (updated % 10 === 0) {
              console.log(`  Progress: ${updated}/${tools.rows.length}`);
            }
          } catch (error) {
            console.error(`  ✗ Failed to enrich ${tool.slug}:`, error.message);
            failed++;
          }
        }

        console.log(`✅ Registry refresh complete: ${updated} updated, ${failed} failed, ${skipped} skipped`);

        return {
          updated,
          failed,
          skipped,
          total: tools.rows.length,
        };
      } catch (error) {
        console.error('❌ Registry refresh failed:', error);
        throw error;
      }
    },

    /**
     * On-demand refresh for a single tool (e.g., vendor-paid testing).
     * Bypasses freshness check — always re-enriches.
     */
    async refreshTool({
      db, console, config, slug,
      passiveScanner, llmTester, mediaTester,
      evidenceAnalyzer, scorer,
    }) {
      const modelMap = (config && config.llmModels && config.llmModels.MODEL_MAP) || {};
      const mediaCats = (config && config.llmModels && config.llmModels.MEDIA_CATEGORIES) || [];
      const mediaApiMap = (config && config.llmModels && config.llmModels.MEDIA_API_MAP) || {};

      const toolResult = await db.query(
        `SELECT "registryToolId", slug, name, website, categories,
                level, evidence, assessments, provider, "priorityScore"
         FROM "RegistryTool"
         WHERE slug = $1 AND active = true`,
        [slug],
      );

      if (!toolResult.rows || toolResult.rows.length === 0) {
        return { error: 'Tool not found', slug };
      }

      const tool = toolResult.rows[0];
      let existingEvidence = tool.evidence || {};
      if (typeof existingEvidence === 'string') {
        try { existingEvidence = JSON.parse(existingEvidence); } catch { existingEvidence = {}; }
      }

      const evidence = { ...existingEvidence };
      const enrichmentLog = [];

      // 1. Passive scan
      if (passiveScanner && tool.website) {
        try {
          const scanResult = await passiveScanner.scan(tool);
          if (scanResult) {
            evidence.passive_scan = scanResult;
            enrichmentLog.push(`passive_scan: ${scanResult.pages_fetched} pages`);
          }
        } catch (err) {
          enrichmentLog.push(`passive_scan: error — ${err.message}`);
        }
      }

      // 2. LLM tests
      if (llmTester && modelMap[tool.slug]) {
        try {
          const testResults = await llmTester.test(tool, modelMap[tool.slug]);
          if (testResults && testResults.length > 0) {
            evidence.llm_tests = testResults;
            const passed = testResults.filter((t) => t.passed).length;
            enrichmentLog.push(`llm_tests: ${passed}/${testResults.length} passed`);
          }
        } catch (err) {
          enrichmentLog.push(`llm_tests: error — ${err.message}`);
        }
      }

      // 3. Media tests
      const toolCats = tool.categories || [];
      const isMediaTool = toolCats.some((c) => mediaCats.includes(c));
      if (mediaTester && isMediaTool) {
        const apiConfig = mediaApiMap[tool.slug] || null;
        if (apiConfig && apiConfig.type !== 'none') {
          try {
            const mediaResults = await mediaTester.test(tool, apiConfig);
            if (mediaResults && mediaResults.length > 0) {
              evidence.media_tests = mediaResults;
              enrichmentLog.push(`media_tests: ${mediaResults.length} tests`);
            }
          } catch (err) {
            enrichmentLog.push(`media_tests: error — ${err.message}`);
          }
        }
      }

      evidence.enriched_at = new Date().toISOString();

      // Determine new level
      let newLevel = tool.level;
      const hasLlmTests = evidence.llm_tests && evidence.llm_tests.length > 0;
      const hasMediaTests = evidence.media_tests && evidence.media_tests.length > 0;
      if (hasLlmTests || hasMediaTests) newLevel = 'verified';
      else if (evidence.passive_scan && newLevel === 'classified') newLevel = 'scanned';

      await db.query(
        `UPDATE "RegistryTool" SET evidence = $1, level = $2 WHERE slug = $3`,
        [JSON.stringify(evidence), newLevel, tool.slug],
      );

      // Re-score
      let scoreResult = null;
      if (evidenceAnalyzer && scorer) {
        try {
          const fullTool = await db.query('SELECT * FROM "RegistryTool" WHERE slug = $1', [tool.slug]);
          if (fullTool.rows.length > 0) {
            const toolData = fullTool.rows[0];
            if (typeof toolData.evidence === 'string') {
              try { toolData.evidence = JSON.parse(toolData.evidence); } catch { /* keep */ }
            }
            if (typeof toolData.assessments === 'string') {
              try { toolData.assessments = JSON.parse(toolData.assessments); } catch { /* keep */ }
            }
            const analysisResult = evidenceAnalyzer.analyze(toolData);
            scoreResult = await scorer.calculate(toolData, analysisResult);

            const scoreVal = scoreResult && scoreResult.score !== undefined ? scoreResult.score : null;
            await db.query(
              `UPDATE "RegistryTool"
               SET assessments = jsonb_set(
                 jsonb_set(
                   COALESCE(assessments, '{}'::jsonb),
                   '{eu-ai-act,score}', $1::jsonb
                 ),
                 '{eu-ai-act,scored_at}', $2::jsonb
               )
               WHERE slug = $3`,
              [JSON.stringify(scoreVal), JSON.stringify(new Date().toISOString()), tool.slug],
            );
          }
        } catch (err) {
          enrichmentLog.push(`scoring: error — ${err.message}`);
        }
      }

      return {
        slug: tool.slug,
        level: newLevel,
        enrichmentLog,
        score: scoreResult ? scoreResult.score : null,
        grade: scoreResult ? scoreResult.grade : null,
      };
    },

    /**
     * Enrich detectionPatterns for tools missing them.
     * (Unchanged from original implementation)
     */
    async enrichDetectionPatterns({ db, console, config }) {
      console.log('🔍 Starting detection pattern enrichment...');

      const batchSize = config?.registry?.enrichBatchSize || 50;

      const tools = await db.query(
        `SELECT "registryToolId", slug, name, category, capabilities, level
         FROM "RegistryTool"
         WHERE ("detectionPatterns" IS NULL OR "detectionPatterns" = 'null'::jsonb)
           AND active = true
           AND level IN ('scanned', 'verified')
         ORDER BY "priorityScore" DESC, level DESC
         LIMIT $1`,
        [batchSize],
      );

      if (tools.rows.length === 0) {
        console.log('✅ No tools need detection enrichment');
        return { updated: 0, skipped: 0, total: 0 };
      }

      console.log(`📊 Found ${tools.rows.length} tools to enrich`);

      let updated = 0;
      let skipped = 0;

      for (const tool of tools.rows) {
        const patterns = buildPatternsFromCategory(tool);

        if (!patterns) {
          skipped++;
          continue;
        }

        await db.query(
          `UPDATE "RegistryTool"
           SET "detectionPatterns" = $1
           WHERE slug = $2`,
          [JSON.stringify(patterns), tool.slug],
        );

        updated++;

        if (updated % 10 === 0) {
          console.log(`  Progress: ${updated}/${tools.rows.length}`);
        }
      }

      console.log(`✅ Detection enrichment done: ${updated} updated, ${skipped} skipped`);
      return { updated, skipped, total: tools.rows.length };
    },
  };
})()
