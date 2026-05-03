/**
 * V1-M12: Eval Disclaimer Builder — RED test spec.
 *
 * Verifies that the eval disclaimer provides clear human-readable context
 * about what was tested, what was filtered, and scoring methodology.
 */

import { describe, it, expect } from 'vitest';
import type { EvalFilterContext, EvalDisclaimer } from '../../types/common.types.js';
import { buildEvalDisclaimer } from './eval-disclaimer.js';

describe('V1-M12: Eval Disclaimer Builder', () => {
  it('with profile → includes role and domain in summary', () => {
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
    const disclaimer = buildEvalDisclaimer(context, true);
    expect(disclaimer.profileUsed).toBe(true);
    expect(disclaimer.summary).toContain('deployer');
    expect(disclaimer.summary).toContain('healthcare');
    expect(disclaimer.testsRun).toBe(310);
    expect(disclaimer.testsSkipped).toBe(70);
  });

  it('without profile → generic disclaimer', () => {
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
    const disclaimer = buildEvalDisclaimer(context, false);
    expect(disclaimer.profileUsed).toBe(false);
    expect(disclaimer.summary).toContain('Full eval');
    expect(disclaimer.testsSkipped).toBe(0);
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
    const disclaimer = buildEvalDisclaimer(context, true);
    expect(disclaimer.severityWeighted).toBe(true);
    expect(disclaimer.summary).toMatch(/severity/i);
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
    const disclaimer = buildEvalDisclaimer(context, true);
    expect(disclaimer.limitations.length).toBeGreaterThanOrEqual(1);
    // Limitations should mention things like "eval tests running AI systems, not code"
    // or "scores depend on LLM judge accuracy"
    expect(disclaimer.limitations.some(l => l.toLowerCase().includes('api') || l.toLowerCase().includes('ai system'))).toBe(true);
  });
});
