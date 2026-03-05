({
  init: async (ctx) => {
    const { pgboss, application, console: logger } = ctx;

    await pgboss.work('audit-package-generate', async (job) => {
      const { auditPackageId, organizationId } = job.data;
      logger.info(`Processing audit package ${auditPackageId}`);
      try {
        await application.audit.generateAuditPackage.processPackage({
          auditPackageId,
          organizationId,
        });
        logger.info(`Audit package ${auditPackageId} completed`);
      } catch (err) {
        logger.error(err, `Audit package ${auditPackageId} failed`);
        throw err;
      }
    });

    logger.info('Audit package worker registered');
  },
})
