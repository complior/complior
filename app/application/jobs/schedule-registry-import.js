/**
 * Schedule Registry Import Job (one-time)
 *
 * Worker for 'registry-import' job. Runs migrate-ai-registry.js
 * which restores ~4983 tools from seed JSON into RegistryTool.
 *
 * Not scheduled on cron — triggered manually via admin endpoint.
 */

({
  async init({ pgboss, console, db }) {
    const jobName = 'registry-import';

    try {
      await pgboss.work(jobName, { newJobCheckInterval: 5000 }, async (job) => {
        console.log(`📥 Registry import job started (ID: ${job.id})`);

        try {
          // require() allowed here — server/infrastructure context (job init)
          const migrate = require('./seeds/migrate-ai-registry');
          await migrate({ db });

          console.log('✅ Registry import job completed');
          return { success: true };
        } catch (error) {
          console.error('❌ Registry import job failed:', error);
          throw error;
        }
      });

      console.log('✅ Registry import job worker registered (trigger via POST /api/admin/import-registry)');
      return { jobName, scheduled: false };
    } catch (error) {
      console.error('❌ Failed to register registry import worker:', error);
      throw error;
    }
  },

  async trigger({ pgboss, console }) {
    const jobId = await pgboss.send('registry-import', {
      manual: true,
      triggeredAt: new Date().toISOString(),
    });

    console.log(`✅ Registry import triggered (Job ID: ${jobId})`);
    return { jobId };
  },
});
