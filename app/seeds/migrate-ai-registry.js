'use strict';
const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, 'registry-import-data.json');

// old categories[] → current category enum
const CATEGORY_MAP = {
  'chatbot': 'chatbot',
  'text-generation': 'chatbot',
  'conversational-ai': 'chatbot',
  'hr-recruitment': 'recruitment',
  'hr-screening': 'recruitment',
  'hr-management': 'recruitment',
  'code-generation': 'coding',
  'code-assistant': 'coding',
  'image-generation': 'image_generation',
  'image-editing': 'image_generation',
  'video-generation': 'video',
  'video-editing': 'video',
  'data-analytics': 'analytics',
  'search-engine': 'analytics',
  'business-intelligence': 'analytics',
  'customer-service': 'customer_service',
  'customer-support': 'customer_service',
  'marketing-automation': 'marketing',
  'content-creation': 'writing',
  'copywriting': 'writing',
  'legal-tech': 'legal',
  'medical-ai': 'medical',
  'healthcare': 'medical',
  'finance-ai': 'finance',
  'fintech': 'finance',
  'education': 'education',
  'edtech': 'education',
  'api-platform': 'api_platform',
  'foundation-model': 'api_platform',
  'translation': 'translation',
  'voice-tts': 'translation',
};

// category → aiActRole
const ROLE_MAP = {
  chatbot: 'provider',
  image_generation: 'provider',
  video: 'provider',
  api_platform: 'infrastructure',
  coding: 'ai_feature',
  writing: 'ai_feature',
  translation: 'ai_feature',
  recruitment: 'deployer_product',
  analytics: 'deployer_product',
  customer_service: 'deployer_product',
  marketing: 'deployer_product',
  medical: 'deployer_product',
  legal: 'deployer_product',
  finance: 'deployer_product',
  education: 'deployer_product',
  other: 'deployer_product',
};

const deriveCategory = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) return 'other';
  for (const cat of categories) {
    const mapped = CATEGORY_MAP[cat];
    if (mapped) return mapped;
  }
  return 'other';
};

const deriveRole = (category) => ROLE_MAP[category] || 'deployer_product';

const BATCH_SIZE = 100;

module.exports = async ({ db }) => {
  console.log('=== AI Registry Import — Restore + Merge ===\n');

  // 1. Load JSON file
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`✗ Source file not found: ${SOURCE_FILE}`);
    console.error('  Run: git show 8cde618:data/registry/all_tools.json > app/seeds/registry-import-data.json');
    return;
  }

  const allTools = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
  console.log(`Loaded: ${allTools.length} AI tools\n`);

  // 2. Build existing slug index
  const existingResult = await db.query(
    'SELECT slug, category, "riskLevel", "vendorCountry", capabilities, jurisdictions FROM "RegistryTool"',
  );
  const existingRows = existingResult.rows || existingResult;
  const existingMap = {};
  for (const row of existingRows) {
    existingMap[row.slug] = row;
  }
  console.log(`Existing tools in DB: ${existingRows.length}\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // 3. Process in batches
  for (let batchStart = 0; batchStart < allTools.length; batchStart += BATCH_SIZE) {
    const batch = allTools.slice(batchStart, batchStart + BATCH_SIZE);

    try {
      await db.query('BEGIN');

      for (const tool of batch) {
        try {
          const existing = existingMap[tool.slug];

          // Stringify provider if object
          const providerStr = typeof tool.provider === 'object'
            ? JSON.stringify(tool.provider || {})
            : String(tool.provider || '{}');

          if (existing) {
            // MERGE: keep DB category/riskLevel/vendorCountry
            // RESTORE: assessments, evidence, seo, level from JSON
            await db.query(
              `UPDATE "RegistryTool" SET
                evidence = $2,
                assessments = $3,
                seo = $4,
                level = $5,
                "priorityScore" = $6,
                "detectionPatterns" = $7
               WHERE slug = $1`,
              [
                tool.slug,
                JSON.stringify(tool.evidence || null),
                JSON.stringify(tool.assessments || null),
                JSON.stringify(tool.seo || null),
                tool.level || 'classified',
                Math.round(parseFloat(tool.priority_score) || 0),
                JSON.stringify(tool.detection_patterns || null),
              ],
            );
            updated++;
          } else {
            // INSERT new tool with derived category + aiActRole
            const category = deriveCategory(tool.categories);
            const aiActRole = deriveRole(category);
            const riskLevel = (tool.assessments
              && tool.assessments['eu-ai-act']
              && tool.assessments['eu-ai-act'].risk_level) || null;
            const websiteUrl = tool.website || null;

            await db.query(
              `INSERT INTO "RegistryTool" (
                slug, name, provider, website, "websiteUrl", categories, description,
                source, "rankOnSource", level, "priorityScore",
                evidence, assessments, seo, "detectionPatterns",
                category, "riskLevel", "aiActRole", active
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
              [
                tool.slug,
                tool.name,
                providerStr,
                websiteUrl,
                websiteUrl,
                JSON.stringify(tool.categories || []),
                tool.description || null,
                tool.source || null,
                tool.rank_on_source || null,
                tool.level || 'classified',
                Math.round(parseFloat(tool.priority_score) || 0),
                JSON.stringify(tool.evidence || null),
                JSON.stringify(tool.assessments || null),
                JSON.stringify(tool.seo || null),
                JSON.stringify(tool.detection_patterns || null),
                category,
                riskLevel,
                aiActRole,
                true,
              ],
            );
            inserted++;
          }
        } catch (err) {
          console.error(`  ✗ Error for ${tool.slug}: ${err.message}`);
          skipped++;
        }
      }

      await db.query('COMMIT');
    } catch (batchErr) {
      await db.query('ROLLBACK');
      console.error(`  ✗ Batch at ${batchStart} failed: ${batchErr.message}`);
      skipped += batch.length;
    }

    const progress = Math.min(batchStart + BATCH_SIZE, allTools.length);
    if (progress % 500 === 0 || progress >= allTools.length) {
      console.log(`  Progress: ${progress}/${allTools.length} (inserted: ${inserted}, updated: ${updated}, skipped: ${skipped})`);
    }
  }

  // 4. Backfill aiActRole for existing tools that have category but null role
  const backfillResult = await db.query(
    `UPDATE "RegistryTool" SET "aiActRole" = CASE
      WHEN category = 'chatbot' THEN 'provider'
      WHEN category = 'api_platform' THEN 'infrastructure'
      WHEN category IN ('image_generation','video') THEN 'provider'
      WHEN category IN ('coding','writing','translation') THEN 'ai_feature'
      ELSE 'deployer_product'
    END
    WHERE "aiActRole" IS NULL AND category IS NOT NULL`,
  );
  const backfilled = (backfillResult && backfillResult.rowCount) || 0;
  console.log(`\nBackfilled aiActRole: ${backfilled} tools`);

  console.log('\n=== AI Registry Import Complete ===');
  console.log(`Inserted: ${inserted}`);
  console.log(`Merged: ${updated}`);
  console.log(`Skipped (errors): ${skipped}`);
  console.log(`Total processed: ${inserted + updated}`);
};
