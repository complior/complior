[
  {
    access: 'public',
    httpMethod: 'GET',
    path: '/v1/registry/tools',
    method: async ({ query }) => {
      let parsed;
      try {
        parsed = schemas.RegistryToolSearchSchema.parse(query || {});
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError(
            'Invalid search parameters', err.flatten().fieldErrors,
          );
        }
        throw err;
      }

      return application.registry.searchTools.search({
        q: parsed.q || '',
        category: parsed.category || null,
        risk: parsed.risk || null,
        aiActRole: parsed.aiActRole || null,
        jurisdiction: parsed.jurisdiction || null,
        hasDetectionPatterns: parsed.hasDetectionPatterns ?? null,
        level: parsed.level || null,
        sort: parsed.sort || null,
        page: parsed.page,
        limit: parsed.limit,
      });
    },
  },
  {
    access: 'public',
    httpMethod: 'GET',
    path: '/v1/registry/tools/by-slug/:slug',
    method: async ({ params, query }) => {
      const slug = params.slug;
      if (!slug || typeof slug !== 'string') {
        throw new errors.ValidationError('Invalid slug');
      }
      const tool = await application.registry.searchTools.findBySlug(slug);
      if (!tool) throw new errors.NotFoundError('RegistryTool', slug);

      // Optional includes: ?include=actions,procurement,fria
      const includes = (query && query.include)
        ? query.include.split(',').map((s) => s.trim())
        : [];

      const result = { ...tool };

      if (includes.includes('actions')) {
        const generator = domain.registry['deployer-action-generator']
          ? domain.registry['deployer-action-generator']()
          : null;
        if (generator) {
          const assessment = (tool.assessments && tool.assessments['eu-ai-act']) || {};
          const obligations = assessment.deployer_obligations || [];
          result.deployerActions = generator.generateActions(tool, obligations);
        }
      }

      if (includes.includes('procurement')) {
        const procScorer = domain.registry['procurement-scorer']
          ? domain.registry['procurement-scorer']()
          : null;
        if (procScorer) {
          const assessment = (tool.assessments && tool.assessments['eu-ai-act']) || {};
          result.procurementScore = procScorer.calculateProcurementScore(tool, {
            score: assessment.score || 0,
            grade: assessment.grade || 'F',
            transparencyGrade: assessment.transparencyGrade || 'F',
            confidence: assessment.confidence || 0,
          });
        }
      }

      if (includes.includes('fria')) {
        const prefill = await application.compliance.prefillFRIA
          .prefillFromRegistry({ db, console }, slug);
        if (prefill && prefill.found) {
          result.friaPrefill = prefill;
        }
      }

      return result;
    },
  },
  {
    access: 'public',
    httpMethod: 'GET',
    path: '/v1/registry/tools/:id',
    method: async ({ params }) => {
      let parsed;
      try {
        parsed = schemas.RegistryToolIdSchema.parse(params);
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError(
            'Invalid tool ID', err.flatten().fieldErrors,
          );
        }
        throw err;
      }

      const tool = await application.registry.searchTools.findById(parsed.id);
      if (!tool) throw new errors.NotFoundError('RegistryTool', parsed.id);
      return tool;
    },
  },
]
