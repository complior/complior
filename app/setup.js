'use strict';

const fsp = require('node:fs').promises;
const path = require('node:path');
const vm = require('node:vm');
const pg = require('pg');
// loader.js available for runtime use
const dbConfig = require('./config/database.js');

const SCHEMAS_DIR = path.join(__dirname, 'schemas');
const SEEDS_DIR = path.join(__dirname, 'seeds');

// MetaSQL kind → SQL DDL mapping
const KIND_PK = {
  Registry: () =>
    '"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY',
  Entity: (n) =>
    `"${n[0].toLowerCase()}${n.slice(1)}Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
  Details: (n) =>
    `"${n[0].toLowerCase()}${n.slice(1)}Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
  Relation: (n) =>
    `"${n[0].toLowerCase()}${n.slice(1)}Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
};

const REGISTRY_COLUMNS = `
  "creation" timestamp with time zone DEFAULT now(),
  "change" timestamp with time zone DEFAULT now()`;

// Custom type mapping
const TYPE_MAP = {
  string: 'varchar',
  text: 'text',
  number: 'integer',
  boolean: 'boolean',
  datetime: 'timestamp with time zone',
  json: 'jsonb',
  decimal: 'numeric',
  ip: 'inet',
  riskLevel: 'varchar',
  complianceStatus: 'varchar',
};

const resolveType = (field) => {
  if (typeof field === 'string') {
    if (field.startsWith('?')) return { type: field.slice(1), required: false };
    return { type: field };
  }
  return field;
};

const fieldToSQL = (name, rawField, tableName, schemas) => {
  const field = resolveType(rawField);

  // Skip meta-fields
  if (name === 'naturalKey' || name === 'many') return null;
  if (typeof field === 'object' && field.many) return null;

  const type = field.type || 'string';
  const isFK = schemas.has(type);

  if (isFK) {
    const refTable = type;
    const refKind = getKind(schemas.get(refTable));
    const refPK = refKind === 'Registry'
      ? 'id'
      : `${refTable[0].toLowerCase()}${refTable.slice(1)}Id`;
    const colName = `"${name}Id"`;
    const nullable = field.required === false ? '' : ' NOT NULL';
    const onDelete = field.delete === 'cascade' ? ' ON DELETE CASCADE'
      : field.delete === 'restrict' ? ' ON DELETE RESTRICT' : '';
    const ref = `REFERENCES "${refTable}"("${refPK}")`;
    return `${colName} bigint${nullable} ${ref}${onDelete}`;
  }

  let sqlType = TYPE_MAP[type] || 'varchar';

  // Handle length constraints
  if (field.length && field.length.max && sqlType === 'varchar') {
    sqlType = `varchar(${field.length.max})`;
  }

  // Handle enums as CHECK constraints
  if (field.enum) {
    const values = field.enum.map((v) => `'${v}'`).join(', ');
    sqlType = `varchar CHECK ("${name}" IN (${values}))`;
  }

  const nullable = field.required === false ? '' : ' NOT NULL';
  const unique = field.unique === true ? ' UNIQUE' : '';
  let defaultVal = '';
  if (field.default !== undefined) {
    const d = field.default;
    // Booleans, numbers, pre-quoted strings ('en'), and functions (now())
    // pass through as-is. Bare strings need SQL quoting.
    if (typeof d === 'string' && !d.startsWith('\'') &&
        d !== 'now()' && d !== 'true' && d !== 'false') {
      defaultVal = ` DEFAULT '${d}'`;
    } else {
      defaultVal = ` DEFAULT ${d}`;
    }
  }

  return `"${name}" ${sqlType}${nullable}${unique}${defaultVal}`;
};

const getKind = (schema) => {
  for (const kind of ['Registry', 'Entity', 'Details', 'Relation']) {
    if (schema[kind] !== undefined) return kind;
  }
  return 'Entity';
};

const generateDDL = (tableName, schema, schemas) => {
  const kind = getKind(schema);
  const pk = KIND_PK[kind](tableName);
  const columns = [pk];

  if (kind === 'Registry') {
    columns.push(REGISTRY_COLUMNS.trim());
  }

  const uniqueConstraints = [];

  for (const [name, field] of Object.entries(schema)) {
    if (['Registry', 'Entity', 'Details', 'Relation'].includes(name)) continue;

    // Handle many-to-many (junction table created
    // separately by UserRole schema)
    if (typeof field === 'object' && field.many) continue;

    // Handle naturalKey
    if (name === 'naturalKey' && field.unique) {
      const cols = field.unique.map((col) => {
        const f = resolveType(schema[col]);
        const isFK = f && schemas.has(f.type || f);
        return isFK ? `"${col}Id"` : `"${col}"`;
      });
      uniqueConstraints.push(`UNIQUE (${cols.join(', ')})`);
      continue;
    }

    const sql = fieldToSQL(name, field, tableName, schemas);
    if (sql) columns.push(sql);
  }

  const allCols = [...columns, ...uniqueConstraints].join(',\n  ');
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${allCols}\n);`;
};

