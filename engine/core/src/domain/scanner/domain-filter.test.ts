/**
 * V1-M18 T-3: Domain Filter — RED test spec.
 *
 * Filters scanner findings by project industry domain.
 * Uses check-applicability.json for domain→checkId overrides.
 * Mirrors role-filter.ts and risk-level-filter.ts pattern:
 * findings for inapplicable domains become type: 'skip' (visible but not scored).
 *
 * Conservative default: checks with NO domain mapping apply to ALL domains.
 */

import { describe, it, expect } from 'vitest';
import type { Finding } from '../../types/common.types.js';
import { filterFindingsByDomain } from './domain-filter.js';

/** Helper: create a Finding with minimal required fields. */
const makeFinding = (checkId: string, type: 'pass' | 'fail' | 'skip' = 'fail'): Finding => ({
  checkId,
  type,
  message: `Finding for ${checkId}`,
  severity: 'medium',
});

describe('V1-M18: filterFindingsByDomain', () => {
  it('returns findings unchanged when domain is null', () => {
    const findings: readonly Finding[] = [
      makeFinding('worker-notification'),
      makeFinding('ai-disclosure'),
      makeFinding('industry-hr-bias'),
    ];

    const result = filterFindingsByDomain(findings, null);

    // No filtering when domain is unknown (no profile)
    expect(result).toBe(findings); // same reference
    expect(result).toHaveLength(3);
    expect(result.every(f => f.type === 'fail')).toBe(true);
  });

  it('skips HR-only checks when project domain is healthcare', () => {
    const findings: readonly Finding[] = [
      makeFinding('industry-hr-bias'),        // HR domain only
      makeFinding('industry-hr-notification'), // HR domain only
      makeFinding('ai-disclosure'),            // no domain restriction
    ];

    const result = filterFindingsByDomain(findings, 'healthcare');

    // HR-only checks should become skip for healthcare domain
    const hrBias = result.find(f => f.checkId === 'industry-hr-bias');
    expect(hrBias).toBeDefined();
    expect(hrBias!.type).toBe('skip');

    const hrNotif = result.find(f => f.checkId === 'industry-hr-notification');
    expect(hrNotif).toBeDefined();
    expect(hrNotif!.type).toBe('skip');

    // Disclosure has no domain restriction → unchanged
    const disclosure = result.find(f => f.checkId === 'ai-disclosure');
    expect(disclosure).toBeDefined();
    expect(disclosure!.type).toBe('fail');
  });

  it('preserves healthcare checks when project domain is healthcare', () => {
    const findings: readonly Finding[] = [
      makeFinding('industry-healthcare-clinical'),   // healthcare domain
      makeFinding('industry-healthcare-disclosure'),  // healthcare domain
    ];

    const result = filterFindingsByDomain(findings, 'healthcare');

    // Healthcare checks should pass through for healthcare domain
    expect(result[0]!.type).toBe('fail');
    expect(result[1]!.type).toBe('fail');
  });

  it('preserves checks with no domain mapping (conservative default)', () => {
    const findings: readonly Finding[] = [
      makeFinding('ai-disclosure'),         // no domain override
      makeFinding('l4-bare-llm'),           // no domain override
      makeFinding('qms'),                   // role override only, no domain
      makeFinding('l4-security-risk'),      // no domain override
    ];

    const result = filterFindingsByDomain(findings, 'finance');

    // All checks without domain mapping should pass through unchanged
    expect(result).toHaveLength(4);
    expect(result.every(f => f.type === 'fail')).toBe(true);
  });

  it('skips finance-only checks for education domain', () => {
    const findings: readonly Finding[] = [
      makeFinding('industry-finance-credit'),     // finance domain
      makeFinding('industry-finance-insurance'),  // finance domain
      makeFinding('industry-education-assessment'), // education domain
      makeFinding('ai-disclosure'),                 // universal
    ];

    const result = filterFindingsByDomain(findings, 'education');

    // Finance checks → skip for education
    expect(result.find(f => f.checkId === 'industry-finance-credit')!.type).toBe('skip');
    expect(result.find(f => f.checkId === 'industry-finance-insurance')!.type).toBe('skip');

    // Education check → unchanged
    expect(result.find(f => f.checkId === 'industry-education-assessment')!.type).toBe('fail');

    // Universal check → unchanged
    expect(result.find(f => f.checkId === 'ai-disclosure')!.type).toBe('fail');
  });

  it('includes descriptive skip message with domain info', () => {
    const findings: readonly Finding[] = [
      makeFinding('industry-hr-bias'),
    ];

    const result = filterFindingsByDomain(findings, 'healthcare');

    const skipped = result[0]!;
    expect(skipped.type).toBe('skip');
    // Message should include both the required domain and the project domain
    expect(skipped.message).toContain('healthcare');
    expect(skipped.message.toLowerCase()).toContain('domain');
  });

  it('returns original array reference when no changes needed', () => {
    const findings: readonly Finding[] = [
      makeFinding('ai-disclosure'),
      makeFinding('l4-security-risk'),
    ];

    // These checks have no domain restriction → no changes for any domain
    const result = filterFindingsByDomain(findings, 'healthcare');

    // Optimization: same reference when nothing changed
    expect(result).toBe(findings);
  });

  it('is deterministic (same input produces same output)', () => {
    const findings: readonly Finding[] = [
      makeFinding('industry-hr-bias'),
      makeFinding('industry-finance-credit'),
      makeFinding('ai-disclosure'),
    ];

    const result1 = filterFindingsByDomain(findings, 'healthcare');
    const result2 = filterFindingsByDomain(findings, 'healthcare');

    expect(result1).toStrictEqual(result2);
  });

  it('returns frozen result when changes are made', () => {
    const findings: readonly Finding[] = [
      makeFinding('industry-hr-bias'),
      makeFinding('ai-disclosure'),
    ];

    const result = filterFindingsByDomain(findings, 'healthcare');

    // Result should be frozen when changes were made (hr-bias → skip)
    expect(result).not.toBe(findings); // not same reference (changes were made)
    expect(Object.isFrozen(result)).toBe(true);
  });
});

