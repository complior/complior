({
  access: 'authenticated',
  httpMethod: 'PUT',
  path: '/api/fria/:id/status',
  method: async ({ params, body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'FRIAAssessment', 'update');

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

    return application.fria.updateStatus.update({
      assessmentId: parsed.id,
      body: body || {},
      userId: user.id,
      organizationId: user.organizationId,
    });
  },
})
