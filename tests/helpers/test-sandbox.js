'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const errors = require('../../server/lib/errors.js');
const schemas = require('../../server/lib/schemas.js');
const zod = require('zod');
const { load, loadDir, loadDeepDir } = require('../../server/src/loader.js');

const APP_PATH = path.resolve(__dirname, '../../app');

const createTestSandbox = (mockDb, extras = {}) => ({
  setTimeout,
  clearTimeout,
  Buffer,
  console,
  crypto,
  db: mockDb,
  errors,
  schemas,
  zod,
  config: {},
  workos: {
    getAuthorizationUrl: () => 'https://authkit.workos.com/test',
    authenticateWithCode: async () => ({
      user: { id: 'wos_user_test', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      sealedSession: 'sealed-session-data',
    }),
    authenticateWithPassword: async () => ({
      user: { id: 'wos_user_test', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      sealedSession: 'sealed-session-data',
    }),
    createUser: async () => ({ id: 'wos_user_new', email: 'new@example.com', firstName: 'New', lastName: 'User' }),
    sendMagicAuth: async () => ({ id: 'magic_01' }),
    authenticateWithMagicAuth: async () => ({
      user: { id: 'wos_user_test', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      sealedSession: 'sealed-session-data',
    }),
    sendPasswordReset: async () => ({ id: 'reset_01' }),
    resetPassword: async () => ({ user: { id: 'wos_user_test' } }),
    authenticateWithEmailVerification: async () => ({
      user: { id: 'wos_user_test', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      sealedSession: 'sealed-session-data',
    }),
    verifySessionCookie: async () => ({ authenticated: true, user: { id: 'wos_user_test' } }),
    deleteUser: async () => {},
  },
  brevo: { sendTransactional: async () => ({}) },
  gotenberg: { convertHtmlToPdf: async () => Buffer.alloc(0) },
  s3: { upload: async () => ({}), download: async () => null },
  stripe: { createCheckoutSession: async () => ({}), retrieveSession: async () => null, constructEvent: () => null },
  ...extras,
});

const loadAppModule = async (relativePath, sandbox) => {
  const filePath = path.join(APP_PATH, relativePath);
  return load(filePath, sandbox);
};

const loadAppDir = async (relativePath, sandbox) => {
  const dirPath = path.join(APP_PATH, relativePath);
  return loadDir(dirPath, sandbox);
};

const loadAppDeepDir = async (relativePath, sandbox) => {
  const dirPath = path.join(APP_PATH, relativePath);
  return loadDeepDir(dirPath, sandbox);
};

const buildFullSandbox = async (mockDb, extras = {}) => {
  const sandbox = createTestSandbox(mockDb, extras);
  const lib = await loadAppDir('lib', sandbox);
  sandbox.lib = lib;
  const domain = await loadAppDeepDir('domain', sandbox);
  sandbox.domain = domain;
  const application = await loadAppDeepDir('application', sandbox);
  sandbox.application = application;
  const api = await loadAppDeepDir('api', sandbox);
  sandbox.api = api;
  return { sandbox, lib, domain, application, api };
};

module.exports = {
  createTestSandbox, loadAppModule, loadAppDir,
  loadAppDeepDir, buildFullSandbox, APP_PATH,
};
