'use strict';

const pg = require('pg');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const dotenvPath = path.join(__dirname, '../.env');
fs.readFileSync(dotenvPath, 'utf8').split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const dbConfig = require('../app/config/database.js');
const loadMod = (f) => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });

(async () => {
  const pool = new pg.Pool(dbConfig);
  const domainDir = path.join(__dirname, '../app/domain/registry');
  const analyzer = loadMod(path.join(domainDir, 'evidence-analyzer.js'))({ db: pool });
  const scorer = loadMod(path.join(domainDir, 'registry-scorer.js'))({ db: pool });

  const slugs = ['chatgpt', 'stability-ai'];

  for (const slug of slugs) {
    const res = await pool.query(
      `SELECT "registryToolId", slug, name, provider, "riskLevel", level, assessments, evidence, categories
       FROM "RegistryTool" WHERE slug = $1`, [slug]
    );
    const t = res.rows[0];
    if (!t) { console.log(`\n${slug}: NOT FOUND`); continue; }

    if (typeof t.evidence === 'string') try { t.evidence = JSON.parse(t.evidence); } catch { t.evidence = {}; }
    if (typeof t.assessments === 'string') try { t.assessments = JSON.parse(t.assessments); } catch { t.assessments = {}; }
    t.evidence = t.evidence || {};
    t.assessments = t.assessments || {};

    const assessment = t.assessments['eu-ai-act'] || {};

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  ${t.name} (${slug})`);
    console.log(`${'='.repeat(70)}`);
    console.log(`  riskLevel: ${t.riskLevel}`);
    console.log(`  level: ${t.level}`);

    const providerObj = typeof t.provider === 'string' ? JSON.parse(t.provider || '{}') : (t.provider || {});
    console.log(`  provider: ${JSON.stringify(providerObj)}`);

    const applicableIds = assessment.applicable_obligation_ids || [];
    console.log(`\n  Applicable obligation IDs (${applicableIds.length}):`);
    applicableIds.forEach((id) => console.log(`    - ${id}`));

    const obligations = assessment.obligations || {};
    console.log(`\n  Obligation statuses (${Object.keys(obligations).length}):`);
    for (const [oblId, obl] of Object.entries(obligations)) {
      console.log(`    ${oblId}: status=${obl.status}, confidence=${obl.confidence || '—'}`);
    }

    // Analyze evidence
    const enriched = analyzer.analyze(t);
    console.log(`\n  Derived obligations from evidence (${Object.keys(enriched.derivedObligations).length}):`);
    for (const [oblId, d] of Object.entries(enriched.derivedObligations)) {
      console.log(`    ${oblId}: status=${d.status}, confidence=${(d.confidence || 0).toFixed(2)}, source=${d.source}`);
    }

    console.log(`\n  Evidence quality: ${JSON.stringify(enriched.evidenceQuality)}`);
    console.log(`  Transparency score: ${enriched.transparencyScore}`);

    // Score
    const corrRes = await pool.query('SELECT slug, provider, evidence, categories FROM "RegistryTool" WHERE active = true');
    const corrTools = corrRes.rows.map((ct) => {
      if (typeof ct.evidence === 'string') try { ct.evidence = JSON.parse(ct.evidence); } catch { ct.evidence = {}; }
      ct.evidence = ct.evidence || {};
      return ct;
    });
    const correlations = analyzer.correlateProvider(corrTools);
    const corr = correlations[slug] || null;

    const result = await scorer.calculate(t, enriched, corr);
    console.log(`\n  SCORE RESULT:`);
    console.log(`    score: ${result.score}`);
    console.log(`    reason: ${result.reason || '—'}`);
    console.log(`    coverage: ${result.coverage}%`);
    console.log(`    transparencyGrade: ${result.transparencyGrade}`);
    console.log(`    zone: ${result.zone}`);
    if (result.maturity) console.log(`    maturity: ${result.maturity.criteria} (level ${result.maturity.level})`);
    if (result.penalties) console.log(`    penalties: ${JSON.stringify(result.penalties)}`);
    if (result.bonuses) console.log(`    bonuses: ${JSON.stringify(result.bonuses)}`);
    if (result.counts) console.log(`    counts: ${JSON.stringify(result.counts)}`);
    if (result.confidenceInterval) console.log(`    CI: [${result.confidenceInterval.low}, ${result.confidenceInterval.high}]`);
  }

  await pool.end();
})();
