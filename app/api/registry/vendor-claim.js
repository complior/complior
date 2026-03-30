/**
 * Vendor Claim API — Submit, verify, and manage vendor ownership claims.
 *
 * POST /api/public/registry/vendor-claim
 *   Body: { toolSlug, email }
 *   Returns: { claimId, methods (DNS/meta/well-known instructions) }
 *
 * POST /api/public/registry/vendor-claim/verify
 *   Body: { claimId, method }
 *   Returns: { verified, error? }
 *
 * GET /api/public/registry/vendor-claim/:claimId
 *   Returns: claim status
 */
({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/public/registry/vendor-claim',

  method: async ({ body }) => {
    const action = (body && body.action) || 'submit';

    // ── Submit new claim ──────────────────────────────────────
    if (action === 'submit') {
      if (!body.toolSlug || !body.email) {
        throw new errors.ValidationError('Missing required fields', {
          toolSlug: !body.toolSlug ? ['Tool slug is required'] : [],
          email: !body.email ? ['Email is required'] : [],
        });
      }

      // Basic email validation
      if (!body.email.includes('@') || !body.email.includes('.')) {
        throw new errors.ValidationError('Invalid email', {
          email: ['Must be a valid email address'],
        });
      }

      const verifier = domain.registry['vendor-verification']
        ? domain.registry['vendor-verification']({ fetch, config })
        : null;

      if (!verifier) {
        throw new errors.InternalServerError('Vendor verification not available');
      }

      try {
        const result = await application.registry.processVendorClaim.submit(
          { db, console },
          {
            toolSlug: body.toolSlug,
            email: body.email,
            websiteUrl: body.websiteUrl || null,
          },
          verifier,
        );

        return {
          _statusCode: 201,
          data: result,
        };
      } catch (err) {
        throw new errors.ValidationError(err.message);
      }
    }

    // ── Verify claim ──────────────────────────────────────────
    if (action === 'verify') {
      if (!body.claimId || !body.method) {
        throw new errors.ValidationError('Missing required fields', {
          claimId: !body.claimId ? ['Claim ID is required'] : [],
          method: !body.method ? ['Verification method is required'] : [],
        });
      }

      const validMethods = ['dns_txt', 'meta_tag', 'well_known'];
      if (!validMethods.includes(body.method)) {
        throw new errors.ValidationError('Invalid verification method', {
          method: [`Must be one of: ${validMethods.join(', ')}`],
        });
      }

      const verifier = domain.registry['vendor-verification']
        ? domain.registry['vendor-verification']({ fetch, config })
        : null;

      if (!verifier) {
        throw new errors.InternalServerError('Vendor verification not available');
      }

      try {
        const result = await application.registry.processVendorClaim.verify(
          { db, console },
          { claimId: body.claimId, method: body.method },
          verifier,
        );
        return { data: result };
      } catch (err) {
        throw new errors.ValidationError(err.message);
      }
    }

    // ── Get status ────────────────────────────────────────────
    if (action === 'status') {
      if (!body.claimId) {
        throw new errors.ValidationError('Claim ID is required');
      }

      const claim = await application.registry.processVendorClaim.getStatus(
        { db },
        body.claimId,
      );

      if (!claim) {
        throw new errors.NotFoundError('Claim not found');
      }

      return { data: claim };
    }

    throw new errors.ValidationError('Invalid action. Must be: submit, verify, or status');
  },
})
