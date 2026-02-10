'use strict';

const fsp = require('node:fs').promises;
const vm = require('node:vm');
const path = require('node:path');

const OPTIONS = {
  timeout: 5000,
  displayErrors: false,
};

const load = async (filePath, sandbox) => {
  const src = await fsp.readFile(filePath, 'utf8');
  const code = `'use strict';\n{\n${src}\n}`;
  const script = new vm.Script(code, {
    ...OPTIONS,
    lineOffset: -2,
  });
  const context = vm.createContext(sandbox);
  return script.runInContext(context, OPTIONS);
};

const loadDir = async (dir, sandbox) => {
  const files = await fsp.readdir(dir);
  const container = {};
  for (const fileName of files) {
    if (!fileName.endsWith('.js')) continue;
    if (fileName.startsWith('.')) continue;
    const filePath = path.join(dir, fileName);
    const name = path.basename(fileName, '.js');
    container[name] = await load(filePath, sandbox);
  }
  return container;
};

const loadDeepDir = async (dir, sandbox) => {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const container = {};
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      container[entry.name] = await loadDeepDir(fullPath, sandbox);
    } else if (entry.name.endsWith('.js')) {
      const name = path.basename(entry.name, '.js');
      container[name] = await load(fullPath, sandbox);
    }
  }
  return container;
};

const loadApplication = async (appPath, serverContext) => {
  const { console: logger, db, config, errors, schemas, zod,
    ory, brevo, gotenberg, s3 } = serverContext;

  // Base sandbox — available to all VM layers
  const sandbox = {
    console: Object.freeze(logger),
    db,
    config: Object.freeze(config),
    errors: Object.freeze(errors),
    schemas: Object.freeze(schemas),
    zod,
    ory: Object.freeze(ory),
    brevo: Object.freeze(brevo),
    gotenberg: Object.freeze(gotenberg),
    s3: Object.freeze(s3),
  };

  // Layer 1: lib (permissions, audit, tenant)
  const lib = await loadDir(path.join(appPath, 'lib'), sandbox);
  sandbox.lib = Object.freeze(lib);

  // Layer 2: application (use cases)
  const application = await loadDeepDir(
    path.join(appPath, 'application'), sandbox,
  );
  sandbox.application = Object.freeze(application);

  // Layer 3: api (HTTP handlers)
  const api = await loadDeepDir(
    path.join(appPath, 'api'), sandbox,
  );
  sandbox.api = Object.freeze(api);

  return Object.freeze({ lib, application, api, config });
};

module.exports = { load, loadDir, loadDeepDir, loadApplication };
