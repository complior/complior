import { describe, it, expect } from 'vitest';
import { createSharePayload, generateShareId } from './share.js';
import type { ScanResult } from '../../types/common.types.js';
import { ENGINE_VERSION } from '../../version.js';

const makeScanResult = (overrides?: Partial<ScanResult>): ScanResult => ({
  score: {
    totalScore: 72,
    zone: 'yellow',
    categoryScores: [],
    criticalCapApplied: false,
    totalChecks: 10,
    passedChecks: 7,
    failedChecks: 3,
    skippedChecks: 0,
  },
  findings: [
    { checkId: 'chk-1', type: 'fail', message: 'No AI disclosure', severity: 'high', obligationId: 'OBL-015', articleReference: 'Art. 50(1)', fix: 'Add AI disclosure component' },
    { checkId: 'chk-2', type: 'fail', message: 'No C2PA marking', severity: 'high', obligationId: 'OBL-016', articleReference: 'Art. 50(2)', fix: 'Add C2PA metadata' },
    { checkId: 'chk-3', type: 'fail', message: 'Missing monitoring', severity: 'medium', obligationId: 'OBL-011', articleReference: 'Art. 26' },
    { checkId: 'chk-4', type: 'pass', message: 'Logging present', severity: 'info' },
    { checkId: 'chk-5', type: 'pass', message: 'Documentation found', severity: 'info' },
  ],
  projectPath: '/test',
  scannedAt: new Date().toISOString(),
  duration: 1200,
  filesScanned: 50,
  ...overrides,
});

describe('share', () => {
  describe('generateShareId', () => {
    it('generates unique IDs with cpl_sh_ prefix', () => {
      const id1 = generateShareId();
      const id2 = generateShareId();
      expect(id1).toMatch(/^cpl_sh_[0-9A-Za-z]{8}$/);
      expect(id2).toMatch(/^cpl_sh_[0-9A-Za-z]{8}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createSharePayload', () => {
    it('creates payload with correct score and findings count', () => {
      const result = makeScanResult();
      const payload = createSharePayload(result, ENGINE_VERSION);

      expect(payload.score).toBe(72);
      expect(payload.findingsCount.high).toBe(2);
      expect(payload.findingsCount.medium).toBe(1);
      expect(payload.findingsCount.critical).toBe(0);
      expect(payload.findingsCount.low).toBe(0);
      expect(payload.jurisdiction).toBe('EU AI Act');
      expect(payload.scanType).toBe('code');
      expect(payload.compliorVersion).toBe(ENGINE_VERSION);
    });

    it('returns top 5 findings sorted by severity (no file paths)', () => {
      const result = makeScanResult();
      const payload = createSharePayload(result, ENGINE_VERSION);

      expect(payload.topFindings.length).toBe(3); // only 3 fail findings
      expect(payload.topFindings[0].severity).toBe('high');
      expect(payload.topFindings[0].obligationId).toBe('OBL-015');
      // Verify no file paths leak
      for (const f of payload.topFindings) {
        expect(f).not.toHaveProperty('file');
        expect(f).not.toHaveProperty('line');
      }
    });

    it('sets expiration based on options', () => {
      const result = makeScanResult();
      const payload = createSharePayload(result, ENGINE_VERSION, { expirationDays: 90 });

      const created = new Date(payload.createdAt);
      const expires = new Date(payload.expiresAt);
      const diffDays = (expires.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(90);
    });

    it('respects custom jurisdiction and scanType', () => {
      const result = makeScanResult();
      const payload = createSharePayload(result, ENGINE_VERSION, {
        jurisdiction: 'UK AI Framework',
        scanType: 'external',
      });

      expect(payload.jurisdiction).toBe('UK AI Framework');
      expect(payload.scanType).toBe('external');
    });
  });
});
