({
  sign: (payload, secret, expiresIn) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claims = { ...payload, iat: now, exp: now + expiresIn };

    const encode = (obj) =>
      Buffer.from(JSON.stringify(obj)).toString('base64url');
    const headerB64 = encode(header);
    const payloadB64 = encode(claims);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  },

  verify: (token, secret) => {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const [headerB64, payloadB64, signatureB64] = parts;
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

    return payload;
  },
})
