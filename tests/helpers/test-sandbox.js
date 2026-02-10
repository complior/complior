'use strict';

const path = require('node:path');
const errors = require('../../server/lib/errors.js');
const schemas = require('../../server/lib/schemas.js');
const zod = require('zod');
const { load, loadDir, loadDeepDir } = require('../../server/src/loader.js');

const APP_PATH = path.resolve(__dirname, '../../app');

const createTestSandbox = (mockDb, extras = {}) => ({
  console,
  db: mockDb,
  errors,
  schemas,
  zod,
  config: {},
  ory: { verifyWebhookSecret: () => false, verifySession: async () => null },
  brevo: { sendTransactional: async () => ({}) },
  gotenberg: { convertHtmlToPdf: async () => Buffer.alloc(0) },
  s3: { upload: async () => ({}), download: async () => null },
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
  const application = await loadAppDeepDir('application', sandbox);
  sandbox.application = application;
  const api = await loadAppDeepDir('api', sandbox);
  sandbox.api = api;
  return { sandbox, lib, application, api };
};

module.exports = {
  createTestSandbox, loadAppModule, loadAppDir,
  loadAppDeepDir, buildFullSandbox, APP_PATH,
};
