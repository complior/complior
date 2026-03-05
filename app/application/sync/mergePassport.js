({
  merge: async ({ passport, organizationId, userId }) => {
    const AUTONOMY_MAP = { L1: 'advisory', L2: 'advisory', L3: 'semi_autonomous', L4: 'autonomous', L5: 'autonomous' };
    const STATUS_MAP = { draft: 'not_started', review: 'review', active: 'compliant', suspended: 'non_compliant', retired: 'non_compliant' };
    const ALLOWED_UPDATE_FIELDS = new Set([
      'vendorName', 'vendorUrl', 'description', 'purpose', 'domain',
      'autonomyLevel', 'complianceScore', 'complianceStatus', 'riskLevel',
      'classificationConfidence', 'wizardStep',
      'framework', 'modelProvider', 'modelId', 'syncMetadata', 'dataResidency',
    ]);

    const slug = passport.slug || passport.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const mapAutonomy = (level) => AUTONOMY_MAP[level] || 'advisory';
    const mapStatus = (status) => STATUS_MAP[status] || 'in_progress';

    // Compute wizard step based on available CLI data
    // Step 1 = name + vendor (always done — name is required)
    // Step 2 = purpose + domain (done if CLI provides both)
    // Steps 3-4 = deployer-specific (dataTypes, affectedPersons, humanOversight)
    const computeWizardStep = (p) => {
      if (p.purpose && p.domain) return 2;
      return 1;
    };

    // Create RiskClassification record for CLI-imported risk
    const createCliClassification = async (toolId, riskLevel) => {
      // Mark previous classifications as not current
      await db.query(
        `UPDATE "RiskClassification" SET "isCurrent" = false
         WHERE "aiToolId" = $1 AND "isCurrent" = true`,
        [toolId],
      );

      // Get next version number
      const versionResult = await db.query(
        `SELECT COALESCE(MAX("version"), 0) + 1 AS "nextVersion"
         FROM "RiskClassification" WHERE "aiToolId" = $1`,
        [toolId],
      );
      const nextVersion = versionResult.rows[0].nextVersion;

      await db.query(
        `INSERT INTO "RiskClassification"
         ("aiToolId", "riskLevel", "confidence", "reasoning",
          "ruleResult", "articleReferences", "method",
          "version", "isCurrent", "classifiedById")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)`,
        [
          toolId, riskLevel, 50,
          'Imported from CLI passport scan',
          JSON.stringify({ riskLevel, confidence: 50, matchedRules: [] }),
          JSON.stringify([]),
          'cli_import',
          nextVersion, userId,
        ],
      );
    };

    // Find existing tool by name match
    const existing = await db.query(
      `SELECT * FROM "AITool" WHERE "organizationId" = $1 AND (LOWER("name") = LOWER($2) OR "name" = $3) LIMIT 1`,
      [organizationId, passport.name, passport.name],
    );

    const conflicts = [];

    if (existing.rows.length > 0) {
      const tool = existing.rows[0];
      const updates = {};

      // Technical fields — CLI wins
      if (passport.vendorName && passport.vendorName !== tool.vendorName) updates.vendorName = passport.vendorName;
      if (passport.vendorUrl && passport.vendorUrl !== tool.vendorUrl) updates.vendorUrl = passport.vendorUrl;
      if (passport.description && passport.description !== tool.description) updates.description = passport.description;

      // Organizational fields — SaaS wins (log conflict)
      if (passport.purpose && passport.purpose !== tool.purpose && tool.purpose) {
        conflicts.push({ field: 'purpose', cli: passport.purpose, saas: tool.purpose, resolution: 'saas_wins' });
      } else if (passport.purpose && !tool.purpose) {
        updates.purpose = passport.purpose;
      }

      // Last write wins
      if (passport.domain && passport.domain !== tool.domain) updates.domain = passport.domain;

      // riskLevel — SaaS wins if already classified differently
      let shouldCreateClassification = false;
      if (passport.riskLevel) {
        if (tool.riskLevel && tool.riskLevel !== passport.riskLevel) {
          conflicts.push({ field: 'riskLevel', cli: passport.riskLevel, saas: tool.riskLevel, resolution: 'saas_wins' });
        } else if (!tool.riskLevel) {
          updates.riskLevel = passport.riskLevel;
          updates.classificationConfidence = 50;
          shouldCreateClassification = true;
        }
        // If same risk level — no-op
      }

      // wizardStep — auto-advance, never downgrade
      const cliStep = computeWizardStep(passport);
      const currentStep = tool.wizardStep || 1;
      const newStep = Math.max(currentStep, cliStep);
      if (newStep > currentStep) updates.wizardStep = newStep;

      // Extended fields
      if (passport.autonomyLevel) updates.autonomyLevel = mapAutonomy(passport.autonomyLevel);
      if (passport.compliorScore !== undefined && passport.compliorScore !== null) updates.complianceScore = passport.compliorScore;
      if (passport.lifecycleStatus) updates.complianceStatus = mapStatus(passport.lifecycleStatus);

      // Technical stack fields — CLI wins
      if (passport.framework) updates.framework = passport.framework;
      if (passport.modelProvider) updates.modelProvider = passport.modelProvider;
      if (passport.modelId) updates.modelId = passport.modelId;
      if (passport.dataResidency) updates.dataResidency = passport.dataResidency;

      // syncMetadata — merge CLI-only fields
      const meta = {};
      if (passport.detectionPatterns) meta.detectionPatterns = passport.detectionPatterns;
      if (passport.versions) meta.versions = passport.versions;
      if (passport.manifestVersion) meta.manifestVersion = passport.manifestVersion;
      if (passport.signature) meta.signature = passport.signature;
      if (passport.extendedFields) meta.extendedFields = passport.extendedFields;
      if (Object.keys(meta).length > 0) {
        const existing = typeof tool.syncMetadata === 'string'
          ? JSON.parse(tool.syncMetadata)
          : (tool.syncMetadata || {});
        updates.syncMetadata = JSON.stringify({ ...existing, ...meta });
      }

      // complianceStatus — upgrade to in_progress if riskLevel is being set
      if (shouldCreateClassification && (!tool.complianceStatus || tool.complianceStatus === 'not_started')) {
        updates.complianceStatus = 'in_progress';
      }

      // Apply updates (with field allowlist for SQL safety)
      const fields = Object.keys(updates).filter((f) => ALLOWED_UPDATE_FIELDS.has(f));
      if (fields.length > 0) {
        const setClauses = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');
        const values = [...fields.map((f) => updates[f]), tool.aIToolId, organizationId];
        await db.query(
          `UPDATE "AITool" SET ${setClauses} WHERE "aIToolId" = $${values.length - 1} AND "organizationId" = $${values.length}`,
          values,
        );
      }

      // Create RiskClassification record if CLI provides new risk
      if (shouldCreateClassification) {
        await createCliClassification(tool.aIToolId, passport.riskLevel);
      }

      await db.query(
        `INSERT INTO "SyncHistory" ("organizationId", "userId", "source", "syncType", "status", "toolSlug", "conflicts", "metadata")
         VALUES ($1, $2, 'cli', 'passport', $3, $4, $5, $6)`,
        [
          organizationId, userId,
          conflicts.length > 0 ? 'conflict' : 'success',
          slug,
          conflicts.length > 0 ? JSON.stringify(conflicts) : null,
          JSON.stringify({ merged: true, fieldsUpdated: fields.length }),
        ],
      );

      // Determine if requirements need mapping:
      // 1) New classification just created, or
      // 2) Tool already has riskLevel but no ToolRequirement records (backfill)
      let mapRiskLevel = shouldCreateClassification ? passport.riskLevel : null;
      if (!mapRiskLevel && tool.riskLevel) {
        const reqCheck = await db.query(
          `SELECT COUNT(*)::int AS c FROM "ToolRequirement" WHERE "aiToolId" = $1`,
          [tool.aIToolId],
        );
        if (reqCheck.rows[0].c === 0) mapRiskLevel = tool.riskLevel;
      }

      return {
        action: 'updated', toolId: tool.aIToolId, conflicts, fieldsUpdated: fields.length,
        mapRiskLevel,
      };
    }

    // Create new tool — all fields in single INSERT (no redundant UPDATE)
    const mappedAutonomy = passport.autonomyLevel ? mapAutonomy(passport.autonomyLevel) : 'advisory';
    const hasRisk = !!passport.riskLevel;
    const mappedStatus = passport.lifecycleStatus
      ? mapStatus(passport.lifecycleStatus)
      : (hasRisk ? 'in_progress' : 'not_started');
    const wizardStep = computeWizardStep(passport);

    // Build syncMetadata for CREATE
    const createMeta = {};
    if (passport.detectionPatterns) createMeta.detectionPatterns = passport.detectionPatterns;
    if (passport.versions) createMeta.versions = passport.versions;
    if (passport.manifestVersion) createMeta.manifestVersion = passport.manifestVersion;
    if (passport.signature) createMeta.signature = passport.signature;
    if (passport.extendedFields) createMeta.extendedFields = passport.extendedFields;
    const syncMetadataJson = Object.keys(createMeta).length > 0 ? JSON.stringify(createMeta) : null;

    const insertResult = await db.query(
      `INSERT INTO "AITool" ("organizationId", "createdById", "name", "vendorName", "vendorUrl",
       "description", "purpose", "domain", "dataTypes", "affectedPersons",
       "autonomyLevel", "complianceScore", "complianceStatus", "riskLevel",
       "classificationConfidence", "affectsNaturalPersons", "wizardStep", "wizardCompleted",
       "framework", "modelProvider", "modelId", "syncMetadata", "dataResidency")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false, $16, false,
       $17, $18, $19, $20, $21)
       RETURNING "aIToolId"`,
      [
        organizationId, userId, passport.name,
        passport.vendorName || '', passport.vendorUrl || null,
        passport.description || null, passport.purpose || '',
        passport.domain || 'other',
        JSON.stringify([]), JSON.stringify([]),
        mappedAutonomy, passport.compliorScore ?? null, mappedStatus,
        passport.riskLevel || null,
        hasRisk ? 50 : null,
        wizardStep,
        passport.framework || null,
        passport.modelProvider || null,
        passport.modelId || null,
        syncMetadataJson,
        passport.dataResidency || null,
      ],
    );

    const newToolId = insertResult.rows[0].aIToolId;

    // Create RiskClassification record if CLI provides risk level
    if (hasRisk) {
      await createCliClassification(newToolId, passport.riskLevel);
    }

    await db.query(
      `INSERT INTO "SyncHistory" ("organizationId", "userId", "source", "syncType", "status", "toolSlug", "metadata")
       VALUES ($1, $2, 'cli', 'passport', 'success', $3, $4)`,
      [organizationId, userId, slug, JSON.stringify({ merged: false, created: true })],
    );

    return {
      action: 'created', toolId: newToolId, conflicts: [],
      mapRiskLevel: hasRisk ? passport.riskLevel : null,
    };
  },
})
