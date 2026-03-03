({
  create: async ({ body, userId, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.FRIACreateSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid FRIA data',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const tq = lib.tenant.createTenantQuery(organizationId);

    // Verify tool exists and belongs to this org
    const tool = await tq.findOne('AITool', parsed.toolId);
    if (!tool) throw new errors.NotFoundError('AITool', parsed.toolId);

    // Check no existing non-completed FRIA for this tool
    const existing = await db.query(
      `SELECT "fRIAAssessmentId" FROM "FRIAAssessment"
       WHERE "aiToolId" = $1 AND "organizationId" = $2
       AND "status" != 'completed'
       LIMIT 1`,
      [parsed.toolId, organizationId],
    );
    if (existing.rows.length > 0) {
      return {
        assessment: existing.rows[0],
        existing: true,
        fRIAAssessmentId: existing.rows[0].fRIAAssessmentId,
      };
    }

    // Create assessment
    const assessment = await tq.create('FRIAAssessment', {
      aiToolId: parsed.toolId,
      createdById: userId,
      status: 'draft',
      affectedPersons: JSON.stringify([]),
      risks: JSON.stringify([]),
      oversightMeasures: JSON.stringify([]),
      mitigation: JSON.stringify([]),
    });

    // Generate pre-filled sections from tool data
    const sectionTemplates = domain.fria.preFill.generate(tool);

    for (const tmpl of sectionTemplates) {
      await db.query(
        `INSERT INTO "FRIASection"
         ("friaId", "sectionType", "content", "completed", "sortOrder")
         VALUES ($1, $2, $3, $4, $5)`,
        [
          assessment.fRIAAssessmentId,
          tmpl.sectionType,
          JSON.stringify(tmpl.content),
          false,
          tmpl.sortOrder,
        ],
      );
    }

    // Load created sections
    const sections = await db.query(
      `SELECT * FROM "FRIASection"
       WHERE "friaId" = $1 ORDER BY "sortOrder" ASC`,
      [assessment.fRIAAssessmentId],
    );

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'create',
      resource: 'FRIAAssessment',
      resourceId: assessment.fRIAAssessmentId,
      newData: { toolId: parsed.toolId, toolName: tool.name },
    });

    return {
      assessment,
      sections: sections.rows,
      fRIAAssessmentId: assessment.fRIAAssessmentId,
    };
  },
})
