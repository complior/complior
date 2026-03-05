({
  get: async ({ documentId, organizationId }) => {
    const result = await db.query(
      `SELECT d.*, t."name" AS "toolName", t."riskLevel" AS "toolRiskLevel"
       FROM "ComplianceDocument" d
       JOIN "AITool" t ON t."aIToolId" = d."aiToolId"
       WHERE d."complianceDocumentId" = $1
       AND d."organizationId" = $2`,
      [documentId, organizationId],
    );

    if (result.rows.length === 0) {
      throw new errors.NotFoundError('ComplianceDocument', documentId);
    }

    const doc = result.rows[0];

    const sections = await db.query(
      `SELECT * FROM "DocumentSection"
       WHERE "documentId" = $1
       ORDER BY "sortOrder" ASC`,
      [documentId],
    );

    return {
      document: {
        complianceDocumentId: doc.complianceDocumentId,
        aiToolId: doc.aiToolId,
        createdById: doc.createdById,
        documentType: doc.documentType,
        title: doc.title,
        version: doc.version,
        status: doc.status,
        fileUrl: doc.fileUrl,
        approvedById: doc.approvedById,
        approvedAt: doc.approvedAt,
      },
      sections: sections.rows,
      tool: {
        name: doc.toolName,
        riskLevel: doc.toolRiskLevel,
      },
    };
  },
})
