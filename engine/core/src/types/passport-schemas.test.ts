import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AgentPassportSchema } from './passport-schemas.js';

const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT'] ?? '/home/openclaw/test-projects/eval-target';

describe('parsePassport schema validation', () => {
  it('validates eval-target anthropic manifest', () => {
    const content = readFileSync(
      resolve(TEST_PROJECT, '.complior/agents/eval-target-anthropic-manifest.json'),
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
      resolve(TEST_PROJECT, '.complior/agents/eval-target-openai-manifest.json'),
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
