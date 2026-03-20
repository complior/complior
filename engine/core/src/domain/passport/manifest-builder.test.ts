import { describe, it, expect } from 'vitest';
import {
  buildPassport,
  ALL_PASSPORT_FIELDS,
  resolveRiskClass,
  getApplicableArticles,
  inferDataResidency,
  computeNextReview,
  buildOversight,
  computeDeployerObligations,
} from './manifest-builder.js';
import type { PassportBuildInput } from './manifest-builder.js';
import type { ScanResult } from '../../types/common.types.js';

// --- Standard test input ---

const testInput: PassportBuildInput = {
  agent: {
    name: 'test-agent',
    entryFile: 'src/index.ts',
    framework: 'OpenAI',
    language: 'typescript',
    detectedSdks: ['openai'],
    detectedModels: ['gpt-4'],
    confidence: 0.9,
    sourceFiles: ['src/index.ts'],
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
    killSwitchPresent: false,
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

describe('buildPassport', () => {
  it('generates valid manifest with all sections', () => {
    const manifest = buildPassport(testInput);

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
    const manifest = buildPassport(testInput);

    expect(manifest.agent_id).toMatch(/^ag_/);
  });

  it('infers risk class from autonomy level (no profile)', () => {
    // L1 → minimal
    const l1 = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L1' },
    });
    expect(l1.compliance.eu_ai_act.risk_class).toBe('minimal');

    // L3 → limited
    const l3 = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L3' },
    });
    expect(l3.compliance.eu_ai_act.risk_class).toBe('limited');

    // L5 → high
    const l5 = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L5' },
    });
    expect(l5.compliance.eu_ai_act.risk_class).toBe('high');
  });

  it('resolves risk class to HIGHER of autonomy and profile', () => {
    // Profile says high (hr domain), autonomy L3 → limited. Result: high
    const manifest = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L3' },
      projectProfile: { domain: 'hr', dataTypes: ['personal'], systemType: 'feature', riskLevel: 'high' },
    });
    expect(manifest.compliance.eu_ai_act.risk_class).toBe('high');
  });

  it('uses dynamic applicable articles based on risk class', () => {
    const limited = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L3' },
    });
    expect(limited.compliance.eu_ai_act.applicable_articles).toEqual(['Art.50', 'Art.52']);

    const high = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L5' },
    });
    expect(high.compliance.eu_ai_act.applicable_articles).toContain('Art.26');
    expect(high.compliance.eu_ai_act.applicable_articles).toContain('Art.14');
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

    const manifest = buildPassport({ ...testInput, scanResult });

    expect(manifest.compliance.complior_score).toBe(72);
  });

  it('defaults to zero score without scan result', () => {
    const manifest = buildPassport({ ...testInput, scanResult: undefined });

    expect(manifest.compliance.complior_score).toBe(0);
  });

  it('applies overrides', () => {
    const manifest = buildPassport({
      ...testInput,
      overrides: { name: 'custom-name' },
    });

    expect(manifest.name).toBe('custom-name');
  });

  it('calculates source confidence', () => {
    const manifest = buildPassport(testInput);

    expect(manifest.source.confidence).toBeGreaterThan(0);
    expect(manifest.source.confidence).toBeLessThanOrEqual(1);
    expect(manifest.source.fields_auto_filled.length).toBeGreaterThan(0);
    expect(manifest.source.fields_manual.length).toBeGreaterThan(0);
    expect(manifest.source.confidence).toBe(
      manifest.source.fields_auto_filled.length / ALL_PASSPORT_FIELDS.length,
    );
  });

  it('auto-fills data_boundaries.pii_handling to redact', () => {
    const manifest = buildPassport(testInput);

    expect(manifest.permissions.data_boundaries).toBeDefined();
    expect(manifest.permissions.data_boundaries!.pii_handling).toBe('redact');
  });

  it('auto-fills escalation_rules from humanApprovalRequired', () => {
    const manifest = buildPassport(testInput);

    expect(manifest.constraints.escalation_rules).toBeDefined();
    expect(manifest.constraints.escalation_rules).toHaveLength(1);
    expect(manifest.constraints.escalation_rules![0].condition).toBe('action == "delete_account"');
    expect(manifest.constraints.escalation_rules![0].action).toBe('require_approval');
    expect(manifest.constraints.escalation_rules![0].timeout_minutes).toBe(5);
  });

  it('sets escalation_rules to undefined when no human approvals', () => {
    const manifest = buildPassport({
      ...testInput,
      permissions: { ...testInput.permissions, humanApprovalRequired: [] },
    });

    expect(manifest.constraints.escalation_rules).toBeUndefined();
  });

  it('persists source_files from discovered agent', () => {
    const manifest = buildPassport(testInput);

    expect(manifest.source_files).toEqual(['src/index.ts']);
  });

  it('persists multiple source_files', () => {
    const manifest = buildPassport({
      ...testInput,
      agent: { ...testInput.agent, sourceFiles: ['src/index.ts', 'src/handler.ts', 'lib/utils.ts'] },
    });

    expect(manifest.source_files).toEqual(['src/index.ts', 'src/handler.ts', 'lib/utils.ts']);
  });

  it('generates contextual description instead of generic', () => {
    const manifest = buildPassport(testInput);

    expect(manifest.description).not.toBe('AI agent using OpenAI');
    expect(manifest.description).toContain('L3');
    expect(manifest.description).toContain('gpt-4');
  });

  it('sets next_review to 90 days from now', () => {
    const manifest = buildPassport(testInput);

    expect(manifest.lifecycle.next_review).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const reviewDate = new Date(manifest.lifecycle.next_review);
    const now = new Date();
    const diffDays = (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(85);
    expect(diffDays).toBeLessThan(95);
  });

  it('generates oversight block for high-risk systems', () => {
    const manifest = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L5' },
    });

    expect(manifest.oversight).toBeDefined();
    expect(manifest.oversight!.override_mechanism).toContain('no kill switch');
  });

  it('generates oversight with kill-switch info when present', () => {
    const manifest = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L5', killSwitchPresent: true },
    });

    expect(manifest.oversight).toBeDefined();
    expect(manifest.oversight!.override_mechanism).toContain('Kill switch detected');
  });

  it('no oversight for minimal-risk L1 systems', () => {
    const manifest = buildPassport({
      ...testInput,
      autonomy: { ...testInput.autonomy, level: 'L1', agentType: 'assistive' },
    });

    expect(manifest.oversight).toBeUndefined();
  });

  it('infers data residency from profile', () => {
    const manifest = buildPassport({
      ...testInput,
      projectProfile: { domain: 'general', dataTypes: ['public'], systemType: 'feature', riskLevel: 'limited', dataStorage: 'eu' },
    });

    expect(manifest.model.data_residency).toBe('eu');
  });

  it('infers data residency from provider when no profile', () => {
    const manifest = buildPassport(testInput);
    // openai SDK detected → provider is openai → 'us'
    expect(manifest.model.data_residency).toBe('us');
  });

  it('populates deployer_obligations_met and pending', () => {
    const manifest = buildPassport(testInput);

    const met = manifest.compliance.eu_ai_act.deployer_obligations_met;
    const pending = manifest.compliance.eu_ai_act.deployer_obligations_pending;
    expect(met.length + pending.length).toBeGreaterThan(0);
    // Owner fields are empty → at least OBL-012 should be pending
    expect(pending).toContain('OBL-012');
  });

  it('preserves existing passport dates on force rebuild', () => {
    const manifest = buildPassport({
      ...testInput,
      existingPassport: { created: '2026-01-01T00:00:00.000Z', deployed_since: '2026-02-01' },
    });

    expect(manifest.created).toBe('2026-01-01T00:00:00.000Z');
    expect(manifest.lifecycle.deployed_since).toBe('2026-02-01');
  });
});

