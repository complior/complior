({
  export: async ({ documentId, userId, organizationId }) => {
    // Load document + sections
    const docResult = await db.query(
      `SELECT d.*, o."name" AS "organizationName"
       FROM "ComplianceDocument" d
       JOIN "Organization" o ON o."id" = d."organizationId"
       WHERE d."complianceDocumentId" = $1
       AND d."organizationId" = $2`,
      [documentId, organizationId],
    );

    if (docResult.rows.length === 0) {
      throw new errors.NotFoundError('ComplianceDocument', documentId);
    }

    const doc = docResult.rows[0];

    const sections = await db.query(
      `SELECT * FROM "DocumentSection"
       WHERE "documentId" = $1
       ORDER BY "sortOrder" ASC`,
      [documentId],
    );

    // Render HTML
    const html = domain.documents.htmlRenderer.render(
      doc, sections.rows, doc.organizationName,
    );

    // Convert to PDF via Gotenberg
    const pdfBuffer = await gotenberg.convertHtmlToPdf(html);

    // Upload to S3
    const slug = (doc.documentType || 'document').replace(/_/g, '-');
    const filename = `${slug}-${documentId}.pdf`;
    const key = s3.generateKey(organizationId, 'documents', filename);

    await s3.upload(key, pdfBuffer, 'application/pdf');

    // Update document with S3 key + set status to review
    await db.query(
      `UPDATE "ComplianceDocument"
       SET "fileUrl" = $1, "status" = 'review'
       WHERE "complianceDocumentId" = $2`,
      [key, documentId],
    );

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'update',
      resource: 'ComplianceDocument',
      resourceId: documentId,
      newData: { action: 'export_pdf', filename },
    });

    const signedUrl = await s3.getSignedUrl(key);

    return { fileUrl: signedUrl, filename };
  },
})
