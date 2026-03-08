import { describe, it, expect } from 'vitest';
import { buildManifest, ALL_PASSPORT_FIELDS } from './manifest-builder.js';
import type { ManifestBuildInput } from './manifest-builder.js';
import type { ScanResult } from '../../types/common.types.js';

// --- Standard test input ---

const testInput: ManifestBuildInput = {
  agent: {
    name: 'test-agent',
    entryFile: 'src/index.ts',
    framework: 'OpenAI',
    language: 'typescript',
    detectedSdks: ['openai'],
    detectedModels: ['gpt-4'],
    confidence: 0.9,
  },
  autonomy: {
    level: 'L3',
    evidence: {
      human_approval_gates: 2,
      unsupervised_actions: 1,
      no_logging_actions: 0,
      auto_rated: true,
    },
    agentType: 'hybrid',
  },
  permissions: {
    tools: ['search', 'create_file'],
    dataAccess: { read: ['users'], write: ['orders'], delete: [] },
    denied: [],
    mcpServers: [],
    humanApprovalRequired: ['delete_account'],
  },
  scanResult: undefined,
};

// --- Tests ---

describe('buildManifest', () => {
  it('generates valid manifest with all sections', () => {
    const manifest = buildManifest(testInput);

    expect(manifest).toHaveProperty('$schema');
    expect(manifest).toHaveProperty('manifest_version');
    expect(manifest).toHaveProperty('agent_id');
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('display_name');
    expect(manifest).toHaveProperty('description');
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('created');
    expect(manifest).toHaveProperty('updated');
    expect(manifest).toHaveProperty('owner');
    expect(manifest).toHaveProperty('type');
    expect(manifest).toHaveProperty('autonomy_level');
    expect(manifest).toHaveProperty('autonomy_evidence');
    expect(manifest).toHaveProperty('framework');
    expect(manifest).toHaveProperty('model');
    expect(manifest).toHaveProperty('permissions');
    expect(manifest).toHaveProperty('constraints');
    expect(manifest).toHaveProperty('compliance');
    expect(manifest).toHaveProperty('disclosure');
    expect(manifest).toHaveProperty('logging');
    expect(manifest).toHaveProperty('lifecycle');
    expect(manifest).toHaveProperty('interop');
    expect(manifest).toHaveProperty('source');
  });

  it('generates agent_id with ag_ prefix', () => {
    const manifest = buildManifest(testInput);

    expect(manifest.agent_id).toMatch(/^ag_/);
  });

  it('infers risk class from autonomy level', () => {
    // L1 → minimal
    const l1 = buildManifest({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L1' },
    });
    expect(l1.compliance.eu_ai_act.risk_class).toBe('minimal');

    // L3 → limited
    const l3 = buildManifest({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L3' },
    });
    expect(l3.compliance.eu_ai_act.risk_class).toBe('limited');

    // L5 → high
    const l5 = buildManifest({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L5' },
    });
    expect(l5.compliance.eu_ai_act.risk_class).toBe('high');
  });

  it('uses scan result score if available', () => {
    const scanResult: ScanResult = {
      score: {
        totalScore: 72,
        zone: 'yellow',
        categoryScores: [],
        criticalCapApplied: false,
        totalChecks: 10,
        passedChecks: 7,
        failedChecks: 2,
        skippedChecks: 1,
      },
      findings: [],
      projectPath: '/test',
      scannedAt: '2026-03-01T00:00:00.000Z',
      duration: 100,
      filesScanned: 5,
    };

    const manifest = buildManifest({ ...testInput, scanResult });

    expect(manifest.compliance.complior_score).toBe(72);
  });

  it('defaults to zero score without scan result', () => {
    const manifest = buildManifest({ ...testInput, scanResult: undefined });

    expect(manifest.compliance.complior_score).toBe(0);
  });

  it('applies overrides', () => {
    const manifest = buildManifest({
      ...testInput,
      overrides: { name: 'custom-name' },
    });

    expect(manifest.name).toBe('custom-name');
  });

  it('calculates source confidence', () => {
    const manifest = buildManifest(testInput);

    expect(manifest.source.confidence).toBeGreaterThan(0);
    expect(manifest.source.confidence).toBeLessThanOrEqual(1);
    expect(manifest.source.fields_auto_filled.length).toBeGreaterThan(0);
    expect(manifest.source.fields_manual.length).toBeGreaterThan(0);
    expect(manifest.source.confidence).toBe(
      manifest.source.fields_auto_filled.length / ALL_PASSPORT_FIELDS.length,
    );
  });

  it('auto-fills data_boundaries.pii_handling to redact', () => {
    const manifest = buildManifest(testInput);

    expect(manifest.permissions.data_boundaries).toBeDefined();
    expect(manifest.permissions.data_boundaries!.pii_handling).toBe('redact');
  });

  it('auto-fills escalation_rules from humanApprovalRequired', () => {
    const manifest = buildManifest(testInput);

    expect(manifest.constraints.escalation_rules).toBeDefined();
    expect(manifest.constraints.escalation_rules).toHaveLength(1);
    expect(manifest.constraints.escalation_rules![0].condition).toBe('action == "delete_account"');
    expect(manifest.constraints.escalation_rules![0].action).toBe('require_approval');
    expect(manifest.constraints.escalation_rules![0].timeout_minutes).toBe(5);
  });

  it('sets escalation_rules to undefined when no human approvals', () => {
    const manifest = buildManifest({
      ...testInput,
      permissions: { ...testInput.permissions, humanApprovalRequired: [] },
    });

    expect(manifest.constraints.escalation_rules).toBeUndefined();
  });
});
