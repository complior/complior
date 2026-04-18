/**
 * Contract tests for Sync API schemas (engine/core side).
 *
 * Validates that:
 * 1. Full AgentPassport can be mapped to SyncPassportPayload without data loss
 * 2. ScanResult can be mapped to SyncScanPayload
 * 3. Schemas accept valid payloads and reject invalid ones
 *
 * These tests use schemas re-exported from @complior/contracts and
 * shared fixtures from @complior/contracts/fixtures.
 * If a test fails, the sync API is broken.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SyncPassportSchema,
  SyncScanSchema,
  SyncDocumentsSchema,
  SyncFriaSchema,
} from './sync.types.js';

// Load shared fixtures from @complior/contracts
const contractsFixtures = resolve(import.meta.dirname, '..', '..', '..', 'contracts', 'fixtures');
const loadFixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(contractsFixtures, name), 'utf-8'));

describe('SyncPassportSchema', () => {
  it('accepts minimal payload (name only)', () => {
    const fixture = loadFixture('sync-passport-minimal.json');
    const result = SyncPassportSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it('accepts full payload with all 36 fields', () => {
    const full = loadFixture('sync-passport-full.json');

    const result = SyncPassportSchema.safeParse(full);
    expect(result.success).toBe(true);
    if (result.success) {
      // Verify no data loss — autonomyEvidence preserved
      expect(result.data.autonomyEvidence?.humanApprovalGates).toBe(2);
      expect(result.data.autonomyEvidence?.unsupervisedActions).toBe(5);
      // Verify dual score preserved
      expect(result.data.compliorScore).toBe(72);
      expect(result.data.projectScore).toBe(68);
      // Verify permissions preserved
      expect(result.data.permissions?.dataBoundaries?.piiHandling).toBe('redact');
      // Verify escalation rules preserved
      expect(result.data.constraints?.escalationRules).toHaveLength(1);
    }
  });

  it('rejects empty name', () => {
    const result = SyncPassportSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid riskLevel', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', riskLevel: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid autonomyLevel', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', autonomyLevel: 'L9' });
    expect(result.success).toBe(false);
  });
});

describe('SyncScanSchema', () => {
  it('accepts valid scan payload', () => {
    const fixture = loadFixture('sync-scan-valid.json');
    const result = SyncScanSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.findings[1].agentId).toBe('bot-1');
      expect(result.data.findings[1].l5Analyzed).toBe(true);
    }
  });

  it('rejects scan without toolsDetected', () => {
    const result = SyncScanSchema.safeParse({
      projectPath: '/path', findings: [], toolsDetected: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('SyncDocumentsSchema', () => {
  it('accepts valid document payload', () => {
    const fixture = loadFixture('sync-documents-valid.json');
    const result = SyncDocumentsSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documents).toHaveLength(2);
    }
  });

  it('rejects empty documents array', () => {
    const result = SyncDocumentsSchema.safeParse({ documents: [] });
    expect(result.success).toBe(false);
  });
});

describe('SyncFriaSchema', () => {
  it('accepts valid FRIA payload', () => {
    const fixture = loadFixture('sync-fria-valid.json');
    const result = SyncFriaSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toolSlug).toBe('acme-support-bot');
      expect(result.data.sections.general_info.toolName).toBe('ACME Support Bot');
    }
  });
});
