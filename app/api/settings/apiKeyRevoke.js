({
  access: 'authenticated',
  httpMethod: 'DELETE',
  path: '/api/settings/api-keys/:id',
  method: async ({ params, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    await lib.permissions.checkPermission(user, 'ApiKey', 'manage');

    let parsed;
    try {
      parsed = schemas.ApiKeyIdSchema.parse(params);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid API key ID', err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    const result = await application.registry.revokeApiKey.revoke({
      organizationId: user.organizationId,
      apiKeyId: parsed.id,
      userId: user.id,
    });

    if (!result) throw new errors.NotFoundError('ApiKey', parsed.id);
    return { revoked: true };
  },
})
