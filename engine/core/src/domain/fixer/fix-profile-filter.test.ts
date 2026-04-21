/**
 * V1-M19 T-2: Fix Profile Filter — RED test spec.
 *
 * Filters fix plans by project profile so only profile-relevant fixes appear.
 * Two mechanisms:
 *  1. Primary: exclude plans whose associated finding is type: 'skip' (from scan filtering)
 *  2. Secondary: for direct calls without prior scan, use check-applicability.json
 *
 * Conservative: plans without mapping pass through unchanged.
 * No profile → all plans pass through (backward compatible).
 */

import { describe, it, expect } from 'vitest';
import type { Finding, FixFilterContext, Role } from '../../types/common.types.js';
import type { FixPlan } from './types.js';
import { filterFixPlansByProfile, type FixFilterProfile } from './fix-profile-filter.js';

/** Helper: create a minimal Finding. */
const makeFinding = (checkId: string, type: 'pass' | 'fail' | 'skip' = 'fail'): Finding => ({
  checkId,
  type,
  message: `Finding for ${checkId}`,
  severity: 'medium',
});

/** Helper: create a minimal FixPlan. */
const makePlan = (checkId: string): FixPlan => ({
  obligationId: `obl-${checkId}`,
  checkId,
  article: 'Art. 50',
  fixType: 'code_injection',
  framework: 'generic',
  actions: [{ type: 'create', path: `fix-${checkId}.ts`, description: `Fix ${checkId}`, content: '// fix' }],
  diff: '',
  scoreImpact: 5,
  commitMessage: `fix: ${checkId}`,
  description: `Fix for ${checkId}`,
});

