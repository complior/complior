({
  process: async ({ payload, organizationId, userId }) => {
    const SECTION_TYPES = [
      'general_info', 'affected_persons', 'specific_risks',
      'human_oversight', 'mitigation_measures', 'monitoring_plan',
    ];

    const { findToolBySlug, recordSyncHistory, parseJsonField } = lib.syncHelpers;

    const toolId = await findToolBySlug(organizationId, payload.toolSlug);
    if (!toolId) return { action: 'skipped', reason: 'tool_not_found', assessmentId: null };

    // Check existing FRIAAssessment (non-completed)
    const existingResult = await db.query(
      `SELECT "fRIAAssessmentId", "status" FROM "FRIAAssessment"
       WHERE "aiToolId" = $1 AND "organizationId" = $2
       AND "status" != 'completed'
       LIMIT 1`,
      [toolId, organizationId],
    );

    // Skip if assessment is already in_progress or review (SaaS wins)
    if (existingResult.rows.length > 0 && existingResult.rows[0].status !== 'draft') {
      await recordSyncHistory({
        organizationId, userId, syncType: 'fria', status: 'conflict',
        toolSlug: payload.toolSlug,
        conflicts: [{ field: 'status', resolution: 'saas_wins', reason: 'assessment_in_progress' }],
        metadata: { assessmentId: payload.assessmentId },
      });
      return {
        action: 'skipped',
        reason: 'assessment_in_progress',
        assessmentId: existingResult.rows[0].fRIAAssessmentId,
      };
    }

    if (existingResult.rows.length > 0) {
      const friaId = await mergeDraftAssessment(
        existingResult.rows[0].fRIAAssessmentId, payload, SECTION_TYPES,
      );
      await recordSyncHistory({
        organizationId, userId, syncType: 'fria', status: 'success',
        toolSlug: payload.toolSlug,
        metadata: { assessmentId: payload.assessmentId, action: 'updated' },
      });
      return { action: 'updated', assessmentId: friaId, reason: null };
    }

    const friaId = await createAssessment(
      organizationId, toolId, userId, payload, SECTION_TYPES,
    );
    await recordSyncHistory({
      organizationId, userId, syncType: 'fria', status: 'success',
      toolSlug: payload.toolSlug,
      metadata: { assessmentId: payload.assessmentId, action: 'created' },
    });
    return { action: 'created', assessmentId: friaId, reason: null };

    // --- Private helpers ---

    // Merge CLI data into empty SaaS fields (SaaS non-empty preserved)
    function mergeSection(existing, incoming) {
      if (!existing || typeof existing !== 'object') return incoming;
      const merged = { ...existing };
      for (const [key, value] of Object.entries(incoming)) {
        const existingVal = existing[key];
        const isEmpty = existingVal === '' || existingVal === null
          || existingVal === undefined
          || (Array.isArray(existingVal) && existingVal.length === 0);
        if (isEmpty && value !== '' && value !== null
            && (!Array.isArray(value) || value.length > 0)) {
          merged[key] = value;
        }
      }
      return merged;
    }

    async function mergeDraftAssessment(friaId, data, sectionTypes) {
      // Merge assessment-level JSON fields
      const assessmentResult = await db.query(
        `SELECT "affectedPersons", "risks", "oversightMeasures", "mitigation"
         FROM "FRIAAssessment" WHERE "fRIAAssessmentId" = $1`,
        [friaId],
      );
      const assessment = assessmentResult.rows[0];

      const existingPersons = parseJsonField(assessment.affectedPersons, []);
      const existingRisks = parseJsonField(assessment.risks, []);
      const existingOversight = parseJsonField(assessment.oversightMeasures, []);
      const existingMitigation = parseJsonField(assessment.mitigation, []);

      const mergedPersons = existingPersons.length > 0
        ? existingPersons : data.sections.affected_persons.categories;
      const mergedRisks = existingRisks.length > 0
        ? existingRisks : data.sections.specific_risks.risks;
      const mergedOversight = existingOversight.length > 0
        ? existingOversight : [data.sections.human_oversight];
      const mergedMitigation = existingMitigation.length > 0
        ? existingMitigation : data.sections.mitigation_measures.measures;

      await db.query(
        `UPDATE "FRIAAssessment" SET
           "affectedPersons" = $1, "risks" = $2,
           "oversightMeasures" = $3, "mitigation" = $4
         WHERE "fRIAAssessmentId" = $5`,
        [
          JSON.stringify(mergedPersons), JSON.stringify(mergedRisks),
          JSON.stringify(mergedOversight), JSON.stringify(mergedMitigation),
          friaId,
        ],
      );

      // Merge each section
      for (let i = 0; i < sectionTypes.length; i++) {
        const sectionType = sectionTypes[i];
        const incoming = data.sections[sectionType];

        const sectionResult = await db.query(
          `SELECT "fRIASectionId", "content" FROM "FRIASection"
           WHERE "friaId" = $1 AND "sectionType" = $2 LIMIT 1`,
          [friaId, sectionType],
        );

        if (sectionResult.rows.length > 0) {
          const existingContent = parseJsonField(sectionResult.rows[0].content, {});
          const merged = mergeSection(existingContent, incoming);
          await db.query(
            `UPDATE "FRIASection" SET "content" = $1 WHERE "fRIASectionId" = $2`,
            [JSON.stringify(merged), sectionResult.rows[0].fRIASectionId],
          );
        } else {
          await db.query(
            `INSERT INTO "FRIASection" ("friaId", "sectionType", "content", "completed", "sortOrder")
             VALUES ($1, $2, $3, false, $4)`,
            [friaId, sectionType, JSON.stringify(incoming), i],
          );
        }
      }

      return friaId;
    }

    async function createAssessment(orgId, aiToolId, createdById, data, sectionTypes) {
      const insertResult = await db.query(
        `INSERT INTO "FRIAAssessment"
         ("organizationId", "aiToolId", "createdById", "status",
          "affectedPersons", "risks", "oversightMeasures", "mitigation")
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7)
         RETURNING "fRIAAssessmentId"`,
        [
          orgId, aiToolId, createdById,
          JSON.stringify(data.sections.affected_persons.categories),
          JSON.stringify(data.sections.specific_risks.risks),
          JSON.stringify([data.sections.human_oversight]),
          JSON.stringify(data.sections.mitigation_measures.measures),
        ],
      );

      const friaId = insertResult.rows[0].fRIAAssessmentId;

      for (let i = 0; i < sectionTypes.length; i++) {
        await db.query(
          `INSERT INTO "FRIASection" ("friaId", "sectionType", "content", "completed", "sortOrder")
           VALUES ($1, $2, $3, false, $4)`,
          [friaId, sectionTypes[i], JSON.stringify(data.sections[sectionTypes[i]]), i],
        );
      }

      return friaId;
    }
  },
})
