({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/tools',
  method: async ({ body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'create');

    const tool = await application.inventory.registerTool.create({
      body: body || {},
      userId: user.id,
      organizationId: user.organizationId,
    });

    return { _statusCode: 201, ...tool };
  },
})
