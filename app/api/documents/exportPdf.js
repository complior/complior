({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/documents/:id/export-pdf',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'ComplianceDocument', 'update');

    let parsed;
    try {
      parsed = schemas.DocumentIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid document ID',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application.documents.exportPdf.export({
      documentId: parsed.id,
      userId: user.id,
      organizationId: user.organizationId,
    });
  },
})