// Table creation order (respects foreign key dependencies)
const TABLE_ORDER = [
  'Organization',
  'Plan',
  'AIToolCatalog',
  'TrainingCourse',
  'RegulatoryUpdate',
  'User',
  'Invitation',
  'Role',
  'UserRole',
  'Permission',
  'Subscription',
  'AITool',
  'AIToolDiscovery',
  'RiskClassification',
  'Requirement',
  'ToolRequirement',
  'ClassificationLog',
  'TrainingModule',
  'LiteracyCompletion',
  'LiteracyRequirement',
  'ComplianceDocument',
  'DocumentSection',
  'ChecklistItem',
  'FRIAAssessment',
  'FRIASection',
  'Conversation',
  'ChatMessage',
  'ImpactAssessment',
  'Notification',
  'AuditLog',
  'RegistryTool',
  'Obligation',
  'ScoringRule',
  'ScoringWeight',
  'ApiKey',
  'ApiUsage',
  // New regulation tables (Phase 1)
  'RegulationMeta',
  'TechnicalRequirement',
  'TimelineEvent',
  'CrossMapping',
  'LocalizationTerm',
  'ApplicabilityNode',
  // Sprint 8: Gap Analysis, Audit Package, CLI Auth, CLI Sync
  'GapAnalysis',
  'AuditPackage',
  'DeviceCode',
  'SyncHistory',
];

