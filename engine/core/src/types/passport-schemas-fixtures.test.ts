/**
 * V1-M20 / TD-31: RED test — passport schema validation must use repo fixtures.
 *
 * Background:
 *   passport-schemas.test.ts skips tests when agents are not present on disk.
 *   On CI or fresh checkout these tests are silently skipped — no real coverage.
 *
 * Specification:
 *   - Two passport JSON fixtures live in repo: `engine/core/data/fixtures/`
 *   - Tests load them from a path resolved via `import.meta.url` (works anywhere)
 *   - Tests are NEVER skipped: always run, always validate
 *
 * Architecture requirements:
 *   - Fixtures are deterministic, version-controlled
 *   - Tests are environment-independent
 *   - Real types (`AgentPassportSchema`)
 *   - Concrete assertions (not just `success: true`)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentPassportSchema } from './passport-schemas.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../../data/fixtures');

describe('TD-31: passport-schemas validates fixtures from repo (not env-dependent)', () => {
  it('anthropic passport fixture exists in repo', () => {
    expect(() =>
      readFileSync(resolve(FIXTURES_DIR, 'passport-anthropic.json'), 'utf-8'),
    ).not.toThrow();
  });

  it('openai passport fixture exists in repo', () => {
    expect(() =>
      readFileSync(resolve(FIXTURES_DIR, 'passport-openai.json'), 'utf-8'),
    ).not.toThrow();
  });

  it('anthropic passport validates against AgentPassportSchema', () => {
    const content = readFileSync(
      resolve(FIXTURES_DIR, 'passport-anthropic.json'),
      'utf-8',
    );
    const passport = JSON.parse(content) as unknown;
    const result = AgentPassportSchema.safeParse(passport);

    if (!result.success) {
      // Surface schema errors loudly for CI logs
      // eslint-disable-next-line no-console
      console.error('Anthropic passport schema errors:', JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('openai passport validates against AgentPassportSchema', () => {
    const content = readFileSync(
      resolve(FIXTURES_DIR, 'passport-openai.json'),
      'utf-8',
    );
    const passport = JSON.parse(content) as unknown;
    const result = AgentPassportSchema.safeParse(passport);

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('OpenAI passport schema errors:', JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('uses data/fixtures path, not dynamic environment paths', () => {
    // Implementation must use the fixed fixtures path under engine/core/data/,
    // not a runtime-resolved path from environment variables.
    // Verify by reading self and checking for the expected directory path.
    const selfPath = fileURLToPath(import.meta.url);
    const selfSource = readFileSync(selfPath, 'utf-8');
    // Must reference the canonical data/fixtures path
    expect(selfSource).toMatch(/['"]\.\.\/\.\.\/data\/fixtures['"]/);
    expect(selfSource).not.toMatch(/process\.env/);
  });
});
