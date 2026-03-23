/**
 * Schedule Data Export Job
 *
 * Weekly pg-boss job that exports Registry + Regulation DB
 * to JSON files in data/ directory (backup + CLI offline bundle).
 *
 * Schedule: Every Monday at 04:00 UTC (1 hour after registry-refresh)
 * Job name: export-data
 */

({
  /**
   * Initialize and register the export job
   * @param {Object} ctx - { pgboss, domain, console, db, config, writeFile }
   */
  async init({ pgboss, console, db, writeFile }) {
    const jobName = 'export-data';
    const cronSchedule = '0 4 * * 1'; // Monday 04:00 UTC

    try {
      await pgboss.work(jobName, async (job) => {
        console.log(`📦 Data export job started (ID: ${job.id})`);

        try {
          const result = await exportAll({ db, console, writeFile });
          console.log('✅ Data export job completed:', result);
          return { success: true, ...result };
        } catch (error) {
          console.error('❌ Data export job failed:', error);
          throw error;
        }
      });

      await pgboss.schedule(jobName, cronSchedule, {}, { tz: 'UTC' });

      console.log(`✅ Data export job scheduled: ${cronSchedule} (Mondays 04:00 UTC)`);

      return { jobName, cronSchedule, scheduled: true };
    } catch (error) {
      console.error('❌ Failed to schedule data export:', error);
      throw error;
    }
  },

  /**
   * Manually trigger export (for admin use / testing)
   */
  async trigger({ pgboss, console }) {
    const jobId = await pgboss.send('export-data', {
      manual: true,
      triggeredAt: new Date().toISOString(),
    });

    console.log(`✅ Manual data export triggered (Job ID: ${jobId})`);
    return { jobId };
  },
})

/**
 * Export all data tables to JSON files.
 * Uses injected writeFile(relativePath, data) utility.
 */
async function exportAll({ db, console, writeFile }) {
  const stats = { files: 0, errors: 0 };

  // 1. Registry — all_tools.json
  try {
    const { rows: tools } = await db.query(
      'SELECT * FROM "RegistryTool" WHERE "active" = true ORDER BY slug',
    );

    const allTools = tools.map((t) => ({
      slug: t.slug,
      name: t.name,
      provider: t.provider,
      website: t.website,
      categories: t.categories,
      description: t.description,
      source: t.source,
      rank_on_source: t.rankOnSource,
      level: t.level,
      priority_score: t.priorityScore,
      evidence: t.evidence,
      assessments: t.assessments,
      seo: t.seo,
      detection_patterns: t.detectionPatterns,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    }));

    writeFile('data/registry/all_tools.json', JSON.stringify(allTools));
    console.log(`  ✅ ${allTools.length} tools → data/registry/all_tools.json`);
    stats.files++;
  } catch (err) {
    console.error('  ❌ Registry export failed:', err.message);
    stats.errors++;
  }

  // 2. Obligations
  try {
    const { rows: obligations } = await db.query(
      'SELECT * FROM "Obligation" ORDER BY "obligationId"',
    );

    const oblFile = {
      jurisdiction_id: 'eu-ai-act',
      version: '4.0',
      last_updated: new Date().toISOString(),
      obligations: obligations.map((o) => ({
        obligation_id: o.obligationId,
        article_reference: o.articleReference,
        title: o.title,
        description: o.description,
        applies_to_role: o.appliesToRole,
        applies_to_risk_level: o.appliesToRiskLevel,
        obligation_type: o.obligationType,
        severity: o.severity,
        what_to_do: o.whatToDo,
        what_not_to_do: o.whatNotToDo,
        evidence_required: o.evidenceRequired,
        deadline: o.deadline,
        frequency: o.frequency,
        penalty_for_non_compliance: o.penaltyForNonCompliance,
        automation_approach: o.automationApproach,
        cli_check_possible: o.cliCheckPossible,
        cli_check_description: o.cliCheckDescription,
        document_template_needed: o.documentTemplateNeeded,
        document_template_type: o.documentTemplateType,
        sdk_feature_needed: o.sdkFeatureNeeded,
        parent_obligation: o.parentObligation,
      })),
    };

    writeFile('data/regulations/obligations.json', JSON.stringify(oblFile, null, 2));
    console.log(`  ✅ ${obligations.length} obligations → data/regulations/obligations.json`);
    stats.files++;
  } catch (err) {
    console.error('  ❌ Obligations export failed:', err.message);
    stats.errors++;
  }

  // 3. RegulationMeta
  try {
    const { rows: meta } = await db.query('SELECT * FROM "RegulationMeta"');
    writeFile('data/regulations/regulation-meta.json', JSON.stringify(meta[0] ?? {}, null, 2));
    console.log('  ✅ RegulationMeta → data/regulations/regulation-meta.json');
    stats.files++;
  } catch (err) {
    console.error('  ❌ RegulationMeta export failed:', err.message);
    stats.errors++;
  }

  // 4. TechnicalRequirements
  try {
    const { rows: reqs } = await db.query(
      'SELECT * FROM "TechnicalRequirement" ORDER BY "requirementId"',
    );

    const reqFile = {
      last_updated: new Date().toISOString(),
      technical_requirements: reqs.map((r) => ({
        requirement_id: r.requirementId,
        obligation_id: r.obligationId,
        feature_type: r.featureType,
        sdk_implementation: r.sdkImplementation,
        cli_check: r.cliCheck,
      })),
    };

    writeFile('data/regulations/technical-requirements.json', JSON.stringify(reqFile, null, 2));
    console.log(`  ✅ ${reqs.length} tech requirements → data/regulations/technical-requirements.json`);
    stats.files++;
  } catch (err) {
    console.error('  ❌ TechnicalRequirements export failed:', err.message);
    stats.errors++;
  }

  // 5. Timeline
  try {
    const { rows: events } = await db.query(
      'SELECT * FROM "TimelineEvent" ORDER BY date',
    );

    const tlFile = {
      last_updated: new Date().toISOString(),
      timeline: {
        key_dates: events.map((e) => ({
          event_id: e.eventId,
          jurisdiction_id: e.jurisdictionId,
          event: e.phase,
          date: e.date,
          impact_on_product: e.whatApplies,
          status: e.status,
        })),
      },
    };

    writeFile('data/regulations/timeline.json', JSON.stringify(tlFile, null, 2));
    console.log(`  ✅ ${events.length} timeline events → data/regulations/timeline.json`);
    stats.files++;
  } catch (err) {
    console.error('  ❌ Timeline export failed:', err.message);
    stats.errors++;
  }

  return stats;
}
