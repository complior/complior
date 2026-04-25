/**
 * V1-M22 / A-7 (H-8): RED test — Actions tab must not suggest deprecated or duplicated commands.
 *
 * Background (V1-M21 review):
 *   Actions tab suggested `complior passport init` (deprecated — onboarding is
 *   via `complior init`) and `complior fix` 6 times (duplicated).
 *
 * Specification (from milestone §4):
 *   INCLUDE:
 *     - "Run `complior scan` to refresh findings" — if last scan > 30min OR findings stale
 *     - "Run `complior fix <check-id>` for N fixable findings" — ONCE, with top fixable IDs
 *     - "Generate `<doc-type>` document" — only for missing doc types
 *     - "Update passport for <agent>" — if completeness < 80%
 *     - "Run `complior eval <endpoint>`" — if project has endpoint AND eval not yet run
 *
 *   EXCLUDE:
 *     - `complior passport init` — deprecated
 *     - Duplicate suggestions (dedup by verb+object tuple)
 *     - Actions on already-fixed findings
 *
 * Architecture:
 *   - Pure fn `buildSuggestions(state: ProjectState): Suggestion[]`
 *   - Object.freeze on result
 *   - No I/O
 */

import { describe, it, expect } from 'vitest';

describe('V1-M22 / A-7: Actions suggestions rules', () => {
  it('does not suggest `complior passport init` (deprecated)', async () => {
    const { buildSuggestions } = await import('./actions-suggestions.js');
    const suggestions = buildSuggestions(mockState());

    const hasPassportInit = suggestions.some((s) =>
      /passport\s+init/i.test(s.command ?? ''),
    );
    expect(hasPassportInit).toBe(false);
  });

  it('`complior fix` command appears at most once (dedup)', async () => {
    const { buildSuggestions } = await import('./actions-suggestions.js');
    const suggestions = buildSuggestions(mockStateWithFixableFindings());

    const fixCommands = suggestions.filter((s) =>
      /^complior\s+fix(\s|$)/.test(s.command ?? ''),
    );
    expect(fixCommands.length).toBeLessThanOrEqual(1);
  });

  it('suggests fix ONCE with list of top fixable check-ids', async () => {
    const { buildSuggestions } = await import('./actions-suggestions.js');
    const suggestions = buildSuggestions(mockStateWithFixableFindings());

    const fixSuggestion = suggestions.find((s) =>
      /^complior\s+fix/.test(s.command ?? ''),
    );
    expect(fixSuggestion).toBeDefined();
    // Message should reference count of fixable findings
    expect(fixSuggestion?.description ?? '').toMatch(/\d+\s+(fixable|findings)/i);
  });

  it('suggests `complior eval` when endpoint configured + never run', async () => {
    const { buildSuggestions } = await import('./actions-suggestions.js');
    const suggestions = buildSuggestions(mockStateWithEndpointNoEval());

    const hasEval = suggestions.some((s) =>
      /^complior\s+eval/.test(s.command ?? ''),
    );
    expect(hasEval).toBe(true);
  });

  it('does NOT suggest `complior eval` when eval already recent', async () => {
    const { buildSuggestions } = await import('./actions-suggestions.js');
    const state = {
      ...(mockStateWithEndpointNoEval() as Record<string, unknown>),
      lastEvalAt: new Date().toISOString(),
    };
    const suggestions = buildSuggestions(Object.freeze(state));

    const hasEval = suggestions.some((s) =>
      /^complior\s+eval/.test(s.command ?? ''),
    );
    expect(hasEval).toBe(false);
  });

  it('returns frozen array of frozen items', async () => {
    const { buildSuggestions } = await import('./actions-suggestions.js');
    const suggestions = buildSuggestions(mockState());

    expect(Object.isFrozen(suggestions)).toBe(true);
    if (suggestions.length > 0) {
      expect(Object.isFrozen(suggestions[0])).toBe(true);
    }
  });

  it('is deterministic (same input → same output)', async () => {
    const { buildSuggestions } = await import('./actions-suggestions.js');
    const a = buildSuggestions(mockState());
    const b = buildSuggestions(mockState());
    expect(a).toStrictEqual(b);
  });
});

function mockState(): unknown {
  return Object.freeze({
    lastScanAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
    lastEvalAt: null,
    lastFixAt: null,
    findings: Object.freeze([]),
    fixableFindings: Object.freeze([]),
    passports: Object.freeze([]),
    missingDocTypes: Object.freeze([]),
    endpointConfigured: false,
    profile: Object.freeze({
      role: 'provider',
      riskLevel: 'high',
      domain: 'healthcare',
    }),
  });
}

function mockStateWithFixableFindings(): unknown {
  return Object.freeze({
    ...(mockState() as Record<string, unknown>),
    fixableFindings: Object.freeze([
      Object.freeze({ checkId: 'L1-A001', severity: 'high' }),
      Object.freeze({ checkId: 'L1-A002', severity: 'medium' }),
      Object.freeze({ checkId: 'L4-banned-dep', severity: 'critical' }),
    ]),
  });
}

function mockStateWithEndpointNoEval(): unknown {
  return Object.freeze({
    ...(mockState() as Record<string, unknown>),
    endpointConfigured: true,
    lastEvalAt: null,
  });
}
