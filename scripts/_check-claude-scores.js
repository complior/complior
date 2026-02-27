'use strict';

const pg = require('pg');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Load .env
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

  // Load all tools for correlation
  const corrRes = await pool.query(
    'SELECT slug, provider, evidence, categories FROM "RegistryTool" WHERE active = true'
  );
  const corrTools = corrRes.rows.map((t) => {
    if (typeof t.evidence === 'string') {
      try { t.evidence = JSON.parse(t.evidence); } catch { t.evidence = {}; }
    }
    t.evidence = t.evidence || {};
    return t;
  });
  const correlations = analyzer.correlateProvider(corrTools);

  // Load Claude + some comparison tools
  const res = await pool.query(
    `SELECT "registryToolId", slug, name, provider, "riskLevel", level, assessments, evidence, categories
     FROM "RegistryTool"
     WHERE active = true
       AND (slug LIKE '%claude%' OR slug IN ('chatgpt', 'gpt-4', 'gpt-4o', 'gemini', 'heygen', 'synthesia', 'stability-ai', 'midjourney'))
     ORDER BY slug`
  );
  const tools = res.rows;
  for (const t of tools) {
    if (typeof t.evidence === 'string') {
      try { t.evidence = JSON.parse(t.evidence); } catch { t.evidence = {}; }
    }
    if (typeof t.assessments === 'string') {
      try { t.assessments = JSON.parse(t.assessments); } catch { t.assessments = {}; }
    }
    t.evidence = t.evidence || {};
    t.assessments = t.assessments || {};
  }

  // Build analysis map
  const toolAnalysisMap = {};
  for (const t of tools) {
    const enriched = analyzer.analyze(t);
    const corr = correlations[t.slug] || null;
    if (corr && corr.inheritedSignals) {
      for (const [, d] of Object.entries(enriched.derivedObligations)) {
        const sigs = d.signals || [];
        if (d.source === 'passive_scan' && corr.inheritedSignals.some((s) =>
          sigs.some((ds) => ds.includes(s.split('.')[0])))) {
          d.confidence = (d.confidence || 0.5) * corr.confidenceMultiplier;
          d.evidence_summary = '[INHERITED] ' + (d.evidence_summary || '');
        }
      }
    }
    let pName = 'Unknown';
    if (t.provider) {
      if (typeof t.provider === 'string') {
        try { pName = JSON.parse(t.provider).name || 'Unknown'; } catch { pName = t.provider; }
      } else {
        pName = t.provider.name || 'Unknown';
      }
    }
    toolAnalysisMap[t.slug] = { enriched, providerName: pName, correlation: corr };
  }

  // Correlate obligations
  const oblCorr = analyzer.correlateObligations(toolAnalysisMap);
  for (const [slug, oc] of Object.entries(oblCorr)) {
    const entry = toolAnalysisMap[slug];
    if (!entry) continue;
    for (const [oblId, inh] of Object.entries(oc.inheritedObligations)) {
      if (!entry.enriched.derivedObligations[oblId]) {
        entry.enriched.derivedObligations[oblId] = inh;
      }
    }
  }

  // Score
  const getOldScore = (t) => {
    const a = t.assessments && t.assessments['eu-ai-act'];
    return a ? a.score : null;
  };

  console.log('');
  console.log('Tool                        | Old | New  |   Δ  | Coverage | Grade | Maturity    | Reason');
  console.log('-'.repeat(110));

  for (const t of tools) {
    const entry = toolAnalysisMap[t.slug] || {};
    const enriched = entry.enriched || analyzer.analyze(t);
    const corr = entry.correlation || correlations[t.slug] || null;
    const result = await scorer.calculate(t, enriched, corr);

    const old = getOldScore(t);
    const oldStr = old != null ? String(old).padStart(3) : '  —';
    const newStr = result.score != null ? String(result.score).padStart(3) : '  —';

    let deltaStr = '  — ';
    if (old != null && result.score != null) {
      const d = result.score - old;
      deltaStr = (d >= 0 ? '+' + d : String(d)).padStart(4);
    }

    const cov = result.coverage != null ? result.coverage.toFixed(0) + '%' : '—';
    const grade = result.transparencyGrade || '—';
    const maturity = result.maturity ? result.maturity.criteria : '—';
    const reason = result.reason || '';

    console.log(
      t.name.padEnd(28) + '| ' + oldStr + ' | ' + newStr +
      '  | ' + deltaStr + ' | ' + cov.padStart(8) + ' | ' + grade.padStart(5) +
      ' | ' + (maturity || '').padEnd(11) + ' | ' + reason
    );
  }

  console.log('');
  await pool.end();
})();
