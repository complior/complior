/**
 * Merge User Report — Merge deployer questionnaire answers into Registry card.
 *
 * Handles both new and existing tools:
 *   - Existing: aggregates community reports (N deployers)
 *   - New: creates registry card from scan + questionnaire answers
 *
 * VM sandbox compatible — IIFE, no require().
 */
(() => {
  /**
   * Map questionnaire answers to risk classification.
   * Based on EU AI Act Art. 6 Annex III high-risk categories.
   */
  const classifyRisk = (answers) => {
    const { category, autonomyLevel, dataType, affectedPersons } = answers;

    // Unacceptable: social scoring, real-time biometric, manipulation
    // (these are blocked at questionnaire level — not selectable)

    // High risk: HR/recruitment, credit scoring, law enforcement, etc.
    const highRiskCategories = [
      'recruitment', 'credit_scoring', 'law_enforcement',
      'biometric', 'education_assessment', 'immigration',
      'justice', 'critical_infrastructure',
    ];

    if (highRiskCategories.includes(category)) return 'high';

    // High risk: fully autonomous + sensitive data + vulnerable persons
    if (
      autonomyLevel === 'fully_autonomous'
      && dataType === 'sensitive_personal_data'
      && ['patients', 'job_applicants', 'general_public'].includes(affectedPersons)
    ) {
      return 'high';
    }

    // Limited risk: AI interaction + personal data
    if (
      dataType === 'personal_data' || dataType === 'sensitive_personal_data'
      || autonomyLevel === 'ai_suggests'
    ) {
      return 'limited';
    }

    // Minimal risk: default
    return 'minimal';
  };

  /**
   * Map risk level to deployer obligation IDs.
   */
  const getDeployerObligations = (riskLevel) => {
    const common = [
      { id: 'OBL-001', title: 'AI Literacy (Art. 4)', required: true },
      { id: 'OBL-015', title: 'AI Disclosure (Art. 50)', required: true },
    ];

    if (riskLevel === 'high') {
      return [
        ...common,
        { id: 'OBL-008', title: 'Human Oversight (Art. 26)', required: true },
        { id: 'OBL-003', title: 'Data Governance (Art. 10)', required: true },
        { id: 'OBL-009', title: 'Robustness Monitoring (Art. 26)', required: true },
        { id: 'OBL-029', title: 'FRIA (Art. 27)', required: true },
        { id: 'OBL-004', title: 'Risk Management (Art. 9)', required: true },
      ];
    }

    if (riskLevel === 'limited') {
      return [
        ...common,
        { id: 'OBL-008', title: 'Human Oversight (Art. 26)', required: false },
      ];
    }

    return common;
  };

  return {
    /**
     * Merge questionnaire answers into registry.
     *
     * @param {Object} ctx - { db, console }
     * @param {Object} input - {
     *   slug: string, url: string,
     *   answers: { category, autonomyLevel, dataType, affectedPersons, dataLocation },
     *   scanEvidence?: object,
     *   ip: string, email?: string, userId?: string
     * }
     */
    async merge({ db, console }, input) {
      const { slug, url, answers, scanEvidence, ip, email, userId } = input;

      // 1. Classify risk based on deployer context
      const riskLevel = classifyRisk(answers);
      const obligations = getDeployerObligations(riskLevel);

      // 2. Build community report entry
      const reportEntry = {
        answers,
        riskLevel,
        reportedBy: userId || email || ip,
        reportedAt: new Date().toISOString(),
      };

      // 3. Check if tool exists
      const existing = await db.query(
        'SELECT * FROM "RegistryTool" WHERE slug = $1',
        [slug],
      );

      if (existing.rows.length > 0) {
        // ── Existing tool: add community report ──────────────
        const tool = existing.rows[0];
        let communityReports = tool.communityReports || [];
        if (typeof communityReports === 'string') {
          try { communityReports = JSON.parse(communityReports); } catch { communityReports = []; }
        }

        // Add new report (max 100 per tool)
        communityReports.push(reportEntry);
        if (communityReports.length > 100) {
          communityReports = communityReports.slice(-100);
        }

        // Aggregate: compute consensus values
        const aggregated = aggregateReports(communityReports);

        // Update trust level if enough reports
        let trustLevel = tool.trustLevel || 'auto_assessed';
        if (communityReports.length >= 3) {
          trustLevel = 'community_reported';
        }

        await db.query(
          `UPDATE "RegistryTool"
           SET "communityReports" = $1,
               "trustLevel" = $2
           WHERE slug = $3`,
          [JSON.stringify(communityReports), trustLevel, slug],
        );

        console.log(`Community report added for ${slug} (${communityReports.length} total)`);

        return {
          action: 'updated',
          slug,
          riskLevel,
          obligations,
          communityReportCount: communityReports.length,
          aggregated,
        };
      }

      // ── New tool: create registry card ────────────────────
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const evidence = scanEvidence || {};
      evidence.enriched_at = new Date().toISOString();

      const assessments = {
        'eu-ai-act': {
          risk_level: riskLevel,
          deployer_obligations: obligations.map((o) => ({
            obligation_id: o.id,
            title: o.title,
            status: 'unknown',
            evidence_summary: null,
          })),
          scored_at: new Date().toISOString(),
        },
      };

      await db.query(
        `INSERT INTO "RegistryTool"
          (slug, name, website, categories, level, evidence, assessments,
           "riskLevel", "communityReports", "trustLevel", "lastPublicScanAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [
          slug,
          name,
          url,
          JSON.stringify([answers.category]),
          scanEvidence ? 'scanned' : 'classified',
          JSON.stringify(evidence),
          JSON.stringify(assessments),
          riskLevel,
          JSON.stringify([reportEntry]),
          'community_reported',
        ],
      );

      console.log(`New registry card created: ${slug} (${riskLevel} risk)`);

      return {
        action: 'created',
        slug,
        riskLevel,
        obligations,
        communityReportCount: 1,
      };
    },
  };

  /**
   * Aggregate community reports into consensus values.
   */
  function aggregateReports(reports) {
    if (!reports || reports.length === 0) return null;

    const counts = {
      categories: {},
      autonomyLevels: {},
      dataTypes: {},
      affectedPersons: {},
      dataLocations: {},
      riskLevels: {},
    };

    for (const report of reports) {
      const a = report.answers || {};
      if (a.category) counts.categories[a.category] = (counts.categories[a.category] || 0) + 1;
      if (a.autonomyLevel) counts.autonomyLevels[a.autonomyLevel] = (counts.autonomyLevels[a.autonomyLevel] || 0) + 1;
      if (a.dataType) counts.dataTypes[a.dataType] = (counts.dataTypes[a.dataType] || 0) + 1;
      if (a.affectedPersons) counts.affectedPersons[a.affectedPersons] = (counts.affectedPersons[a.affectedPersons] || 0) + 1;
      if (a.dataLocation) counts.dataLocations[a.dataLocation] = (counts.dataLocations[a.dataLocation] || 0) + 1;
      if (report.riskLevel) counts.riskLevels[report.riskLevel] = (counts.riskLevels[report.riskLevel] || 0) + 1;
    }

    const total = reports.length;
    const topOf = (obj) => {
      const entries = Object.entries(obj);
      if (entries.length === 0) return null;
      entries.sort((a, b) => b[1] - a[1]);
      return { value: entries[0][0], count: entries[0][1], total };
    };

    return {
      topCategory: topOf(counts.categories),
      topAutonomy: topOf(counts.autonomyLevels),
      topDataType: topOf(counts.dataTypes),
      topAffectedPersons: topOf(counts.affectedPersons),
      topDataLocation: topOf(counts.dataLocations),
      consensusRisk: topOf(counts.riskLevels),
      totalReports: total,
    };
  }
})()
