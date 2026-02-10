'use strict';

const { z } = require('zod');
const { AuthError, ValidationError } = require('../../lib/errors.js');
const { AuditQuerySchema } = require('../../lib/schemas.js');

const createAuditHandler = (sessionResolver, checkPermission, auditLogger) => {
  const handler = async (request) => {
    if (!request.session) throw new AuthError();

    const user = await sessionResolver.resolveUser(request.session);
    if (!user) throw new AuthError('User not found');

    await checkPermission(user, 'AuditLog', 'read');

    let query;
    try {
      query = AuditQuerySchema.parse(request.query || {});
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Invalid query parameters', err.flatten().fieldErrors);
      }
      throw err;
    }

    return auditLogger.findEntries(user.organizationId, {
      page: query.page,
      pageSize: query.pageSize,
      action: query.action,
      resource: query.resource,
    });
  };

  return {
    method: 'GET',
    path: '/api/auth/audit',
    handler,
  };
};

module.exports = createAuditHandler;
