({
  access: 'authenticated',
  httpMethod: 'DELETE',
  path: '/api/user/account',
  method: async ({ body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');

    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');

    const parsed = schemas.AccountDeleteSchema.parse(body);
    if (!parsed.confirm) {
      throw new errors.ValidationError('Confirmation required');
    }

    await application.iam.deleteAccount.deleteAccount({
      userId: user.id,
      organizationId: user.organizationId,
      oryId: user.oryId,
    });

    return { _statusCode: 200, deleted: true };
  },
})
