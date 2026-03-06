({
  process: async ({ documents, organizationId, userId }) => {
    const { findToolBySlug, recordSyncHistory } = lib.syncHelpers;
    let created = 0;
    let updated = 0;
    const results = [];

    for (const doc of documents) {
      const toolId = doc.toolSlug
        ? await findToolBySlug(organizationId, doc.toolSlug)
        : null;

      // Find existing document by (aiToolId, documentType)
      let existing = null;
      if (toolId) {
        const existingResult = await db.query(
          `SELECT "complianceDocumentId", "version" FROM "ComplianceDocument"
           WHERE "aiToolId" = $1 AND "documentType" = $2
           LIMIT 1`,
          [toolId, doc.type],
        );
        if (existingResult.rows.length > 0) {
          existing = existingResult.rows[0];
        }
      }

      if (existing) {
        // Update existing document
        await db.query(
          `UPDATE "ComplianceDocument"
           SET "title" = $1, "version" = $2, "status" = 'draft',
               "metadata" = COALESCE("metadata", '{}'::jsonb) || $3::jsonb
           WHERE "complianceDocumentId" = $4`,
          [
            doc.title,
            (existing.version || 0) + 1,
            JSON.stringify({ source: 'cli', lastSyncAt: new Date().toISOString(), content: doc.content }),
            existing.complianceDocumentId,
          ],
        );
        updated++;
        results.push({ title: doc.title, type: doc.type, action: 'updated', id: existing.complianceDocumentId });
      } else if (toolId) {
        // Create new document
        const insertResult = await db.query(
          `INSERT INTO "ComplianceDocument"
           ("organizationId", "aiToolId", "createdById", "documentType", "title", "status", "metadata")
           VALUES ($1, $2, $3, $4, $5, 'draft', $6)
           RETURNING "complianceDocumentId"`,
          [
            organizationId, toolId, userId, doc.type, doc.title,
            JSON.stringify({ source: 'cli', content: doc.content, obligationId: doc.obligationId }),
          ],
        );
        created++;
        results.push({ title: doc.title, type: doc.type, action: 'created', id: insertResult.rows[0].complianceDocumentId });
      } else {
        results.push({ title: doc.title, type: doc.type, action: 'skipped', reason: 'tool_not_found' });
      }
    }

    await recordSyncHistory({
      organizationId, userId, syncType: 'document', status: 'success',
      toolSlug: 'batch',
      metadata: { created, updated, total: documents.length },
    });

    return { synced: created + updated, created, updated, results };
  },
})
