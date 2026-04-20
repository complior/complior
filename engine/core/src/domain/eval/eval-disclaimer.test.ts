/**
 * V1-M12: Eval Disclaimer Builder — RED test spec.
 *
 * Verifies that the eval disclaimer provides clear human-readable context
 * about what was tested, what was filtered, and scoring methodology.
 */

import { describe, it, expect } from 'vitest';
import type { EvalFilterContext, EvalDisclaimer } from '../../types/common.types.js';

// --- Test will import from eval-disclaimer.ts (not yet implemented) ---
// import { buildEvalDisclaimer } from './eval-disclaimer.js';

describe('V1-M12: Eval Disclaimer Builder', () => {
  it('with profile → includes role and domain in summary', () => {
    // When a profile is used, the disclaimer should mention what was filtered
    const context: EvalFilterContext = {
      role: 'deployer',
      riskLevel: 'high',
      domain: 'healthcare',
      profileFound: true,
      totalTests: 380,
      applicableTests: 310,
      skippedByRole: 15,
      skippedByRiskLevel: 12,
      skippedByDomain: 43,
    };
    // const disclaimer = buildEvalDisclaimer(context, true);
    // expect(disclaimer.profileUsed).toBe(true);
    // expect(disclaimer.summary).toContain('deployer');
    // expect(disclaimer.summary).toContain('healthcare');
    // expect(disclaimer.testsRun).toBe(310);
    // expect(disclaimer.testsSkipped).toBe(70);
    expect.fail('Not implemented: buildEvalDisclaimer');
  });

  it('without profile → generic disclaimer', () => {
    // No profile = no filtering, standard disclaimer
    const context: EvalFilterContext = {
      role: 'both',
      riskLevel: null,
      domain: null,
      profileFound: false,
      totalTests: 380,
      applicableTests: 380,
      skippedByRole: 0,
      skippedByRiskLevel: 0,
      skippedByDomain: 0,
    };
    // const disclaimer = buildEvalDisclaimer(context, false);
    // expect(disclaimer.profileUsed).toBe(false);
    // expect(disclaimer.summary).toContain('all');
    // expect(disclaimer.testsSkipped).toBe(0);
    expect.fail('Not implemented: buildEvalDisclaimer');
  });

  it('severity-weighted note in disclaimer when weights applied', () => {
    const context: EvalFilterContext = {
      role: 'both',
      riskLevel: null,
      domain: null,
      profileFound: false,
      totalTests: 380,
      applicableTests: 380,
      skippedByRole: 0,
      skippedByRiskLevel: 0,
      skippedByDomain: 0,
    };
    // const disclaimer = buildEvalDisclaimer(context, true); // severityWeighted = true
    // expect(disclaimer.severityWeighted).toBe(true);
    // expect(disclaimer.summary).toMatch(/severity/i);
    expect.fail('Not implemented: buildEvalDisclaimer');
  });

  it('includes at least one limitation string', () => {
    const context: EvalFilterContext = {
      role: 'deployer',
      riskLevel: 'high',
      domain: 'healthcare',
      profileFound: true,
      totalTests: 380,
      applicableTests: 310,
      skippedByRole: 15,
      skippedByRiskLevel: 12,
      skippedByDomain: 43,
    };
    // const disclaimer = buildEvalDisclaimer(context, true);
    // expect(disclaimer.limitations.length).toBeGreaterThanOrEqual(1);
    // Limitations should mention things like "eval tests running AI systems, not code"
    // or "scores depend on LLM judge accuracy"
    expect.fail('Not implemented: buildEvalDisclaimer');
  });
});
