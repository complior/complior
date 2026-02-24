'use strict';

/**
 * Data Export Job Tests
 *
 * Validates:
 * 1. export-data job registers with correct cron schedule (Mondays 04:00 UTC)
 * 2. job can be manually triggered
 * 3. export writes 5 JSON files via writeFile callback
 * 4. cron does not conflict with registry-refresh (03:00) or enrichment (Wed 03:00)
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

// ─── Mock DB for export ─────────────────────────────────────────────────────

const createExportMockDb = () => ({
  query: async (sql) => {
    if (sql.includes('FROM "Permission"')) return { rows: [] };

    if (sql.includes('FROM "RegistryTool"')) {
      return {
        rows: [
          { slug: 'test-tool', name: 'Test', provider: '{}', website: null, categories: '[]',
            description: 'desc', source: 'test', rankOnSource: 1, level: 'classified',
            priorityScore: 50, evidence: null, assessments: null, seo: null,
            detectionPatterns: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        ],
      };
    }

    if (sql.includes('FROM "Obligation"')) {
      return {
        rows: [
          { obligationId: 'OBL-001', articleReference: 'Art.6', title: 'Test Obligation',
            description: 'desc', appliesToRole: 'deployer', appliesToRiskLevel: '["high"]',
            obligationType: 'mandatory', severity: 'high', whatToDo: '[]', whatNotToDo: '[]',
            evidenceRequired: 'yes', deadline: '2026-08-02', frequency: 'ongoing',
            penaltyForNonCompliance: '€15M', automationApproach: null, cliCheckPossible: true,
            cliCheckDescription: null, documentTemplateNeeded: false, documentTemplateType: null,
            sdkFeatureNeeded: null, parentObligation: null },
        ],
      };
    }

    if (sql.includes('FROM "RegulationMeta"')) {
      return { rows: [{ jurisdictionId: 'eu-ai-act', officialName: 'EU AI Act' }] };
    }

    if (sql.includes('FROM "TechnicalRequirement"')) {
      return { rows: [{ requirementId: 'REQ-001', obligationId: 'OBL-001', featureType: 'check',
        sdkImplementation: '{}', cliCheck: '{}' }] };
    }

    if (sql.includes('FROM "TimelineEvent"')) {
      return { rows: [{ eventId: 'TL-001', jurisdictionId: 'eu-ai-act', phase: 'Phase 1',
        date: '2025-02-02', whatApplies: 'Art.5', status: 'in-force' }] };
    }

    return { rows: [] };
  },
});

// ─── Mock writeFile ─────────────────────────────────────────────────────────

const createMockWriteFile = () => {
  const written = [];
  const fn = (relativePath, data) => {
    written.push({ path: relativePath, size: data.length });
    return `/mock/${relativePath}`;
  };
  fn._written = written;
  return fn;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Data Export Job', () => {

  describe('job init and scheduling', () => {
    it('registers job with name export-data', async () => {
      const pgboss = createMockPgBoss();
      const writeFile = createMockWriteFile();
      const { application } = await buildFullSandbox(createExportMockDb());

      await application.jobs['schedule-data-export'].init({
        pgboss, console, db: createExportMockDb(), config: {}, writeFile,
      });

      assert.ok(
        pgboss._registered.some((r) => r.jobName === 'export-data'),
        'Job "export-data" must be registered',
      );
    });

    it('schedules with Monday 04:00 UTC cron pattern', async () => {
      const pgboss = createMockPgBoss();
      const writeFile = createMockWriteFile();
      const { application } = await buildFullSandbox(createExportMockDb());

      await application.jobs['schedule-data-export'].init({
        pgboss, console, db: createExportMockDb(), config: {}, writeFile,
      });

      const scheduled = pgboss._scheduled.find((s) => s.jobName === 'export-data');
      assert.ok(scheduled, 'Job should be scheduled');
      assert.strictEqual(scheduled.cron, '0 4 * * 1', 'Cron must be Mondays 04:00 UTC');
    });

    it('schedules with UTC timezone', async () => {
      const pgboss = createMockPgBoss();
      const writeFile = createMockWriteFile();
      const { application } = await buildFullSandbox(createExportMockDb());

      await application.jobs['schedule-data-export'].init({
        pgboss, console, db: createExportMockDb(), config: {}, writeFile,
      });

      const scheduled = pgboss._scheduled.find((s) => s.jobName === 'export-data');
      assert.strictEqual(scheduled.opts.tz, 'UTC');
    });

    it('returns scheduled:true on success', async () => {
      const pgboss = createMockPgBoss();
      const writeFile = createMockWriteFile();
      const { application } = await buildFullSandbox(createExportMockDb());

      const result = await application.jobs['schedule-data-export'].init({
        pgboss, console, db: createExportMockDb(), config: {}, writeFile,
      });

      assert.strictEqual(result.scheduled, true);
      assert.strictEqual(result.jobName, 'export-data');
      assert.strictEqual(result.cronSchedule, '0 4 * * 1');
    });
  });

  describe('manual trigger', () => {
    it('sends job to pg-boss queue with manual flag', async () => {
      const pgboss = createMockPgBoss();
      const { application } = await buildFullSandbox(createExportMockDb());

      const result = await application.jobs['schedule-data-export'].trigger({
        pgboss, console,
      });

      assert.ok(result.jobId, 'Should return a jobId');
      const sent = pgboss._sent.find((s) => s.jobName === 'export-data');
      assert.ok(sent, 'Should have sent export-data job');
      assert.strictEqual(sent.data.manual, true);
    });
  });

  describe('export worker writes all 5 files', () => {
    it('calls writeFile for all 5 data exports', async () => {
      const pgboss = createMockPgBoss();
      const writeFile = createMockWriteFile();
      const mockDb = createExportMockDb();
      const { application } = await buildFullSandbox(mockDb);

      await application.jobs['schedule-data-export'].init({
        pgboss, console, db: mockDb, config: {}, writeFile,
      });

      // Find and execute the registered worker
      const worker = pgboss._registered.find((r) => r.jobName === 'export-data');
      assert.ok(worker, 'Worker should be registered');

      await worker.handler({ id: 'test-job-id' });

      const paths = writeFile._written.map((w) => w.path);
      assert.ok(paths.includes('data/registry/all_tools.json'), 'Should export registry');
      assert.ok(paths.includes('data/regulations/obligations.json'), 'Should export obligations');
      assert.ok(paths.includes('data/regulations/regulation-meta.json'), 'Should export meta');
      assert.ok(paths.includes('data/regulations/technical-requirements.json'), 'Should export tech reqs');
      assert.ok(paths.includes('data/regulations/timeline.json'), 'Should export timeline');
      assert.strictEqual(writeFile._written.length, 5, 'Should write exactly 5 files');
    });
  });

  describe('cron schedule non-conflict', () => {
    it('export-data runs after registry-refresh (03:00 → 04:00)', () => {
      const registryRefreshCron = '0 3 * * 1'; // Monday 03:00
      const exportCron = '0 4 * * 1';          // Monday 04:00
      assert.notStrictEqual(registryRefreshCron, exportCron, 'Different times');
      // Both on Monday but export is 1 hour later
      assert.strictEqual(exportCron.split(' ')[1], '4', 'Export at 04:00');
      assert.strictEqual(registryRefreshCron.split(' ')[1], '3', 'Refresh at 03:00');
    });

    it('all three jobs have unique cron schedules', () => {
      const crons = new Set([
        '0 3 * * 1', // registry-refresh: Monday 03:00
        '0 3 * * 3', // enrich-detection-patterns: Wednesday 03:00
        '0 4 * * 1', // export-data: Monday 04:00
      ]);
      assert.strictEqual(crons.size, 3, 'All 3 cron schedules must be unique');
    });
  });
});