// --- Unit tests for exported helpers ---

describe('resolveRiskClass', () => {
  it('returns autonomy-based risk when no profile', () => {
    expect(resolveRiskClass('L1')).toBe('minimal');
    expect(resolveRiskClass('L3')).toBe('limited');
    expect(resolveRiskClass('L5')).toBe('high');
  });

  it('takes the HIGHER of autonomy and profile risk', () => {
    expect(resolveRiskClass('L1', 'high')).toBe('high');
    expect(resolveRiskClass('L5', 'minimal')).toBe('high');
    expect(resolveRiskClass('L3', 'high')).toBe('high');
  });

  it('normalizes unacceptable to prohibited', () => {
    expect(resolveRiskClass('L1', 'unacceptable')).toBe('prohibited');
  });
});

describe('getApplicableArticles', () => {
  it('returns Art.5 for prohibited', () => {
    expect(getApplicableArticles('prohibited')).toEqual(['Art.5']);
  });

  it('returns comprehensive list for high', () => {
    const articles = getApplicableArticles('high');
    expect(articles).toContain('Art.26');
    expect(articles).toContain('Art.14');
    expect(articles.length).toBe(10);
  });

  it('returns Art.50/52 for limited', () => {
    expect(getApplicableArticles('limited')).toEqual(['Art.50', 'Art.52']);
  });

  it('returns Art.50 for minimal', () => {
    expect(getApplicableArticles('minimal')).toEqual(['Art.50']);
  });
});

