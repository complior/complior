/**
 * Schedule Detection Pattern Enrichment Job
 *
 * Weekly pg-boss job that enriches RegistryTool.detectionPatterns
 * for verified/scanned tools that currently have no detection data.
 *
 * Schedule: Every Wednesday at 03:00 UTC
 * Job name: enrich-detection-patterns
 */

({
  /**
   * Initialize and register the enrichment job
   * @param {Object} ctx - { pgboss, domain, console, db, config }
   */
  async init({ pgboss, domain, application, console, db, config }) {
    const jobName = 'enrich-detection-patterns';

    // Every Wednesday at 03:00 UTC (0 3 * * 3)
    const cronSchedule = '0 3 * * 3';

    try {
      await pgboss.work(jobName, async (job) => {
        console.log(`🔍 Detection enrichment job started (ID: ${job.id})`);

        try {
          const result = await application.registry['refresh-service'].enrichDetectionPatterns({
            db,
            console,
            config,
          });

          console.log('✅ Detection enrichment job completed:', result);
          return { success: true, ...result };
        } catch (error) {
          console.error('❌ Detection enrichment job failed:', error);
          throw error; // pg-boss will retry
        }
      });

      await pgboss.schedule(jobName, cronSchedule, {}, { tz: 'UTC' });

      console.log(`✅ Detection enrichment job scheduled: ${cronSchedule} (Wednesdays 03:00 UTC)`);

      return { jobName, cronSchedule, scheduled: true };
    } catch (error) {
      console.error('❌ Failed to schedule detection enrichment:', error);
      throw error;
    }
  },

  /**
   * Manually trigger enrichment (for admin use / testing)
   */
  async trigger({ pgboss, console }) {
    const jobId = await pgboss.send('enrich-detection-patterns', {
      manual: true,
      triggeredAt: new Date().toISOString(),
    });

    console.log(`✅ Manual detection enrichment triggered (Job ID: ${jobId})`);
    return { jobId };
  },
})
