import { describe, it, expect } from 'vitest';
import { computeCostEstimate } from './cost-estimator.js';

describe('computeCostEstimate', () => {
  it('returns zero costs when no issues', () => {
    const result = computeCostEstimate({
      findings: [],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 150,
    });
    expect(result.totalCost).toBe(0);
    expect(result.remediationCost).toBe(0);
    expect(result.documentationCost).toBe(0);
    expect(result.roi).toBe(0);
    expect(result.currency).toBe('EUR');
  });

  it('calculates remediation cost by severity', () => {
    const result = computeCostEstimate({
      findings: [
        { severity: 'critical', checkId: 'c1', status: 'fail' },
        { severity: 'high', checkId: 'h1', status: 'fail' },
        { severity: 'medium', checkId: 'm1', status: 'fail' },
        { severity: 'low', checkId: 'l1', status: 'fail' },
      ],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 100,
    });
    // 8 + 4 + 2 + 1 = 15 hours x EUR 100 = EUR 1,500
    expect(result.remediationCost).toBe(1500);
  });

  it('adds FRIA cost when not completed', () => {
    const result = computeCostEstimate({
      findings: [],
      passportCompleteness: 100,
      friaCompleted: false,
      evidenceValid: true,
      hourlyRate: 150,
    });
    expect(result.documentationCost).toBe(16 * 150); // FRIA: 16h
  });

  it('adds passport completion cost', () => {
    const result = computeCostEstimate({
      findings: [],
      passportCompleteness: 50,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 150,
    });
    // 50% missing -> ceil(50/10)*2 = 10h x EUR 150 = EUR 1,500
    expect(result.breakdown.some((b) => b.item === 'Passport completion')).toBe(
      true,
    );
    const passportItem = result.breakdown.find(
      (b) => b.item === 'Passport completion',
    );
    expect(passportItem?.effortHours).toBe(10);
    expect(passportItem?.cost).toBe(1500);
  });

  it('adds evidence chain setup cost', () => {
    const result = computeCostEstimate({
      findings: [],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: false,
      hourlyRate: 150,
    });
    expect(
      result.breakdown.some((b) => b.item === 'Evidence chain setup'),
    ).toBe(true);
    expect(result.documentationCost).toBe(4 * 150);
  });

  it('skips pass findings', () => {
    const result = computeCostEstimate({
      findings: [{ severity: 'critical', checkId: 'c1', status: 'pass' }],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 150,
    });
    expect(result.remediationCost).toBe(0);
  });

  it('calculates ROI correctly', () => {
    const result = computeCostEstimate({
      findings: [{ severity: 'critical', checkId: 'c1', status: 'fail' }],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 100,
    });
    expect(result.totalCost).toBe(800); // 8h x EUR 100
    expect(result.potentialFine).toBeGreaterThan(0);
    expect(result.roi).toBeGreaterThan(0);
  });

  it('returns frozen result', () => {
    const result = computeCostEstimate({
      findings: [],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 150,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns frozen breakdown array', () => {
    const result = computeCostEstimate({
      findings: [{ severity: 'high', checkId: 'h1', status: 'fail' }],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 100,
    });
    expect(Object.isFrozen(result.breakdown)).toBe(true);
  });

  it('uses default 2h for unknown severity', () => {
    const result = computeCostEstimate({
      findings: [
        { severity: 'unknown-severity', checkId: 'x1', status: 'fail' },
      ],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 100,
    });
    expect(result.remediationCost).toBe(200); // 2h x EUR 100
  });

  it('caps potential fine risk factor at 1.0', () => {
    // 5 critical findings -> 5 * 0.3 = 1.5, capped at 1.0
    const result = computeCostEstimate({
      findings: Array.from({ length: 5 }, (_, i) => ({
        severity: 'critical',
        checkId: `c${i}`,
        status: 'fail',
      })),
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 100,
    });
    expect(result.potentialFine).toBe(35_000_000);
  });

  it('calculates combined costs with all gap types', () => {
    const result = computeCostEstimate({
      findings: [
        { severity: 'critical', checkId: 'c1', status: 'fail' },
        { severity: 'low', checkId: 'l1', status: 'fail' },
      ],
      passportCompleteness: 70,
      friaCompleted: false,
      evidenceValid: false,
      hourlyRate: 200,
    });
    // Remediation: (8+1)*200 = 1800
    expect(result.remediationCost).toBe(1800);
    // Documentation: FRIA 16*200=3200, passport ceil(30/10)*2=6h*200=1200,
    //   evidence 4*200=800 => 5200
    expect(result.documentationCost).toBe(3200 + 1200 + 800);
    expect(result.totalCost).toBe(1800 + 5200);
  });

  it('handles empty findings array gracefully', () => {
    const result = computeCostEstimate({
      findings: [],
      passportCompleteness: 100,
      friaCompleted: true,
      evidenceValid: true,
      hourlyRate: 0,
    });
    expect(result.totalCost).toBe(0);
    expect(result.breakdown).toHaveLength(0);
    expect(result.potentialFine).toBe(0);
  });
});
