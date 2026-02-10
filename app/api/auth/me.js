'use strict';

const { AuthError } = require('../../lib/errors.js');

const createMeHandler = (db, userSync) => {
  const handler = async (request) => {
    if (!request.session) {
      throw new AuthError('Not authenticated');
    }

    // Sync-on-login: ensure user exists in our DB
    const user = await userSync.syncOnLogin(request.session);
    if (!user) {
      throw new AuthError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId,
      locale: user.locale,
      roles: user.roles || [],
      active: user.active,
    };
  };

  return {
    method: 'GET',
    path: '/api/auth/me',
    handler,
  };
};

module.exports = createMeHandler;
