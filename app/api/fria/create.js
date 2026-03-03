({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/fria',
  method: async ({ body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'FRIAAssessment', 'create');

    const result = await application.fria.createAssessment.create({
      body: body || {},
      userId: user.id,
      organizationId: user.organizationId,
    });

    return { _statusCode: 201, ...result };
  },
})
