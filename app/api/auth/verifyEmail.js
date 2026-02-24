({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/verify-email',
  method: async ({ body }) => {
    const parsed = schemas.VerifyEmailSchema.parse(body);
    const { code, pendingAuthenticationToken } = parsed;

    let result;
    try {
      result = await workos.authenticateWithEmailVerification(code, pendingAuthenticationToken);
    } catch (err) {
      console.error('WorkOS email verification failed:', err?.message || err);
      throw new errors.AuthError('Invalid verification code');
    }

    const { user, sealedSession } = result;
    if (!user || !sealedSession) {
      throw new errors.AuthError('Email verification failed');
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
