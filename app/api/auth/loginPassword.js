({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/login/password',
  method: async ({ body }) => {
    const parsed = schemas.LoginPasswordSchema.parse(body);
    const { email, password } = parsed;

    let result;
    try {
      result = await workos.authenticateWithPassword(email, password);
    } catch {
      throw new errors.AuthError('Invalid email or password');
    }

    const { user, sealedSession } = result;
    if (!user || !sealedSession) {
      throw new errors.AuthError('Authentication failed');
    }

    await application.iam.syncUserFromWorkOS.syncUser(user);

    return {
      success: true,
      user: { id: user.id, email: user.email },
      _cookie: {
        name: 'wos-session',
        value: sealedSession,
        options: {
          path: '/',
          httpOnly: true,
          secure: (config.server?.frontendUrl || '').startsWith('https'),
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 400,
        },
      },
    };
  },
})
