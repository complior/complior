import { describe, it, expect } from 'vitest';
import { generateKeyPair, signManifest, verifyManifest } from './crypto-signer.js';
import { buildManifest } from './manifest-builder.js';
import type { ManifestBuildInput } from './manifest-builder.js';
import type { AgentManifest } from '../../types/passport.types.js';

// --- Helpers ---

const testInput: ManifestBuildInput = {
  agent: {
    name: 'crypto-test-agent',
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
    tools: ['search'],
    dataAccess: { read: ['users'], write: [], delete: [] },
    denied: [],
    mcpServers: [],
    humanApprovalRequired: [],
  },
  scanResult: undefined,
};

// --- Tests ---

describe('crypto-signer', () => {
  it('generates valid ed25519 key pair', () => {
    const { publicKey, privateKey } = generateKeyPair();

    expect(publicKey).toContain('BEGIN PUBLIC KEY');
    expect(publicKey).toContain('END PUBLIC KEY');
    expect(privateKey).toContain('BEGIN PRIVATE KEY');
    expect(privateKey).toContain('END PRIVATE KEY');
  });

  it('sign and verify roundtrip', () => {
    const { publicKey: _pub, privateKey } = generateKeyPair();
    const unsignedManifest = buildManifest(testInput);

    const signature = signManifest(unsignedManifest, privateKey);

    const signedManifest: AgentManifest = {
      ...unsignedManifest,
      signature,
    };

    expect(verifyManifest(signedManifest)).toBe(true);
  });

  it('detects tampered manifest', () => {
    const { publicKey: _pub, privateKey } = generateKeyPair();
    const unsignedManifest = buildManifest(testInput);

    const signature = signManifest(unsignedManifest, privateKey);

    // Tamper with the agent_id after signing
    const tamperedManifest: AgentManifest = {
      ...unsignedManifest,
      agent_id: 'ag_tampered-id',
      signature,
    };

    expect(verifyManifest(tamperedManifest)).toBe(false);
  });

  it('signature contains valid algorithm and hash', () => {
    const { publicKey: _pub, privateKey } = generateKeyPair();
    const unsignedManifest = buildManifest(testInput);

    const signature = signManifest(unsignedManifest, privateKey);

    expect(signature.algorithm).toBe('ed25519');
    expect(signature.hash).toMatch(/^sha256:[0-9a-f]+$/);
    // value is base64 encoded
    expect(signature.value).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});
