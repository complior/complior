({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/sync/documents',
  method: async ({ body, headers }) => {
    const auth = lib.apiAuth.resolveApiAuth(headers);

    let parsed;
    try {
      parsed = schemas.SyncDocumentsSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid document data', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application.sync.processDocuments.process({
      documents: parsed.documents,
      organizationId: auth.organizationId,
      userId: auth.userId,
    });
  },
})
