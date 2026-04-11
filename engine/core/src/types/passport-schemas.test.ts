import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AgentPassportSchema } from './passport-schemas.js';

const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT'] ?? '/home/openclaw/test-projects/eval-target';
const AGENTS_DIR = resolve(TEST_PROJECT, '.complior/agents');
const hasPassports = existsSync(resolve(AGENTS_DIR, 'eval-target-anthropic-manifest.json'));

describe.skipIf(!hasPassports)('parsePassport schema validation', () => {
  it('validates eval-target anthropic manifest', () => {
    const content = readFileSync(
      resolve(AGENTS_DIR, 'eval-target-anthropic-manifest.json'),
      'utf-8'
    );
    const manifest = JSON.parse(content);
    const result = AgentPassportSchema.safeParse(manifest);
    if (!result.success) {
      console.warn('Schema errors:', JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('validates eval-target openai manifest', () => {
    const content = readFileSync(
      resolve(AGENTS_DIR, 'eval-target-openai-manifest.json'),
      'utf-8'
    );
    const manifest = JSON.parse(content);
    const result = AgentPassportSchema.safeParse(manifest);
    if (!result.success) {
      console.warn('Schema errors:', JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });
});
