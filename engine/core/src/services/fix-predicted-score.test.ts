/**
 * V1-M30.9 / W-3: RED — fix preview `predictedScore` must be realistic
 * (current + sum of fix score impacts), not hardcoded 100.
 *
 * Bug verified in /deep-e2e:
 *   Profile A current 67 → predicted 100
 *   Profile B current 70 → predicted 100
 *   Profile C current 71 → predicted 100
 *
 * The Rust CLI renders whatever the engine returns for `predictedScore`.
 * V1-M30.8a W-8 was a Rust-side test that passed because no literal `→ ~100`
 * exists in fix.rs source — but the bug is in engine: `predictedScore`
 * computation always returns 100 (or close to it).
 *
 * Spec: predictedScore = min(99, current + sum(scoreImpact)).
 */

import { describe, it, expect } from 'vitest';

describe('V1-M30.9 W-3: predictedScore is realistic, not hardcoded 100', () => {
  it('current=67 + 3 fixes (impact 5+5+5=15) → predicted ≈ 82, not 100', async () => {
    // Probe fix-service / fixer modules for the prediction function.
    const candidates = [
      '../services/fix-service.js',
      '../domain/fixer/index.js',
      '../domain/fixer/predictor.js',
      '../domain/fixer/score-predictor.js',
    ];
    let predict: ((current: number, fixes: readonly { scoreImpact: number }[]) => number) | null = null;
    let foundIn: string | null = null;
    for (const path of candidates) {
      try {
        const mod = await import(path) as Record<string, unknown>;
        for (const k of Object.keys(mod)) {
          if (typeof mod[k] === 'function' && /predict|estimate|forecast/i.test(k) && /score/i.test(k)) {
            predict = mod[k] as typeof predict;
            foundIn = `${path}::${k}`;
            break;
          }
        }
        if (predict) break;
      } catch { /* try next */ }
    }
    expect(predict, 'engine must expose a score-prediction function (predictScore/estimateScoreAfterFixes/...)').not.toBeNull();

    const fixes = [{ scoreImpact: 5 }, { scoreImpact: 5 }, { scoreImpact: 5 }];
    const result = predict!(67, fixes);
    // Expected: min(99, 67 + 15) = 82
    expect(result, `[${foundIn}] should compute realistic estimate, got ${result}`).toBeLessThanOrEqual(85);
    expect(result, `should be at LEAST current + 1 (some improvement): got ${result}`).toBeGreaterThan(67);
    // CRITICAL: must not be hardcoded 100
    expect(result, 'must NOT be hardcoded 100').not.toBe(100);
  });

  it('current=85 + small fix (impact 2) → predicted ≈ 87, not 100', async () => {
    const candidates = [
      '../services/fix-service.js',
      '../domain/fixer/index.js',
      '../domain/fixer/predictor.js',
      '../domain/fixer/score-predictor.js',
    ];
    let predict: ((current: number, fixes: readonly { scoreImpact: number }[]) => number) | null = null;
    for (const path of candidates) {
      try {
        const mod = await import(path) as Record<string, unknown>;
        for (const k of Object.keys(mod)) {
          if (typeof mod[k] === 'function' && /predict|estimate|forecast/i.test(k) && /score/i.test(k)) {
            predict = mod[k] as typeof predict;
            break;
          }
        }
        if (predict) break;
      } catch { /* try next */ }
    }
    if (!predict) {
      // Already failed in first test — skip duplicate failure
      expect(predict).not.toBeNull();
      return;
    }

    const result = predict(85, [{ scoreImpact: 2 }]);
    expect(result).toBeLessThanOrEqual(89);
    expect(result).toBeGreaterThan(85);
    expect(result).not.toBe(100);
  });

  it('estimate is capped at 99 (not 100 — 100 implies certainty)', async () => {
    const candidates = [
      '../services/fix-service.js',
      '../domain/fixer/index.js',
      '../domain/fixer/predictor.js',
      '../domain/fixer/score-predictor.js',
    ];
    let predict: ((current: number, fixes: readonly { scoreImpact: number }[]) => number) | null = null;
    for (const path of candidates) {
      try {
        const mod = await import(path) as Record<string, unknown>;
        for (const k of Object.keys(mod)) {
          if (typeof mod[k] === 'function' && /predict|estimate|forecast/i.test(k) && /score/i.test(k)) {
            predict = mod[k] as typeof predict;
            break;
          }
        }
        if (predict) break;
      } catch { /* try next */ }
    }
    if (!predict) {
      expect(predict).not.toBeNull();
      return;
    }
    // Even with huge fix impact, must cap at 99
    const result = predict(50, [{ scoreImpact: 100 }, { scoreImpact: 100 }]);
    expect(result).toBeLessThanOrEqual(99);
  });
});
