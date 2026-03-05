({
  access: 'authenticated',
  httpMethod: 'PUT',
  path: '/api/documents/:id/sections/:sectionCode',
  method: async ({ params, body, session }) => {
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

    return application.documents.updateSection.update({
      documentId: parsed.id,
      sectionCode: parsed.sectionCode,
      body: body || {},
      userId: user.id,
      organizationId: user.organizationId,
    });
  },
})
