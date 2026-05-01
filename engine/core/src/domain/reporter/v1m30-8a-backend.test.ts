/**
 * V1-M30.8a / W-3, W-4, W-5, W-6, W-7: RED — backend bug hotfixes.
 *
 *   W-3: complior docs hint replaced with valid v1.0.0 command
 *   W-4: scan score consistent (CLI vs report.summary.scanScore)
 *   W-5: l5-doc-fria skipped for limited-risk profiles
 *   W-6: undeclared-permission finds existing passports
 *   W-7: Fix discovery detects existing files (no false CREATE)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// ── W-3: source-introspection — no `complior docs` literal in user-facing strings ──
describe('V1-M30.8a W-3: no `complior docs` invalid hints in scanner/fixer', () => {
  const ENGINE_ROOT = resolve(__dirname, '..', '..', '..');
  const TARGET_PATHS = [
    'src/domain/fixer/strategies',
    'src/domain/scanner/finding-explainer.ts',
    'src/domain/scanner/checks',
    'src/domain/reporter/priority-actions.ts',
  ];

  it.each(TARGET_PATHS)('path %s contains no `complior docs` user-facing literal', (relPath) => {
    const fullPath = resolve(ENGINE_ROOT, relPath);
    const collect = (p: string): readonly string[] => {
      try {
        const stat = require('node:fs').statSync(p);
        if (stat.isDirectory()) {
          return readdirSync(p)
            .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
            .flatMap((f) => collect(resolve(p, f)));
        }
        return [p];
      } catch {
        return [];
      }
    };
    const files = collect(fullPath);
    const offending: { file: string; line: number; text: string }[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trimStart().startsWith('//')) continue;
        if (line.includes('complior docs')) {
          offending.push({ file: f, line: i + 1, text: line.trim().slice(0, 200) });
        }
      }
    }
    if (offending.length > 0) {
      const detail = offending.map((o) => `  ${o.file}:${o.line}: ${o.text}`).join('\n');
      throw new Error(
        `V1-M30.8a W-3: ${offending.length} occurrence(s) of \`complior docs\` literal — ` +
          `the docs subcommand does NOT exist in v1.0.0. Replace with \`complior fix --doc <type>\` or similar:\n${detail}`,
      );
    }
    expect(offending).toHaveLength(0);
  });
});

// ── W-5: l5-doc-fria skips for limited-risk profile ──
describe('V1-M30.8a W-5: L5 FRIA validation skipped for limited-risk profile', () => {
  it('limited-risk profile + FRIA file present → finding NOT type=fail', async () => {
    // Module being tested
    const layer5docs = await import('../scanner/layers/layer5-docs.js');
    // Deliberately probe whether the module exposes a profile-aware filter or
    // whether skip semantics apply at finding level. Either way, this test
    // ensures the OUTPUT for a limited-risk profile does NOT include a
    // type='fail' finding for FRIA.
    if (typeof (layer5docs as Record<string, unknown>)['filterDocsByRisk'] === 'function') {
      // Direct unit if helper is exposed
      const filter = (layer5docs as { filterDocsByRisk: (docs: unknown[], risk: string) => unknown[] }).filterDocsByRisk;
      const result = filter([{ docType: 'fria', article: 'Art. 27' }], 'limited');
      expect(result).toHaveLength(0);
    } else {
      // Fall back to integration: layer5-docs must accept profile context.
      // RED until V1-M30.8a W-5 implementation adds the filter.
      expect(false, 'V1-M30.8a W-5: layer5-docs must export `filterDocsByRisk` or accept profile in run()').toBe(true);
    }
  });
});

// ── W-6: undeclared-permission finds existing passports ──
describe('V1-M30.8a W-6: passport-presence/permission scanner finds *-manifest.json', () => {
  it('scanner finds passports stored as `<name>-manifest.json`', async () => {
    // The check should report 'No passport found' ONLY when there are no
    // *-manifest.json files in `.complior/agents/`. With manifests present,
    // it should pass.
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const proj = mkdtempSync(resolve(tmpdir(), 'm30-8a-w6-'));
    try {
      mkdirSync(resolve(proj, '.complior', 'agents'), { recursive: true });
      writeFileSync(
        resolve(proj, '.complior', 'agents', 'eval-target-anthropic-manifest.json'),
        JSON.stringify({ name: 'eval-target-anthropic', version: '1.0.0' }),
      );
      // The scanner check / permission scanner / passport-presence should NOT
      // emit "No passport found". Module name TBD — accept any of the known
      // call sites that produce this message.
      const ppr = await import('../scanner/checks/passport-presence.js').catch(() => null);
      const perm = await import('../scanner/checks/permission-scanner.js').catch(() => null);
      const candidates = [ppr, perm].filter((m): m is Record<string, unknown> => m !== null);
      let foundCheck = false;
      for (const m of candidates) {
        for (const k of Object.keys(m)) {
          if (typeof m[k] === 'function' && (k.includes('check') || k.includes('Check') || k.includes('scan') || k.includes('Scan'))) {
            try {
              const fn = m[k] as (ctx: unknown) => unknown;
              const ctx = { projectPath: proj, files: [], findings: [] };
              const result = fn(ctx) as readonly { type?: string; message?: string }[] | undefined;
              if (Array.isArray(result)) {
                foundCheck = true;
                const msg = result.map((r) => r?.message ?? '').join(' ');
                expect(msg, `${k} should not say "No passport found" with manifests present`).not.toMatch(/no passport found/i);
              }
            } catch {
              /* signature mismatch — skip */
            }
          }
        }
      }
      expect(foundCheck, 'expected at least one passport-related check function').toBe(true);
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });
});

