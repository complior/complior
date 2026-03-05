({
  init: async (ctx) => {
    const { pgboss, application, console: logger } = ctx;

    await pgboss.work('doc-section-generate', async (job) => {
      const { documentId, sectionCode, userId, organizationId } = job.data;
      logger.info(`Generating AI draft: doc=${documentId} section=${sectionCode}`);

      try {
        await application.documents.generateDraft.processGeneration({
          documentId, sectionCode, userId, organizationId,
        });
        logger.info(`AI draft complete: doc=${documentId} section=${sectionCode}`);
      } catch (error) {
        logger.error(`AI draft failed: doc=${documentId} section=${sectionCode} — ${error.message}`);
        throw error;
      }
    });
  },
})
