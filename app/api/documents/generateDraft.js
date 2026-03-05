({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/documents/:id/sections/:sectionCode/generate',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'ComplianceDocument', 'update');

    let parsed;
    try {
      parsed = schemas.DocumentSectionParamsSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid parameters',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.documents.generateDraft.generate({
      documentId: parsed.id,
      sectionCode: parsed.sectionCode,
      userId: user.id,
      organizationId: user.organizationId,
    });

    // Fallback: when pg-boss is unavailable (dev), run synchronously
    if (!pgboss) {
      await application.documents.generateDraft.processGeneration({
        documentId: parsed.id,
        sectionCode: parsed.sectionCode,
        userId: user.id,
        organizationId: user.organizationId,
      });

      // Return the updated section for immediate display
      const updated = await db.query(
        `SELECT ds.* FROM "DocumentSection" ds
         JOIN "ComplianceDocument" cd ON cd."complianceDocumentId" = ds."documentId"
         WHERE ds."documentId" = $1 AND ds."sectionCode" = $2
         AND cd."organizationId" = $3`,
        [parsed.id, parsed.sectionCode, user.organizationId],
      );
      if (updated.rows.length > 0) return updated.rows[0];
    }

    return result;
  },
})
