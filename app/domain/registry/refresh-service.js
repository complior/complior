/**
 * Registry Refresh Service
 *
 * Simplified Wave 3 enrichment pipeline for AI Registry tools.
 *
 * Full implementation would include:
 * - Passive scanning (GitHub stats, web search, privacy policy detection)
 * - OpenRouter LLM testing
 * - Media content testing
 * - Comprehensive scoring algorithm
 *
 * This is a placeholder that demonstrates the infrastructure.
 */

({
  /**
   * Refresh classified tools with enrichment data
   * @param {Object} context - Sandbox context { db, console, config }
   * @returns {Object} Results { updated, failed, total }
   */
  async refreshClassifiedTools({ db, console, config }) {
    console.log('🔄 Starting registry refresh...');

    try {
      // 1. Fetch classified tools (need enrichment)
      const limit = config?.registry?.refreshBatchSize || 100;

      const tools = await db.query(
        `SELECT "registryToolId", slug, name, website, categories
         FROM "RegistryTool"
         WHERE level = 'classified'
         ORDER BY "priorityScore" DESC
         LIMIT $1`,
        [limit]
      );

      if (tools.length === 0) {
        console.log('✅ No classified tools to refresh');
        return { updated: 0, failed: 0, total: 0 };
      }

      console.log(`📊 Found ${tools.length} classified tools to enrich`);

      let updated = 0;
      let failed = 0;

      // 2. Process each tool
      for (const tool of tools) {
        try {
          // Placeholder enrichment logic
          // In production, this would call passive-scan, run-tests, etc.
          const evidence = await this._enrichTool(tool, { console });

          // 3. Update database
          await db.query(
            `UPDATE "RegistryTool"
             SET
               evidence = $1,
               level = 'scanned'
             WHERE slug = $2`,
            [JSON.stringify(evidence), tool.slug]
          );

          updated++;

          if (updated % 10 === 0) {
            console.log(`  Progress: ${updated}/${tools.length}`);
          }
        } catch (error) {
          console.error(`  ✗ Failed to enrich ${tool.slug}:`, error.message);
          failed++;
        }
      }

      console.log(`✅ Registry refresh complete: ${updated} updated, ${failed} failed`);

      return {
        updated,
        failed,
        total: tools.length,
      };
    } catch (error) {
      console.error('❌ Registry refresh failed:', error);
      throw error;
    }
  },

  /**
   * Enrich detectionPatterns for tools missing them.
   *
   * Uses category-to-pattern heuristics for tools where
   * detectionPatterns is NULL or empty.
   *
   * @param {Object} context - Sandbox context { db, console, config }
   * @returns {Object} Results { updated, skipped, total }
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
      const patterns = this._buildPatternsFromCategory(tool);

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

  /**
   * Build minimal detection patterns from tool category.
   * Returns null if no heuristic applies.
   * @private
   */
  _buildPatternsFromCategory(tool) {
    // Only env_vars heuristic is safe to derive without LLM
    // Real enrichment will be done by the LLM-based stage (future sprint)
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
  },

  /**
   * Enrich a single tool (placeholder)
   *
   * In production, this would:
   * 1. Scan tool website for privacy policy, terms, disclosure
   * 2. Check GitHub for repo stats (if open source)
   * 3. Run LLM tests via OpenRouter (if accessible)
   * 4. Test media content handling
   * 5. Calculate comprehensive score
   *
   * @private
   */
  async _enrichTool(tool, { console }) {
    // Placeholder evidence structure
    const evidence = {
      passive_scan: {
        disclosure: null,
        privacy_policy: null,
        terms_of_service: null,
        scanned_at: new Date().toISOString(),
      },
      github_stats: null,
      llm_tests: null,
      media_tests: null,
      enriched_at: new Date().toISOString(),
    };

    // Simulate enrichment delay
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`  ✓ Enriched: ${tool.slug}`);

    return evidence;
  },
});
