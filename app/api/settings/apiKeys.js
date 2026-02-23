[
  {
    access: 'authenticated',
    httpMethod: 'GET',
    path: '/api/settings/api-keys',
    method: async ({ session }) => {
      if (!session) throw new errors.AuthError('Not authenticated');

      const user = await application.iam.resolveSession.resolveUser(session);
      if (!user) throw new errors.AuthError('User not found');

      await lib.permissions.checkPermission(user, 'ApiKey', 'manage');

      return application.registry.listApiKeys.list({
        organizationId: user.organizationId,
      });
    },
  },
  {
    access: 'authenticated',
    httpMethod: 'POST',
    path: '/api/settings/api-keys',
    method: async ({ body, session }) => {
      if (!session) throw new errors.AuthError('Not authenticated');

      const user = await application.iam.resolveSession.resolveUser(session);
      if (!user) throw new errors.AuthError('User not found');

      await lib.permissions.checkPermission(user, 'ApiKey', 'manage');

      let parsed;
      try {
        parsed = schemas.ApiKeyCreateSchema.parse(body);
      } catch (err) {
        if (err.flatten) {
          throw new errors.ValidationError(
            'Invalid API key data', err.flatten().fieldErrors,
          );
        }
        throw err;
      }

      const result = await application.registry.createApiKey.create({
        organizationId: user.organizationId,
        userId: user.id,
        name: parsed.name,
        expiresInDays: parsed.expiresInDays,
      });

      return { _statusCode: 201, ...result };
    },
  },
]
