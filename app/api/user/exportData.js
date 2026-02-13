({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/user/export',
  method: async ({ session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    const data = await application.iam.exportUserData.exportAll({
      userId: user.id,
      organizationId: user.organizationId,
    });

    return data;
  },
})
