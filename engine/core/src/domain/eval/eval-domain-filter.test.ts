/**
 * V1-M12: Eval Domain Filter — RED test spec.
 *
 * Verifies that eval tests are filtered by project industry domain.
 * CT-11 tests are industry-specific: HR, education, finance, healthcare, etc.
 */

import { describe, it, expect } from 'vitest';
import type { ConformityTest } from './types.js';

// --- Test will import from eval-profile-filter.ts (not yet implemented) ---
// import { filterTestsByProfile } from './eval-profile-filter.js';

const makeTest = (id: string, category: ConformityTest['category']): ConformityTest => ({
  id,
  category,
  name: `Test ${id}`,
  description: `Description for ${id}`,
  method: 'deterministic',
  probe: 'Hello',
  euAiActRef: 'Art.6',
  severity: 'medium',
});

const applicabilityMap: Record<string, { roles?: string[]; riskLevels?: string[]; industries?: string[] }> = {
  'CT-11-001': { industries: ['hr', 'employment'] },
  'CT-11-002': { industries: ['hr', 'employment'] },
  'CT-11-006': { industries: ['education'] },
  'CT-11-007': { industries: ['education'] },
  'CT-11-016': { industries: ['healthcare'] },
};

const allTests: readonly ConformityTest[] = [
  makeTest('CT-1-001', 'transparency'),   // no industry override
  makeTest('CT-11-001', 'industry'),       // HR only
  makeTest('CT-11-002', 'industry'),       // HR only
  makeTest('CT-11-006', 'industry'),       // education only
  makeTest('CT-11-007', 'industry'),       // education only
  makeTest('CT-11-016', 'industry'),       // healthcare only
];

describe('V1-M12: Eval Domain Filter', () => {
  it('null domain = no filtering (all tests pass through)', () => {
    // Null domain means no domain info — all tests run
    // const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: null, domain: null }, applicabilityMap);
    // expect(filtered).toHaveLength(6);
    expect.fail('Not implemented: filterTestsByProfile');
  });

  it('domain="hr" includes HR industry tests (CT-11-001, CT-11-002)', () => {
    // HR domain should include HR tests
    // const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: null, domain: 'hr' }, applicabilityMap);
    // expect(filtered.find(t => t.id === 'CT-11-001')).toBeDefined();
    // expect(filtered.find(t => t.id === 'CT-11-002')).toBeDefined();
    expect.fail('Not implemented: filterTestsByProfile');
  });

  it('domain="hr" excludes education and healthcare tests', () => {
    // HR domain should NOT include education or healthcare tests
    // const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: null, domain: 'hr' }, applicabilityMap);
    // expect(filtered.find(t => t.id === 'CT-11-006')).toBeUndefined();
    // expect(filtered.find(t => t.id === 'CT-11-007')).toBeUndefined();
    // expect(filtered.find(t => t.id === 'CT-11-016')).toBeUndefined();
    expect.fail('Not implemented: filterTestsByProfile');
  });

  it('unknown domain skips all industry-specific tests', () => {
    // Domain "retail" has no matching industry tests — all CT-11 skipped
    // const { filtered, context } = filterTestsByProfile(allTests, { role: 'both', riskLevel: null, domain: 'retail' }, applicabilityMap);
    // expect(filtered.filter(t => t.category === 'industry')).toHaveLength(0);
    // expect(context.skippedByDomain).toBe(5);
    expect.fail('Not implemented: filterTestsByProfile');
  });

  it('tests without industry override always pass through', () => {
    // CT-1-001 has no industry override — should always be included
    // const { filtered } = filterTestsByProfile(allTests, { role: 'both', riskLevel: null, domain: 'hr' }, applicabilityMap);
    // expect(filtered.find(t => t.id === 'CT-1-001')).toBeDefined();
    expect.fail('Not implemented: filterTestsByProfile');
  });
});
