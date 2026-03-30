/**
 * Manually trigger registry refresh job (admin only)
 */

({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/admin/trigger-registry-refresh',
  method: async ({ session, headers }) => {
    // Support both session auth and admin API token
    const token = (headers || {})['x-admin-token'];
    if (token && config.server.adminApiToken && token === config.server.adminApiToken) {
      // Token auth OK
    } else {
      await application.admin.requirePlatformAdmin.require(session);
    }

    if (!pgboss) {
      throw new errors.BadRequestError('Job queue not available');
    }

    if (!application?.jobs?.scheduleRegistryRefresh) {
      throw new errors.BadRequestError('Registry refresh job not configured');
    }

    try {
      const result = await application.jobs.scheduleRegistryRefresh.trigger({
        pgboss,
        console,
      });

      return {
        success: true,
        jobId: result.jobId,
        message: 'Registry refresh job triggered successfully',
      };
    } catch (error) {
      console.error('Failed to trigger registry refresh:', error);
      throw new errors.InternalServerError('Failed to trigger registry refresh');
    }
  },
});
