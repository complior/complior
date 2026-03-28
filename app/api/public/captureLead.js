({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/public/lead',
  rateLimit: { max: 5, timeWindow: '1 hour' },
  method: async ({ body }) => {
    let data;
    try {
      data = schemas.CaptureLeadSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Validation failed', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.leadgen.captureLead.perform({
      email: data.email,
      source: data.source,
      metadata: data.metadata || null,
    });

    return { _statusCode: 200, ...result };
  },
})
