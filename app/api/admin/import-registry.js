/**
 * Trigger one-time registry import job (admin only).
 * Restores ~4983 tools from seed data into RegistryTool table.
 */

({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/admin/import-registry',
  method: async ({ session, headers }) => {
    const token = (headers || {})['x-admin-token'];
    if (token && config.server.adminApiToken && token === config.server.adminApiToken) {
      // Token auth OK
    } else {
      await application.admin.requirePlatformAdmin.require(session);
    }

    if (!pgboss) {
      throw new errors.BadRequestError('Job queue not available');
    }

    const jobId = await pgboss.send('registry-import', {
      manual: true,
      triggeredAt: new Date().toISOString(),
    });

    return {
      success: true,
      jobId,
      message: 'Registry import job queued. Check server logs for progress.',
    };
  },
});
