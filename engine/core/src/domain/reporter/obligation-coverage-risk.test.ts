/**
 * V1-M08 T-7: Obligation Coverage + Risk Level — RED test spec.
 *
 * Tests that buildObligationCoverage() accepts a riskLevel parameter
 * and filters obligations accordingly.
 *
 * This test MUST fail (RED) until nodejs-dev adds riskLevel parameter
 * to buildObligationCoverage and report-builder.
 */
import { describe, it, expect } from 'vitest';
import { buildObligationCoverage, type ObligationRecord } from './obligation-coverage.js';
import type { Finding, Role } from '../../types/common.types.js';

/**
 * Sample obligations that cover different risk levels.
 * Mirrors the structure in data/regulations/eu-ai-act/obligations.json.
 */
const sampleObligations: ObligationRecord[] = [
  {
    obligation_id: 'eu-ai-act-OBL-001',
    article_reference: 'Article 4',
    title: 'AI Literacy',
    applies_to_role: 'both',
    severity: 'medium',
    applies_to_risk_level: ['unacceptable', 'high', 'limited', 'minimal', 'gpai'],
    deadline: '2025-02-02',
  },
  {
    obligation_id: 'eu-ai-act-OBL-016',
    article_reference: 'Article 9',
    title: 'Risk Management System',
    applies_to_role: 'provider',
    severity: 'critical',
    applies_to_risk_level: ['high'],
    deadline: '2026-08-02',
  },
  {
    obligation_id: 'eu-ai-act-OBL-028',
    article_reference: 'Article 27',
    title: 'FRIA',
    applies_to_role: 'deployer',
    severity: 'high',
    applies_to_risk_level: ['high'],
    deadline: '2026-08-02',
  },
  {
    obligation_id: 'eu-ai-act-OBL-013',
    article_reference: 'Article 50',
    title: 'Transparency',
    applies_to_role: 'both',
    severity: 'medium',
    applies_to_risk_level: ['high', 'limited'],
    deadline: '2026-08-02',
  },
  {
    obligation_id: 'eu-ai-act-OBL-052',
    article_reference: 'Article 50',
    title: 'AI Disclosure',
    applies_to_role: 'both',
    severity: 'medium',
    applies_to_risk_level: ['high', 'limited', 'minimal'],
    deadline: '2026-08-02',
  },
];

const emptyFindings: readonly Finding[] = [];

describe('buildObligationCoverage with riskLevel', () => {
  it('returns all obligations when riskLevel is null (no profile)', () => {
    const result = buildObligationCoverage(
      sampleObligations, emptyFindings, 'both', null,
    );
    // All 5 obligations should be counted
    expect(result.total).toBe(5);
  });

  it('filters obligations by riskLevel=limited for deployer', () => {
    const result = buildObligationCoverage(
      sampleObligations, emptyFindings, 'deployer', 'limited',
    );
    // Deployer + limited:
    // - OBL-001: both + all risk levels → YES
    // - OBL-016: provider only → NO (role filter)
    // - OBL-028: deployer + high only → NO (risk filter)
    // - OBL-013: both + high/limited → YES
    // - OBL-052: both + high/limited/minimal → YES
    // Expected: 3 obligations
    expect(result.total).toBe(3);
  });

  it('filters obligations by riskLevel=high for provider', () => {
    const result = buildObligationCoverage(
      sampleObligations, emptyFindings, 'provider', 'high',
    );
    // Provider + high:
    // - OBL-001: both + all → YES
    // - OBL-016: provider + high → YES
    // - OBL-028: deployer → NO (role filter)
    // - OBL-013: both + high/limited → YES
    // - OBL-052: both + high/limited/minimal → YES
    // Expected: 4 obligations
    expect(result.total).toBe(4);
  });

  it('filters obligations by riskLevel=minimal for both', () => {
    const result = buildObligationCoverage(
      sampleObligations, emptyFindings, 'both', 'minimal',
    );
    // Both + minimal:
    // - OBL-001: both + all → YES
    // - OBL-016: provider + high only → NO (risk filter)
    // - OBL-028: deployer + high only → NO (risk filter)
    // - OBL-013: both + high/limited → NO (risk filter)
    // - OBL-052: both + all including minimal → YES
    // Expected: 2 obligations
    expect(result.total).toBe(2);
  });

  it('coverage percent reflects filtered obligation count', () => {
    const findings: readonly Finding[] = [
      { checkId: 'ai-disclosure', type: 'pass', message: 'OK', severity: 'info' },
    ];
    const resultAll = buildObligationCoverage(
      sampleObligations, findings, 'both', null,
    );
    const resultLimited = buildObligationCoverage(
      sampleObligations, findings, 'both', 'limited',
    );
    // Coverage % should be higher for limited (fewer total obligations, same covered count)
    expect(resultLimited.coveragePercent).toBeGreaterThanOrEqual(resultAll.coveragePercent);
  });
});
