({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/sync/documents',
  method: async ({ body, headers }) => {
    const auth = lib.apiAuth.resolveApiAuth(headers);

    const parsed = lib.syncHelpers.validateSync(
      body, schemas.SyncDocumentsSchema, 'Invalid document data',
    );

    return application.sync.processDocuments.process({
      documents: parsed.documents,
      organizationId: auth.organizationId,
      userId: auth.userId,
    });
  },
})
