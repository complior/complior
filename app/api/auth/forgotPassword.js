({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/forgot-password',
  method: async ({ body }) => {
    const parsed = schemas.ForgotPasswordSchema.parse(body);

    try {
      await workos.sendPasswordReset(parsed.email);
    } catch {
      // Always return success to prevent email enumeration
    }

    return { success: true };
  },
})
