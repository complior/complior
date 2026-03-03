({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/fria/:id',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'FRIAAssessment', 'read');

    let parsed;
    try {
      parsed = schemas.FRIAIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid FRIA ID',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application.fria.getAssessment.get({
      assessmentId: parsed.id,
      organizationId: user.organizationId,
    });
  },
})
