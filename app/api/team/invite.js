({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/team/invite',
  method: async ({ body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'User', 'manage');

    const invitation = await application.iam.createInvitation.create({
      email: (body || {}).email,
      role: (body || {}).role,
      userId: user.id,
      organizationId: user.organizationId,
    });

    return { _statusCode: 201, ...invitation };
  },
})
