'use strict';
const fs = require('fs');
const path = require('path');
fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim();
  }
});
const pg = require('pg');
const dbConfig = require('../app/config/database.js');
const db = new pg.Pool(dbConfig);

const slugs = [
  'claude', 'chatgpt', 'gpt-4o', 'gemini', 'mistral-large',
  'heygen', 'synthesia', 'stability-ai', 'midjourney', 'copilot',
  'dall-e', 'claude-3-5-sonnet', 'deepseek',
];

(async () => {
  const r = await db.query(
    `SELECT slug, name, "aiActRole", assessments->'eu-ai-act'->'publicDocumentation' as pd
     FROM "RegistryTool" WHERE slug = ANY($1) AND active=true ORDER BY slug`,
    [slugs],
  );
  for (const t of r.rows) {
    const pd = typeof t.pd === 'string' ? JSON.parse(t.pd) : t.pd;
    if (!pd) { console.log(`${t.slug} | ${t.aiActRole} | NO GRADE`); continue; }
    console.log(`\n${t.name} (${t.slug})`);
    console.log(`  Role: ${t.aiActRole || 'null'}  |  Checklist: ${pd.checklist}  |  Grade: ${pd.grade} (${pd.score}/${pd.total})`);
    console.log('  -------------------------------------------');
    for (const item of pd.items) {
      const icon = item.found ? 'YES' : ' NO';
      console.log(`  [${icon}]  ${item.label}`);
    }
  }
  await db.end();
})();
