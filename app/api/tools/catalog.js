'use strict';

const { z } = require('zod');
const { NotFoundError, ValidationError } = require('../../lib/errors.js');
const { CatalogSearchSchema, CatalogIdSchema } = require('../../lib/schemas.js');

const createCatalogHandlers = (catalogSearch) => {
  const searchHandler = async (request) => {
    let query;
    try {
      query = CatalogSearchSchema.parse(request.query || {});
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Invalid search parameters', err.flatten().fieldErrors);
      }
      throw err;
    }

    return catalogSearch.search({
      q: query.q || '',
      category: query.category || null,
      riskLevel: query.riskLevel || null,
      page: query.page,
      pageSize: query.pageSize,
    });
  };

  const detailHandler = async (request) => {
    let params;
    try {
      params = CatalogIdSchema.parse(request.params);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Invalid catalog ID', err.flatten().fieldErrors);
      }
      throw err;
    }

    const tool = await catalogSearch.findById(params.id);
    if (!tool) throw new NotFoundError('AIToolCatalog', params.id);
    return tool;
  };

  return [
    {
      method: 'GET',
      path: '/api/tools/catalog/search',
      handler: searchHandler,
      public: true,
    },
    {
      method: 'GET',
      path: '/api/tools/catalog/:id',
      handler: detailHandler,
      public: true,
    },
  ];
};

module.exports = createCatalogHandlers;
