'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadSchemas, generateDDL, TABLE_ORDER } = require('../app/setup.js');

describe('Setup — schema loading', () => {
  it('loads all 48 schemas', async () => {
    const schemas = await loadSchemas();
    assert.strictEqual(schemas.size, 48);
  });

  it('TABLE_ORDER has 48 entries', () => {
    assert.strictEqual(TABLE_ORDER.length, 48);
  });

  it('TABLE_ORDER entries are unique', () => {
    const unique = new Set(TABLE_ORDER);
    assert.strictEqual(unique.size, TABLE_ORDER.length);
  });

  it('generates valid DDL for Organization', async () => {
    const schemas = await loadSchemas();
    const ddl = generateDDL('Organization', schemas.get('Organization'), schemas);
    assert(ddl.includes('CREATE TABLE'));
    assert(ddl.includes('"Organization"'));
    assert(ddl.includes('PRIMARY KEY'));
  });

  it('generates DDL with foreign keys for User', async () => {
    const schemas = await loadSchemas();
    const ddl = generateDDL('User', schemas.get('User'), schemas);
    assert(ddl.includes('REFERENCES'));
    assert(ddl.includes('"workosUserId"'));
  });

  it('all TABLE_ORDER entries have matching schemas', async () => {
    const schemas = await loadSchemas();
    for (const name of TABLE_ORDER) {
      assert(schemas.has(name), `Schema missing for ${name}`);
    }
  });
});
