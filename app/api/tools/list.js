({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/tools',
  method: async ({ query, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'AITool', 'read');

    return application.inventory.listTools.list({
      query,
      organizationId: user.organizationId,
    });
  },
})
