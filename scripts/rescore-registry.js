'use strict';

/**
 * Batch Re-Score CLI for Registry Tools — v2
 *
 * Usage:
 *   node scripts/rescore-registry.js [--dry-run] [--provider "OpenAI"] [--risk-level gpai] [--validate] [--compare-v1]
 */

const pg = require('pg');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const dbConfig = require('../app/config/database.js');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, provider: null, riskLevel: null, validate: false, compareV1: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--validate') opts.validate = true;
    else if (args[i] === '--compare-v1') opts.compareV1 = true;
    else if (args[i] === '--provider' && args[i + 1]) opts.provider = args[++i];
    else if (args[i] === '--risk-level' && args[i + 1]) opts.riskLevel = args[++i];
  }
  return opts;
};

const loadSandboxModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const run = async () => {
  const opts = parseArgs();
  console.log('Registry Re-Score CLI v3');
  console.log(`  Mode: ${opts.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Algorithm: deterministic-v3`);
  if (opts.provider) console.log(`  Filter: provider = "${opts.provider}"`);
  if (opts.riskLevel) console.log(`  Filter: riskLevel = "${opts.riskLevel}"`);
  if (opts.compareV1) console.log(`  Compare: v1 vs v2 side-by-side`);

  const pool = new pg.Pool(dbConfig);

  try {
    // Load all sandbox modules
    const domainDir = path.join(__dirname, '../app/domain/registry');

    const analyzerFactory = loadSandboxModule(path.join(domainDir, 'evidence-analyzer.js'));
    const analyzer = analyzerFactory({ db: pool });

    const scorerFactory = loadSandboxModule(path.join(domainDir, 'registry-scorer.js'));
    const scorer = scorerFactory({ db: pool });

    let validatorInstance = null;
    if (opts.validate) {
      const validatorFactory = loadSandboxModule(path.join(domainDir, 'score-validator.js'));
      validatorInstance = validatorFactory({ db: pool });
    }

    // Build query with optional filters — include evidence column
    const conditions = ['active = true'];
    const params = [];

    if (opts.provider) {
      params.push(`%${opts.provider}%`);
      conditions.push(`provider::text ILIKE $${params.length}`);
    }
    if (opts.riskLevel) {
      params.push(opts.riskLevel);
      conditions.push(`"riskLevel" = $${params.length}`);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await pool.query(
      `SELECT "registryToolId", slug, name, provider, "riskLevel",
              level, assessments, evidence, categories
       FROM "RegistryTool"
       ${where}
       ORDER BY slug`,
      params,
    );

    const tools = result.rows;
    console.log(`\nFound ${tools.length} tools to score\n`);

    // Layer 1.5: Provider correlation (batch)
    const correlations = analyzer.correlateProvider(tools);
    const correlatedCount = Object.keys(correlations).length;
    if (correlatedCount > 0) {
      console.log(`  Provider correlation: ${correlatedCount} tools received inherited signals\n`);
    }

    let rescored = 0;
    let skipped = 0;
    const scoredTools = [];
    const scoreChanges = [];

    // Zone, maturity, coverage, transparency stats
    const zoneStats = { red: 0, yellow: 0, green: 0 };
    const maturityStats = { unaware: 0, aware: 0, implementing: 0, compliant: 0, exemplary: 0 };
    const coverageStats = { low: 0, medium: 0, high: 0, full: 0 };
    let nullScoreCount = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const tool of tools) {
      // Layer 1: Evidence analysis
      const enriched = analyzer.analyze(tool);

      // Layer 2-3: Scoring with enriched data
      const correlation = correlations[tool.slug] || null;

      // Apply inherited signal confidence reduction
      if (correlation && correlation.inheritedSignals && correlation.inheritedSignals.length > 0) {
        for (const [oblId, derived] of Object.entries(enriched.derivedObligations)) {
          const signals = derived.signals || [];
          if (derived.source === 'passive_scan' && correlation.inheritedSignals.some((s) => signals.some((ds) => ds.includes(s.split('.')[0])))) {
            derived.confidence = (derived.confidence || 0.5) * correlation.confidenceMultiplier;
            derived.evidence_summary = `[INHERITED from ${correlation.referenceToolSlug}] ${derived.evidence_summary || ''}`;
          }
        }
      }

      const scoreResult = await scorer.calculate(tool, enriched, correlation);

      // Skip tools with no data at all; process insufficient_data (store null score + transparency)
      if (scoreResult.score === null && scoreResult.reason !== 'insufficient_data') {
        skipped++;
        continue;
      }

      const oldScore = tool.assessments?.['eu-ai-act']?.score;
      const diff = oldScore !== null && oldScore !== undefined && scoreResult.score !== null
        ? scoreResult.score - oldScore
        : null;

      // Track changes for summary
      scoreChanges.push({
        name: tool.name,
        slug: tool.slug,
        oldScore: oldScore ?? null,
        newScore: scoreResult.score,
        diff: diff,
        grade: scoreResult.grade,
        zone: scoreResult.zone,
        coverage: scoreResult.coverage ?? 0,
        transparencyGrade: scoreResult.transparencyGrade || null,
        maturity: scoreResult.maturity.label,
        confidence: scoreResult.confidence,
      });

      // Zone, maturity, coverage stats (skip null-score tools for zone)
      if (scoreResult.score === null) {
        nullScoreCount++;
      } else if (scoreResult.zone) {
        zoneStats[scoreResult.zone]++;
      }
      maturityStats[scoreResult.maturity.criteria]++;
      if (scoreResult.confidence) {
        totalConfidence += scoreResult.confidence;
        confidenceCount++;
      }
      const cov = scoreResult.coverage ?? 0;
      if (cov === 100) coverageStats.full++;
      else if (cov >= 50) coverageStats.high++;
      else if (cov >= 20) coverageStats.medium++;
      else coverageStats.low++;

      if (opts.dryRun || opts.compareV1) {
        const diffStr = diff !== null ? ` (${diff >= 0 ? '+' : ''}${diff})` : ' (new)';
        const scoreStr = scoreResult.score !== null ? scoreResult.score : 'null';
        const gradeStr = scoreResult.grade || 'n/a';
        const zoneStr = scoreResult.zone || 'n/a';
        const covStr = `cov:${scoreResult.coverage ?? 0}%`;
        const tgStr = `T:${scoreResult.transparencyGrade || 'n/a'}`;
        const line = `  ${tool.name}: ${oldScore ?? 'null'} → ${scoreStr}${diffStr}  [${zoneStr}] ${gradeStr} | ${covStr} ${tgStr} | ${scoreResult.maturity.label}`;
        console.log(line);
      }

      if (!opts.dryRun && !opts.compareV1) {
        // Update assessments with new score + breakdown + coverage + transparency
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
               '{eu-ai-act,coverage}',
               $3::jsonb
             ),
             '{eu-ai-act,transparencyGrade}',
             $4::jsonb
           )
           WHERE slug = $5`,
          [
            JSON.stringify(scoreResult.score),
            JSON.stringify({
              ...scoreResult,
              // Remove redundant obligationDetails from stored data (too large)
              obligationDetails: undefined,
            }),
            JSON.stringify(scoreResult.coverage ?? 0),
            JSON.stringify(scoreResult.transparencyGrade || null),
            tool.slug,
          ],
        );
      }

      // Attach score for validator
      tool._score = scoreResult.score;
      tool._scoring = scoreResult;
      scoredTools.push(tool);
      rescored++;

      if (rescored % 500 === 0) {
        console.log(`  Progress: ${rescored}/${tools.length}`);
      }
    }

    // Summary
    console.log(`\n${'═'.repeat(60)}`);
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Total:     ${tools.length}`);
    console.log(`  Rescored:  ${rescored}`);
    console.log(`  Skipped:   ${skipped}`);
    console.log(`  Correlated: ${correlatedCount}`);

    console.log(`  Null scores: ${nullScoreCount}`);

    console.log(`\n  Zones (scored tools only):`);
    console.log(`    🔴 Red (<50):    ${zoneStats.red}`);
    console.log(`    🟡 Yellow (50-79): ${zoneStats.yellow}`);
    console.log(`    🟢 Green (80+):  ${zoneStats.green}`);

    console.log(`\n  Coverage:`);
    console.log(`    <20%:  ${coverageStats.low}`);
    console.log(`    20-49%: ${coverageStats.medium}`);
    console.log(`    50-99%: ${coverageStats.high}`);
    console.log(`    100%:  ${coverageStats.full}`);

    console.log(`\n  Maturity:`);
    for (const [key, count] of Object.entries(maturityStats)) {
      if (count > 0) console.log(`    ${key}: ${count}`);
    }

    if (confidenceCount > 0) {
      console.log(`\n  Avg Confidence: ${(totalConfidence / confidenceCount).toFixed(3)}`);
    }

    // Top-10 changes
    if (scoreChanges.length > 0) {
      const withDiff = scoreChanges.filter((c) => c.diff !== null).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      if (withDiff.length > 0) {
        console.log(`\n  Top-10 Score Changes:`);
        for (const change of withDiff.slice(0, 10)) {
          const sign = change.diff >= 0 ? '+' : '';
          console.log(`    ${change.name}: ${change.oldScore} → ${change.newScore} (${sign}${change.diff})`);
        }
      }
    }

    // Run validation if requested
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
        for (const err of report.errors) {
          console.log(`    ✗ ${err}`);
        }
      }
      if (report.warnings.length > 0) {
        console.log('\n  WARNINGS:');
        for (const warn of report.warnings.slice(0, 50)) {
          console.log(`    ⚠ ${warn}`);
        }
        if (report.warnings.length > 50) {
          console.log(`    ... and ${report.warnings.length - 50} more`);
        }
      }
    }
  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error('Re-score failed:', err);
  process.exit(1);
});
