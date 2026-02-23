'use strict';

const { WorkOS } = require('@workos-inc/node');
const config = require('../../../app/config/workos.js');

const createWorkOSClient = (options = config) => {
  const { clientId, apiKey, redirectUri, cookiePassword } = options;

  const workos = new WorkOS(apiKey, { clientId });

  return {
    getAuthorizationUrl(screenHint, state, provider) {
      const params = {
        clientId,
        redirectUri,
        state: state || undefined,
      };
      if (provider === 'google' || provider === 'github') {
        params.provider = provider === 'google' ? 'GoogleOAuth' : 'GitHubOAuth';
      } else {
        params.provider = 'authkit';
        params.screenHint = screenHint || 'sign-in';
      }
      return workos.userManagement.getAuthorizationUrl(params);
    },

    async authenticateWithCode(code) {
      return workos.userManagement.authenticateWithCode({
        clientId,
        code,
        session: {
          sealSession: true,
          cookiePassword,
        },
      });
    },

    async verifySessionCookie(sessionData) {
      try {
        const session = await workos.userManagement.loadSealedSession({
          sessionData,
          cookiePassword,
        });
        const result = await session.authenticate();
        if (result.authenticated) {
          return {
            authenticated: true,
            user: result.user,
            organizationId: result.organizationId || null,
          };
        }
        return { authenticated: false };
      } catch {
        return { authenticated: false };
      }
    },

    async refreshSession(sessionData) {
      try {
        const session = await workos.userManagement.loadSealedSession({
          sessionData,
          cookiePassword,
        });
        const result = await session.refresh();
        if (result.authenticated) {
          return {
            authenticated: true,
            sealedSession: result.sealedSession,
            user: result.user,
          };
        }
        return { authenticated: false };
      } catch {
        return { authenticated: false };
      }
    },

    async authenticateWithPassword(email, password) {
      return workos.userManagement.authenticateWithPassword({
        clientId,
        email,
        password,
        session: { sealSession: true, cookiePassword },
      });
    },

    async createUser(email, password, firstName, lastName) {
      return workos.userManagement.createUser({
        email,
        password,
        firstName,
        lastName,
        emailVerified: true,
      });
    },

    async sendMagicAuth(email) {
      return workos.userManagement.createMagicAuth({ email });
    },

    async authenticateWithMagicAuth(code, email) {
      return workos.userManagement.authenticateWithMagicAuth({
        clientId,
        code,
        email,
        session: { sealSession: true, cookiePassword },
      });
    },

    async sendPasswordReset(email) {
      return workos.userManagement.createPasswordReset({ email });
    },

    async resetPassword(token, newPassword) {
      return workos.userManagement.resetPassword({ token, newPassword });
    },

    async getUser(userId) {
      return workos.userManagement.getUser(userId);
    },

    async deleteUser(userId) {
      return workos.userManagement.deleteUser(userId);
    },
  };
};

module.exports = createWorkOSClient;
