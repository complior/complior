'use strict';

const { PgBoss } = require('pg-boss');

/**
 * Creates a PgBoss client for background job processing
 * @returns {Object} Job queue interface
 */
function createPgBossClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required for pg-boss');
  }

  const boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    // Polling interval for checking new jobs
    pollInterval: 5000,
    // Delete completed jobs after 7 days
    retentionDays: 7,
    // Retry failed jobs
    retryLimit: 3,
    retryDelay: 60, // 1 minute
    retryBackoff: true,
  });

  let started = false;

  // Prevent unhandled error crashes — log and continue
  boss.on('error', (err) => {
    console.error('pg-boss error:', err.message || err);
  });

  return {
    /**
     * Start the job queue
     */
    async start() {
      if (started) return;
      await boss.start();
      started = true;
      console.log('✅ pg-boss started');
    },

    /**
     * Stop the job queue
     */
    async stop() {
      if (!started) return;
      await boss.stop();
      started = false;
      console.log('✅ pg-boss stopped');
    },

    /**
     * Send a job to the queue
     * @param {string} name - Job name
     * @param {Object} data - Job data
     * @param {Object} options - Job options (startAfter, retryLimit, etc.)
     */
    async send(name, data = {}, options = {}) {
      await this.ensureQueue(name);
      return boss.send(name, data, options);
    },

    /**
     * Ensure a queue exists before using it
     * @param {string} name - Queue name
     */
    async ensureQueue(name) {
      try {
        await boss.createQueue(name);
      } catch (err) {
        // Queue already exists — safe to ignore
        if (!err.message?.includes('already exists') && err.code !== '23505') {
          throw err;
        }
      }
    },

    /**
     * Schedule a recurring job (cron)
     * @param {string} name - Job name
     * @param {string} cron - Cron expression (e.g., '0 3 * * 1' for Mondays at 3 AM)
     * @param {Object} data - Job data
     * @param {Object} options - Job options
     */
    async schedule(name, cron, data = {}, options = {}) {
      await this.ensureQueue(name);
      return boss.schedule(name, cron, data, options);
    },

    /**
     * Register a worker for a job
     * @param {string} name - Job name
     * @param {Function} handler - Job handler function
     * @param {Object} options - Worker options (teamSize, teamConcurrency, etc.)
     */
    async work(name, options, handler) {
      // Support both (name, handler) and (name, options, handler) signatures
      if (typeof options === 'function') {
        handler = options;
        options = {};
      }

      await this.ensureQueue(name);
      return boss.work(name, options, async (job) => {
        try {
          const result = await handler(job);
          return result;
        } catch (error) {
          console.error(`Job ${name} failed:`, error);
          throw error;
        }
      });
    },

    /**
     * Get job by ID
     */
    async getJob(id) {
      return boss.getJobById(id);
    },

    /**
     * Cancel a job
     */
    async cancel(id) {
      return boss.cancel(id);
    },

    /**
     * Get the raw PgBoss instance (for advanced usage)
     */
    getRawClient() {
      return boss;
    },
  };
}

module.exports = createPgBossClient;
