({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/sync/scan',
  method: async ({ body, headers }) => {
    const auth = lib.apiAuth.resolveApiAuth(headers);

    let parsed;
    try {
      parsed = schemas.SyncScanSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid scan data', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application.sync.processScanUpload.process({
      scanData: parsed,
      organizationId: auth.organizationId,
      userId: auth.userId,
    });
  },
})
