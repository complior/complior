({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/token',
  method: async ({ body }) => {
    let parsed;
    try {
      parsed = schemas.DeviceTokenSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid request',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }
    return application.auth.deviceFlow.pollToken({
      deviceCode: parsed.deviceCode,
    });
  },
})
