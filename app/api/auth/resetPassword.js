({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/auth/reset-password',
  method: async ({ body }) => {
    const parsed = schemas.ResetPasswordSchema.parse(body);

    try {
      await workos.resetPassword(parsed.token, parsed.newPassword);
    } catch {
      throw new errors.ValidationError('Invalid or expired reset token');
    }

    return { success: true };
  },
})
