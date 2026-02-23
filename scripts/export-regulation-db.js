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

async function exportRegulationDB() {
  console.log('Экспорт Regulation DB в JSON...\n');

  // 1. Obligations
  const { rows: obligations } = await pool.query(
    'SELECT * FROM "Obligation" ORDER BY "obligationIdUnique"'
  );

  const obligationsFile = {
    jurisdiction_id: 'eu-ai-act',
    version: '4.0',
    last_updated: new Date().toISOString(),
    obligations: obligations.map((o) => ({
      obligation_id: o.obligationIdUnique,
      article_reference: o.articleReference,
      title: o.title,
      description: o.description,
      applies_to_role: o.appliesToRole,
      applies_to_risk_level: o.appliesToRiskLevel,
      obligation_type: o.obligationType,
      severity: o.severity,
      what_to_do: o.whatToDo,
      what_not_to_do: o.whatNotToDo,
      evidence_required: o.evidenceRequired,
      deadline: o.deadline,
      frequency: o.frequency,
      penalty_for_non_compliance: o.penaltyForNonCompliance,
      automatable: o.automatable,
      automation_approach: o.automationApproach,
      cli_check_possible: o.cliCheckPossible,
      cli_check_description: o.cliCheckDescription,
      document_template_needed: o.documentTemplateNeeded,
      document_template_type: o.documentTemplateType,
      sdk_feature_needed: o.sdkFeatureNeeded,
      parent_obligation: o.parentObligation,
    })),
  };

  const oblPath = path.join(__dirname, '..', 'data', 'regulations', 'obligations.json');
  fs.mkdirSync(path.dirname(oblPath), { recursive: true });
  fs.writeFileSync(oblPath, JSON.stringify(obligationsFile, null, 2));
  console.log(`✅ ${obligations.length} обязательств → ${oblPath}`);

  // 2. RegulationMeta
  const { rows: meta } = await pool.query('SELECT * FROM "RegulationMeta"');
  const metaPath = path.join(__dirname, '..', 'data', 'regulations', 'regulation-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta[0] ?? {}, null, 2));
  console.log(`✅ RegulationMeta → ${metaPath}`);

  // 3. TechnicalRequirements
  const { rows: techReqs } = await pool.query(
    'SELECT * FROM "TechnicalRequirement" ORDER BY "requirementId"'
  );
  const techReqsFile = {
    last_updated: new Date().toISOString(),
    technical_requirements: techReqs.map((r) => ({
      requirement_id: r.requirementId,
      obligation_id: r.obligationId,
      feature_type: r.featureType,
      sdk_implementation: r.sdkImplementation,
      cli_check: r.cliCheck,
    })),
  };
  const techPath = path.join(__dirname, '..', 'data', 'regulations', 'technical-requirements.json');
  fs.writeFileSync(techPath, JSON.stringify(techReqsFile, null, 2));
  console.log(`✅ ${techReqs.length} технических требований → ${techPath}`);

  // 4. TimelineEvents
  const { rows: timeline } = await pool.query(
    'SELECT * FROM "TimelineEvent" ORDER BY date'
  );
  const timelineFile = {
    last_updated: new Date().toISOString(),
    timeline: { key_dates: timeline.map((e) => ({
      event_id: e.eventId,
      jurisdiction_id: e.jurisdictionId,
      event: e.phase,
      date: e.date,
      impact_on_product: e.whatApplies,
      status: e.status,
    }))},
  };
  const tlPath = path.join(__dirname, '..', 'data', 'regulations', 'timeline.json');
  fs.writeFileSync(tlPath, JSON.stringify(timelineFile, null, 2));
  console.log(`✅ ${timeline.length} timeline событий → ${tlPath}`);

  console.log('\n✅ Regulation DB экспорт завершён');
}

exportRegulationDB()
  .catch((err) => { console.error('❌ Export error:', err); process.exit(1); })
  .finally(() => pool.end());
