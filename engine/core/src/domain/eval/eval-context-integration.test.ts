/**
 * V1-M12: Eval Context-Aware Integration — RED test spec.
 *
 * End-to-end tests verifying that profile filtering + severity scoring
 * work together and produce correct EvalResult shape with filterContext + disclaimer.
 */

import { describe, it, expect } from 'vitest';
import type { ConformityTest, EvalResult } from './types.js';
import type { EvalFilterContext, EvalDisclaimer } from '../../types/common.types.js';

// --- Test imports ---
import { filterTestsByProfile } from './eval-profile-filter.js';
import { buildEvalDisclaimer } from './eval-disclaimer.js';
import { scoreSeverityWeighted } from './eval-severity-scoring.js';

import applicabilityData from '../../../data/eval/test-applicability.json' with { type: 'json' };

const makeTest = (id: string, category: ConformityTest['category'], severity: ConformityTest['severity'] = 'medium'): ConformityTest => ({
  id,
  category,
  name: `Test ${id}`,
  description: `Description for ${id}`,
  method: 'deterministic',
  probe: 'Hello',
  euAiActRef: 'Art.50',
  severity,
});

describe('V1-M12: Eval Context Integration', () => {
  it('deployer + healthcare: filters out provider-only + non-healthcare industry tests', () => {
    const tests: ConformityTest[] = [
      makeTest('CT-1-001', 'transparency'),
      makeTest('CT-8-001', 'logging'),           // provider-only
      makeTest('CT-11-001', 'industry'),          // HR-only
      makeTest('CT-11-016', 'industry'),          // healthcare
      makeTest('CT-10-001', 'gpai'),              // GPAI-only
    ];

    const { filtered, context } = filterTestsByProfile(
      tests,
      { role: 'deployer', riskLevel: 'high', domain: 'healthcare' },
      applicabilityData.overrides as Record<string, { roles?: readonly string[]; riskLevels?: readonly string[]; industries?: readonly string[] }>,
    );

    expect(filtered).toHaveLength(2); // CT-1-001 + CT-11-016
    expect(filtered.find(t => t.id === 'CT-1-001')).toBeDefined();
    expect(filtered.find(t => t.id === 'CT-11-016')).toBeDefined();
    expect(filtered.find(t => t.id === 'CT-8-001')).toBeUndefined();  // provider-only
    expect(filtered.find(t => t.id === 'CT-11-001')).toBeUndefined(); // HR-only
    expect(filtered.find(t => t.id === 'CT-10-001')).toBeUndefined(); // GPAI-only

    expect(context.skippedByRole).toBe(1);
    expect(context.skippedByRiskLevel).toBe(1);
    expect(context.skippedByDomain).toBe(1);
  });

  it('no profile = all tests included (backward compatibility)', () => {
    const tests: ConformityTest[] = [
      makeTest('CT-1-001', 'transparency'),
      makeTest('CT-8-001', 'logging'),
      makeTest('CT-10-001', 'gpai'),
      makeTest('CT-11-001', 'industry'),
    ];

    const { filtered, context } = filterTestsByProfile(tests, null, applicabilityData.overrides as Record<string, { roles?: readonly string[]; riskLevels?: readonly string[]; industries?: readonly string[] }>);
    expect(filtered).toHaveLength(4); // all tests pass through
    expect(context.profileFound).toBe(false);
    expect(context.skippedByRole).toBe(0);
    expect(context.skippedByRiskLevel).toBe(0);
    expect(context.skippedByDomain).toBe(0);
  });

  it('EvalResult contains filterContext and disclaimer fields', () => {
    // Verify that the EvalResult type allows filterContext and disclaimer
    // (Type-level check: constructing a minimal EvalResult with new fields)
    const result: EvalResult = {
      target: 'http://localhost:3000',
      tier: 'basic',
      overallScore: 85,
      grade: 'B',
      categories: [],
      results: [],
      totalTests: 10,
      passed: 8,
      failed: 2,
      errors: 0,
      inconclusive: 0,
      skipped: 0,
      duration: 5000,
      timestamp: '2026-04-20T00:00:00Z',
      criticalCapped: false,
      filterContext: {
        role: 'deployer',
        riskLevel: 'high',
        domain: 'healthcare',
        profileFound: true,
        totalTests: 380,
        applicableTests: 310,
        skippedByRole: 15,
        skippedByRiskLevel: 12,
        skippedByDomain: 43,
      },
      disclaimer: {
        summary: 'Eval run with profile: deployer, high-risk, healthcare domain',
        profileUsed: true,
        testsRun: 310,
        testsSkipped: 70,
        severityWeighted: true,
        limitations: ['Eval tests running AI systems via API only — does not cover code or organizational requirements'],
      },
    };

    // Type-level checks pass — now verify runtime behavior
    expect(result.filterContext).toBeDefined();
    expect(result.filterContext!.profileFound).toBe(true);
    expect(result.disclaimer).toBeDefined();
    expect(result.disclaimer!.profileUsed).toBe(true);

    // Test buildEvalDisclaimer integration
    const builtDisclaimer = buildEvalDisclaimer(result.filterContext!, true);
    expect(builtDisclaimer.summary).toContain('deployer');
  });
});
