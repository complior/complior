/**
 * CJS Build Compatibility — RED tests for C-M02.
 *
 * Validates that @complior/contracts can be consumed via require() (CJS).
 * SaaS uses CJS (`require('./lib/schemas.js')`), so contracts MUST ship
 * a working CJS build alongside the ESM source.
 *
 * These tests require `npm run build` to have been run first.
 * They verify:
 * 1. tsup produces correct dist/ structure (CJS + ESM + .d.ts)
 * 2. CJS build is require()-able by Node.js
 * 3. Sync schemas are accessible via CJS require
 * 4. Zod v4 compatible patterns work (z.record(string, string))
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

describe('CJS Build Output', () => {
  it('tsup produces dist/cjs/index.cjs', () => {
    expect(existsSync(resolve(ROOT, 'dist', 'cjs', 'index.cjs'))).toBe(true);
  });

  it('tsup produces dist/cjs/sync/index.cjs', () => {
    expect(existsSync(resolve(ROOT, 'dist', 'cjs', 'sync', 'index.cjs'))).toBe(true);
  });

  it('tsup produces dist/cjs/shared/index.cjs', () => {
    expect(existsSync(resolve(ROOT, 'dist', 'cjs', 'shared', 'index.cjs'))).toBe(true);
  });

  it('tsup produces dist/esm/index.js with .d.ts', () => {
    expect(existsSync(resolve(ROOT, 'dist', 'esm', 'index.js'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'dist', 'esm', 'index.d.ts'))).toBe(true);
  });

  it('CJS build is require()-able by Node', () => {
    // Use subprocess to test CJS require in non-ESM context
    const result = execSync(
      `node -e "const c = require('./dist/cjs/index.cjs'); console.log(Object.keys(c).length)"`,
      { cwd: ROOT, encoding: 'utf-8' },
    );
    expect(parseInt(result.trim())).toBeGreaterThan(0);
  });

  it('CJS sync schemas are accessible', () => {
    const result = execSync(
      `node -e "const s = require('./dist/cjs/sync/index.cjs'); console.log(typeof s.SyncPassportSchema.safeParse)"`,
      { cwd: ROOT, encoding: 'utf-8' },
    );
    expect(result.trim()).toBe('function');
  });

  it('CJS shared enums are accessible', () => {
    const result = execSync(
      `node -e "const s = require('./dist/cjs/shared/index.cjs'); console.log(s.RISK_LEVELS.length)"`,
      { cwd: ROOT, encoding: 'utf-8' },
    );
    expect(parseInt(result.trim())).toBeGreaterThan(0);
  });
});

describe('Zod v4 Compatibility', () => {
  it('versions field uses v4-compatible z.record(string, string)', async () => {
    // z.record(z.string()) fails in Zod v4, must be z.record(z.string(), z.string())
    const { SyncPassportSchema } = await import('../sync/passport.schema.js');
    const result = SyncPassportSchema.safeParse({
      name: 'test',
      versions: { cli: '1.0.0', manifest: '2.0.0' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.versions).toEqual({ cli: '1.0.0', manifest: '2.0.0' });
    }
  });

  it('signature field uses v4-compatible z.object (not z.record)', async () => {
    const { SyncPassportSchema } = await import('../sync/passport.schema.js');
    const result = SyncPassportSchema.safeParse({
      name: 'test',
      signature: { algorithm: 'ed25519', publicKey: 'pk', signedAt: 'now', hash: 'h', value: 'v' },
    });
    expect(result.success).toBe(true);
  });

  it('CJS build validates passport with versions field', () => {
    const result = execSync(
      `node -e "
        const s = require('./dist/cjs/sync/index.cjs');
        const r = s.SyncPassportSchema.safeParse({
          name: 'test',
          versions: { cli: '1.0.0', manifest: '2.0.0' }
        });
        console.log(r.success ? 'PASS' : 'FAIL: ' + JSON.stringify(r.error.flatten()));
      "`,
      { cwd: ROOT, encoding: 'utf-8' },
    );
    expect(result.trim()).toBe('PASS');
  });
});
