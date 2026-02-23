const fs = require('fs');
const path = require('path');

const SOURCE_FILE = '/home/openclaw/complior/engine/data/registry/all_tools.json';

module.exports = async ({ db }) => {
  console.log('=== Миграция AI Registry из ~/complior ===\n');

  // 1. Загрузка JSON файла
  const allTools = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
  console.log(`Загружено: ${allTools.length} AI-инструментов (21MB)\n`);

  // 2. Вставка инструментов
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const tool of allTools) {
    try {
      // Проверка существования по slug
      const existing = await db.query(
        'SELECT "registryToolId" FROM "RegistryTool" WHERE slug = $1',
        [tool.slug]
      );

      if (existing.length === 0) {
        // INSERT новый инструмент
        await db.query(
          `INSERT INTO "RegistryTool" (
            slug, name, provider, website, categories, description,
            source, "rankOnSource", level, "priorityScore",
            evidence, assessments, seo, active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            tool.slug,
            tool.name,
            JSON.stringify(tool.provider || {}),
            tool.website || null,
            JSON.stringify(tool.categories || []),
            tool.description || null,
            tool.source || null,
            tool.rank_on_source || null,
            tool.level || 'classified',
            tool.priority_score || 0,
            JSON.stringify(tool.evidence || null),
            JSON.stringify(tool.assessments || null),
            JSON.stringify(tool.seo || null),
            true,
          ]
        );
        inserted++;
      } else {
        // UPDATE существующий инструмент (обновляем только ключевые поля)
        await db.query(
          `UPDATE "RegistryTool" SET
            name = $2,
            evidence = $3,
            assessments = $4,
            level = $5,
            "priorityScore" = $6
           WHERE slug = $1`,
          [
            tool.slug,
            tool.name,
            JSON.stringify(tool.evidence || null),
            JSON.stringify(tool.assessments || null),
            tool.level || 'classified',
            tool.priority_score || 0,
          ]
        );
        updated++;
      }
    } catch (err) {
      console.error(`✗ Ошибка для ${tool.slug}: ${err.message}`);
      skipped++;
    }

    // Прогресс каждые 500 инструментов
    if ((inserted + updated + skipped) % 500 === 0) {
      console.log(`  Прогресс: ${inserted + updated + skipped}/${allTools.length} (inserted: ${inserted}, updated: ${updated}, skipped: ${skipped})`);
    }
  }

  console.log(`\n✅ Миграция AI Registry завершена!`);
  console.log(`Добавлено: ${inserted}`);
  console.log(`Обновлено: ${updated}`);
  console.log(`Пропущено (ошибки): ${skipped}`);
  console.log(`Всего: ${inserted + updated}`);
};
