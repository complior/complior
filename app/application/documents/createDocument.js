({
  create: async ({ body, userId, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.DocumentCreateSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid document data',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    // Plan enforcement: documents === 'full' required (Growth+)
    const sub = await db.query(
      `SELECT s.*, p."features"
       FROM "Subscription" s
       JOIN "Plan" p ON p."planId" = s."planId"
       WHERE s."organizationId" = $1
       AND s."status" IN ('active', 'trialing')
       LIMIT 1`,
      [organizationId],
    );

    if (sub.rows.length === 0) {
      throw new errors.NotFoundError('Subscription', organizationId);
    }

    const features = sub.rows[0].features;
    if (!features || (features.documents !== 'full' && !features.all)) {
      throw new errors.PlanLimitError('documents', 0, 0);
    }

    const tq = lib.tenant.createTenantQuery(organizationId);

    // Verify tool exists and belongs to this org
    const tool = await tq.findOne('AITool', parsed.toolId);
    if (!tool) throw new errors.NotFoundError('AITool', parsed.toolId);

    // Check no existing draft/generating/review doc of same type for this tool
    const existing = await db.query(
      `SELECT "complianceDocumentId" FROM "ComplianceDocument"
       WHERE "aiToolId" = $1 AND "organizationId" = $2
       AND "documentType" = $3
       AND "status" IN ('draft', 'generating', 'review')
       LIMIT 1`,
      [parsed.toolId, organizationId, parsed.documentType],
    );
    if (existing.rows.length > 0) {
      return {
        document: existing.rows[0],
        existing: true,
        complianceDocumentId: existing.rows[0].complianceDocumentId,
      };
    }

    const title = domain.documents.templates.getDocumentTitle(
      parsed.documentType, tool.name,
    );

    // Create document
    const document = await tq.create('ComplianceDocument', {
      aiToolId: parsed.toolId,
      createdById: userId,
      documentType: parsed.documentType,
      title,
      version: 1,
      status: 'draft',
    });

    // Generate pre-filled sections
    const sectionDefs = domain.documents.templates.getSections(parsed.documentType);
    const preFilled = domain.documents.preFill.generate(tool, parsed.documentType, sectionDefs);

    for (const section of preFilled) {
      await db.query(
        `INSERT INTO "DocumentSection"
         ("documentId", "sectionCode", "title", "content", "status", "sortOrder")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          document.complianceDocumentId,
          section.sectionCode,
          (sectionDefs.find(
            (s) => s.sectionCode === section.sectionCode,
          ) || {}).title || section.sectionCode,
          JSON.stringify(section.content),
          'empty',
          (sectionDefs.find((s) => s.sectionCode === section.sectionCode) || {}).sortOrder || 0,
        ],
      );
    }

    // Load created sections
    const sections = await db.query(
      `SELECT * FROM "DocumentSection"
       WHERE "documentId" = $1 ORDER BY "sortOrder" ASC`,
      [document.complianceDocumentId],
    );

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'create',
      resource: 'ComplianceDocument',
      resourceId: document.complianceDocumentId,
      newData: { toolId: parsed.toolId, documentType: parsed.documentType },
    });

    return {
      document,
      sections: sections.rows,
      complianceDocumentId: document.complianceDocumentId,
    };
  },
})
