/**
 * V1-M12: Eval Role Filter — RED test spec.
 *
 * Verifies that eval tests are filtered by project role (provider/deployer/both).
 * Tests marked as provider-only (CT-8 Logging) should be skipped for deployers.
 * Tests marked as deployer-only (some CT-2 Oversight) should be skipped for providers.
 */

import { describe, it, expect } from 'vitest';
import type { ConformityTest } from './types.js';
import type { EvalFilterContext } from '../../types/common.types.js';
import { filterTestsByProfile } from './eval-profile-filter.js';

// --- Test data: minimal ConformityTest stubs ---

const makeTest = (id: string, category: ConformityTest['category']): ConformityTest => ({
  id,
  category,
  name: `Test ${id}`,
  description: `Description for ${id}`,
  method: 'deterministic',
  probe: 'Hello',
  euAiActRef: 'Art.50',
  severity: 'medium',
});

// Applicability map (mirrors test-applicability.json structure)
const applicabilityMap: Record<string, { roles?: string[]; riskLevels?: string[]; industries?: string[] }> = {
  'CT-8-001': { roles: ['provider'] },
  'CT-8-002': { roles: ['provider'] },
  'CT-2-008': { roles: ['deployer'] },
  'CT-2-009': { roles: ['deployer'] },
};

const allTests: readonly ConformityTest[] = [
  makeTest('CT-1-001', 'transparency'),
  makeTest('CT-8-001', 'logging'),
  makeTest('CT-8-002', 'logging'),
  makeTest('CT-2-001', 'oversight'),
  makeTest('CT-2-008', 'oversight'),
  makeTest('CT-2-009', 'oversight'),
];

describe('V1-M12: Eval Role Filter', () => {
  it('role="both" passes all tests through', () => {
    const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: null, domain: null }, applicabilityMap);
    expect(filtered).toHaveLength(allTests.length);
  });

  it('role="provider" skips deployer-only tests (CT-2-008, CT-2-009)', () => {
    const { filtered, context } = filterTestsByProfile(allTests, { role: 'provider', riskLevel: null, domain: null }, applicabilityMap);
    expect(filtered).toHaveLength(4); // 6 total - 2 deployer-only
    expect(filtered.find(t => t.id === 'CT-2-008')).toBeUndefined();
    expect(filtered.find(t => t.id === 'CT-2-009')).toBeUndefined();
  });

  it('role="deployer" skips provider-only tests (CT-8-001, CT-8-002)', () => {
    const { filtered, context } = filterTestsByProfile(allTests, { role: 'deployer', riskLevel: null, domain: null }, applicabilityMap);
    expect(filtered).toHaveLength(4); // 6 total - 2 provider-only
    expect(filtered.find(t => t.id === 'CT-8-001')).toBeUndefined();
    expect(filtered.find(t => t.id === 'CT-8-002')).toBeUndefined();
  });

  it('defaults to role="both" when no profile provided (null)', () => {
    const { filtered, context } = filterTestsByProfile(allTests, null, applicabilityMap);
    expect(filtered).toHaveLength(allTests.length);
    expect(context.profileFound).toBe(false);
  });

  it('counts skippedByRole correctly', () => {
    const { context } = filterTestsByProfile(allTests, { role: 'provider', riskLevel: null, domain: null }, applicabilityMap);
    expect(context.skippedByRole).toBe(2);
    expect(context.totalTests).toBe(6);
    expect(context.applicableTests).toBe(4);
  });

  it('does not skip tests without role override', () => {
    const { filtered } = filterTestsByProfile(allTests, { role: 'deployer', riskLevel: null, domain: null }, applicabilityMap);
    expect(filtered.find(t => t.id === 'CT-1-001')).toBeDefined();
    expect(filtered.find(t => t.id === 'CT-2-001')).toBeDefined();
  });
});
