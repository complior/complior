import { describe, it, expect } from 'vitest';
import { getCheckRole, filterFindingsByRole } from './role-filter.js';
import type { Finding } from '../../types/common.types.js';

const makeFinding = (checkId: string, type: 'pass' | 'fail' | 'skip' = 'fail'): Finding => ({
  checkId,
  type,
  message: `Check ${checkId}`,
  severity: 'medium',
});

describe('getCheckRole', () => {
  it('returns provider for provider-only checks', () => {
    expect(getCheckRole('qms')).toBe('provider');
    expect(getCheckRole('gpai-transparency')).toBe('provider');
    expect(getCheckRole('l4-conformity-assessment')).toBe('provider');
    expect(getCheckRole('content-marking')).toBe('provider');
  });

  it('returns deployer for deployer-only checks', () => {
    expect(getCheckRole('monitoring-policy')).toBe('deployer');
    expect(getCheckRole('fria')).toBe('deployer');
    expect(getCheckRole('worker-notification')).toBe('deployer');
    expect(getCheckRole('l4-deployer-monitoring')).toBe('deployer');
  });

  it('returns both for unlisted checks', () => {
    expect(getCheckRole('l1-risk')).toBe('both');
    expect(getCheckRole('technical-documentation')).toBe('both');
    expect(getCheckRole('sdk-no-disclosure')).toBe('both');
    expect(getCheckRole('unknown-check')).toBe('both');
  });
});

describe('filterFindingsByRole', () => {
  const findings: readonly Finding[] = [
    makeFinding('qms'),              // provider-only
    makeFinding('fria'),             // deployer-only
    makeFinding('l1-risk'),          // both
    makeFinding('gpai-transparency'), // provider-only
    makeFinding('worker-notification'), // deployer-only
    makeFinding('technical-documentation', 'pass'), // both, pass
  ];

  it('role=both returns all findings unchanged', () => {
    const result = filterFindingsByRole(findings, 'both');
    expect(result).toBe(findings); // same reference
    expect(result).toHaveLength(6);
  });

  it('role=deployer skips provider-only checks', () => {
    const result = filterFindingsByRole(findings, 'deployer');
    expect(result).toHaveLength(6);

    // Provider-only → skip
    const qms = result.find(f => f.checkId === 'qms')!;
    expect(qms.type).toBe('skip');
    expect(qms.message).toContain('provider-only');

    const gpai = result.find(f => f.checkId === 'gpai-transparency')!;
    expect(gpai.type).toBe('skip');

    // Deployer-only → unchanged
    const fria = result.find(f => f.checkId === 'fria')!;
    expect(fria.type).toBe('fail');

    const worker = result.find(f => f.checkId === 'worker-notification')!;
    expect(worker.type).toBe('fail');

    // Both → unchanged
    const risk = result.find(f => f.checkId === 'l1-risk')!;
    expect(risk.type).toBe('fail');

    const techDoc = result.find(f => f.checkId === 'technical-documentation')!;
    expect(techDoc.type).toBe('pass');
  });

  it('role=provider skips deployer-only checks', () => {
    const result = filterFindingsByRole(findings, 'provider');
    expect(result).toHaveLength(6);

    // Deployer-only → skip
    const fria = result.find(f => f.checkId === 'fria')!;
    expect(fria.type).toBe('skip');
    expect(fria.message).toContain('deployer-only');

    const worker = result.find(f => f.checkId === 'worker-notification')!;
    expect(worker.type).toBe('skip');

    // Provider-only → unchanged
    const qms = result.find(f => f.checkId === 'qms')!;
    expect(qms.type).toBe('fail');

    const gpai = result.find(f => f.checkId === 'gpai-transparency')!;
    expect(gpai.type).toBe('fail');
  });

  it('preserves finding count (skip replaces, does not remove)', () => {
    const result = filterFindingsByRole(findings, 'deployer');
    expect(result).toHaveLength(findings.length);
  });

  it('empty findings returns empty', () => {
    const result = filterFindingsByRole([], 'deployer');
    expect(result).toHaveLength(0);
  });

  it('all-applicable findings unchanged for any role', () => {
    const bothFindings: Finding[] = [
      makeFinding('l1-risk'),
      makeFinding('technical-documentation', 'pass'),
    ];
    expect(filterFindingsByRole(bothFindings, 'deployer')).toEqual(bothFindings);
    expect(filterFindingsByRole(bothFindings, 'provider')).toEqual(bothFindings);
  });
});