// Migrations — idempotent ALTER TABLEs for existing databases
const MIGRATIONS = [
  `ALTER TABLE "Subscription"
   ADD COLUMN IF NOT EXISTS "stripePriceId" varchar`,
  `ALTER TABLE "Subscription"
   ADD COLUMN IF NOT EXISTS "billingPeriod" varchar DEFAULT 'monthly'`,
  `ALTER TABLE "Subscription"
   ADD COLUMN IF NOT EXISTS "trialEndsAt" timestamp with time zone`,
  // Sprint 7: Ory → WorkOS migration
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'User' AND column_name = 'oryId')
     THEN
       ALTER TABLE "User" RENAME COLUMN "oryId" TO "workosUserId";
     END IF;
   END $$`,
  `ALTER TABLE "Organization"
   ADD COLUMN IF NOT EXISTS "workosOrgId" varchar UNIQUE`,
  `ALTER TABLE "Requirement"
   ADD COLUMN IF NOT EXISTS "translations" jsonb DEFAULT '{}'`,
  // Sprint 8: FRIA multi-tenancy fix
  `ALTER TABLE "FRIAAssessment"
   ADD COLUMN IF NOT EXISTS "organizationId" bigint REFERENCES "Organization"("id") ON DELETE CASCADE`,
  // Sprint 9: CLI sync — allow cli_import as classification method
  `ALTER TABLE "RiskClassification" DROP CONSTRAINT IF EXISTS "RiskClassification_method_check"`,
  `ALTER TABLE "RiskClassification" ADD CONSTRAINT "RiskClassification_method_check"
   CHECK ("method" IN ('rule_only', 'rule_plus_llm', 'cross_validated', 'cli_import'))`,
  // Sprint 9: Backfill ToolRequirements for tools with riskLevel but no requirements
  `INSERT INTO "ToolRequirement" ("aiToolId", "requirementId", "status", "progress")
   SELECT t."aIToolId", r."requirementId", 'pending', 0
   FROM "AITool" t
   CROSS JOIN "Requirement" r
   WHERE t."riskLevel" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM "ToolRequirement" tr WHERE tr."aiToolId" = t."aIToolId"
     )
     AND (
       (t."riskLevel" = 'minimal' AND r."riskLevel" = 'minimal')
       OR (t."riskLevel" = 'limited' AND r."riskLevel" IN ('minimal', 'limited'))
       OR (t."riskLevel" = 'gpai' AND r."riskLevel" IN ('minimal', 'limited'))
       OR (t."riskLevel" = 'high' AND r."riskLevel" IN ('minimal', 'limited', 'high'))
       OR (t."riskLevel" = 'prohibited' AND r."riskLevel" = 'prohibited')
     )
   ON CONFLICT DO NOTHING`,
  // Sprint 9: CLI ↔ SaaS passport parity — new AITool columns
  `ALTER TABLE "AITool" ADD COLUMN IF NOT EXISTS "framework" varchar(100)`,
  `ALTER TABLE "AITool" ADD COLUMN IF NOT EXISTS "modelProvider" varchar(100)`,
  `ALTER TABLE "AITool" ADD COLUMN IF NOT EXISTS "modelId" varchar(255)`,
  `ALTER TABLE "AITool" ADD COLUMN IF NOT EXISTS "syncMetadata" jsonb`,
  // Sprint 9: Backfill classificationConfidence for CLI-synced tools
  `UPDATE "AITool" SET "classificationConfidence" = 50
   WHERE "riskLevel" IS NOT NULL
     AND "classificationConfidence" IS NULL
     AND EXISTS (
       SELECT 1 FROM "RiskClassification" rc
       WHERE rc."aiToolId" = "AITool"."aIToolId"
         AND rc."method" = 'cli_import'
         AND rc."isCurrent" = true
     )`,
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_user_org ON "User"("organizationId")',
  'CREATE INDEX IF NOT EXISTS idx_user_workos_id ON "User"("workosUserId")',
  'CREATE INDEX IF NOT EXISTS idx_aitool_org ON "AITool"("organizationId")',
  'CREATE INDEX IF NOT EXISTS idx_aitool_risk ON "AITool"("riskLevel")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_aitool_status ON "AITool"("complianceStatus")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_class_tool_current ' +
    'ON "RiskClassification"("aiToolId", "isCurrent")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_toolreq_tool ON "ToolRequirement"("aiToolId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_doc_tool ON "ComplianceDocument"("aiToolId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_conv_user ON "Conversation"("userId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_msg_conv ON "ChatMessage"("conversationId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_notif_org_user ' +
    'ON "Notification"("organizationId", "userId", "read")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_audit_org_time ON "AuditLog"("organizationId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_invitation_org ON "Invitation"("organizationId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_invitation_token ON "Invitation"("token")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_invitation_email_status ON "Invitation"("email", "status")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_registrytool_category ON "RegistryTool"("category")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_registrytool_risk ON "RegistryTool"("riskLevel")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_obligation_regulation ON "Obligation"("regulation")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_obligation_risk ON "Obligation"("riskLevel")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_apikey_hash ON "ApiKey"("keyHash")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_apikey_org ON "ApiKey"("organizationId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_fria_org ON "FRIAAssessment"("organizationId")',
  'CREATE INDEX IF NOT EXISTS ' +
    'idx_fria_tool ON "FRIAAssessment"("aiToolId")',
];

const loadSchemas = async () => {
  const schemas = new Map();
  const files = await fsp.readdir(SCHEMAS_DIR);
  for (const file of files) {
    if (!file.endsWith('.js') || file.startsWith('.')) continue;
    const name = path.basename(file, '.js');
    const filePath = path.join(SCHEMAS_DIR, file);
    const src = await fsp.readFile(filePath, 'utf8');
    const schema = vm.runInThisContext(src, { filename: filePath });
    schemas.set(name, schema);
  }
  return schemas;
};

const seedRequirements = async (client) => {
  const requirements = require(path.join(SEEDS_DIR, 'requirements.js'));
  for (const req of requirements) {
    await client.query(
      `INSERT INTO "Requirement"
       ("code", "name", "description",
       "articleReference", "riskLevel", "category",
       "sortOrder", "estimatedEffortHours", "guidance", "translations")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT ("code") DO UPDATE SET
         "name" = EXCLUDED."name",
         "description" = EXCLUDED."description",
         "guidance" = EXCLUDED."guidance",
         "translations" = EXCLUDED."translations"`,
      [req.code, req.name, req.description, req.articleReference,
        req.riskLevel, req.category, req.sortOrder,
        req.estimatedEffortHours || null, req.guidance || null,
        JSON.stringify(req.translations || {})],
    );
  }
  console.log(`  Seeded ${requirements.length} requirements`);
};

const seedPlans = async (client) => {
  const plans = require(path.join(SEEDS_DIR, 'plans.js'));
  for (const plan of plans) {
    await client.query(
      `INSERT INTO "Plan"
       ("name", "displayName", "priceMonthly",
       "priceYearly", "maxTools", "maxUsers",
       "maxEmployees", "features", "active",
       "sortOrder")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT ("name") DO NOTHING`,
      [plan.name, plan.displayName, plan.priceMonthly, plan.priceYearly,
        plan.maxTools, plan.maxUsers, plan.maxEmployees,
        JSON.stringify(plan.features), plan.active, plan.sortOrder],
    );
  }
  console.log(`  Seeded ${plans.length} plans`);
};

const seedRoles = async (client) => {
  const { roles, permissions } = require(path.join(SEEDS_DIR, 'roles.js'));
  for (const role of roles) {
    await client.query(
      `INSERT INTO "Role" ("name", "active", "organizationId")
       VALUES ($1, $2, $3)
       ON CONFLICT ("name") DO NOTHING`,
      [role.name, role.active, role.organizationId],
    );
  }
  for (const perm of permissions) {
    const roleResult = await client.query(
      'SELECT "roleId" FROM "Role" WHERE "name" = $1',
      [perm.role],
    );
    if (roleResult.rows.length === 0) continue;
    const roleId = roleResult.rows[0].roleId;
    await client.query(
      `INSERT INTO "Permission" ("roleId", "resource", "action")
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [roleId, perm.resource, perm.action],
    );
  }
  const msg = `  Seeded ${roles.length} roles,` +
    ` ${permissions.length} permissions`;
  console.log(msg);
};

