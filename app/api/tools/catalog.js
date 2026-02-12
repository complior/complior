[
  {
    access: 'public',
    httpMethod: 'GET',
    path: '/api/tools/catalog/search',
    method: async ({ query }) => {
      let parsed;
      try {
        parsed = schemas.CatalogSearchSchema.parse(query || {});
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError(
            'Invalid search parameters', err.flatten().fieldErrors,
          );
        }
        throw err;
      }

      return application.inventory.searchCatalog.search({
        q: parsed.q || '',
        category: parsed.category || null,
        riskLevel: parsed.riskLevel || null,
        domain: parsed.domain || null,
        maxRisk: parsed.maxRisk || null,
        page: parsed.page,
        pageSize: parsed.pageSize,
      });
    },
  },
  {
    access: 'public',
    httpMethod: 'GET',
    path: '/api/tools/catalog/:id',
    method: async ({ params }) => {
      let parsed;
      try {
        parsed = schemas.CatalogIdSchema.parse(params);
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError(
            'Invalid catalog ID', err.flatten().fieldErrors,
          );
        }
        throw err;
      }

      const tool = await application.inventory.searchCatalog.findById(parsed.id);
      if (!tool) throw new errors.NotFoundError('AIToolCatalog', parsed.id);
      return tool;
    },
  },
]
