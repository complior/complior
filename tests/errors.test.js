'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  AppError, ValidationError, AuthError,
  ForbiddenError, NotFoundError, ConflictError,
  RateLimitError,
} = require('../server/lib/errors.js');

describe('Error classes', () => {
  it('AppError defaults', () => {
    const err = new AppError('test');
    assert.strictEqual(err.statusCode, 500);
    assert.strictEqual(err.code, 'INTERNAL_ERROR');
    assert.strictEqual(err.message, 'test');
    assert(err instanceof Error);
  });

  it('AppError toJSON', () => {
    const err = new AppError('test', 400, 'CUSTOM');
    const json = err.toJSON();
    assert.deepStrictEqual(json, {
      error: { code: 'CUSTOM', message: 'test' },
    });
  });

  it('ValidationError', () => {
    const err = new ValidationError('bad', { field: 'email' });
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.code, 'VALIDATION_ERROR');
    const json = err.toJSON();
    assert.deepStrictEqual(json.error.details, { field: 'email' });
  });

  it('AuthError', () => {
    const err = new AuthError();
    assert.strictEqual(err.statusCode, 401);
    assert.strictEqual(err.code, 'AUTH_ERROR');
  });

  it('ForbiddenError', () => {
    const err = new ForbiddenError();
    assert.strictEqual(err.statusCode, 403);
    assert.strictEqual(err.code, 'FORBIDDEN');
  });

  it('NotFoundError with resource', () => {
    const err = new NotFoundError('User', 42);
    assert.strictEqual(err.statusCode, 404);
    assert.strictEqual(err.code, 'NOT_FOUND');
    assert.match(err.message, /User.*42/);
  });

  it('NotFoundError without id', () => {
    const err = new NotFoundError('User');
    assert.match(err.message, /User not found/);
  });

  it('ConflictError', () => {
    const err = new ConflictError();
    assert.strictEqual(err.statusCode, 409);
    assert.strictEqual(err.code, 'CONFLICT');
  });

  it('RateLimitError', () => {
    const err = new RateLimitError();
    assert.strictEqual(err.statusCode, 429);
    assert.strictEqual(err.code, 'RATE_LIMIT');
  });
});
