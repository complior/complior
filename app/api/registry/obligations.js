({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/regulations/obligations',
  method: async ({ query }) => {
    let parsed;
    try {
      parsed = schemas.ObligationSearchSchema.parse(query || {});
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid search parameters', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application.registry.searchObligations.search({
      regulation: parsed.regulation || null,
      risk: parsed.risk || null,
      category: parsed.category || null,
      page: parsed.page,
      limit: parsed.limit,
    });
  },
})
