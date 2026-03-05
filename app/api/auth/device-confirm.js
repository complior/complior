({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/auth/device-confirm',
  method: async ({ body, session }) => {
    if (!session) throw new errors.AuthError('Not authenticated');
    const user = await application.iam.resolveSession.resolveUser(session);
    if (!user) throw new errors.AuthError('User not found');
    await lib.permissions.checkPermission(user, 'DeviceCode', 'create');

    let parsed;
    try {
      parsed = schemas.DeviceConfirmSchema.parse(body);
    } catch (err) {
      if (err.flatten) {
        throw new errors.ValidationError(
          'Invalid request',
          err.flatten().fieldErrors,
        );
      }
      throw err;
    }

    return application.auth.deviceFlow.confirmDevice({
      userCode: parsed.userCode,
      userId: user.id,
      organizationId: user.organizationId,
    });
  },
})
