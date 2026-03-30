/**
 * Rescore registry tools — recalculates scores from existing evidence.
 *
 * Does NOT re-run LLM tests or passive scan. Only re-runs:
 *   evidence-analyzer → registry-scorer → DB update
 *
 * Useful after scoring algorithm changes (v3, weight updates, etc.)
 *
 * Query params:
 *   ?slug=chatgpt       — rescore single tool (dry-run by default)
 *   ?dryRun=false       — actually write to DB
 *   ?limit=10           — batch rescore N tools (default: 10, max: 500)
 *   ?all=true           — rescore ALL active tools (requires dryRun=false)
 */

({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/admin/rescore-registry',
  method: async ({ session, query, headers }) => {
    // Support both session auth and admin API token
    const token = (headers || {})['x-admin-token'];
    if (token && config.server.adminApiToken && token === config.server.adminApiToken) {
      // Token auth OK
    } else {
      await application.admin.requirePlatformAdmin.require(session);
    }

    const dryRun = query.dryRun !== 'false';
    const slug = query.slug || null;
    const limit = Math.min(parseInt(query.limit, 10) || 10, 500);
    const all = query.all === 'true' && !dryRun;

    // Load scorer dependencies
    const weightsResult = await db.query(
      'SELECT category, weight FROM "ScoringWeight" WHERE regulation = \'eu-ai-act\'',
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

    const evidenceAnalyzer = domain.registry['evidence-analyzer']({ db });
    const scorer = domain.registry['registry-scorer']({ weights, obligationMap });

    // Fetch tools
    let toolsQuery;
    let toolsParams;

    if (slug) {
      toolsQuery = 'SELECT * FROM "RegistryTool" WHERE slug = $1 AND active = true';
      toolsParams = [slug];
    } else {
      toolsQuery = `SELECT * FROM "RegistryTool"
                     WHERE active = true
                       AND level IN ('scanned', 'verified')
                     ORDER BY "priorityScore" DESC
                     LIMIT $1`;
      toolsParams = [all ? 10000 : limit];
    }

    const toolsResult = await db.query(toolsQuery, toolsParams);
    const tools = toolsResult.rows || toolsResult;

    if (tools.length === 0) {
      return { message: 'No tools found', dryRun };
    }

    const results = [];
    let updated = 0;

    for (const tool of tools) {
      // Parse JSON fields
      if (typeof tool.evidence === 'string') {
        try { tool.evidence = JSON.parse(tool.evidence); } catch { tool.evidence = {}; }
      }
      if (typeof tool.assessments === 'string') {
        try { tool.assessments = JSON.parse(tool.assessments); } catch { tool.assessments = {}; }
      }

      const euAssessment = (tool.assessments || {})['eu-ai-act'] || {};
      const oldScore = euAssessment.score ?? null;

      try {
        const analysis = evidenceAnalyzer.analyze(tool);
        const scoreResult = await scorer.calculate(tool, analysis);

        const entry = {
          slug: tool.slug,
          level: tool.level,
          oldScore,
          newScore: scoreResult.score,
          oldGrade: euAssessment.transparencyGrade || null,
          newGrade: scoreResult.grade || null,
          delta: scoreResult.score !== null && oldScore !== null
            ? Math.round((scoreResult.score - oldScore) * 100) / 100
            : null,
          coverage: scoreResult.coverage || null,
          maturity: scoreResult.maturity ? scoreResult.maturity.label : null,
          evidenceQuality: analysis.evidenceQuality || null,
          obligationsMet: scoreResult.counts ? scoreResult.counts.met : null,
          obligationsTotal: scoreResult.counts ? scoreResult.counts.total : null,
        };

        if (!dryRun && scoreResult.score !== null) {
          const euAssessmentObj = {
            ...(tool.assessments && tool.assessments['eu-ai-act'] || {}),
            score: scoreResult.score,
            coverage: scoreResult.coverage || 0,
            transparencyGrade: scoreResult.grade || null,
            scored_at: new Date().toISOString(),
          };
          if (scoreResult.counts) {
            euAssessmentObj.obligationsMet = scoreResult.counts.met;
            euAssessmentObj.obligationsTotal = scoreResult.counts.total;
          }
          if (scoreResult.maturity) {
            euAssessmentObj.maturityLabel = scoreResult.maturity.label;
          }
          await db.query(
            `UPDATE "RegistryTool"
             SET assessments = jsonb_set(
               COALESCE(assessments, '{}'::jsonb),
               '{eu-ai-act}', $1::jsonb
             )
             WHERE slug = $2`,
            [
              JSON.stringify(euAssessmentObj),
              tool.slug,
            ],
          );
          updated++;
        }

        results.push(entry);
      } catch (err) {
        results.push({
          slug: tool.slug,
          error: err.message,
        });
      }
    }

    return {
      dryRun,
      algorithm: 'deterministic-v3',
      toolsProcessed: results.length,
      toolsUpdated: updated,
      results,
    };
  },
});
