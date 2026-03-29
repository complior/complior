({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/public/quick-check',
  rateLimit: { max: 10, timeWindow: '1 hour' },
  method: async ({ body }) => {
    let data;
    try {
      data = schemas.QuickCheckSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Validation failed', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    if (data.email && !data.consent) {
      throw new errors.ValidationError(
        'Consent is required when providing an email', { consent: ['Required when email is provided'] },
      );
    }

    const result = await application.leadgen.performQuickCheck.perform({
      answers: data.answers,
    });

    // Capture lead if email+consent provided (non-blocking)
    if (data.email && data.consent) {
      try {
        await application.leadgen.captureLead.perform({
          email: data.email,
          source: 'quick_check',
          metadata: {
            applies: result.applies,
            obligationCount: result.obligations.length,
            highRisk: result.highRiskAreas.length > 0,
          },
        });
      } catch (err) {
        console.error('Lead capture in quick check failed:', err.message);
      }
    }

    return { _statusCode: 200, ...result };
  },
})
