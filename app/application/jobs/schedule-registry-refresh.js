/**
 * Schedule Registry Refresh Job
 *
 * Sets up recurring job to enrich classified AI tools weekly.
 * Runs every Monday at 03:00 UTC.
 *
 * Composition root — instantiates scanner/tester/media modules
 * and passes them to refresh-service (application layer).
 */

({
  /**
   * Initialize the registry refresh job
   * @param {Object} context - Sandbox context { pgboss, domain, application, console, db, config }
   */
  async init({ pgboss, domain, application, console, config, db }) {
    const jobName = 'registry-refresh';

    // Cron: Every Monday at 03:00 UTC
    const cronSchedule = '0 3 * * 1';

    try {
      // Instantiate enrichment modules from domain factories
      const passiveScanner = domain.registry['passive-scanner']({
        fetch, cheerio, config, console,
      });

      const llmTester = domain.registry['llm-tester']({
        fetch, config, console,
      });

      const mediaTester = domain.registry['media-tester']({
        fetch, config, console,
      });

      // Pre-load scorer dependencies (data access in application layer)
      const loadScorerData = async () => {
        const weightsResult = await db.query(
          `SELECT category, weight FROM "ScoringWeight"
           WHERE regulation = 'eu-ai-act'`,
        );
        const weightsRows = weightsResult.rows || weightsResult;
        const weights = {};
        for (const row of weightsRows) {
          weights[row.category] = parseFloat(row.weight);
        }

        const oblResult = await db.query(
          `SELECT "obligationIdUnique", category, severity,
                  "parentObligation", deadline, "penaltyForNonCompliance",
                  "appliesToRiskLevel"
           FROM "Obligation"`,
        );
        const oblRows = oblResult.rows || oblResult;
        const obligationMap = {};
        for (const row of oblRows) {
          obligationMap[row.obligationIdUnique] = {
            category: row.category,
            severity: row.severity,
            parentObligation: row.parentObligation || null,
            deadline: row.deadline || null,
            penaltyForNonCompliance: row.penaltyForNonCompliance || null,
            appliesToRiskLevel: row.appliesToRiskLevel || null,
          };
        }

        return { weights, obligationMap };
      };

      // Register the job worker
      await pgboss.work(jobName, async (job) => {
        console.log(`🔄 Registry refresh job started (ID: ${job.id})`);

        try {
          // Load scorer data fresh each run (data may change between runs)
          const scorerData = await loadScorerData();

          const result = await application.registry['refresh-service'].refreshClassifiedTools({
            db,
            console,
            config,
            passiveScanner,
            llmTester,
            mediaTester,
            evidenceAnalyzer: domain.registry['evidence-analyzer']({ db }),
            scorer: domain.registry['registry-scorer'](scorerData),
          });

          console.log(`✅ Registry refresh job completed:`, result);

          return {
            success: true,
            ...result,
          };
        } catch (error) {
          console.error(`❌ Registry refresh job failed:`, error);
          throw error; // pg-boss will retry
        }
      });

      // Schedule the recurring job
      await pgboss.schedule(jobName, cronSchedule, {}, {
        tz: 'UTC',
      });

      console.log(`✅ Registry refresh job scheduled: ${cronSchedule} (Mondays 03:00 UTC)`);

      return {
        jobName,
        cronSchedule,
        scheduled: true,
      };
    } catch (error) {
      console.error(`❌ Failed to schedule registry refresh:`, error);
      throw error;
    }
  },

  /**
   * Manually trigger a refresh job (for testing)
   */
  async trigger({ pgboss, console }) {
    try {
      const jobId = await pgboss.send('registry-refresh', {
        manual: true,
        triggeredAt: new Date().toISOString(),
      });

      console.log(`✅ Manual registry refresh triggered (Job ID: ${jobId})`);

      return { jobId };
    } catch (error) {
      console.error(`❌ Failed to trigger manual refresh:`, error);
      throw error;
    }
  },
});
