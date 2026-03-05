({
  access: 'public',
  httpMethod: 'GET',
  path: '/api/sync/status',
  method: async ({ headers }) => {
    const auth = lib.apiAuth.resolveApiAuth(headers);
    return application.sync.syncStatus.getStatus({
      organizationId: auth.organizationId,
    });
  },
})
