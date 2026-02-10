'use strict';

const { NotFoundError } = require('../../lib/errors.js');

const createCatalogHandlers = (catalogSearch) => {
  const searchHandler = async (request) => {
    const { q, category, riskLevel, page, pageSize } = request.query || {};

    return catalogSearch.search({
      q: q || '',
      category: category || null,
      riskLevel: riskLevel || null,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? Math.min(parseInt(pageSize, 10) || 20, 100) : 20,
    });
  };

  const detailHandler = async (request) => {
    const id = parseInt(request.params.id, 10);
    const tool = await catalogSearch.findById(id);
    if (!tool) throw new NotFoundError('AIToolCatalog', id);
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