describe('V1-M19: filterFixPlansByProfile', () => {
  it('returns all plans when profile is null (no filtering)', () => {
    const plans: readonly FixPlan[] = [
      makePlan('ai-disclosure'),
      makePlan('worker-notification'),
      makePlan('industry-hr-bias'),
    ];
    const findings: readonly Finding[] = [
      makeFinding('ai-disclosure'),
      makeFinding('worker-notification'),
      makeFinding('industry-hr-bias'),
    ];

    const result = filterFixPlansByProfile(plans, findings, null);

    expect(result.filtered).toHaveLength(3);
    expect(result.context.profileFound).toBe(false);
    expect(result.context.totalPlans).toBe(3);
    expect(result.context.applicablePlans).toBe(3);
    expect(result.context.excludedBySkip).toBe(0);
    expect(result.context.excludedByDomain).toBe(0);
  });

  it('excludes plans for skip findings (role-skipped)', () => {
    const plans: readonly FixPlan[] = [
      makePlan('qms'),              // provider-only → skip finding for deployer
      makePlan('ai-disclosure'),    // universal → fail finding
    ];
    const findings: readonly Finding[] = [
      { ...makeFinding('qms'), type: 'skip', message: 'Skipped: provider-only check (project role: deployer)' } as unknown as Finding,
      makeFinding('ai-disclosure'),
    ];
    const profile: FixFilterProfile = { role: 'deployer', riskLevel: 'high', domain: null };

    const result = filterFixPlansByProfile(plans, findings, profile);

    expect(result.filtered).toHaveLength(1);
    expect(result.filtered[0]!.checkId).toBe('ai-disclosure');
    expect(result.context.excludedBySkip).toBe(1);
  });

  it('excludes plans for skip findings (domain-skipped)', () => {
    const plans: readonly FixPlan[] = [
      makePlan('industry-hr-bias'),       // HR domain → skip for healthcare
      makePlan('ai-disclosure'),           // universal → keep
    ];
    const findings: readonly Finding[] = [
      { ...makeFinding('industry-hr-bias'), type: 'skip', message: 'Skipped: not applicable for healthcare domain' } as unknown as Finding,
      makeFinding('ai-disclosure'),
    ];
    const profile: FixFilterProfile = { role: 'deployer', riskLevel: 'high', domain: 'healthcare' };

    const result = filterFixPlansByProfile(plans, findings, profile);

    expect(result.filtered).toHaveLength(1);
    expect(result.filtered[0]!.checkId).toBe('ai-disclosure');
    expect(result.context.excludedBySkip).toBe(1);
  });

  it('preserves plans for applicable fail findings', () => {
    const plans: readonly FixPlan[] = [
      makePlan('ai-disclosure'),
      makePlan('interaction-logging'),
      makePlan('compliance-metadata'),
    ];
    const findings: readonly Finding[] = [
      makeFinding('ai-disclosure'),
      makeFinding('interaction-logging'),
      makeFinding('compliance-metadata'),
    ];
    const profile: FixFilterProfile = { role: 'both', riskLevel: 'high', domain: null };

    const result = filterFixPlansByProfile(plans, findings, profile);

    expect(result.filtered).toHaveLength(3);
    expect(result.context.applicablePlans).toBe(3);
    expect(result.context.excludedBySkip).toBe(0);
    expect(result.context.excludedByDomain).toBe(0);
  });

  it('context reports correct counts', () => {
    const plans: readonly FixPlan[] = [
      makePlan('qms'),                    // will be excluded (role-skip)
      makePlan('ai-disclosure'),          // will be kept
      makePlan('industry-hr-bias'),       // will be excluded (domain-skip)
      makePlan('interaction-logging'),    // will be kept
    ];
    const findings: readonly Finding[] = [
      { ...makeFinding('qms'), type: 'skip' } as unknown as Finding,
      makeFinding('ai-disclosure'),
      { ...makeFinding('industry-hr-bias'), type: 'skip' } as unknown as Finding,
      makeFinding('interaction-logging'),
    ];
    const profile: FixFilterProfile = { role: 'deployer', riskLevel: 'high', domain: 'healthcare' };

    const result = filterFixPlansByProfile(plans, findings, profile);

    expect(result.context.totalPlans).toBe(4);
    expect(result.context.applicablePlans).toBe(2);
    expect(result.context.excludedBySkip).toBe(2);
  });

  it('handles empty plans array', () => {
    const profile: FixFilterProfile = { role: 'deployer', riskLevel: 'high', domain: 'healthcare' };

    const result = filterFixPlansByProfile([], [], profile);

    expect(result.filtered).toHaveLength(0);
    expect(result.context.totalPlans).toBe(0);
    expect(result.context.applicablePlans).toBe(0);
    expect(result.context.excludedBySkip).toBe(0);
    expect(result.context.excludedByDomain).toBe(0);
  });

  it('is deterministic (same input produces same output)', () => {
    const plans: readonly FixPlan[] = [
      makePlan('qms'),
      makePlan('ai-disclosure'),
    ];
    const findings: readonly Finding[] = [
      { ...makeFinding('qms'), type: 'skip' } as unknown as Finding,
      makeFinding('ai-disclosure'),
    ];
    const profile: FixFilterProfile = { role: 'deployer', riskLevel: 'high', domain: null };

    const result1 = filterFixPlansByProfile(plans, findings, profile);
    const result2 = filterFixPlansByProfile(plans, findings, profile);

    expect(result1.filtered).toStrictEqual(result2.filtered);
    expect(result1.context).toStrictEqual(result2.context);
  });

  it('returns frozen filtered array', () => {
    const plans: readonly FixPlan[] = [
      makePlan('qms'),
      makePlan('ai-disclosure'),
    ];
    const findings: readonly Finding[] = [
      { ...makeFinding('qms'), type: 'skip' } as unknown as Finding,
      makeFinding('ai-disclosure'),
    ];
    const profile: FixFilterProfile = { role: 'deployer', riskLevel: 'high', domain: null };

    const result = filterFixPlansByProfile(plans, findings, profile);

    expect(Object.isFrozen(result.filtered)).toBe(true);
  });
});
