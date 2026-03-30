/**
 * Admin Vendor Claims API — List pending claims, approve/reject.
 *
 * POST /api/admin/vendor-claims
 *   Body: { action: 'list' | 'approve' | 'reject', claimId?, reason? }
 */
({
  access: 'authenticated',
  httpMethod: 'POST',
  path: '/api/admin/vendor-claims',

  method: async ({ body, session, headers }) => {
    // Auth: admin token or platform admin session
    const token = (headers || {})['x-admin-token'];
    if (token && config.server.adminApiToken && token === config.server.adminApiToken) {
      // Token auth OK
    } else {
      await application.admin.requirePlatformAdmin.require(session);
    }

    const action = body && body.action;

    if (action === 'list') {
      const claims = await application.registry.processVendorClaim.listPending({ db });
      return { data: claims };
    }

    if (action === 'approve') {
      if (!body.claimId) {
        throw new errors.ValidationError('Claim ID is required');
      }
      const reviewedBy = (session && session.user && session.user.email)
        || 'admin-token';
      const result = await application.registry.processVendorClaim.approve(
        { db, console },
        { claimId: body.claimId, reviewedBy },
      );
      return { data: result };
    }

    if (action === 'reject') {
      if (!body.claimId) {
        throw new errors.ValidationError('Claim ID is required');
      }
      const reviewedBy = (session && session.user && session.user.email)
        || 'admin-token';
      const result = await application.registry.processVendorClaim.reject(
        { db, console },
        {
          claimId: body.claimId,
          reviewedBy,
          reason: body.reason || null,
        },
      );
      return { data: result };
    }

    throw new errors.ValidationError('Invalid action. Must be: list, approve, or reject');
  },
})
