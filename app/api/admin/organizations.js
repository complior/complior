({
  access: 'authenticated',
  httpMethod: 'GET',
  path: '/api/admin/organizations',
  method: async ({ session, query }) => {
    const admin = await application.admin.requirePlatformAdmin.require(session);

    let parsed;
    try {
      parsed = schemas.AdminSubscriptionSchema.parse(query || {});
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid query parameters', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.admin.listAllOrganizations.list(parsed);

    await lib.audit.createAuditEntry({
      userId: admin.id,
      organizationId: admin.organizationId,
      action: 'read',
      resource: 'PlatformAdmin',
      resourceId: 0,
      newData: { endpoint: 'organizations', query: parsed },
    });

    return result;
  },
})
