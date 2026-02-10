'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const modulePath = require.resolve('../app/config/validate.js');

describe('Config validation', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete require.cache[modulePath];
  });

  afterEach(() => {
    process.env = originalEnv;
    delete require.cache[modulePath];
  });

  it('throws on missing DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    const validate = require(modulePath);
    assert.throws(() => validate(), /DATABASE_URL/);
  });

  it('returns warnings for missing optional vars', () => {
    process.env.DATABASE_URL = 'postgres://test';
    delete process.env.ORY_WEBHOOK_SECRET;
    delete process.env.BREVO_API_KEY;
    delete process.env.S3_ENDPOINT;
    const validate = require(modulePath);
    const { warnings } = validate();
    assert(warnings.length >= 3);
  });

  it('passes with all vars set', () => {
    process.env.DATABASE_URL = 'postgres://test';
    process.env.ORY_WEBHOOK_SECRET = 'secret';
    process.env.BREVO_API_KEY = 'key';
    process.env.S3_ENDPOINT = 'https://s3.example.com';
    const validate = require(modulePath);
    const { warnings } = validate();
    assert.strictEqual(warnings.length, 0);
  });
});
