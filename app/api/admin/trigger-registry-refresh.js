/**
 * Manually trigger registry refresh job (admin only)
 */

({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/v1/admin/trigger-registry-refresh',
  method: async ({ user, application, pgboss }) => {
    // Check admin permission
    if (!user.permissions?.includes('admin:jobs')) {
      throw new errors.ForbiddenError('Admin permission required');
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
