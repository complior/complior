({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/register/password',
  method: async ({ body }) => {
    const parsed = schemas.RegisterPasswordSchema.parse(body);
    const { email, password, firstName, lastName } = parsed;

    let user;
    try {
      user = await workos.createUser(email, password, firstName, lastName);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('email')) {
        throw new errors.ConflictError('A user with this email already exists');
      }
      throw err;
    }

    let authResult;
    try {
      authResult = await workos.authenticateWithPassword(email, password);
    } catch (err) {
      const errCode = err?.rawData?.code || err?.code || '';
      if (errCode === 'email_verification_required') {
        return {
          success: false,
          emailVerificationRequired: true,
          pendingAuthenticationToken: err.rawData?.pending_authentication_token || '',
          email,
        };
      }
      throw new errors.AuthError('Account created but authentication failed');
    }

    const { sealedSession } = authResult;
    if (!sealedSession) {
      throw new errors.AuthError('Authentication failed');
    }

    await application.iam.syncUserFromWorkOS.syncUser(user);

    return {
      success: true,
      created: true,
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
