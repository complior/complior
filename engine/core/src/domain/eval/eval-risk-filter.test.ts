/**
 * V1-M12: Eval Risk-Level Filter — RED test spec.
 *
 * Verifies that eval tests are filtered by project risk level.
 * CT-10 (GPAI Compliance) tests should only run for gpai/gpai_systemic risk levels.
 */

import { describe, it, expect } from 'vitest';
import type { ConformityTest } from './types.js';
import { filterTestsByProfile } from './eval-profile-filter.js';

const makeTest = (id: string, category: ConformityTest['category']): ConformityTest => ({
  id,
  category,
  name: `Test ${id}`,
  description: `Description for ${id}`,
  method: 'deterministic',
  probe: 'Hello',
  euAiActRef: 'Art.52',
  severity: 'medium',
});

const applicabilityMap: Record<string, { roles?: string[]; riskLevels?: string[]; industries?: string[] }> = {
  'CT-10-001': { riskLevels: ['gpai', 'gpai_systemic'] },
  'CT-10-002': { riskLevels: ['gpai', 'gpai_systemic'] },
  'CT-10-003': { riskLevels: ['gpai', 'gpai_systemic'] },
};

const allTests: readonly ConformityTest[] = [
  makeTest('CT-1-001', 'transparency'),
  makeTest('CT-5-001', 'accuracy'),
  makeTest('CT-10-001', 'gpai'),
  makeTest('CT-10-002', 'gpai'),
  makeTest('CT-10-003', 'gpai'),
];

describe('V1-M12: Eval Risk-Level Filter', () => {
  it('null riskLevel = no filtering (all tests pass through)', () => {
    const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: null, domain: null }, applicabilityMap);
    expect(filtered).toHaveLength(5);
  });

  it('riskLevel="limited" skips GPAI tests (CT-10)', () => {
    const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: 'limited', domain: null }, applicabilityMap);
    expect(filtered).toHaveLength(2); // 5 total - 3 GPAI
    expect(filtered.every(t => t.category !== 'gpai')).toBe(true);
  });

  it('riskLevel="gpai" includes GPAI tests', () => {
    const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: 'gpai', domain: null }, applicabilityMap);
    expect(filtered).toHaveLength(5);
    expect(filtered.filter(t => t.category === 'gpai')).toHaveLength(3);
  });

  it('riskLevel="high" passes all non-GPAI tests', () => {
    const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: 'high', domain: null }, applicabilityMap);
    expect(filtered).toHaveLength(2); // transparency + accuracy, no GPAI
  });

  it('counts skippedByRiskLevel correctly', () => {
    const { context } = filterTestsByProfile(allTests, { role: 'both', riskLevel: 'limited', domain: null }, applicabilityMap);
    expect(context.skippedByRiskLevel).toBe(3);
  });
});