// ── W-4: scan score consistency between scanResult and report.summary ──
describe('V1-M30.8a W-4: summary.scanScore equals scanResult.score.totalScore', () => {
  it('buildComplianceReport copies scanResult.score.totalScore to summary.scanScore (no transformation)', async () => {
    const { buildComplianceReport } = await import('./report-builder.js');
    const out = buildComplianceReport({
      scanResult: {
        projectPath: '/tmp/proj',
        score: { totalScore: 75, zone: 'yellow' as const, breakdown: {} },
        findings: [], scannedAt: '2026-04-30T10:00:00Z', duration: 1000, filesScanned: 0,
      } as never,
      evalScore: null, passports: [], obligations: [], evidenceSummary: null,
      version: '0.10.0',
    } as never);
    // scanScore in summary MUST equal scanResult.score.totalScore (75)
    expect(out.summary.scanScore).toBe(75);
  });
});

// ── W-7: fix discovery detects existing files ──
describe('V1-M30.8a W-7: fix planner discovery distinguishes existing vs new files', () => {
  it('finding.outputFile points to existing file → action.type is enrich/edit, not create', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const proj = mkdtempSync(resolve(tmpdir(), 'm30-8a-w7-'));
    try {
      mkdirSync(resolve(proj, 'docs', 'compliance'), { recursive: true });
      writeFileSync(resolve(proj, 'docs', 'compliance', 'fria.md'), '# FRIA\n');
      // Probe the fixer planner: a finding with outputFile pointing to fria.md
      // (which exists on disk) → fix plan action MUST NOT be `create`.
      const fixerMod = await import('../fixer/index.js').catch(() => null);
      if (!fixerMod) {
        expect(false, 'engine/core/src/domain/fixer must expose a planner').toBe(true);
        return;
      }
      // RED: until the fixer is updated to check existence, dry-run will
      // return action.type === 'create' even for existing files.
      const planner = (fixerMod as Record<string, unknown>)['planFix'] ?? (fixerMod as Record<string, unknown>)['plan'];
      if (typeof planner !== 'function') {
        expect(false, 'fixer must expose planFix/plan function for V1-M30.8a W-7').toBe(true);
        return;
      }
      const finding = {
        checkId: 'l5-doc-fria',
        outputFile: 'docs/compliance/fria.md',
        type: 'fail',
        severity: 'high',
        layer: 'L5',
      };
      const ctx = { projectPath: proj };
      const plan = (planner as (f: unknown, c: unknown) => unknown)(finding, ctx) as { actions?: readonly { type?: string }[] } | null;
      const actionTypes = (plan?.actions ?? []).map((a) => a?.type);
      // Existing file — must NOT be create
      expect(actionTypes, 'fix plan for existing file must not contain create action').not.toContain('create');
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });
});
