'use strict';

const { AuthError } = require('../../lib/errors.js');

const createAuditHandler = (sessionResolver, checkPermission, auditLogger) => {
  const handler = async (request) => {
    if (!request.session) throw new AuthError();

    const user = await sessionResolver.resolveUser(request.session);
    if (!user) throw new AuthError('User not found');

    await checkPermission(user, 'AuditLog', 'read');

    const { page, pageSize, action, resource } = request.query || {};

    return auditLogger.findEntries(user.organizationId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      action,
      resource,
    });
  };

  return {
    method: 'GET',
    path: '/api/auth/audit',
    handler,
  };
};

module.exports = createAuditHandler;
