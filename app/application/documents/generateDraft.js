({
  // Queue AI draft generation as a background job via pg-boss
  generate: async ({ documentId, sectionCode, userId, organizationId }) => {
    // Verify document exists + tenant check
    const docResult = await db.query(
      `SELECT d."complianceDocumentId", d."documentType", d."status"
       FROM "ComplianceDocument" d
       WHERE d."complianceDocumentId" = $1
       AND d."organizationId" = $2`,
      [documentId, organizationId],
    );

    if (docResult.rows.length === 0) {
      throw new errors.NotFoundError('ComplianceDocument', documentId);
    }

    const doc = docResult.rows[0];

    // Verify section exists and is not approved
    const sectionResult = await db.query(
      `SELECT * FROM "DocumentSection"
       WHERE "documentId" = $1 AND "sectionCode" = $2`,
      [documentId, sectionCode],
    );

    if (sectionResult.rows.length === 0) {
      throw new errors.NotFoundError('DocumentSection', sectionCode);
    }

    if (sectionResult.rows[0].status === 'approved') {
      throw new errors.ValidationError('Cannot regenerate an approved section');
    }

    // Mark section as generating (optimistic UI update)
    await db.query(
      `UPDATE "DocumentSection"
       SET "status" = 'empty'
       WHERE "documentId" = $1 AND "sectionCode" = $2`,
      [documentId, sectionCode],
    );

    // Auto-transition document draft → generating
    if (doc.status === 'draft') {
      await db.query(
        `UPDATE "ComplianceDocument" SET "status" = 'generating'
         WHERE "complianceDocumentId" = $1
         AND "organizationId" = $2`,
        [documentId, organizationId],
      );
    }

    // Queue background LLM job via pg-boss (when available)
    if (pgboss) {
      await pgboss.send('doc-section-generate', {
        documentId,
        sectionCode,
        userId,
        organizationId,
      });
    }

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'ComplianceDocument',
      resourceId: documentId,
      newData: { sectionCode, action: 'generate_draft_queued' },
    });

    return { documentId, sectionCode, status: 'queued' };
  },

  // Actual LLM generation — called by pg-boss worker or fallback
  processGeneration: async ({ documentId, sectionCode, organizationId }) => {
    const docResult = await db.query(
      `SELECT d."complianceDocumentId", d."documentType", d."status",
              t."name", t."vendorName", t."purpose", t."domain",
              t."riskLevel", t."dataTypes", t."affectedPersons",
              t."autonomyLevel", t."humanOversight"
       FROM "ComplianceDocument" d
       JOIN "AITool" t ON t."aIToolId" = d."aiToolId"
       WHERE d."complianceDocumentId" = $1
       AND d."organizationId" = $2`,
      [documentId, organizationId],
    );

    if (docResult.rows.length === 0) return;
    const doc = docResult.rows[0];

    const sectionResult = await db.query(
      `SELECT * FROM "DocumentSection"
       WHERE "documentId" = $1 AND "sectionCode" = $2`,
      [documentId, sectionCode],
    );

    if (sectionResult.rows.length === 0) return;
    const section = sectionResult.rows[0];

    const { systemPrompt, userPrompt } = domain.documents.prompts.buildPrompt(
      doc, doc.documentType, sectionCode, section.title,
    );

    const result = await llm.generateText({
      model: 'doc-writer',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const aiDraft = { text: result.text };
    const content = { text: result.text };

    await db.query(
      `UPDATE "DocumentSection"
       SET "content" = $1, "aiDraft" = $2, "status" = 'ai_generated'
       WHERE "documentId" = $3 AND "sectionCode" = $4`,
      [JSON.stringify(content), JSON.stringify(aiDraft), documentId, sectionCode],
    );
  },
})