const seedCourses = async (client) => {
  const courses = require(path.join(SEEDS_DIR, 'courses.js'));
  for (const course of courses) {
    const { modules, ...courseData } = course;
    const result = await client.query(
      `INSERT INTO "TrainingCourse"
       ("title", "slug", "roleTarget",
       "durationMinutes", "contentType",
       "description", "language", "version",
       "active", "sortOrder")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT ("slug") DO NOTHING
       RETURNING "trainingCourseId"`,
      [courseData.title, courseData.slug,
        courseData.roleTarget,
        courseData.durationMinutes,
        courseData.contentType,
        courseData.description,
        courseData.language, courseData.version,
        courseData.active, courseData.sortOrder],
    );
    if (result.rows.length === 0) continue;
    const courseId = result.rows[0].trainingCourseId;
    for (const mod of modules) {
      await client.query(
        `INSERT INTO "TrainingModule" ("courseId", "sortOrder", "title",
         "contentMarkdown", "quizQuestions", "durationMinutes")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [courseId, mod.sortOrder, mod.title,
          mod.contentMarkdown, JSON.stringify(mod.quizQuestions),
          mod.durationMinutes],
      );
    }
  }
  console.log(`  Seeded ${courses.length} courses with modules`);
};

const seedRegistryTools = async (client) => {
  const tools = require(path.join(SEEDS_DIR, 'registry-tools.js'));
  for (const tool of tools) {
    await client.query(
      `INSERT INTO "RegistryTool"
       ("name", "provider", "category", "riskLevel",
       "description", "websiteUrl", "vendorCountry",
       "dataResidency", "capabilities", "jurisdictions",
       "detectionPatterns", "evidence", "active")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT ("name") DO NOTHING`,
      [tool.name, JSON.stringify(tool.provider), tool.category, tool.riskLevel,
        tool.description, tool.websiteUrl, tool.vendorCountry,
        tool.dataResidency, JSON.stringify(tool.capabilities),
        JSON.stringify(tool.jurisdictions),
        JSON.stringify(tool.detectionPatterns),
        JSON.stringify(tool.evidence), tool.active],
    );
  }
  console.log(`  Seeded ${tools.length} registry tools`);
};

const seedObligations = async (client) => {
  const obligations = require(path.join(SEEDS_DIR, 'obligations.js'));
  for (const obl of obligations) {
    await client.query(
      `INSERT INTO "Obligation"
       ("code", "regulation", "name", "description",
       "articleReference", "riskLevel", "category",
       "checkCriteria", "sortOrder")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ("code") DO NOTHING`,
      [obl.code, obl.regulation, obl.name, obl.description,
        obl.articleReference, obl.riskLevel, obl.category,
        JSON.stringify(obl.checkCriteria), obl.sortOrder],
    );
  }
  console.log(`  Seeded ${obligations.length} obligations`);
};

const seedScoringRules = async (client) => {
  const rules = require(path.join(SEEDS_DIR, 'scoring-rules.js'));
  for (const rule of rules) {
    await client.query(
      `INSERT INTO "ScoringRule"
       ("regulation", "checkId", "weight", "maxScore",
       "riskLevel", "description")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("checkId") DO NOTHING`,
      [rule.regulation, rule.checkId, rule.weight, rule.maxScore,
        rule.riskLevel, rule.description],
    );
  }
  console.log(`  Seeded ${rules.length} scoring rules`);
};

const seedScoringWeights = async (client) => {
  const weights = require(path.join(SEEDS_DIR, 'scoring-weights.js'));
  for (const w of weights) {
    await client.query(
      `INSERT INTO "ScoringWeight"
       ("category", "weight", "label", "regulation")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("category") DO NOTHING`,
      [w.category, w.weight, w.label, 'eu-ai-act'],
    );
  }
  console.log(`  Seeded ${weights.length} scoring weights`);
};

const seedCatalog = async (client) => {
  const catalog = require(path.join(SEEDS_DIR, 'catalog.js'));
  for (const tool of catalog) {
    await client.query(
      `INSERT INTO "AIToolCatalog"
       ("name", "vendor", "vendorCountry",
       "category", "defaultRiskLevel", "domains",
       "description", "websiteUrl",
       "dataResidency", "active")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT ("name") DO NOTHING`,
      [tool.name, tool.vendor, tool.vendorCountry || null, tool.category,
        tool.defaultRiskLevel || null, JSON.stringify(tool.domains),
        tool.description || null, tool.websiteUrl || null,
        tool.dataResidency || null, tool.active],
    );
  }
  console.log(`  Seeded ${catalog.length} AI tools in catalog`);
};

const run = async () => {
  console.log('Loading schemas...');
  const schemas = await loadSchemas();
  console.log(`  Found ${schemas.size} schemas`);

  console.log('Connecting to database...');
  const pool = new pg.Pool(dbConfig);
  const client = await pool.connect();

  try {
    console.log('Creating tables...');
    for (const tableName of TABLE_ORDER) {
      const schema = schemas.get(tableName);
      if (!schema) {
        console.warn(`  WARNING: Schema not found for ${tableName}`);
        continue;
      }
      const ddl = generateDDL(tableName, schema, schemas);
      await client.query(ddl);
      console.log(`  Created: ${tableName}`);
    }

    console.log('\nRunning migrations...');
    for (const migration of MIGRATIONS) {
      await client.query(migration);
    }
    console.log(`  Applied ${MIGRATIONS.length} migrations`);

    console.log('\nCreating indexes...');
    for (const idx of INDEXES) {
      await client.query(idx);
    }
    console.log(`  Created ${INDEXES.length} indexes`);

    console.log('\nSeeding data...');
    await seedRequirements(client);
    await seedPlans(client);
    await seedRoles(client);
    await seedCourses(client);
    await seedCatalog(client);
    await seedRegistryTools(client);
    await seedObligations(client);
    await seedScoringRules(client);
    await seedScoringWeights(client);

    console.log('\nSetup complete!');
    console.log(`  Tables: ${TABLE_ORDER.length}`);
    console.log(`  Indexes: ${INDEXES.length}`);
  } catch (err) {
    console.error('Setup failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

const initDatabase = async (pool) => {
  console.log('Loading schemas...');
  const schemas = await loadSchemas();
  console.log(`  Found ${schemas.size} schemas`);

  const client = await pool.connect();
  try {
    console.log('Creating tables...');
    for (const tableName of TABLE_ORDER) {
      const schema = schemas.get(tableName);
      if (!schema) {
        console.warn(`  WARNING: Schema not found for ${tableName}`);
        continue;
      }
      const ddl = generateDDL(tableName, schema, schemas);
      await client.query(ddl);
    }
    console.log(`  Created ${TABLE_ORDER.length} tables`);

    console.log('Running migrations...');
    for (const migration of MIGRATIONS) {
      await client.query(migration);
    }
    console.log(`  Applied ${MIGRATIONS.length} migrations`);

    console.log('Creating indexes...');
    for (const idx of INDEXES) {
      await client.query(idx);
    }
    console.log(`  Created ${INDEXES.length} indexes`);

    console.log('Seeding data...');
    await seedRequirements(client);
    await seedPlans(client);
    await seedRoles(client);
    await seedCourses(client);
    await seedCatalog(client);
    // Skip seedRegistryTools — using migrated data from ~/complior (4,983 tools)
    // await seedRegistryTools(client);
    // Skip seedObligations/ScoringRules — using migrated data from ~/complior (108 obligations)
    // await seedObligations(client);
    // await seedScoringRules(client);

    console.log('Setup complete!');
    console.log(`  Tables: ${TABLE_ORDER.length}, Indexes: ${INDEXES.length}`);
  } finally {
    client.release();
  }
};

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  loadSchemas, generateDDL, run, initDatabase, TABLE_ORDER,
};
