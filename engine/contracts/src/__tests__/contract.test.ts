/**
 * Contract tests for @complior/contracts sync schemas.
 *
 * These tests ARE the contract between complior CLI and PROJECT SaaS.
 * If a test fails, the sync API is broken.
 *
 * Tests validate:
 * 1. Fixtures pass schema validation (canonical payloads)
 * 2. Invalid payloads are rejected (missing required, wrong enum, bad types)
 * 3. Type inference produces expected shapes
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SyncPassportSchema,
  SyncScanSchema,
  SyncDocumentsSchema,
  SyncFriaSchema,
  SyncFindingSchema,
  SyncToolDetectedSchema,
} from '../sync/index.js';

import { RISK_LEVELS, AUTONOMY_LEVELS, SEVERITIES, LIFECYCLE_STATUSES } from '../shared/enums.js';

// ─── Fixture loading ───────────────��────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '..', '..', 'fixtures');

const loadFixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf-8'));

// ─── SyncPassportSchema ───────────���─────────────────────────────────

describe('SyncPassportSchema', () => {
  it('validates full passport fixture (all 36 fields)', () => {
    const fixture = loadFixture('sync-passport-full.json');
    const result = SyncPassportSchema.safeParse(fixture);
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
      // Verify multiFramework preserved
      expect(result.data.multiFramework).toHaveLength(2);
      // Verify signature preserved
      expect(result.data.signature?.algorithm).toBe('ed25519');
    }
  });

  it('validates minimal passport fixture (name only)', () => {
    const fixture = loadFixture('sync-passport-minimal.json');
    const result = SyncPassportSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('test-agent');
    }
  });

  it('rejects empty name', () => {
    const result = SyncPassportSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = SyncPassportSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid riskLevel enum', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', riskLevel: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid autonomyLevel enum', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', autonomyLevel: 'L9' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid lifecycleStatus enum', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', lifecycleStatus: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects score out of range (> 100)', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', compliorScore: 150 });
    expect(result.success).toBe(false);
  });

  it('rejects score out of range (< 0)', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x', compliorScore: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding max length', () => {
    const result = SyncPassportSchema.safeParse({ name: 'x'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('accepts all valid riskLevel values', () => {
    for (const level of RISK_LEVELS) {
      const result = SyncPassportSchema.safeParse({ name: 'x', riskLevel: level });
      expect(result.success, `riskLevel "${level}" should be valid`).toBe(true);
    }
  });

  it('accepts all valid autonomyLevel values', () => {
    for (const level of AUTONOMY_LEVELS) {
      const result = SyncPassportSchema.safeParse({ name: 'x', autonomyLevel: level });
      expect(result.success, `autonomyLevel "${level}" should be valid`).toBe(true);
    }
  });

  it('accepts all valid lifecycleStatus values', () => {
    for (const status of LIFECYCLE_STATUSES) {
      const result = SyncPassportSchema.safeParse({ name: 'x', lifecycleStatus: status });
      expect(result.success, `lifecycleStatus "${status}" should be valid`).toBe(true);
    }
  });
});

// ─── SyncScanSchema ──────────────────��──────────────────────────────

describe('SyncScanSchema', () => {
  it('validates scan fixture', () => {
    const fixture = loadFixture('sync-scan-valid.json');
    const result = SyncScanSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.findings).toHaveLength(2);
      expect(result.data.findings[1].agentId).toBe('bot-1');
      expect(result.data.findings[1].l5Analyzed).toBe(true);
      expect(result.data.securityScore).toBe(85);
      expect(result.data.tier).toBe(2);
    }
  });

  it('rejects empty toolsDetected array', () => {
    const result = SyncScanSchema.safeParse({
      projectPath: '/path', findings: [], toolsDetected: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing projectPath', () => {
    const result = SyncScanSchema.safeParse({
      findings: [], toolsDetected: [{ name: 'test' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid finding severity', () => {
    const result = SyncScanSchema.safeParse({
      projectPath: '/path',
      findings: [{ severity: 'extreme', message: 'test' }],
      toolsDetected: [{ name: 'test' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid severity values in findings', () => {
    for (const sev of SEVERITIES) {
      const result = SyncFindingSchema.safeParse({ severity: sev, message: 'test' });
      expect(result.success, `severity "${sev}" should be valid`).toBe(true);
    }
  });
});

// ─── SyncDocumentsSchema ────────────────────────────────────────────

describe('SyncDocumentsSchema', () => {
  it('validates documents fixture', () => {
    const fixture = loadFixture('sync-documents-valid.json');
    const result = SyncDocumentsSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documents).toHaveLength(2);
      expect(result.data.documents[0].type).toBe('fria');
      expect(result.data.documents[1].toolSlug).toBe('acme-support-bot');
    }
  });

  it('rejects empty documents array', () => {
    const result = SyncDocumentsSchema.safeParse({ documents: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid document type', () => {
    const result = SyncDocumentsSchema.safeParse({
      documents: [{ type: 'invalid_type', title: 'X', content: 'Y' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects document with empty title', () => {
    const result = SyncDocumentsSchema.safeParse({
      documents: [{ type: 'fria', title: '', content: 'some content' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects document with empty content', () => {
    const result = SyncDocumentsSchema.safeParse({
      documents: [{ type: 'fria', title: 'Title', content: '' }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── SyncFriaSchema ─────────────────────────────────────────────────

describe('SyncFriaSchema', () => {
  it('validates FRIA fixture (all 6 sections)', () => {
    const fixture = loadFixture('sync-fria-valid.json');
    const result = SyncFriaSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toolSlug).toBe('acme-support-bot');
      expect(result.data.assessmentId).toBe('FRIA-2026-001');
      expect(result.data.sections.general_info.toolName).toBe('ACME Support Bot');
      expect(result.data.sections.affected_persons.categories).toHaveLength(2);
      expect(result.data.sections.specific_risks.risks).toHaveLength(1);
      expect(result.data.sections.human_oversight.hasHumanOversight).toBe(true);
      expect(result.data.sections.mitigation_measures.measures).toHaveLength(1);
      expect(result.data.sections.monitoring_plan.metrics).toHaveLength(3);
    }
  });

  it('rejects missing toolSlug', () => {
    const result = SyncFriaSchema.safeParse({
      assessmentId: 'F-1', date: '2026-01-01',
      sections: {
        general_info: {}, affected_persons: {},
        specific_risks: {}, human_oversight: {},
        mitigation_measures: {}, monitoring_plan: {},
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing sections', () => {
    const result = SyncFriaSchema.safeParse({
      toolSlug: 'test', assessmentId: 'F-1', date: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('applies defaults for empty section objects', () => {
    const result = SyncFriaSchema.safeParse({
      toolSlug: 'test', assessmentId: 'F-1', date: '2026-01-01',
      sections: {
        general_info: {},
        affected_persons: {},
        specific_risks: {},
        human_oversight: {},
        mitigation_measures: {},
        monitoring_plan: {},
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Defaults applied
      expect(result.data.sections.general_info.toolName).toBe('');
      expect(result.data.sections.affected_persons.categories).toEqual([]);
      expect(result.data.sections.affected_persons.vulnerableGroups).toBe(false);
      expect(result.data.sections.specific_risks.risks).toEqual([]);
      expect(result.data.sections.human_oversight.hasHumanOversight).toBe(true);
      expect(result.data.sections.mitigation_measures.measures).toEqual([]);
      expect(result.data.sections.monitoring_plan.metrics).toEqual([]);
    }
  });
});

// ��── Sub-schema unit tests ────────���─────────────────────────────────

describe('SyncToolDetectedSchema', () => {
  it('accepts valid tool', () => {
    const result = SyncToolDetectedSchema.safeParse({ name: 'openai', version: '1.0.0' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = SyncToolDetectedSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
