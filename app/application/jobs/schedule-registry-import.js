/**
 * Schedule Registry Import Job (one-time)
 *
 * Worker for 'registry-import' job. Restores ~4983 tools
 * from seed JSON into RegistryTool table.
 *
 * Not scheduled on cron — triggered manually via admin endpoint.
 * readSeedFile() injected from server/main.js (has fs access).
 */

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

const ROLE_MAP = {
  chatbot: 'provider',
  image_generation: 'provider',
  video: 'provider',
  api_platform: 'infrastructure',
  coding: 'ai_feature',
  writing: 'ai_feature',
  translation: 'ai_feature',
};

const deriveCategory = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) return 'other';
  for (const cat of categories) {
    if (CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];
  }
  return 'other';
};

const deriveRole = (category) => ROLE_MAP[category] || 'deployer_product';

const BATCH_SIZE = 100;

({
  async init({ pgboss, console, db, readSeedFile }) {
    const jobName = 'registry-import';

    await pgboss.work(jobName, { newJobCheckInterval: 5000 }, async () => {
      console.log('📥 Registry import job started');

      const raw = readSeedFile();
      if (!raw) {
        console.error('✗ Seed file not found');
        return { success: false, error: 'seed_file_missing' };
      }

      const allTools = JSON.parse(raw);
      console.log(`Loaded: ${allTools.length} AI tools`);

      // Build existing slug index
      const existingResult = await db.query(
        // eslint-disable-next-line max-len
        'SELECT slug, category, "riskLevel", "vendorCountry" FROM "RegistryTool"',
      );
      const existingRows = existingResult.rows || existingResult;
      const existingMap = {};
      for (const row of existingRows) {
        existingMap[row.slug] = row;
      }
      console.log(`Existing tools in DB: ${existingRows.length}`);

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (let i = 0; i < allTools.length; i += BATCH_SIZE) {
        const batch = allTools.slice(i, i + BATCH_SIZE);

        try {
          await db.query('BEGIN');

          for (const tool of batch) {
            try {
              const existing = existingMap[tool.slug];
              const providerStr = typeof tool.provider === 'object'
                ? JSON.stringify(tool.provider || {})
                : String(tool.provider || '{}');

              if (existing) {
                // MERGE: keep DB category/riskLevel
                // RESTORE: assessments, evidence, seo, level
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
                    tool.priority_score || 0,
                    JSON.stringify(tool.detection_patterns || null),
                  ],
                );
                updated++;
              } else {
                const category = deriveCategory(tool.categories);
                const aiActRole = deriveRole(category);
                const euAct = tool.assessments
                  && tool.assessments['eu-ai-act'];
                const riskLevel = (euAct && euAct.risk_level) || null;
                const websiteUrl = tool.website || null;

                await db.query(
                  `INSERT INTO "RegistryTool" (
                    slug, name, provider, website,
                    "websiteUrl", categories, description,
                    source, "rankOnSource", level,
                    "priorityScore", evidence, assessments,
                    seo, "detectionPatterns",
                    category, "riskLevel", "aiActRole", active
                  ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                    $11,$12,$13,$14,$15,$16,$17,$18,$19
                  )`,
                  [
                    tool.slug, tool.name, providerStr,
                    websiteUrl, websiteUrl,
                    JSON.stringify(tool.categories || []),
                    tool.description || null,
                    tool.source || null,
                    tool.rank_on_source || null,
                    tool.level || 'classified',
                    tool.priority_score || 0,
                    JSON.stringify(tool.evidence || null),
                    JSON.stringify(tool.assessments || null),
                    JSON.stringify(tool.seo || null),
                    JSON.stringify(tool.detection_patterns || null),
                    category, riskLevel, aiActRole, true,
                  ],
                );
                inserted++;
              }
            } catch (err) {
              console.error(`  ✗ ${tool.slug}: ${err.message}`);
              skipped++;
            }
          }

          await db.query('COMMIT');
        } catch (batchErr) {
          await db.query('ROLLBACK');
          console.error(`  ✗ Batch at ${i} failed: ${batchErr.message}`);
          skipped += batch.length;
        }

        const progress = Math.min(i + BATCH_SIZE, allTools.length);
        if (progress % 500 === 0 || progress >= allTools.length) {
          console.log(`  ${progress}/${allTools.length} (ins:${inserted} upd:${updated} skip:${skipped})`);
        }
      }

      // Backfill aiActRole
      await db.query(
        `UPDATE "RegistryTool" SET "aiActRole" = CASE
          WHEN category = 'chatbot' THEN 'provider'
          WHEN category = 'api_platform' THEN 'infrastructure'
          WHEN category IN ('image_generation','video') THEN 'provider'
          WHEN category IN ('coding','writing','translation') THEN 'ai_feature'
          ELSE 'deployer_product'
        END
        WHERE "aiActRole" IS NULL AND category IS NOT NULL`,
      );

      console.log(`✅ Import done: ${inserted} inserted, ${updated} merged, ${skipped} skipped`);
      return { success: true, inserted, updated, skipped };
    });

    console.log('✅ Registry import job worker registered');
    return { jobName, scheduled: false };
  },

  async trigger({ pgboss, console }) {
    const jobId = await pgboss.send('registry-import', {
      manual: true,
      triggeredAt: new Date().toISOString(),
    });
    console.log(`✅ Registry import triggered (Job ID: ${jobId})`);
    return { jobId };
  },
});
