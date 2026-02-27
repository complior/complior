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
  const r = await pool.query(`
    SELECT slug, name,
           evidence->'passive_scan'->'social'->>'estimated_company_size' as company_size,
           (evidence->'passive_scan'->>'pages_fetched')::int as pages,
           (assessments->'eu-ai-act'->>'score')::int as score
    FROM "RegistryTool"
    WHERE active = true
      AND slug IN ('claude', 'chatgpt', 'gpt-4', 'gemini', 'copilot',
                   'midjourney', 'heygen', 'synthesia', 'stability-ai-sdxl',
                   'claude-3-opus', 'dall-e-3', 'sora',
                   'claude-mem', 'claude-code', 'claude-4-5-sonnet')
    ORDER BY score DESC NULLS LAST
  `);
  for (const row of r.rows) {
    console.log(
      row.slug.padEnd(22),
      'size:', (row.company_size || 'null').padEnd(12),
      'pages:', String(row.pages).padStart(2),
      'score:', row.score
    );
  }

  console.log('\nCompany size distribution:');
  const r2 = await pool.query(`
    SELECT evidence->'passive_scan'->'social'->>'estimated_company_size' as sz, COUNT(*) as c
    FROM "RegistryTool"
    WHERE active = true AND evidence->'passive_scan'->'social' IS NOT NULL
    GROUP BY 1 ORDER BY c DESC
  `);
  for (const row of r2.rows) {
    console.log('  ' + (row.sz || 'null').padEnd(12) + ': ' + row.c);
  }

  // Check reputation scores
  console.log('\nReputation signals:');
  const r3 = await pool.query(`
    SELECT slug,
           evidence->'passive_scan'->'social'->>'estimated_company_size' as sz,
           evidence->'passive_scan'->'trust'->>'certifications' as certs,
           evidence->'passive_scan'->'web_search'->>'has_transparency_report' as transparency_rpt,
           evidence->'passive_scan'->'infra'->>'has_cookie_consent' as cookie
    FROM "RegistryTool"
    WHERE active = true
      AND slug IN ('claude', 'chatgpt', 'gemini', 'heygen', 'synthesia',
                   'stability-ai-sdxl', 'claude-mem', 'midjourney',
                   'claude-3-opus', 'claude-4-5-sonnet')
    ORDER BY slug
  `);
  for (const row of r3.rows) {
    console.log(
      row.slug.padEnd(22),
      'sz:', (row.sz || 'null').padEnd(12),
      'certs:', (row.certs || '[]').padEnd(30),
      'trpt:', row.transparency_rpt,
      'cookie:', row.cookie
    );
  }

  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
