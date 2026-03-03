({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/fria/by-tool/:id',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'FRIAAssessment', 'read');

    let parsed;
    try {
      parsed = schemas.ToolIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid tool ID',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application.fria.getByTool.get({
      toolId: parsed.id,
      organizationId: user.organizationId,
    });
  },
})
