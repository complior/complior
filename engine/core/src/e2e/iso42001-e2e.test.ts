/**
 * E2E tests for ISO 42001 document generation HTTP endpoints.
 * Tests POST /agent/soa and POST /agent/risk-register via Hono in-memory.
 *
 * RED until nodejs-dev wires routes in agent.route.ts (T-6).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';

// NOTE: These imports will resolve once routes are wired.
// The test file tests the HTTP contract, not internal logic.

describe('ISO 42001 E2E — HTTP Routes', () => {
  // Skip if the test project is not available (env-gated)
  const TEST_PROJECT = process.env.COMPLIOR_TEST_PROJECT;
  const describeWithProject = TEST_PROJECT ? describe : describe.skip;

  describeWithProject('POST /agent/soa', () => {
    it('returns SoA with entries array', async () => {
      const res = await fetch(`http://localhost:${process.env.COMPLIOR_PORT ?? 9876}/agent/soa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', path: TEST_PROJECT }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('completeness');
      expect(data).toHaveProperty('applicableCount');
      expect(data).toHaveProperty('implementedCount');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('returns entries with expected fields', async () => {
      const res = await fetch(`http://localhost:${process.env.COMPLIOR_PORT ?? 9876}/agent/soa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', path: TEST_PROJECT }),
      });

      const data = await res.json() as { entries: Record<string, unknown>[] };
      if (data.entries.length > 0) {
        const entry = data.entries[0];
        expect(entry).toHaveProperty('controlId');
        expect(entry).toHaveProperty('title');
        expect(entry).toHaveProperty('applicable');
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('evidence');
        expect(entry).toHaveProperty('gaps');
      }
    });
  });

  describeWithProject('POST /agent/risk-register', () => {
    it('returns risk register with entries array', async () => {
      const res = await fetch(`http://localhost:${process.env.COMPLIOR_PORT ?? 9876}/agent/risk-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', path: TEST_PROJECT }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('totalRisks');
      expect(data).toHaveProperty('criticalCount');
      expect(data).toHaveProperty('highCount');
      expect(data).toHaveProperty('averageRiskScore');
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('returns entries sorted by riskScore descending', async () => {
      const res = await fetch(`http://localhost:${process.env.COMPLIOR_PORT ?? 9876}/agent/risk-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', path: TEST_PROJECT }),
      });

      const data = await res.json() as { entries: { riskScore: number }[] };
      for (let i = 1; i < data.entries.length; i++) {
        expect(data.entries[i - 1].riskScore).toBeGreaterThanOrEqual(data.entries[i].riskScore);
      }
    });
  });
});
