({
  update: async ({ documentId, sectionCode, body, userId, organizationId }) => {
    let parsed;
    try {
      parsed = schemas.DocumentSectionUpdateSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid section data',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    // Verify document exists + tenant check
    const docResult = await db.query(
      `SELECT d."complianceDocumentId", d."status"
       FROM "ComplianceDocument" d
       WHERE d."complianceDocumentId" = $1
       AND d."organizationId" = $2`,
      [documentId, organizationId],
    );

    if (docResult.rows.length === 0) {
      throw new errors.NotFoundError('ComplianceDocument', documentId);
    }

    const doc = docResult.rows[0];

    if (doc.status === 'approved' || doc.status === 'archived') {
      throw new errors.ValidationError(
        'Cannot edit an approved or archived document',
      );
    }

    // Check section-level approval lock
    const sectionCheck = await db.query(
      `SELECT "status" FROM "DocumentSection"
       WHERE "documentId" = $1 AND "sectionCode" = $2`,
      [documentId, sectionCode],
    );
    if (sectionCheck.rows.length === 0) {
      throw new errors.NotFoundError('DocumentSection', sectionCode);
    }
    if (sectionCheck.rows[0].status === 'approved') {
      throw new errors.ValidationError(
        'Cannot edit an approved section. Revoke approval first.',
      );
    }

    // Update section
    const result = await db.query(
      `UPDATE "DocumentSection"
       SET "content" = $1, "status" = 'editing'
       WHERE "documentId" = $2 AND "sectionCode" = $3
       RETURNING *`,
      [JSON.stringify(parsed.content), documentId, sectionCode],
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('DocumentSection', sectionCode);
    }

    // Auto-transition draft → generating on first edit
    if (doc.status === 'draft') {
      await db.query(
        `UPDATE "ComplianceDocument" SET "status" = 'generating'
         WHERE "complianceDocumentId" = $1
         AND "organizationId" = $2`,
        [documentId, organizationId],
      );
    }

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'ComplianceDocument',
      resourceId: documentId,
      newData: { sectionCode },
    });

    return result.rows[0];
  },
})
