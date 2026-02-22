({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/data/bundle',
  method: async ({ headers }) => {
    const { bundle, etag } = await application.registry.getBundle.generate();

    const ifNoneMatch = headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      return { _statusCode: 304 };
    }

    return {
      _headers: { ETag: etag, 'Cache-Control': 'public, max-age=300' },
      ...bundle,
    };
  },
})
