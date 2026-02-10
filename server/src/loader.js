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
  const context = vm.createContext(
    Object.freeze({ ...sandbox }),
  );
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

module.exports = { load, loadDir };
