({
  resolveApiAuth: (headers) => {
    const authHeader = headers.authorization || headers.Authorization;
    if (!authHeader) throw new errors.AuthError('Missing Authorization header');

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new errors.AuthError('Invalid Authorization format. Use: Bearer <token>');
    }

    const token = parts[1];
    const secret = config.server.jwtSecret;
    if (!secret) throw new errors.AuthError('JWT not configured');

    try {
      // Inline JWT verify — duplicated from lib/jwt.js by design:
      // lib modules cannot cross-reference each other in the VM sandbox
      // (the lib context object is built FROM these modules, so it's not available during load)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) throw new Error('Invalid token format');

      const [headerB64, payloadB64, signatureB64] = tokenParts;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (
        !crypto.timingSafeEqual(
          Buffer.from(signatureB64),
          Buffer.from(expected),
        )
      ) {
        throw new Error('Invalid token signature');
      }

      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString(),
      );
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      if (!payload.userId || !payload.organizationId) {
        throw new errors.AuthError('Invalid token payload');
      }
      return {
        userId: payload.userId,
        organizationId: payload.organizationId,
        scope: payload.scope || '',
      };
    } catch (err) {
      if (err instanceof errors.AuthError) throw err;
      throw new errors.AuthError(err.message || 'Invalid token');
    }
  },
})
