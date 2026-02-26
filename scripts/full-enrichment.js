'use strict';

/**
 * Full Enrichment Pipeline — Re-scan + Re-score ALL registry tools.
 *
 * Phase 1: Reset evidence → classified
 * Phase 2: Passive scan (fetch websites, no API keys needed)
 * Phase 3: Evidence analyzer → Registry scorer → Score validator
 * Phase 4: Provider correlation + percentiles (batch)
 *
 * Usage:
 *   node scripts/full-enrichment.js [--dry-run] [--skip-scan] [--batch 50] [--offset 0] [--validate]
 *
 * Archive preserved in "RegistryTool_archive_v1" table.
 */

// Load .env before anything else
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
const cheerio = require('cheerio');
const dbConfig = require('../app/config/database.js');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = {
    dryRun: false,
    skipScan: false,
    skipReset: false,
    batch: 50,
    offset: 0,
    validate: false,
    concurrency: 5,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--skip-scan') opts.skipScan = true;
    else if (args[i] === '--skip-reset') opts.skipReset = true;
    else if (args[i] === '--validate') opts.validate = true;
    else if (args[i] === '--batch' && args[i + 1]) opts.batch = parseInt(args[++i], 10);
    else if (args[i] === '--offset' && args[i + 1]) opts.offset = parseInt(args[++i], 10);
    else if (args[i] === '--concurrency' && args[i + 1]) opts.concurrency = parseInt(args[++i], 10);
  }
  return opts;
};

const loadSandboxModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  const opts = parseArgs();
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════');
  console.log('  FULL ENRICHMENT PIPELINE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode:        ${opts.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Batch size:  ${opts.batch}`);
  console.log(`  Offset:      ${opts.offset}`);
  console.log(`  Concurrency: ${opts.concurrency}`);
  console.log(`  Skip scan:   ${opts.skipScan}`);
  console.log(`  Skip reset:  ${opts.skipReset}`);
  console.log(`  Validate:    ${opts.validate}`);
  console.log('');

  const pool = new pg.Pool(dbConfig);

  try {
    // ── Load domain modules ────────────────────────────────────────
    const domainDir = path.join(__dirname, '../app/domain/registry');
    const configDir = path.join(__dirname, '../app/config');

    const enrichmentConfig = require(path.join(configDir, 'enrichment.js'));
    const llmModelsConfig = require(path.join(configDir, 'llm-models.js'));

    const scannerFactory = loadSandboxModule(path.join(domainDir, 'passive-scanner.js'));
    const analyzerFactory = loadSandboxModule(path.join(domainDir, 'evidence-analyzer.js'));
    const scorerFactory = loadSandboxModule(path.join(domainDir, 'registry-scorer.js'));

    // Fast scan config: 5 req/sec (vs 2 default), we're in a batch script
    const scanner = scannerFactory({
      fetch: globalThis.fetch,
      cheerio,
      config: {
        enrichment: {
          passiveScanner: {
            ...enrichmentConfig.passiveScanner,
            ratePerSec: 5,
          },
        },
      },
      console,
    });

    const analyzer = analyzerFactory({ db: pool });
    const scorer = scorerFactory({ db: pool });

    let validatorInstance = null;
    if (opts.validate) {
      const validatorFactory = loadSandboxModule(path.join(domainDir, 'score-validator.js'));
      validatorInstance = validatorFactory({ db: pool });
    }

    // ── Phase 1: Reset ─────────────────────────────────────────────
    if (!opts.skipReset && !opts.dryRun) {
      console.log('Phase 1: Resetting automated data...');
      await pool.query(`
        UPDATE "RegistryTool"
        SET evidence = '{}'::jsonb,
            level = 'classified'
        WHERE active = true
      `);
      const countRes = await pool.query(`SELECT COUNT(*) as c FROM "RegistryTool" WHERE active = true`);
      console.log(`  Reset ${countRes.rows[0].c} tools to classified + empty evidence`);
      console.log(`  Archive preserved in "RegistryTool_archive_v1"\n`);
    } else if (opts.skipReset) {
      console.log('Phase 1: SKIPPED (--skip-reset)\n');
    }

    // ── Phase 2: Passive Scan ──────────────────────────────────────
    if (!opts.skipScan) {
      console.log('Phase 2: Passive scanning websites...');

      const totalRes = await pool.query(
        `SELECT COUNT(*) as c FROM "RegistryTool"
         WHERE active = true AND website IS NOT NULL AND website != ''`
      );
      const totalToScan = parseInt(totalRes.rows[0].c, 10);
      console.log(`  Tools with websites: ${totalToScan}`);
      console.log(`  Starting from offset: ${opts.offset}`);
      console.log('');

      let scanned = 0;
      let scanFailed = 0;
      let noWebsite = 0;
      let batchNum = 0;

      while (true) {
        const currentOffset = opts.offset + batchNum * opts.batch;
        const batchRes = await pool.query(
          `SELECT "registryToolId", slug, name, website, categories, provider
           FROM "RegistryTool"
           WHERE active = true AND website IS NOT NULL AND website != ''
           ORDER BY "registryToolId"
           LIMIT $1 OFFSET $2`,
          [opts.batch, currentOffset]
        );

        if (batchRes.rows.length === 0) break;

        console.log(`  Batch ${batchNum + 1}: tools ${currentOffset + 1}–${currentOffset + batchRes.rows.length} of ${totalToScan}`);

        // Process with concurrency control
        const queue = [...batchRes.rows];
        const running = [];

        const processOne = async (tool) => {
          try {
            const result = await scanner.scan(tool);
            if (result && !opts.dryRun) {
              await pool.query(
                `UPDATE "RegistryTool"
                 SET evidence = $1::jsonb, level = 'scanned'
                 WHERE slug = $2`,
                [JSON.stringify({ passive_scan: result }), tool.slug]
              );
            }
            scanned++;
            if (scanned % 100 === 0) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
              const rate = (scanned / (elapsed / 60)).toFixed(1);
              console.log(`    ✓ ${scanned}/${totalToScan} scanned (${rate}/min, ${elapsed}s elapsed)`);
            }
          } catch (err) {
            scanFailed++;
            if (scanFailed <= 20) {
              console.error(`    ✗ ${tool.slug}: ${err.message}`);
            }
          }
        };

        for (const tool of queue) {
          if (running.length >= opts.concurrency) {
            await Promise.race(running);
          }
          const p = processOne(tool).then(() => {
            running.splice(running.indexOf(p), 1);
          });
          running.push(p);
        }
        await Promise.all(running);

        batchNum++;
      }

      console.log(`\n  Phase 2 complete: ${scanned} scanned, ${scanFailed} failed\n`);
    } else {
      console.log('Phase 2: SKIPPED (--skip-scan)\n');
    }

    // ── Phase 3: Evidence Analysis + Scoring ───────────────────────
    console.log('Phase 3: Evidence analysis + scoring...');

    const allToolsRes = await pool.query(
      `SELECT "registryToolId", slug, name, provider, "riskLevel",
              level, assessments, evidence, categories
       FROM "RegistryTool"
       WHERE active = true
       ORDER BY slug`
    );
    const allTools = allToolsRes.rows;
    console.log(`  Loaded ${allTools.length} tools for scoring`);

    // Parse JSON fields
    for (const tool of allTools) {
      if (typeof tool.evidence === 'string') {
        try { tool.evidence = JSON.parse(tool.evidence); } catch { tool.evidence = {}; }
      }
      if (typeof tool.assessments === 'string') {
        try { tool.assessments = JSON.parse(tool.assessments); } catch { tool.assessments = {}; }
      }
      tool.evidence = tool.evidence || {};
      tool.assessments = tool.assessments || {};
    }

    // Layer 1.5: Provider correlation (batch — inheritable signals)
    const correlations = analyzer.correlateProvider(allTools);
    const correlatedCount = Object.keys(correlations).length;
    console.log(`  Provider correlation: ${correlatedCount} tools received inherited signals`);

    // Pass 1: Analyze all tools to collect evidence-derived obligations
    console.log('  Pass 1: Evidence analysis...');
    const toolAnalysisMap = {};
    for (const tool of allTools) {
      const enriched = analyzer.analyze(tool);

      // Apply inherited signal confidence reduction
      const correlation = correlations[tool.slug] || null;
      if (correlation && correlation.inheritedSignals) {
        for (const [, derived] of Object.entries(enriched.derivedObligations)) {
          const signals = derived.signals || [];
          if (derived.source === 'passive_scan' && correlation.inheritedSignals.some((s) =>
            signals.some((ds) => ds.includes(s.split('.')[0])))) {
            derived.confidence = (derived.confidence || 0.5) * correlation.confidenceMultiplier;
            derived.evidence_summary = `[INHERITED from ${correlation.referenceToolSlug}] ${derived.evidence_summary || ''}`;
          }
        }
      }

      let providerName = 'Unknown';
      if (tool.provider) {
        if (typeof tool.provider === 'string') {
          try { providerName = JSON.parse(tool.provider).name || 'Unknown'; } catch { providerName = tool.provider; }
        } else {
          providerName = tool.provider.name || 'Unknown';
        }
      }

      toolAnalysisMap[tool.slug] = { enriched, providerName, correlation };
    }

    // Pass 1.5: Correlate obligations across provider family
    const oblCorrelations = analyzer.correlateObligations(toolAnalysisMap);
    const oblCorrelatedCount = Object.keys(oblCorrelations).length;
    console.log(`  Obligation correlation: ${oblCorrelatedCount} tools received inherited obligations`);

    // Merge inherited obligations into enriched data
    for (const [slug, oblCorr] of Object.entries(oblCorrelations)) {
      const entry = toolAnalysisMap[slug];
      if (!entry) continue;
      for (const [oblId, inherited] of Object.entries(oblCorr.inheritedObligations)) {
        if (!entry.enriched.derivedObligations[oblId]) {
          entry.enriched.derivedObligations[oblId] = inherited;
        }
      }
    }

    // Pass 2: Scoring
    console.log('  Pass 2: Scoring...');
    let scored = 0;
    let skippedScore = 0;
    const scoredTools = [];
    const zoneStats = { red: 0, yellow: 0, green: 0 };
    const maturityStats = { unaware: 0, aware: 0, implementing: 0, compliant: 0, exemplary: 0 };
    let totalConfidence = 0;

    for (const tool of allTools) {
      const entry = toolAnalysisMap[tool.slug] || {};
      const enriched = entry.enriched || analyzer.analyze(tool);
      const correlation = entry.correlation || correlations[tool.slug] || null;

      // Layer 2-3: Scoring
      const scoreResult = await scorer.calculate(tool, enriched, correlation);

      if (scoreResult.score === null) {
        skippedScore++;
        continue;
      }

      // Update DB
      if (!opts.dryRun) {
        const scoring = { ...scoreResult };
        delete scoring.obligationDetails; // Too large to store per-tool
        await pool.query(
          `UPDATE "RegistryTool"
           SET assessments = jsonb_set(
             jsonb_set(
               jsonb_set(
                 jsonb_set(
                   COALESCE(assessments, '{}'::jsonb),
                   '{eu-ai-act,score}',
                   $1::jsonb
                 ),
                 '{eu-ai-act,scoring}',
                 $2::jsonb
               ),
               '{eu-ai-act,transparencyGrade}',
               $3::jsonb
             ),
             '{eu-ai-act,coverage}',
             $4::jsonb
           )
           WHERE slug = $5`,
          [
            JSON.stringify(scoreResult.score),
            JSON.stringify(scoring),
            JSON.stringify(scoreResult.transparencyGrade),
            JSON.stringify(scoreResult.coverage),
            tool.slug,
          ]
        );
      }

      tool._score = scoreResult.score;
      tool._scoring = scoreResult;
      scoredTools.push(tool);
      scored++;

      zoneStats[scoreResult.zone]++;
      maturityStats[scoreResult.maturity.criteria]++;
      totalConfidence += scoreResult.confidence;

      if (scored % 500 === 0) {
        console.log(`  Progress: ${scored}/${allTools.length}`);
      }
    }

    // ── Phase 4: Percentiles ───────────────────────────────────────
    console.log('\nPhase 4: Computing percentiles...');
    if (scoredTools.length > 0) {
      const percentiles = scorer.computePercentiles(scoredTools);

      if (!opts.dryRun) {
        let pUpdated = 0;
        for (const tool of scoredTools) {
          const p = percentiles[tool.slug];
          if (!p) continue;
          await pool.query(
            `UPDATE "RegistryTool"
             SET assessments = jsonb_set(
               COALESCE(assessments, '{}'::jsonb),
               '{eu-ai-act,scoring,percentiles}',
               $1::jsonb
             )
             WHERE slug = $2`,
            [JSON.stringify(p), tool.slug]
          );
          pUpdated++;
        }
        console.log(`  Percentiles written for ${pUpdated} tools`);
      }
    }

    // ── Summary ────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${'═'.repeat(60)}`);
    console.log('RESULTS');
    console.log('═'.repeat(60));
    console.log(`  Total tools:   ${allTools.length}`);
    console.log(`  Scored:        ${scored}`);
    console.log(`  Skipped:       ${skippedScore} (no assessment/obligations)`);
    console.log(`  Correlated:    ${correlatedCount}`);
    console.log(`  Time:          ${elapsed}s`);

    console.log(`\n  Zones:`);
    console.log(`    Red (<50):     ${zoneStats.red}`);
    console.log(`    Yellow (50-79): ${zoneStats.yellow}`);
    console.log(`    Green (80+):   ${zoneStats.green}`);

    console.log(`\n  Maturity:`);
    for (const [key, count] of Object.entries(maturityStats)) {
      if (count > 0) console.log(`    ${key}: ${count}`);
    }

    if (scored > 0) {
      console.log(`\n  Avg Confidence: ${(totalConfidence / scored).toFixed(3)}`);
    }

    // Score distribution
    const scores = scoredTools.map((t) => t._score).filter((s) => s != null);
    if (scores.length > 0) {
      scores.sort((a, b) => a - b);
      const p10 = scores[Math.floor(scores.length * 0.1)];
      const p25 = scores[Math.floor(scores.length * 0.25)];
      const p50 = scores[Math.floor(scores.length * 0.5)];
      const p75 = scores[Math.floor(scores.length * 0.75)];
      const p90 = scores[Math.floor(scores.length * 0.9)];
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      console.log(`\n  Score Distribution:`);
      console.log(`    Min:  ${scores[0]}`);
      console.log(`    P10:  ${p10}`);
      console.log(`    P25:  ${p25}`);
      console.log(`    P50:  ${p50} (median)`);
      console.log(`    P75:  ${p75}`);
      console.log(`    P90:  ${p90}`);
      console.log(`    Max:  ${scores[scores.length - 1]}`);
      console.log(`    Avg:  ${avg}`);
    }

    // ── Validation ─────────────────────────────────────────────────
    if (opts.validate && validatorInstance && scoredTools.length > 0) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log('VALIDATION');
      console.log('─'.repeat(60));
      const report = await validatorInstance.validate(scoredTools);
      console.log(`  Valid:    ${report.valid}`);
      console.log(`  Errors:   ${report.errors.length}`);
      console.log(`  Warnings: ${report.warnings.length}`);
      if (report.errors.length > 0) {
        console.log('\n  ERRORS:');
        for (const err of report.errors.slice(0, 20)) {
          console.log(`    ${err}`);
        }
      }
      if (report.warnings.length > 0) {
        console.log('\n  WARNINGS (first 30):');
        for (const warn of report.warnings.slice(0, 30)) {
          console.log(`    ${warn}`);
        }
        if (report.warnings.length > 30) {
          console.log(`    ... and ${report.warnings.length - 30} more`);
        }
      }
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(opts.dryRun ? '  DRY RUN — no changes written' : '  DONE — all changes saved');
    console.log('═'.repeat(60));

  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error('Full enrichment failed:', err);
  process.exit(1);
});
