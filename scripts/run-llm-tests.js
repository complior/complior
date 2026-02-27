'use strict';

/**
 * Run LLM behavioral tests via OpenRouter for all tools in MODEL_MAP.
 * Merges results into existing evidence, re-scores, upgrades level → verified.
 *
 * Usage:
 *   node scripts/run-llm-tests.js [--dry-run]
 */

// Load .env
const dotenvPath = require('node:path').join(__dirname, '../.env');
require('node:fs').readFileSync(dotenvPath, 'utf8').split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const pg = require('pg');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const dbConfig = require('../app/config/database.js');

const loadSandboxModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const dryRun = process.argv.includes('--dry-run');

const run = async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  LLM BEHAVIORAL TESTS via OpenRouter');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

  const pool = new pg.Pool(dbConfig);
  const domainDir = path.join(__dirname, '../app/domain/registry');
  const configDir = path.join(__dirname, '../app/config');

  const enrichmentConfig = require(path.join(configDir, 'enrichment.js'));
  const llmModelsConfig = require(path.join(configDir, 'llm-models.js'));
  const { MODEL_MAP } = llmModelsConfig;

  const apiKey = enrichmentConfig.openRouter.apiKey;
  if (!apiKey) {
    console.error('  ERROR: OPENROUTER_API_KEY not set in .env');
    process.exit(1);
  }
  console.log(`  API Key: ${apiKey.slice(0, 12)}...`);
  console.log(`  Models in MAP: ${Object.keys(MODEL_MAP).length}`);
  console.log(`  Rate limit: ${enrichmentConfig.openRouter.rateLimitPerMin}/min`);
  console.log('');

  try {
    // Load modules
    const testerFactory = loadSandboxModule(path.join(domainDir, 'llm-tester.js'));
    const tester = testerFactory({
      fetch: globalThis.fetch,
      config: { enrichment: enrichmentConfig },
      console,
    });

    const analyzerFactory = loadSandboxModule(path.join(domainDir, 'evidence-analyzer.js'));
    const analyzer = analyzerFactory({ db: pool });

    const scorerFactory = loadSandboxModule(path.join(domainDir, 'registry-scorer.js'));
    const scorer = scorerFactory({ db: pool });

    // Find tools that have a MODEL_MAP entry
    const slugs = Object.keys(MODEL_MAP);
    const placeholders = slugs.map((_, i) => `$${i + 1}`).join(',');
    const toolsRes = await pool.query(
      `SELECT "registryToolId", slug, name, provider, "riskLevel",
              level, assessments, evidence, categories
       FROM "RegistryTool"
       WHERE active = true AND slug IN (${placeholders})
       ORDER BY slug`,
      slugs,
    );

    console.log(`  Found ${toolsRes.rows.length} tools in DB matching MODEL_MAP\n`);

    let tested = 0;
    let failed = 0;
    let skipped = 0;
    const startTime = Date.now();

    for (const tool of toolsRes.rows) {
      const modelId = MODEL_MAP[tool.slug];
      if (!modelId) { skipped++; continue; }

      // Parse existing evidence
      let evidence = tool.evidence || {};
      if (typeof evidence === 'string') {
        try { evidence = JSON.parse(evidence); } catch { evidence = {}; }
      }

      console.log(`  Testing ${tool.slug} → ${modelId}...`);

      try {
        const results = await tester.test(tool, modelId);
        if (!results || results.length === 0) {
          console.log(`    Skipped (no results)`);
          skipped++;
          continue;
        }

        const passed = results.filter((r) => r.passed).length;
        const total = results.length;
        console.log(`    ${passed}/${total} passed`);

        // Merge into evidence
        evidence.llm_tests = results;
        evidence.enriched_at = new Date().toISOString();

        if (!dryRun) {
          // Update evidence + level → verified
          await pool.query(
            `UPDATE "RegistryTool"
             SET evidence = $1::jsonb, level = 'verified'
             WHERE slug = $2`,
            [JSON.stringify(evidence), tool.slug]
          );

          // Re-score
          tool.evidence = evidence;
          if (typeof tool.assessments === 'string') {
            try { tool.assessments = JSON.parse(tool.assessments); } catch { tool.assessments = {}; }
          }

          const enriched = analyzer.analyze(tool);
          const scoreResult = await scorer.calculate(tool, enriched);

          if (scoreResult.score !== null) {
            const scoring = { ...scoreResult };
            delete scoring.obligationDetails;
            await pool.query(
              `UPDATE "RegistryTool"
               SET assessments = jsonb_set(
                 jsonb_set(
                   COALESCE(assessments, '{}'::jsonb),
                   '{eu-ai-act,score}',
                   $1::jsonb
                 ),
                 '{eu-ai-act,scoring}',
                 $2::jsonb
               )
               WHERE slug = $3`,
              [JSON.stringify(scoreResult.score), JSON.stringify(scoring), tool.slug]
            );
            console.log(`    Score: ${scoreResult.score} (${scoreResult.grade}, ${scoreResult.zone})`);
          }
        }

        tested++;
      } catch (err) {
        console.error(`    ERROR: ${err.message}`);
        failed++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${'═'.repeat(55)}`);
    console.log('RESULTS');
    console.log('═'.repeat(55));
    console.log(`  Tested:  ${tested}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Time:    ${elapsed}s`);

    if (!dryRun) {
      // Show updated stats
      const statsRes = await pool.query(`
        SELECT level, COUNT(*) as count
        FROM "RegistryTool" WHERE active = true
        GROUP BY level ORDER BY count DESC
      `);
      console.log(`\n  Level Distribution:`);
      for (const row of statsRes.rows) {
        console.log(`    ${row.level}: ${row.count}`);
      }
    }

    console.log(`\n${'═'.repeat(55)}`);
    console.log(dryRun ? '  DRY RUN — no changes' : '  DONE');
    console.log('═'.repeat(55));

  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error('LLM tests failed:', err);
  process.exit(1);
});
