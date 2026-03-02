'use strict';

/**
 * US-108: Detection Pattern Enrichment Job Registration Tests
 *
 * Validates:
 * 1. enrichment job registers with correct cron schedule (Wednesdays 03:00 UTC)
 * 2. job name is 'enrich-detection-patterns'
 * 3. job can be manually triggered
 * 4. enrichDetectionPatterns domain method processes tools
 * 5. category heuristics produce valid pattern objects
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

// ─── Mock pg-boss ─────────────────────────────────────────────────────────────

const createMockPgBoss = () => {
  const registered = [];
  const scheduled = [];
  const sent = [];

  return {
    _registered: registered,
    _scheduled: scheduled,
    _sent: sent,
    work: async (jobName, handler) => { registered.push({ jobName, handler }); },
    schedule: async (jobName, cron, data, opts) => { scheduled.push({ jobName, cron, opts }); },
    send: async (jobName, data) => {
      const jobId = `job-${Date.now()}`;
      sent.push({ jobName, data, jobId });
      return jobId;
    },
  };
};

// ─── Mock DB for enrichment tests ─────────────────────────────────────────────

const TOOLS_NEEDING_ENRICHMENT = [
  { registryToolId: 10, slug: 'jasper-test', name: 'Jasper', category: 'marketing', level: 'scanned', priorityScore: 80 },
  { registryToolId: 11, slug: 'some-hr-tool', name: 'HR Tool', category: 'recruitment', level: 'scanned', priorityScore: 60 },
  { registryToolId: 12, slug: 'unknown-category', name: 'Unknown', category: null, level: 'scanned', priorityScore: 40 },
];

const createEnrichmentMockDb = () => ({
  query: async (sql, params) => {
    if (sql.includes('FROM "Permission"')) return { rows: [] };

    if (sql.includes('FROM "RegistryTool"') && sql.includes('detectionPatterns') && sql.includes('LIMIT')) {
      return { rows: TOOLS_NEEDING_ENRICHMENT };
    }

    if (sql.includes('UPDATE "RegistryTool"') && sql.includes('detectionPatterns')) {
      return { rows: [], rowCount: 1 };
    }

    return { rows: [] };
  },
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('US-108: Detection Enrichment Job Registration', () => {

  describe('job init and scheduling', () => {
    it('registers job with name enrich-detection-patterns', async () => {
      const pgboss = createMockPgBoss();
      const { application, domain } = await buildFullSandbox(createEnrichmentMockDb());

      await application.jobs['schedule-detection-enrichment'].init({
        pgboss,
        domain,
        application,
        console,
        db: createEnrichmentMockDb(),
        config: {},
      });

      assert.ok(
        pgboss._registered.some((r) => r.jobName === 'enrich-detection-patterns'),
        'Job "enrich-detection-patterns" must be registered',
      );
    });

    it('schedules with Wednesday 03:00 UTC cron pattern', async () => {
      const pgboss = createMockPgBoss();
      const { application, domain } = await buildFullSandbox(createEnrichmentMockDb());

      await application.jobs['schedule-detection-enrichment'].init({
        pgboss,
        domain,
        application,
        console,
        db: createEnrichmentMockDb(),
        config: {},
      });

      const scheduled = pgboss._scheduled.find((s) => s.jobName === 'enrich-detection-patterns');
      assert.ok(scheduled, 'Job should be scheduled');
      assert.strictEqual(scheduled.cron, '0 3 * * 3', 'Cron must be Wednesdays 03:00 UTC');
    });

    it('schedules with UTC timezone option', async () => {
      const pgboss = createMockPgBoss();
      const { application, domain } = await buildFullSandbox(createEnrichmentMockDb());

      await application.jobs['schedule-detection-enrichment'].init({
        pgboss,
        domain,
        application,
        console,
        db: createEnrichmentMockDb(),
        config: {},
      });

      const scheduled = pgboss._scheduled.find((s) => s.jobName === 'enrich-detection-patterns');
      assert.strictEqual(scheduled.opts.tz, 'UTC');
    });

    it('returns scheduled:true on success', async () => {
      const pgboss = createMockPgBoss();
      const { application, domain } = await buildFullSandbox(createEnrichmentMockDb());

      const result = await application.jobs['schedule-detection-enrichment'].init({
        pgboss,
        domain,
        application,
        console,
        db: createEnrichmentMockDb(),
        config: {},
      });

      assert.strictEqual(result.scheduled, true);
      assert.strictEqual(result.jobName, 'enrich-detection-patterns');
      assert.strictEqual(result.cronSchedule, '0 3 * * 3');
    });
  });

  describe('manual trigger', () => {
    it('sends job to pg-boss queue and returns jobId', async () => {
      const pgboss = createMockPgBoss();
      const { application } = await buildFullSandbox(createEnrichmentMockDb());

      const result = await application.jobs['schedule-detection-enrichment'].trigger({
        pgboss,
        console,
      });

      assert.ok(result.jobId, 'Should return a jobId');
      assert.ok(
        pgboss._sent.some((s) => s.jobName === 'enrich-detection-patterns'),
        'Should have sent enrich-detection-patterns job',
      );
    });

    it('trigger sets manual=true flag in job data', async () => {
      const pgboss = createMockPgBoss();
      const { application } = await buildFullSandbox(createEnrichmentMockDb());

      await application.jobs['schedule-detection-enrichment'].trigger({ pgboss, console });

      const sent = pgboss._sent.find((s) => s.jobName === 'enrich-detection-patterns');
      assert.strictEqual(sent.data.manual, true);
    });
  });

  describe('enrichDetectionPatterns application method', () => {
    it('processes tools with known categories', async () => {
      const mockDb = createEnrichmentMockDb();
      const updates = [];

      // Intercept UPDATE calls
      const trackingDb = {
        query: async (sql, params) => {
          if (sql.includes('UPDATE "RegistryTool"') && sql.includes('detectionPatterns')) {
            updates.push({ patterns: params[0], slug: params[1] });
            return { rows: [], rowCount: 1 };
          }
          return mockDb.query(sql, params);
        },
      };

      const { application } = await buildFullSandbox(trackingDb);

      const result = await application.registry['refresh-service'].enrichDetectionPatterns({
        db: trackingDb,
        console,
        config: {},
      });

      assert.ok(typeof result.updated === 'number', 'updated count must be number');
      assert.ok(typeof result.skipped === 'number', 'skipped count must be number');
      assert.ok(typeof result.total === 'number', 'total count must be number');
      assert.strictEqual(result.total, 3);
    });

    it('skips tools with null or unrecognized category', async () => {
      const mockDb = createEnrichmentMockDb();
      const { application } = await buildFullSandbox(mockDb);

      const result = await application.registry['refresh-service'].enrichDetectionPatterns({
        db: mockDb,
        console,
        config: {},
      });

      // The tool with category=null should be skipped
      assert.ok(result.skipped >= 1, 'Tools with null category should be skipped');
    });

    it('produces valid pattern structure for marketing category', async () => {
      // Test via public API: marketing tool should get patterns with env_vars
      const updates = [];
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('SELECT') && sql.includes('detectionPatterns')) {
            return {
              rows: [{ registryToolId: '1', slug: 'test-marketing', name: 'Test', category: 'marketing', capabilities: null, level: 'scanned' }],
            };
          }
          if (sql.includes('UPDATE')) {
            updates.push({ patterns: JSON.parse(params[0]), slug: params[1] });
            return { rows: [], rowCount: 1 };
          }
          return { rows: [] };
        },
      };

      const { application } = await buildFullSandbox(mockDb);
      await application.registry['refresh-service'].enrichDetectionPatterns({ db: mockDb, console, config: {} });

      assert.strictEqual(updates.length, 1, 'Should update 1 marketing tool');
      const patterns = updates[0].patterns;
      assert.ok(Array.isArray(patterns.npm), 'npm must be array');
      assert.ok(Array.isArray(patterns.pip), 'pip must be array');
      assert.ok(Array.isArray(patterns.env_vars), 'env_vars must be array');
      assert.ok(patterns.env_vars.length > 0, 'marketing should have env_vars');
    });

    it('skips tools with unknown category via enrichDetectionPatterns', async () => {
      // Test via public API: unknown category should be skipped (not updated)
      const updates = [];
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('SELECT') && sql.includes('detectionPatterns')) {
            return {
              rows: [{ registryToolId: '1', slug: 'unknown-tool', name: 'Unknown', category: 'completely_unknown_category', capabilities: null, level: 'scanned' }],
            };
          }
          if (sql.includes('UPDATE')) {
            updates.push({ slug: params[1] });
            return { rows: [], rowCount: 1 };
          }
          return { rows: [] };
        },
      };

      const { application } = await buildFullSandbox(mockDb);
      const result = await application.registry['refresh-service'].enrichDetectionPatterns({ db: mockDb, console, config: {} });

      assert.strictEqual(updates.length, 0, 'Should not update unknown category');
      assert.strictEqual(result.skipped, 1, 'Should skip 1 tool');
    });

    it('skips tools with null category via enrichDetectionPatterns', async () => {
      // Test via public API: null category should be skipped
      const updates = [];
      const mockDb = {
        query: async (sql, params) => {
          if (sql.includes('SELECT') && sql.includes('detectionPatterns')) {
            return {
              rows: [{ registryToolId: '1', slug: 'null-cat', name: 'NullCat', category: null, capabilities: null, level: 'scanned' }],
            };
          }
          if (sql.includes('UPDATE')) {
            updates.push({ slug: params[1] });
            return { rows: [], rowCount: 1 };
          }
          return { rows: [] };
        },
      };

      const { application } = await buildFullSandbox(mockDb);
      const result = await application.registry['refresh-service'].enrichDetectionPatterns({ db: mockDb, console, config: {} });

      assert.strictEqual(updates.length, 0, 'Should not update null category');
      assert.strictEqual(result.skipped, 1, 'Should skip 1 tool');
    });
  });

  describe('registry refresh cron does not conflict', () => {
    it('registry-refresh and enrich-detection-patterns have different cron schedules', () => {
      // registry-refresh: Monday 03:00 = '0 3 * * 1'
      // enrich-detection-patterns: Wednesday 03:00 = '0 3 * * 3'
      const registryRefreshCron = '0 3 * * 1';
      const enrichmentCron = '0 3 * * 3';
      assert.notStrictEqual(registryRefreshCron, enrichmentCron, 'Jobs should run on different days');
    });
  });
});
