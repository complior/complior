({
  require: async (session) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    // Check RBAC permission
    await lib.permissions.checkPermission(user, 'PlatformAdmin', 'manage');

    // Check env whitelist (double gate)
    const adminEmails = config.server.platformAdminEmails;
    if (adminEmails.length > 0 && !adminEmails.includes(user.email)) {
      throw new errors.ForbiddenError('Not in admin whitelist');
    }

    return user;
  },
})
