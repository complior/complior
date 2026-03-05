({
  approve: async ({ documentId, userId, organizationId }) => {
    // Verify document exists + tenant check
    const docResult = await db.query(
      `SELECT d.*
       FROM "ComplianceDocument" d
       WHERE d."complianceDocumentId" = $1
       AND d."organizationId" = $2`,
      [documentId, organizationId],
    );

    if (docResult.rows.length === 0) {
      throw new errors.NotFoundError('ComplianceDocument', documentId);
    }

    const doc = docResult.rows[0];
    if (doc.status === 'approved') {
      return doc; // idempotent
    }
    if (doc.status === 'archived') {
      throw new errors.ValidationError('Cannot approve an archived document');
    }

    // Check all sections are approved
    const sections = await db.query(
      `SELECT "sectionCode", "status"
       FROM "DocumentSection"
       WHERE "documentId" = $1
       ORDER BY "sortOrder" ASC`,
      [documentId],
    );

    const unapproved = sections.rows.filter((s) => s.status !== 'approved');
    if (unapproved.length > 0) {
      const codes = unapproved.map((s) => s.sectionCode).join(', ');
      throw new errors.ValidationError(
        `All sections must be approved before approving the document. Unapproved: ${codes}`,
      );
    }

    // Approve document
    const updated = await db.query(
      `UPDATE "ComplianceDocument"
       SET "status" = 'approved',
           "approvedById" = $1,
           "approvedAt" = NOW()
       WHERE "complianceDocumentId" = $2
       AND "organizationId" = $3
       RETURNING *`,
      [userId, documentId, organizationId],
    );

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'ComplianceDocument',
      resourceId: documentId,
      newData: { action: 'approve_document' },
    });

    return updated.rows[0];
  },
})
