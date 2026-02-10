({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/auth/me',
  method: async ({ session }) => {
    if (!session) {
      throw new errors.AuthError('Not authenticated');
    }

    const user = await application.iam.syncUserFromOry.syncOnLogin(session);
    if (!user) {
      throw new errors.AuthError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId,
      locale: user.locale,
      roles: user.roles || [],
      active: user.active,
    };
  },
})
