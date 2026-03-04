import { describe, it, expect } from 'vitest';
import { createObligationsRoute } from './obligations.route.js';
import type { ScanResult, Finding } from '../../types/common.types.js';

const makeObligation = (overrides: Record<string, unknown> = {}) => ({
  obligation_id: 'eu-ai-act-OBL-001',
  article_reference: 'Article 4',
  title: 'AI Literacy',
  description: 'Ensure staff literacy',
  applies_to_role: 'both',
  applies_to_risk_level: ['high', 'limited'],
  severity: 'medium',
  deadline: '2025-02-02',
  obligation_type: 'training',
  ...overrides,
});

const makeFinding = (checkId: string, type: 'pass' | 'fail'): Finding => ({
  checkId,
  type,
  message: `${checkId} check`,
  severity: 'medium' as const,
  confidence: 1,
  confidenceLevel: 'high',
  evidence: [],
});

const makeScan = (findings: Finding[]): ScanResult => ({
  findings,
  score: { totalScore: 50, zone: 'yellow', breakdown: [] } as unknown as ScanResult['score'],
  metadata: { version: '1.0.0', timestamp: new Date().toISOString(), filesScanned: 10 },
});

describe('obligations route', () => {
  it('returns obligations with coverage from passed checks', async () => {
    const obligations = [
      makeObligation({ obligation_id: 'eu-ai-act-OBL-001' }),
      makeObligation({ obligation_id: 'eu-ai-act-OBL-006', title: 'Logging' }),
    ];
    const scan = makeScan([
      makeFinding('ai-literacy', 'pass'),         // covers OBL-001
      makeFinding('interaction-logging', 'fail'),  // covers OBL-006 but FAIL — not covered
    ]);

    const app = createObligationsRoute({ obligations, getLastScan: () => scan });
    const res = await app.request('/obligations');
    const data = await res.json() as Array<Record<string, unknown>>;

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ id: 'OBL-001', covered: true });
    expect(data[1]).toMatchObject({ id: 'OBL-006', covered: false });
  });

  it('returns all obligations uncovered when no scan', async () => {
    const obligations = [makeObligation()];
    const app = createObligationsRoute({ obligations, getLastScan: () => null });
    const res = await app.request('/obligations');
    const data = await res.json() as Array<Record<string, unknown>>;

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: 'OBL-001', covered: false });
  });

  it('normalizes obligation_id by stripping eu-ai-act- prefix', async () => {
    const obligations = [
      makeObligation({ obligation_id: 'eu-ai-act-OBL-022' }),
    ];
    const scan = makeScan([makeFinding('gpai-transparency', 'pass')]);

    const app = createObligationsRoute({ obligations, getLastScan: () => scan });
    const res = await app.request('/obligations');
    const data = await res.json() as Array<Record<string, unknown>>;

    expect(data[0]).toMatchObject({ id: 'OBL-022', covered: true });
  });

  it('includes linked_checks from reverse mapping', async () => {
    const obligations = [
      makeObligation({ obligation_id: 'eu-ai-act-OBL-008' }),
    ];
    const app = createObligationsRoute({ obligations, getLastScan: () => null });
    const res = await app.request('/obligations');
    const data = await res.json() as Array<Record<string, unknown>>;

    // OBL-008 is covered by l4-human-oversight, l4-kill-switch, cross-kill-switch-no-test
    const linked = data[0]!['linked_checks'] as string[];
    expect(linked).toContain('l4-human-oversight');
    expect(linked).toContain('l4-kill-switch');
    expect(linked).toContain('cross-kill-switch-no-test');
  });

  it('maps all required fields to response', async () => {
    const obligations = [makeObligation({
      obligation_id: 'eu-ai-act-OBL-001',
      article_reference: 'Article 4',
      title: 'AI Literacy',
      description: 'Train staff',
      applies_to_role: 'both',
      applies_to_risk_level: ['high'],
      severity: 'medium',
      deadline: '2025-02-02',
      obligation_type: 'training',
    })];
    const app = createObligationsRoute({ obligations, getLastScan: () => null });
    const res = await app.request('/obligations');
    const data = await res.json() as Array<Record<string, unknown>>;

    expect(data[0]).toEqual({
      id: 'OBL-001',
      article: 'Article 4',
      title: 'AI Literacy',
      description: 'Train staff',
      role: 'both',
      risk_levels: ['high'],
      severity: 'medium',
      deadline: '2025-02-02',
      obligation_type: 'training',
      covered: false,
      linked_checks: expect.any(Array),
    });
  });
});
