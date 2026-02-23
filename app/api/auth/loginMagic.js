({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/login/magic',
  method: async ({ body }) => {
    const parsed = schemas.LoginMagicSchema.parse(body);

    try {
      await workos.sendMagicAuth(parsed.email);
    } catch {
      // Always return success to prevent email enumeration
    }

    return { success: true };
  },
})
