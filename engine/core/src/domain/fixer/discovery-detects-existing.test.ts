/**
 * V1-M30.9 / W-2: documentation strategy emits action.type='enrich' for
 * existing files (instead of 'create' which would overwrite user edits).
 *
 * Uses the real `findStrategy` API + a realistic finding shape (matching
 * BUG-2b sibling tests in strategies.test.ts).
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { findStrategy } from './strategies/index.js';
import type { Finding, FixContext } from './types.js';

function makeFinding(over: Partial<Finding>): Finding {
  return {
    checkId: 'l2-fria',
    obligationId: 'eu-ai-act-OBL-013',
    type: 'fail',
    severity: 'high',
    layer: 'L2',
    message: 'FRIA needs enrichment',
    article: 'Art. 27',
    fix: 'Edit FRIA',
    docQuality: 'draft',
    ...over,
  } as Finding;
}

function makeContext(over: Partial<FixContext>): FixContext {
  return {
    projectPath: '/tmp/x',
    framework: 'node',
    existingFiles: [],
    useAi: false,
    ...over,
  } as FixContext;
}

describe('V1-M30.9 W-2: fix Discovery emits enrich for existing files', () => {
  it('L2 finding + useAi=true + outputFile EXISTS → action.type === "enrich"', () => {
    const proj = mkdtempSync(resolve(tmpdir(), 'm30-9-w2-'));
    try {
      // Pre-create the file the FRIA strategy will target.
      // TEMPLATE_REGISTRY maps OBL-013 → docs/compliance/fria.md (or similar).
      mkdirSync(resolve(proj, 'docs', 'compliance'), { recursive: true });
      writeFileSync(
        resolve(proj, 'docs', 'compliance', 'fria.md'),
        '# FRIA\n\n[user-edited content already present]\n',
      );

      // useAi=true is required because L2 docs in draft state are intentionally
      // skipped without --ai opt-in (don't overwrite user edits).
      const finding = makeFinding({ checkId: 'l2-fria', obligationId: 'eu-ai-act-OBL-013', docQuality: 'draft' });
      const ctx = makeContext({ projectPath: proj, useAi: true });
      const plan = findStrategy(finding, ctx);

      expect(plan, 'findStrategy must return a plan for L2 + useAi finding (file exists)').not.toBeNull();
      const types = plan!.actions.map((a) => a.type);
      // V1-M30.9 W-2 invariant: existing file → NOT create (would overwrite)
      expect(types, `actions for existing file must NOT contain "create": ${JSON.stringify(types)}`).not.toContain('create');
      // Must contain enrich (the new V1-M30.9 W-2 action type)
      expect(types).toContain('enrich');
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });

  it('L1 finding + outputFile does NOT exist → action.type === "create"', () => {
    const proj = mkdtempSync(resolve(tmpdir(), 'm30-9-w2-missing-'));
    try {
      // L1 = file presence; docQuality='none' means file genuinely missing
      const finding = makeFinding({
        checkId: 'fria',
        obligationId: 'eu-ai-act-OBL-013',
        layer: 'L1',
        docQuality: 'none',
      });
      const ctx = makeContext({ projectPath: proj, useAi: false, existingFiles: [] });
      const plan = findStrategy(finding, ctx);

      expect(plan, 'findStrategy must return a plan for L1 missing-file finding').not.toBeNull();
      const types = plan!.actions.map((a) => a.type);
      expect(types).toContain('create');
      expect(types).not.toContain('enrich');
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });
});