/**
 * V1-M18: Validate check-applicability.json data structure.
 *
 * Ensures the JSON data file that domain-filter.ts depends on
 * has the expected structure and key domain overrides.
 */
import applicabilityData from '../../../../data/scanner/check-applicability.json' with { type: 'json' };

const data = applicabilityData as {
  version: string;
  defaults: { roles: string[]; riskLevels: string[]; domains: string[] };
  overrides: Record<string, { roles?: string[]; domains?: string[]; riskLevels?: string[] }>;
};

describe('V1-M18: check-applicability.json data integrity', () => {

  it('has version field', () => {
    expect(data.version).toBe('1.0.0');
  });

  it('defaults.domains is empty array (conservative: applies to all)', () => {
    expect(data.defaults.domains).toEqual([]);
  });

  it('has HR domain overrides for industry-hr checks', () => {
    expect(data.overrides['industry-hr-bias']).toBeDefined();
    expect(data.overrides['industry-hr-bias']!.domains).toContain('hr');
  });

  it('has finance domain overrides', () => {
    expect(data.overrides['industry-finance-credit']).toBeDefined();
    expect(data.overrides['industry-finance-credit']!.domains).toContain('finance');
  });

  it('has healthcare domain overrides', () => {
    expect(data.overrides['industry-healthcare-clinical']).toBeDefined();
    expect(data.overrides['industry-healthcare-clinical']!.domains).toContain('healthcare');
  });

  it('has education domain overrides', () => {
    expect(data.overrides['industry-education-assessment']).toBeDefined();
    expect(data.overrides['industry-education-assessment']!.domains).toContain('education');
  });

  it('provider-only checks have roles override without domain', () => {
    const qms = data.overrides['qms'];
    expect(qms).toBeDefined();
    expect(qms!.roles).toEqual(['provider']);
    // qms has no domain restriction — it's a role-only override
    expect(qms!.domains).toBeUndefined();
  });
});
