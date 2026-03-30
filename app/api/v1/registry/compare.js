/**
 * Registry Compare API — Side-by-side compliance comparison.
 *
 * GET /v1/registry/compare?slugs=chatgpt,claude,gemini
 *   Returns: normalized comparison data for up to 4 tools
 */
({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/registry/compare',

  method: async ({ query }) => {
    const slugsParam = query && query.slugs;
    if (!slugsParam) {
      throw new errors.ValidationError('slugs parameter is required', {
        slugs: ['Comma-separated tool slugs (2-4)'],
      });
    }

    const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (slugs.length < 2 || slugs.length > 4) {
      throw new errors.ValidationError('Must compare 2-4 tools', {
        slugs: ['Provide 2-4 comma-separated tool slugs'],
      });
    }

    // Fetch tools
    const placeholders = slugs.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(
      `SELECT slug, name, website, categories, "riskLevel",
              evidence, assessments, "trustLevel",
              "vendorVerified", "vendorReport", "dataResidency",
              "vendorCountry", level
       FROM "RegistryTool"
       WHERE slug IN (${placeholders})`,
      slugs,
    );

    if (result.rows.length < 2) {
      throw new errors.NotFoundError(
        `Found ${result.rows.length} tools. Need at least 2 for comparison.`,
      );
    }

    // Parse JSON fields
    const tools = result.rows.map((row) => {
      const tool = { ...row };
      if (typeof tool.evidence === 'string') {
        try { tool.evidence = JSON.parse(tool.evidence); } catch { tool.evidence = {}; }
      }
      if (typeof tool.assessments === 'string') {
        try { tool.assessments = JSON.parse(tool.assessments); } catch { tool.assessments = {}; }
      }
      if (typeof tool.categories === 'string') {
        try { tool.categories = JSON.parse(tool.categories); } catch { tool.categories = []; }
      }
      if (typeof tool.vendorReport === 'string') {
        try { tool.vendorReport = JSON.parse(tool.vendorReport); } catch { tool.vendorReport = null; }
      }
      return tool;
    });

    // Build comparison data
    const comparison = tools.map((tool) => {
      const assessment = (tool.assessments && tool.assessments['eu-ai-act']) || {};
      const ps = (tool.evidence && tool.evidence.passive_scan) || {};
      const privacy = ps.privacy || {};
      const trust = ps.trust_signals || {};

      return {
        slug: tool.slug,
        name: tool.name,
        website: tool.website,
        categories: tool.categories || [],
        riskLevel: tool.riskLevel || assessment.risk_level || 'unknown',
        trustLevel: tool.trustLevel || 'auto_assessed',
        vendorVerified: Boolean(tool.vendorVerified),
        vendorCountry: tool.vendorCountry || null,
        dataResidency: tool.dataResidency
          || (tool.vendorReport && tool.vendorReport.data_residency)
          || null,
        score: assessment.score || null,
        grade: assessment.grade || null,
        coverage: assessment.coverage || null,
        transparencyGrade: assessment.transparencyGrade || null,
        obligations: (assessment.deployer_obligations || []).length,
        evidenceQuality: tool.level || 'classified',
        transparency: {
          hasPrivacyPolicy: Boolean(privacy.gdpr_mention || ps.privacy_policy),
          hasTermsOfService: Boolean(ps.terms_of_service),
          hasAiDisclosure: Boolean(ps.disclosure && ps.disclosure.visible),
          hasModelCard: Boolean(ps.model_card && ps.model_card.has_model_card),
          hasEuAiActPage: Boolean(trust.has_eu_ai_act_page),
        },
        gdpr: {
          gdprMention: Boolean(privacy.gdpr_mention),
          dpoListed: Boolean(privacy.dpo_listed),
          deletionRight: Boolean(privacy.deletion_right),
          trainingOptOut: Boolean(privacy.training_opt_out),
        },
      };
    });

    // Sort by score (highest first)
    comparison.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      data: {
        tools: comparison,
        comparedAt: new Date().toISOString(),
        count: comparison.length,
      },
    };
  },
})
