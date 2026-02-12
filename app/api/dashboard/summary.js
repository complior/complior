[
  {
    access: 'authenticated',
    httpMethod: 'GET',
    path: '/api/dashboard/summary',
    method: async ({ session }) => {
      if (!session) throw new errors.AuthError();
      const user = await application.iam.resolveSession.resolveUser(session);
      await lib.permissions.checkPermission(user, 'AITool', 'read');

      return application.dashboard.getDashboardSummary.getSummary({
        userId: user.id,
        organizationId: user.organizationId,
        userRoles: user.roles,
      });
    },
  },
]
