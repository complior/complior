'use strict';

const pg = require('pg');
const path = require('node:path');
const fs = require('node:fs');
fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split('\n').forEach((l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
});
const pool = new pg.Pool(require('../app/config/database.js'));

(async () => {
  // All claude-related tools
  const r = await pool.query(`
    SELECT slug, name, provider, website, "riskLevel",
           (assessments->'eu-ai-act'->>'score')::int as score,
           assessments->'eu-ai-act'->>'transparencyGrade' as tg,
           (assessments->'eu-ai-act'->'scoring'->>'coverage')::int as coverage,
           (evidence->'passive_scan'->>'pages_fetched')::int as pages,
           assessments->'eu-ai-act'->'scoring'->>'zone' as zone,
           assessments->'eu-ai-act'->'scoring'->'maturity'->>'criteria' as maturity,
           (assessments->'eu-ai-act'->'scoring'->>'confidence')::numeric(4,2) as confidence
    FROM "RegistryTool"
    WHERE active = true AND (slug LIKE '%claude%' OR name ILIKE '%claude%')
    ORDER BY score DESC NULLS LAST
  `);
  console.log('=== CLAUDE TOOLS ===');
  for (const row of r.rows) {
    console.log(
      row.slug.padEnd(28),
      'score:', String(row.score ?? 'N/A').padStart(3),
      'tg:', (row.tg || 'N/A').padEnd(3),
      'pages:', String(row.pages ?? 0).padStart(2),
      'cov:', String(row.coverage ?? 0).padStart(3),
      'risk:', (row.riskLevel || 'N/A').padEnd(14),
      'web:', row.website || 'NONE'
    );
  }

  // Check what Claude Mom is
  console.log('\n=== CLAUDE MOM DETAIL ===');
  const mom = await pool.query(`
    SELECT slug, name, provider, website, description, categories, "riskLevel",
           evidence->'passive_scan'->'disclosure' as disclosure,
           evidence->'passive_scan'->'privacy_policy' as privacy,
           evidence->'passive_scan'->'trust' as trust,
           evidence->'passive_scan'->'model_card' as model_card,
           (evidence->'passive_scan'->>'pages_fetched')::int as pages,
           assessments->'eu-ai-act'->'scoring'->'counts' as counts,
           assessments->'eu-ai-act'->'scoring'->'bonuses' as bonuses
    FROM "RegistryTool"
    WHERE slug = 'claude-mom'
  `);
  if (mom.rows[0]) {
    const m = mom.rows[0];
    console.log('Name:', m.name);
    console.log('Provider:', m.provider);
    console.log('Website:', m.website);
    console.log('Description:', m.description);
    console.log('Categories:', m.categories);
    console.log('Risk:', m.riskLevel);
    console.log('Pages:', m.pages);
    console.log('Disclosure:', JSON.stringify(m.disclosure));
    console.log('Privacy:', JSON.stringify(m.privacy));
    console.log('Trust:', JSON.stringify(m.trust));
    console.log('Model Card:', JSON.stringify(m.model_card));
    console.log('Counts:', JSON.stringify(m.counts));
    console.log('Bonuses:', JSON.stringify(m.bonuses));
  }

  // Check main Claude
  console.log('\n=== MAIN CLAUDE DETAIL ===');
  const main = await pool.query(`
    SELECT slug, name, provider, website, "riskLevel",
           evidence->'passive_scan'->'disclosure' as disclosure,
           evidence->'passive_scan'->'privacy_policy' as privacy,
           evidence->'passive_scan'->'trust' as trust,
           evidence->'passive_scan'->'model_card' as model_card,
           (evidence->'passive_scan'->>'pages_fetched')::int as pages,
           assessments->'eu-ai-act'->'scoring'->'counts' as counts,
           assessments->'eu-ai-act'->'scoring'->'bonuses' as bonuses
    FROM "RegistryTool"
    WHERE slug = 'claude'
  `);
  if (main.rows[0]) {
    const m = main.rows[0];
    console.log('Name:', m.name);
    console.log('Provider:', m.provider);
    console.log('Website:', m.website);
    console.log('Risk:', m.riskLevel);
    console.log('Pages:', m.pages);
    console.log('Disclosure:', JSON.stringify(m.disclosure));
    console.log('Privacy:', JSON.stringify(m.privacy));
    console.log('Trust:', JSON.stringify(m.trust));
    console.log('Model Card:', JSON.stringify(m.model_card));
    console.log('Counts:', JSON.stringify(m.counts));
    console.log('Bonuses:', JSON.stringify(m.bonuses));
  }

  // Major providers comparison
  console.log('\n=== MAJOR PROVIDERS COMPARISON ===');
  const majors = await pool.query(`
    SELECT slug, name, provider, website,
           (assessments->'eu-ai-act'->>'score')::int as score,
           assessments->'eu-ai-act'->>'transparencyGrade' as tg,
           (evidence->'passive_scan'->>'pages_fetched')::int as pages
    FROM "RegistryTool"
    WHERE active = true AND slug IN (
      'chatgpt', 'gpt-4', 'gemini', 'copilot', 'midjourney',
      'claude', 'claude-3-opus', 'bard', 'dalle',
      'stability-ai-sdxl', 'synthesia', 'heygen'
    )
    ORDER BY score DESC NULLS LAST
  `);
  for (const row of majors.rows) {
    console.log(
      row.slug.padEnd(22),
      'score:', String(row.score ?? 'N/A').padStart(3),
      'tg:', (row.tg || 'N/A').padEnd(3),
      'pages:', String(row.pages ?? 0).padStart(2),
      'web:', row.website || 'NONE'
    );
  }

  // Provider correlation check
  console.log('\n=== PROVIDER CORRELATION FOR ANTHROPIC ===');
  const anthro = await pool.query(`
    SELECT slug, name, provider,
           assessments->'eu-ai-act'->'scoring'->'providerCorrelation' as correlation
    FROM "RegistryTool"
    WHERE active = true AND provider ILIKE '%anthropic%'
    ORDER BY slug
  `);
  for (const row of anthro.rows) {
    console.log(row.slug.padEnd(28), 'provider:', row.provider, 'correlation:', JSON.stringify(row.correlation));
  }

  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
