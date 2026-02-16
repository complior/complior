({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/admin/overview',
  method: async ({ session }) => {
    const admin = await application.admin.requirePlatformAdmin.require(session);

    const result = await application.admin.getOverviewStats.getStats();

    await lib.audit.createAuditEntry({
      userId: admin.id,
      organizationId: admin.organizationId,
      action: 'read',
      resource: 'PlatformAdmin',
      resourceId: 0,
      newData: { endpoint: 'overview' },
    });

    return result;
  },
})
