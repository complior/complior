({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/login/magic/verify',
  method: async ({ body }) => {
    const parsed = schemas.LoginMagicVerifySchema.parse(body);
    const { email, code } = parsed;

    let result;
    try {
      result = await workos.authenticateWithMagicAuth(code, email);
    } catch {
      throw new errors.AuthError('Invalid or expired code');
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
