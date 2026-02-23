const fs = require('fs');
const path = require('path');

const SOURCE_DIR = '/home/openclaw/complior/engine/data/regulations/eu-ai-act';

module.exports = async ({ db }) => {
  console.log('=== Миграция Regulation DB из ~/complior ===\n');

  // 1. Загрузка JSON файлов
  const obligations = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, 'obligations.json'), 'utf-8')
  );
  const techReqs = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, 'technical-requirements.json'), 'utf-8')
  );
  const metaRaw = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, 'regulation-meta.json'), 'utf-8')
  );
  const meta = metaRaw.stage_1_metadata; // Extract nested metadata

  const timelineRaw = JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, 'timeline.json'), 'utf-8')
  );

  console.log(`Загружено: ${obligations.obligations.length} обязательств`);
  console.log(`Загружено: ${techReqs.technical_requirements ? techReqs.technical_requirements.length : 0} технических требований`);
  console.log(`Загружено: ${timelineRaw.timeline ? timelineRaw.timeline.length : 0} timeline событий\n`);

  // 2. Вставка RegulationMeta (1 строка)
  console.log('Вставка RegulationMeta...');
  await db.query(
    `INSERT INTO "RegulationMeta" (
      "jurisdictionId", "officialName", "jurisdiction", "status",
      "enactedDate", "entryIntoForceDate", "maxPenalty", "riskLevels",
      "keyDefinitions", "roles", "classificationQuestions"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT ("jurisdictionId") DO UPDATE SET
      "officialName" = EXCLUDED."officialName"`,
    [
      meta.regulation_id,
      meta.official_name,
      meta.jurisdiction,
      meta.status,
      meta.enacted_date || null,
      meta.entry_into_force_date || null,
      meta.max_penalty || null,
      JSON.stringify(meta.risk_levels || []),
      JSON.stringify(meta.key_definitions || {}),
      JSON.stringify(meta.roles || []),
      JSON.stringify(meta.classification_questions || []),
    ]
  );
  console.log('✓ RegulationMeta вставлен\n');

  // 3. Вставка Obligations (108 строк)
  console.log('Вставка Obligations...');
  let oblInserted = 0;
  for (const obl of obligations.obligations) {
    await db.query(
      `INSERT INTO "Obligation" (
        "obligationIdUnique", "articleReference", "title", "description",
        "appliesToRole", "appliesToRiskLevel", "obligationType", "severity",
        "whatToDo", "whatNotToDo", "evidenceRequired", "deadline", "frequency",
        "penaltyForNonCompliance", "automatable", "automationApproach",
        "cliCheckPossible", "cliCheckDescription", "documentTemplateNeeded",
        "documentTemplateType", "sdkFeatureNeeded", "parentObligation"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT ("obligationIdUnique") DO UPDATE SET
        "title" = EXCLUDED."title",
        "description" = EXCLUDED."description",
        "whatToDo" = EXCLUDED."whatToDo",
        "whatNotToDo" = EXCLUDED."whatNotToDo"`,
      [
        obl.obligation_id,
        obl.article_reference,
        obl.title,
        obl.description,
        obl.applies_to_role,
        JSON.stringify(obl.applies_to_risk_level),
        obl.obligation_type,
        obl.severity,
        JSON.stringify(obl.what_to_do),
        JSON.stringify(obl.what_not_to_do),
        obl.evidence_required,
        obl.deadline,
        obl.frequency,
        obl.penalty_for_non_compliance,
        obl.automatable,
        obl.automation_approach,
        obl.cli_check_possible,
        obl.cli_check_description,
        obl.document_template_needed,
        obl.document_template_type,
        obl.sdk_feature_needed,
        obl.parent_obligation || null,
      ]
    );
    oblInserted++;
    if (oblInserted % 20 === 0) {
      console.log(`  Прогресс: ${oblInserted}/${obligations.obligations.length}`);
    }
  }
  console.log(`✓ ${oblInserted} обязательств вставлено\n`);

  // 4. Вставка TechnicalRequirements (89 строк)
  console.log('Вставка TechnicalRequirements...');
  let reqInserted = 0;
  const techRequirements = techReqs.technical_requirements || [];
  for (const req of techRequirements) {
    await db.query(
      `INSERT INTO "TechnicalRequirement" (
        "requirementId", "obligationId", "featureType",
        "sdkImplementation", "cliCheck"
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("requirementId") DO NOTHING`,
      [
        req.requirement_id || `${req.obligation_id}-tech`,
        req.obligation_id,
        req.feature_type,
        JSON.stringify(req.sdk_implementation),
        JSON.stringify(req.cli_check),
      ]
    );
    reqInserted++;
  }
  console.log(`✓ ${reqInserted} технических требований вставлено\n`);

  // 5. Вставка TimelineEvents (18 строк)
  console.log('Вставка TimelineEvents...');
  let timelineInserted = 0;
  const events = timelineRaw.timeline?.key_dates || [];
  for (const event of events) {
    await db.query(
      `INSERT INTO "TimelineEvent" (
        "eventId", "jurisdictionId", "phase", "date", "whatApplies",
        "status", "monitoringUrl"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("eventId") DO NOTHING`,
      [
        `eu-ai-act-timeline-${timelineInserted + 1}`,
        'eu-ai-act',
        event.event || '',
        event.date || null,
        event.impact_on_product || null,
        event.status || 'upcoming',
        null, // No monitoring_url in source
      ]
    );
    timelineInserted++;
  }
  console.log(`✓ ${timelineInserted} timeline событий вставлено\n`);

  console.log('=== Миграция Regulation DB завершена! ===');
  console.log(`Obligations: ${oblInserted}`);
  console.log(`Technical Requirements: ${reqInserted}`);
  console.log(`Timeline Events: ${timelineInserted}`);
};
