({
  download: async ({ documentId, organizationId }) => {
    const result = await db.query(
      `SELECT "fileUrl", "title", "documentType"
       FROM "ComplianceDocument"
       WHERE "complianceDocumentId" = $1
       AND "organizationId" = $2`,
      [documentId, organizationId],
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('ComplianceDocument', documentId);
    }

    const doc = result.rows[0];

    if (!doc.fileUrl) {
      throw new errors.ValidationError('PDF has not been exported yet');
    }

    const signedUrl = await s3.getSignedUrl(doc.fileUrl);
    const slug = (doc.documentType || 'document').replace(/_/g, '-');
    const filename = `${slug}-${documentId}.pdf`;

    return { fileUrl: signedUrl, filename };
  },
})
