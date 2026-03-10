import { describe, it, expect } from 'vitest';
import {
  OBLIGATION_FIELD_MAP,
  getFieldValue,
  getRequiredFields,
  getMissingFields,
} from './obligation-field-map.js';
import type { AgentPassport } from '../../types/passport.types.js';
import { buildPassport } from './manifest-builder.js';
import type { PassportBuildInput } from './manifest-builder.js';
import { generateKeyPair, signPassport } from './crypto-signer.js';

// --- Helper: create a fully signed manifest ---

const buildTestManifest = (): AgentPassport => {
  const input: PassportBuildInput = {
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
    },
    permissions: {
      tools: ['search'],
      dataAccess: { read: ['users'], write: [], delete: [] },
      denied: [],
      mcpServers: [],
      humanApprovalRequired: ['deploy'],
    },
  };

  const unsigned = buildPassport(input);
  const { privateKey } = generateKeyPair();
  const signature = signPassport(unsigned, privateKey);
  return { ...unsigned, signature };
};

// --- Tests ---

describe('obligation-field-map', () => {
  it('has non-empty map', () => {
    expect(OBLIGATION_FIELD_MAP.length).toBeGreaterThan(20);
  });

  it('all fields have valid obligation format', () => {
    for (const mapping of OBLIGATION_FIELD_MAP) {
      expect(mapping.obligation).toMatch(/^OBL-\d+[A-Z]?$/);
    }
  });

  it('all fields have article reference', () => {
    for (const mapping of OBLIGATION_FIELD_MAP) {
      expect(mapping.article).toMatch(/^Art\.\d+/);
    }
  });

  it('no duplicate fields', () => {
    const fields = OBLIGATION_FIELD_MAP.map((m) => m.field);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it('required fields subset is non-empty', () => {
    const required = getRequiredFields();
    expect(required.length).toBeGreaterThan(10);
    expect(required.every((m) => m.required)).toBe(true);
  });
});

describe('getFieldValue', () => {
  const manifest = buildTestManifest();

  it('accesses top-level fields', () => {
    expect(getFieldValue(manifest, 'name')).toBe('test-agent');
    expect(getFieldValue(manifest, 'agent_id')).toMatch(/^ag_/);
  });

  it('accesses nested fields', () => {
    expect(getFieldValue(manifest, 'owner.team')).toBeDefined();
    expect(getFieldValue(manifest, 'compliance.complior_score')).toBeDefined();
    expect(getFieldValue(manifest, 'model.provider')).toBeDefined();
  });

  it('returns undefined for missing paths', () => {
    expect(getFieldValue(manifest, 'nonexistent.field')).toBeUndefined();
    expect(getFieldValue(manifest, 'owner.nonexistent')).toBeUndefined();
  });
});

describe('getMissingFields', () => {
  it('returns gaps for manifest', () => {
    const manifest = buildTestManifest();
    const missing = getMissingFields(manifest);
    // All missing fields should reference obligations
    for (const m of missing) {
      expect(m.obligation).toMatch(/^OBL-/);
      expect(m.article).toMatch(/^Art\./);
    }
  });
});
