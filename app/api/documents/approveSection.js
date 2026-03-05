({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/documents/:id/sections/:sectionCode/approve',
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

    return application.documents.approveSection.approve({
      documentId: parsed.id,
      sectionCode: parsed.sectionCode,
      userId: user.id,
      organizationId: user.organizationId,
    });
  },
})
