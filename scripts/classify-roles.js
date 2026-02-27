'use strict';

/**
 * Classify AI Act roles for all registry tools.
 *
 * Rules-based classification using categories + provider names.
 * Sets aiActRole column: provider | deployer_product | hybrid | infrastructure | ai_feature
 *
 * Usage:
 *   node scripts/classify-roles.js [--dry-run]
 */

const dotenvPath = require('node:path').join(__dirname, '../.env');
require('node:fs').readFileSync(dotenvPath, 'utf8').split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const pg = require('pg');
const dbConfig = require('../app/config/database.js');

const ROLE_RULES = {
  provider: {
    categories: new Set([
      'foundation-model', 'large-language-model', 'llm',
    ]),
    providers: new Set([
      'anthropic', 'openai', 'google', 'meta', 'mistral', 'cohere',
      'deepseek', 'alibaba', 'baidu', 'xai', 'ai21 labs', 'ai21',
      'zhipu ai', 'minimax', '01.ai',
    ]),
  },
  deployer_product: {
    categories: new Set([
      'video', 'image_generation', 'recruitment', 'customer_service',
      'marketing', 'writing', 'translation', 'medical', 'legal', 'finance',
    ]),
    providers: new Set([
      'heygen', 'synthesia', 'jasper', 'copy.ai', 'grammarly',
      'notion', 'canva', 'descript', 'runway', 'luma ai',
      'ideogram', 'pika', 'invideo', 'writesonic', 'copy ai',
    ]),
  },
  infrastructure: {
    categories: new Set([
      'api_platform', 'cloud',
    ]),
    providers: new Set([
      'amazon', 'nvidia', 'hugging face', 'databricks',
      'together ai', 'replicate', 'anyscale', 'modal',
    ]),
  },
  ai_feature: {
    categories: new Set([
      'analytics', 'education',
    ]),
    providers: new Set([]),
  },
};

const classifyRole = (tool) => {
  let providerName = '';
  if (tool.provider) {
    if (typeof tool.provider === 'string') {
      try { providerName = JSON.parse(tool.provider).name || ''; } catch { providerName = tool.provider; }
    } else {
      providerName = tool.provider.name || '';
    }
  }
  const normalizedProvider = providerName.toLowerCase().trim();

  const categories = tool.categories || [];
  if (typeof tool.category === 'string' && !categories.includes(tool.category)) {
    categories.push(tool.category);
  }
  const normalizedCategories = categories.map((c) => c.toLowerCase().trim());

  // Check each role in priority order
  for (const [role, rules] of Object.entries(ROLE_RULES)) {
    // Provider name match
    if (rules.providers.has(normalizedProvider)) return role;

    // Category match
    for (const cat of normalizedCategories) {
      if (rules.categories.has(cat)) return role;
    }
  }

  return null; // unclassified
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  return { dryRun: args.includes('--dry-run') };
};

const run = async () => {
  const opts = parseArgs();
  const pool = new pg.Pool(dbConfig);

  console.log('═══════════════════════════════════════════════════');
  console.log('  CLASSIFY AI ACT ROLES');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode: ${opts.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  try {
    const result = await pool.query(
      `SELECT "registryToolId", slug, name, provider, category, categories
       FROM "RegistryTool" WHERE active = true ORDER BY slug`,
    );
    const tools = result.rows;
    console.log(`  Total tools: ${tools.length}`);

    // Parse JSON fields
    for (const tool of tools) {
      if (typeof tool.categories === 'string') {
        try { tool.categories = JSON.parse(tool.categories); } catch { tool.categories = []; }
      }
      if (typeof tool.provider === 'string') {
        try { tool.provider = JSON.parse(tool.provider); } catch { /* keep as string */ }
      }
    }

    const roleCounts = { provider: 0, deployer_product: 0, hybrid: 0, infrastructure: 0, ai_feature: 0, unclassified: 0 };
    let updated = 0;

    for (const tool of tools) {
      const role = classifyRole(tool);
      const countKey = role || 'unclassified';
      roleCounts[countKey]++;

      if (!opts.dryRun && role) {
        await pool.query(
          `UPDATE "RegistryTool" SET "aiActRole" = $1 WHERE "registryToolId" = $2`,
          [role, tool.registryToolId],
        );
        updated++;
      }
    }

    console.log('\n  Role Distribution:');
    for (const [role, count] of Object.entries(roleCounts)) {
      if (count > 0) console.log(`    ${role}: ${count}`);
    }
    console.log(`\n  Updated: ${updated}`);
    console.log(`\n${'═'.repeat(53)}`);
    console.log(opts.dryRun ? '  DRY RUN — no changes written' : '  DONE — all changes saved');
    console.log('═'.repeat(53));

  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error('Classification failed:', err);
  process.exit(1);
});
