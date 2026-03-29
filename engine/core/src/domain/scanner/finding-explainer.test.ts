import { describe, it, expect } from 'vitest';
import {
  getExplanation,
  explainFinding,
  explainFindings,
  getAvailableCheckIds,
} from './finding-explainer.js';
import type { Finding } from '../../types/common.types.js';

const makeFinding = (checkId: string, type: 'pass' | 'fail' = 'fail'): Finding => ({
  checkId,
  type,
  message: `Test finding for ${checkId}`,
  severity: 'medium',
});

describe('US-S05-07: Finding Explainer', () => {
  // ── getExplanation ──────────────────────────────────────────────

  describe('getExplanation', () => {
    it('returns explanation for L1 check_id', () => {
      const expl = getExplanation('ai-disclosure');
      expect(expl).toBeDefined();
      expect(expl!.article).toBe('Art. 50(1)');
      expect(expl!.penalty).toContain('7.5M');
      expect(expl!.deadline).toBe('2025-08-02');
      expect(expl!.business_impact).toContain('informed');
    });

    it('returns explanation for L2 check_id', () => {
      const expl = getExplanation('l2-fria');
      expect(expl).toBeDefined();
      expect(expl!.article).toBe('Art. 27');
      expect(expl!.business_impact).toContain('Fundamental Rights');
    });

    it('returns explanation for L3 check_id', () => {
      const expl = getExplanation('l3-log-retention');
      expect(expl).toBeDefined();
      expect(expl!.article).toBe('Art. 12');
    });

    it('returns explanation for L4 check_id', () => {
      const expl = getExplanation('l4-bare-llm');
      expect(expl).toBeDefined();
      expect(expl!.article).toBe('Art. 50(1)');
      expect(expl!.business_impact).toContain('informational');
    });

    it('normalizes l3-banned-{package} to generic key', () => {
      const expl = getExplanation('l3-banned-tensorflow');
      expect(expl).toBeDefined();
      expect(expl!.article).toBe('Art. 15(4)');
    });

    it('returns undefined for unknown check_id', () => {
      expect(getExplanation('nonexistent-check')).toBeUndefined();
    });

    it('returns explanation for passport-presence', () => {
      const expl = getExplanation('passport-presence');
      expect(expl).toBeDefined();
      expect(expl!.article).toBe('Art. 26(4)');
      expect(expl!.penalty).toContain('15M');
    });
  });

  // ── explainFinding ──────────────────────────────────────────────

  describe('explainFinding', () => {
    it('enriches a finding with explanation', () => {
      const finding = makeFinding('ai-disclosure');
      const result = explainFinding(finding);
      expect(result.explanation).toBeDefined();
      expect(result.explanation!.article).toBe('Art. 50(1)');
      expect(result.checkId).toBe('ai-disclosure');
    });

    it('returns finding unchanged for unknown check_id', () => {
      const finding = makeFinding('unknown-xyz');
      const result = explainFinding(finding);
      expect(result.explanation).toBeUndefined();
      expect(result.checkId).toBe('unknown-xyz');
    });

    it('does not mutate original finding', () => {
      const finding = makeFinding('ai-disclosure');
      explainFinding(finding);
      expect((finding as Record<string, unknown>)['explanation']).toBeUndefined();
    });
  });

  // ── explainFindings ─────────────────────────────────────────────

  describe('explainFindings', () => {
    it('enriches all findings in array', () => {
      const findings = [
        makeFinding('ai-disclosure'),
        makeFinding('passport-presence'),
        makeFinding('unknown-check'),
      ];
      const results = explainFindings(findings);
      expect(results).toHaveLength(3);
      expect(results[0].explanation).toBeDefined();
      expect(results[1].explanation).toBeDefined();
      expect(results[2].explanation).toBeUndefined();
    });

    it('handles empty array', () => {
      expect(explainFindings([])).toEqual([]);
    });
  });

  // ── getAvailableCheckIds ────────────────────────────────────────

  describe('getAvailableCheckIds', () => {
    it('returns all mapped check_ids', () => {
      const ids = getAvailableCheckIds();
      expect(ids.length).toBeGreaterThanOrEqual(19);
      expect(ids).toContain('ai-disclosure');
      expect(ids).toContain('l2-fria');
      expect(ids).toContain('l4-bare-llm');
    });
  });

  // ── Coverage: all explanations have required fields ─────────────

  describe('data integrity', () => {
    it('all explanations have article, penalty, deadline, business_impact', () => {
      const ids = getAvailableCheckIds();
      for (const id of ids) {
        const expl = getExplanation(id);
        expect(expl, `Missing explanation for ${id}`).toBeDefined();
        expect(expl!.article, `Missing article for ${id}`).toBeTruthy();
        expect(expl!.penalty, `Missing penalty for ${id}`).toBeTruthy();
        expect(expl!.deadline, `Missing deadline for ${id}`).toBeTruthy();
        expect(expl!.business_impact, `Missing business_impact for ${id}`).toBeTruthy();
      }
    });

    it('deadlines are valid ISO date format', () => {
      const ids = getAvailableCheckIds();
      for (const id of ids) {
        const expl = getExplanation(id);
        expect(expl!.deadline, `Invalid deadline for ${id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('penalties reference EUR amounts', () => {
      const ids = getAvailableCheckIds();
      for (const id of ids) {
        const expl = getExplanation(id);
        expect(expl!.penalty, `Penalty for ${id} should mention EUR`).toMatch(/€/);
      }
    });
  });
});
