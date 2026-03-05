({
  approve: async ({ documentId, sectionCode, userId, organizationId }) => {
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
      throw new errors.ValidationError('Document is already approved or archived');
    }

    // Verify section exists and has content
    const sectionResult = await db.query(
      `SELECT * FROM "DocumentSection"
       WHERE "documentId" = $1 AND "sectionCode" = $2`,
      [documentId, sectionCode],
    );

    if (sectionResult.rows.length === 0) {
      throw new errors.NotFoundError('DocumentSection', sectionCode);
    }

    const section = sectionResult.rows[0];
    if (section.status === 'empty') {
      throw new errors.ValidationError('Cannot approve a section with no content');
    }
    if (section.status === 'approved') {
      return section; // idempotent
    }

    const updated = await db.query(
      `UPDATE "DocumentSection"
       SET "status" = 'approved'
       WHERE "documentId" = $1 AND "sectionCode" = $2
       RETURNING *`,
      [documentId, sectionCode],
    );

    // Auto-transition document to 'review' if not already
    if (doc.status === 'draft' || doc.status === 'generating') {
      await db.query(
        `UPDATE "ComplianceDocument" SET "status" = 'review'
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
      newData: { sectionCode, action: 'approve_section' },
    });

    return updated.rows[0];
  },

  revoke: async ({ documentId, sectionCode, userId, organizationId }) => {
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

    if (docResult.rows[0].status === 'approved') {
      throw new errors.ValidationError(
        'Cannot revoke section approval on an approved document',
      );
    }

    const updated = await db.query(
      `UPDATE "DocumentSection"
       SET "status" = 'reviewed'
       WHERE "documentId" = $1 AND "sectionCode" = $2
       AND "status" = 'approved'
       RETURNING *`,
      [documentId, sectionCode],
    );

    if (updated.rows.length === 0) {
      throw new errors.NotFoundError('DocumentSection', sectionCode);
    }

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'ComplianceDocument',
      resourceId: documentId,
      newData: { sectionCode, action: 'revoke_section_approval' },
    });

    return updated.rows[0];
  },
})
