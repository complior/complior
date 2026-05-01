/**
 * V1-M30.9 / W-2: RED — fix planner Discovery phase must detect existing files.
 *
 * V1-M30.8a W-7 RED test was structural (checked that `planFix` exists). It
 * passed because the function exists, but the ACTUAL behaviour wasn't fixed:
 * /deep-e2e shows `FILES TO CREATE` for files that exist as `draft` on disk.
 *
 * This RED test verifies the CONCRETE behaviour: a finding whose `outputFile`
 * exists on disk MUST produce an `enrich` (or `edit`) action, NOT `create`.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

describe('V1-M30.9 W-2: fix Discovery emits enrich (not create) for existing files', () => {
  it('finding whose outputFile exists on disk → action.type === "enrich"', async () => {
    const proj = mkdtempSync(resolve(tmpdir(), 'm30-9-w2-'));
    try {
      // Pre-create the file the finding will reference.
      mkdirSync(resolve(proj, 'docs', 'compliance'), { recursive: true });
      writeFileSync(
        resolve(proj, 'docs', 'compliance', 'ai-literacy-policy.md'),
        '# AI Literacy Policy\n\n[some content]\n',
      );
      expect(existsSync(resolve(proj, 'docs', 'compliance', 'ai-literacy-policy.md'))).toBe(true);

      // Probe the fixer — module location is FA-03 spec
      const fixerCandidates = [
        '../fixer/index.js',
        '../fixer/planner.js',
        '../fixer/strategies/index.js',
      ];
      let planner: ((finding: unknown, ctx: unknown) => unknown) | null = null;
      for (const path of fixerCandidates) {
        try {
          const mod = await import(path);
          for (const k of Object.keys(mod)) {
            if (typeof (mod as Record<string, unknown>)[k] === 'function' && /^plan|generatePlan|buildPlan/.test(k)) {
              planner = (mod as Record<string, unknown>)[k] as typeof planner;
              break;
            }
          }
          if (planner) break;
        } catch { /* try next */ }
      }
      expect(planner, 'fixer must expose a plan/planFix/buildPlan function').not.toBeNull();

      // V1-M30.8a W-7 spec / V1-M30.9 W-2 retest:
      // a finding pointing to existing file → action.type !== 'create'
      const finding = {
        checkId: 'l2-ai-literacy',
        outputFile: 'docs/compliance/ai-literacy-policy.md',
        type: 'fail',
        severity: 'low',
        layer: 'L2',
      };
      const result = planner!(finding, { projectPath: proj }) as {
        actions?: readonly { type?: string }[];
      } | null;
      const actionTypes = (result?.actions ?? []).map((a) => a?.type);
      expect(actionTypes, `actions for existing file must NOT contain "create": got ${JSON.stringify(actionTypes)}`)
        .not.toContain('create');
      // Positive: must contain enrich/edit/update
      expect(
        actionTypes.some((t) => t === 'enrich' || t === 'edit' || t === 'update'),
        `at least one action must be enrich/edit/update for existing file: got ${JSON.stringify(actionTypes)}`,
      ).toBe(true);
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });

  it('finding whose outputFile does NOT exist → action.type === "create"', async () => {
    const proj = mkdtempSync(resolve(tmpdir(), 'm30-9-w2-missing-'));
    try {
      // Do NOT create the file — outputFile points to non-existent path
      const fixerCandidates = ['../fixer/index.js', '../fixer/planner.js', '../fixer/strategies/index.js'];
      let planner: ((finding: unknown, ctx: unknown) => unknown) | null = null;
      for (const path of fixerCandidates) {
        try {
          const mod = await import(path);
          for (const k of Object.keys(mod)) {
            if (typeof (mod as Record<string, unknown>)[k] === 'function' && /^plan|generatePlan|buildPlan/.test(k)) {
              planner = (mod as Record<string, unknown>)[k] as typeof planner;
              break;
            }
          }
          if (planner) break;
        } catch { /* try next */ }
      }
      expect(planner).not.toBeNull();
      const finding = {
        checkId: 'l1-missing-fria',
        outputFile: 'docs/compliance/fria.md',
        type: 'fail',
        severity: 'high',
        layer: 'L1',
      };
      const result = planner!(finding, { projectPath: proj }) as {
        actions?: readonly { type?: string }[];
      } | null;
      const actionTypes = (result?.actions ?? []).map((a) => a?.type);
      // Missing file → create action
      expect(
        actionTypes.some((t) => t === 'create' || t === 'generate'),
        `missing file should produce create/generate action, got ${JSON.stringify(actionTypes)}`,
      ).toBe(true);
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });
});
