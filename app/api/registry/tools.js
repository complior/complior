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
    method: async ({ params }) => {
      const slug = params.slug;
      if (!slug || typeof slug !== 'string') {
        throw new errors.ValidationError('Invalid slug');
      }
      const tool = await application.registry.searchTools.findBySlug(slug);
      if (!tool) throw new errors.NotFoundError('RegistryTool', slug);
      return tool;
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
