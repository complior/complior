#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const pg = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function exportRegistry() {
  console.log('Экспорт AI Registry в JSON...');

  const { rows } = await pool.query('SELECT * FROM "RegistryTool" ORDER BY slug');

  const allTools = rows.map((t) => ({
    slug: t.slug,
    name: t.name,
    provider: t.provider,
    website: t.website,
    categories: t.categories,
    description: t.description,
    source: t.source,
    rank_on_source: t.rankOnSource,
    level: t.level,
    priority_score: t.priorityScore,
    evidence: t.evidence,
    assessments: t.assessments,
    seo: t.seo,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  }));

  const outputPath = path.join(__dirname, '..', 'data', 'registry', 'all_tools.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allTools));

  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`✅ Экспортировано ${allTools.length} инструментов → ${outputPath}`);
  console.log(`   Размер: ${sizeMB}MB`);
}

exportRegistry()
  .catch((err) => { console.error('❌ Export error:', err); process.exit(1); })
  .finally(() => pool.end());