describe('inferDataResidency', () => {
  it('uses profile storage when available', () => {
    expect(inferDataResidency('eu')).toBe('eu');
    expect(inferDataResidency('us')).toBe('us');
    expect(inferDataResidency('mixed')).toBe('global');
  });

  it('falls back to provider', () => {
    expect(inferDataResidency(undefined, 'openai')).toBe('us');
    expect(inferDataResidency(undefined, 'anthropic')).toBe('us');
    expect(inferDataResidency(undefined, 'google')).toBe('us');
  });

  it('returns unknown when nothing available', () => {
    expect(inferDataResidency()).toBe('unknown');
    expect(inferDataResidency(undefined, 'custom-provider')).toBe('unknown');
  });
});

describe('computeNextReview', () => {
  it('adds days to ISO date', () => {
    expect(computeNextReview('2026-01-01T00:00:00.000Z', 90)).toBe('2026-04-01');
  });

  it('handles month boundaries', () => {
    expect(computeNextReview('2026-11-15T00:00:00.000Z', 90)).toBe('2027-02-13');
  });
});

describe('buildOversight', () => {
  const owner = { team: 'eng', contact: 'eng@co.com', responsible_person: 'Jane' };

  it('returns oversight for high-risk', () => {
    const result = buildOversight('high', 'L1', owner, false);
    expect(result).toBeDefined();
    expect(result!.responsible_person).toBe('Jane');
  });

  it('returns oversight for L3+ even if limited risk', () => {
    const result = buildOversight('limited', 'L3', owner, true);
    expect(result).toBeDefined();
    expect(result!.override_mechanism).toContain('Kill switch detected');
  });

  it('returns undefined for minimal L1/L2', () => {
    expect(buildOversight('minimal', 'L1', owner, false)).toBeUndefined();
    expect(buildOversight('minimal', 'L2', owner, false)).toBeUndefined();
    expect(buildOversight('limited', 'L2', owner, false)).toBeUndefined();
  });

  it('uses contact as fallback for responsible_person', () => {
    const ownerNoRP = { team: '', contact: 'fallback@co.com', responsible_person: '' };
    const result = buildOversight('high', 'L1', ownerNoRP, false);
    expect(result!.responsible_person).toBe('fallback@co.com');
  });
});

describe('computeDeployerObligations', () => {
  it('groups obligations by ID and classifies met/pending', () => {
    const manifest = {
      agent_id: 'ag_123',
      name: 'bot',
      display_name: 'Bot',
      description: 'desc',
      version: '1.0.0',
      type: 'assistive',
      autonomy_level: 'L1',
      autonomy_evidence: { human_approval_gates: 0, unsupervised_actions: 0, no_logging_actions: 0, auto_rated: true },
      model: { provider: 'openai', model_id: 'gpt-4', data_residency: 'us' },
      owner: { team: 'eng', contact: 'eng@co.com', responsible_person: 'Jane' },
      permissions: { tools: ['search'], denied: [] },
      constraints: { human_approval_required: [], prohibited_actions: [] },
      compliance: { eu_ai_act: { risk_class: 'limited' }, complior_score: 80, last_scan: '2026-03-01' },
      disclosure: { user_facing: true, disclosure_text: 'AI system', ai_marking: { responses_marked: true, method: 'badge' } },
      logging: { actions_logged: true, retention_days: 180 },
      lifecycle: { status: 'active', next_review: '2026-06-01' },
    };

    const { met, pending } = computeDeployerObligations(manifest);
    expect(met.length).toBeGreaterThan(0);
    // All fields filled → most obligations should be met
    expect(met.length).toBeGreaterThan(pending.length);
  });

  it('reports pending when required fields are missing', () => {
    const minimal = { name: 'bot' };
    const { pending } = computeDeployerObligations(minimal);
    expect(pending.length).toBeGreaterThan(0);
  });
});
