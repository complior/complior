import { describe, it, expect } from 'vitest';
import { validatePassport, computeCompleteness } from './passport-validator.js';
import { buildPassport } from './builder/manifest-builder.js';
import type { PassportBuildInput } from './builder/manifest-builder.js';
import { generateKeyPair, signPassport } from './crypto-signer.js';
import type { AgentPassport } from '../../types/passport.types.js';

// --- Helpers ---

const createTestInput = (): PassportBuildInput => ({
  agent: {
    name: 'validator-test-agent',
    entryFile: 'src/index.ts',
    framework: 'OpenAI',
    language: 'typescript',
    detectedSdks: ['openai'],
    detectedModels: ['gpt-4'],
    confidence: 0.9,
    sourceFiles: ['src/index.ts'],
  },
  autonomy: {
    level: 'L2',
    evidence: {
      human_approval_gates: 3,
      unsupervised_actions: 0,
      no_logging_actions: 0,
      auto_rated: true,
    },
    agentType: 'assistive',
  },
  permissions: {
    tools: ['read-file', 'search'],
    dataAccess: { read: ['docs'], write: [], delete: [] },
    denied: ['exec'],
    mcpServers: [],
    humanApprovalRequired: ['deploy'],
  },
});

const buildSignedManifest = (
  input?: PassportBuildInput,
): AgentPassport => {
  const unsigned = buildPassport(input ?? createTestInput());
  const { privateKey } = generateKeyPair();
  const signature = signPassport(unsigned, privateKey);
  return { ...unsigned, signature };
};

// --- Tests ---

describe('validatePassport', () => {
  it('valid manifest passes all checks', () => {
    const manifest = buildSignedManifest();
    const result = validatePassport(manifest);

    expect(result.schemaValid).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects tampered manifest (invalid signature)', () => {
    const manifest = buildSignedManifest();
    const tampered: AgentPassport = {
      ...manifest,
      agent_id: 'ag_tampered',
    };

    const result = validatePassport(tampered);

    expect(result.signatureValid).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'signature')).toBe(true);
  });

  it('detects invalid schema', () => {
    const manifest = buildSignedManifest();
    // Break the schema by removing a required field
    const broken = { ...manifest } as Record<string, unknown>;
    delete broken.name;

    const result = validatePassport(broken as unknown as AgentPassport);

    expect(result.schemaValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('warns about draft lifecycle status', () => {
    const manifest = buildSignedManifest();

    const result = validatePassport(manifest);

    // manifest-builder sets lifecycle.status to 'draft' by default
    expect(result.warnings).toContain('Passport is still in draft status');
  });

  it('warns about low completeness score', () => {
    const manifest = buildSignedManifest();
    const result = validatePassport(manifest);

    // If completeness is below 80%, a warning should appear
    if (result.completeness.score < 80) {
      expect(
        result.warnings.some((w) => w.includes('below 80%')),
      ).toBe(true);
    }
  });

  it('completeness result includes missing fields', () => {
    const manifest = buildSignedManifest();
    const result = validatePassport(manifest);

    expect(result.completeness.totalRequired).toBeGreaterThan(0);
    expect(result.completeness.filledCount).toBeLessThanOrEqual(
      result.completeness.totalRequired,
    );
    expect(result.completeness.score).toBeGreaterThanOrEqual(0);
    expect(result.completeness.score).toBeLessThanOrEqual(100);
  });
});

describe('computeCompleteness', () => {
  it('scores a fully-populated manifest', () => {
    const manifest = buildSignedManifest();
    const result = computeCompleteness(manifest);

    expect(result.score).toBeGreaterThan(0);
    expect(result.filledCount).toBeGreaterThan(0);
    expect(result.totalRequired).toBeGreaterThan(0);
    expect(result.filledFields.length).toBe(result.filledCount);
    expect(result.missingFields.length).toBe(
      result.totalRequired - result.filledCount,
    );
  });

  it('missing fields reference obligations', () => {
    const manifest = buildSignedManifest();
    const result = computeCompleteness(manifest);

    for (const field of result.missingFields) {
      expect(field.obligation).toMatch(/^OBL-/);
      expect(field.article).toMatch(/^Art\./);
      expect(field.description).toBeTruthy();
    }
  });

  it('score equals filledCount / totalRequired * 100', () => {
    const manifest = buildSignedManifest();
    const result = computeCompleteness(manifest);

    const expected = Math.round(
      (result.filledCount / result.totalRequired) * 100,
    );
    expect(result.score).toBe(expected);
  });
});
