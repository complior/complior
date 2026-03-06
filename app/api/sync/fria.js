({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/sync/fria',
  method: async ({ body, headers }) => {
    const auth = lib.apiAuth.resolveApiAuth(headers);

    const parsed = lib.syncHelpers.validateSync(
      body, schemas.SyncFriaSchema, 'Invalid FRIA sync data',
    );

    const result = await application.sync.processFria.process({
      payload: parsed,
      organizationId: auth.organizationId,
      userId: auth.userId,
    });

    return result;
  },
})
