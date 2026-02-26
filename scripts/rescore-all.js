'use strict';

/**
 * Re-score ALL registry tools (Phase 3 + 4 only, no scanning).
 * Processes tools in batches to avoid OOM.
 *
 * Usage:
 *   node --max-old-space-size=4096 scripts/rescore-all.js [--batch 500] [--dry-run]
 */

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

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = { batch: 500, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--batch' && args[i + 1]) opts.batch = parseInt(args[++i], 10);
  }
  return opts;
};

const run = async () => {
  const opts = parseArgs();
  const pool = new pg.Pool(dbConfig);
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════');
  console.log('  RE-SCORE ALL TOOLS (Scoring Engine v3.1)');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode:       ${opts.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Batch size: ${opts.batch}`);
  console.log('');

  try {
    const domainDir = path.join(__dirname, '../app/domain/registry');
    const analyzerFactory = loadSandboxModule(path.join(domainDir, 'evidence-analyzer.js'));
    const scorerFactory = loadSandboxModule(path.join(domainDir, 'registry-scorer.js'));

    const analyzer = analyzerFactory({ db: pool });
    const scorer = scorerFactory({ db: pool });

    // ── Phase 3a: Provider correlation (needs all tools loaded once) ──
    console.log('Phase 3a: Loading tools for provider correlation...');
    const corrRes = await pool.query(
      `SELECT slug, provider, evidence, categories
       FROM "RegistryTool" WHERE active = true ORDER BY slug`
    );
    const corrTools = corrRes.rows.map((t) => {
      if (typeof t.evidence === 'string') {
        try { t.evidence = JSON.parse(t.evidence); } catch { t.evidence = {}; }
      }
      t.evidence = t.evidence || {};
      return t;
    });

    const correlations = analyzer.correlateProvider(corrTools);
    console.log(`  Provider correlation: ${Object.keys(correlations).length} tools received inherited signals`);

    // Free memory
    corrRes.rows.length = 0;
    corrTools.length = 0;
    if (global.gc) global.gc();

    // ── Phase 3b: 2-pass analysis + scoring ──
    console.log('\nPhase 3b: Loading all tools for 2-pass analysis...');
    const allToolsRes = await pool.query(
      `SELECT "registryToolId", slug, name, provider, "riskLevel",
              level, assessments, evidence, categories
       FROM "RegistryTool"
       WHERE active = true
       ORDER BY slug`
    );
    const allTools = allToolsRes.rows;
    const totalTools = allTools.length;
    console.log(`  Total tools: ${totalTools}`);

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

    // Pass 1: Evidence analysis for all tools
    console.log('  Pass 1: Evidence analysis...');
    const toolAnalysisMap = {};
    for (const tool of allTools) {
      const enriched = analyzer.analyze(tool);

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
    let skipped = 0;
    const zoneStats = { red: 0, yellow: 0, green: 0 };
    const maturityStats = {};
    let totalConfidence = 0;
    const allScores = [];

    for (const tool of allTools) {
      const entry = toolAnalysisMap[tool.slug] || {};
      const enriched = entry.enriched || analyzer.analyze(tool);
      const correlation = entry.correlation || correlations[tool.slug] || null;

      const scoreResult = await scorer.calculate(tool, enriched, correlation);

      if (scoreResult.score === null) {
        skipped++;
        continue;
      }

      if (!opts.dryRun) {
        const scoring = { ...scoreResult };
        delete scoring.obligationDetails;
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
      scored++;
      allScores.push(scoreResult.score);
      zoneStats[scoreResult.zone]++;
      maturityStats[scoreResult.maturity.criteria] = (maturityStats[scoreResult.maturity.criteria] || 0) + 1;
      totalConfidence += scoreResult.confidence;

      if (scored % 500 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`  ${scored}/${totalTools} scored (${elapsed}s elapsed)`);
      }
    }

    // ── Phase 4: Percentiles ──
    console.log('\nPhase 4: Computing percentiles...');
    const scoredToolsForPercentiles = allTools.filter((t) => t._score != null);
    if (scoredToolsForPercentiles.length > 0 && !opts.dryRun) {
      const percentiles = scorer.computePercentiles(scoredToolsForPercentiles);
      let pUpdated = 0;

      for (const tool of scoredToolsForPercentiles) {
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

    // ── Summary ──
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(60)}`);
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`  Total tools: ${totalTools}`);
    console.log(`  Scored:      ${scored}`);
    console.log(`  Skipped:     ${skipped}`);
    console.log(`  Time:        ${elapsed}s`);

    console.log(`\n  Zones:`);
    console.log(`    Red (<50):      ${zoneStats.red}`);
    console.log(`    Yellow (50-79): ${zoneStats.yellow}`);
    console.log(`    Green (80+):    ${zoneStats.green}`);

    console.log(`\n  Maturity:`);
    for (const [key, count] of Object.entries(maturityStats)) {
      if (count > 0) console.log(`    ${key}: ${count}`);
    }

    if (scored > 0) {
      console.log(`\n  Avg Confidence: ${(totalConfidence / scored).toFixed(3)}`);
    }

    if (allScores.length > 0) {
      allScores.sort((a, b) => a - b);
      const p10 = allScores[Math.floor(allScores.length * 0.1)];
      const p25 = allScores[Math.floor(allScores.length * 0.25)];
      const p50 = allScores[Math.floor(allScores.length * 0.5)];
      const p75 = allScores[Math.floor(allScores.length * 0.75)];
      const p90 = allScores[Math.floor(allScores.length * 0.9)];
      const avg = (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
      console.log(`\n  Score Distribution:`);
      console.log(`    Min:  ${allScores[0]}`);
      console.log(`    P10:  ${p10}`);
      console.log(`    P25:  ${p25}`);
      console.log(`    P50:  ${p50} (median)`);
      console.log(`    P75:  ${p75}`);
      console.log(`    P90:  ${p90}`);
      console.log(`    Max:  ${allScores[allScores.length - 1]}`);
      console.log(`    Avg:  ${avg}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(opts.dryRun ? '  DRY RUN — no changes written' : '  DONE — all changes saved');
    console.log('='.repeat(60));

  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error('Re-score failed:', err);
  process.exit(1);
});
