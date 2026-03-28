import { describe, it, expect } from 'vitest';
import { runLayer3, layer3ToCheckResults } from './layer3-config.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

describe('runLayer3', () => {
  it('detects AI SDK in package.json (npm project)', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', JSON.stringify({
        dependencies: {
          'openai': '^4.56.0',
          'express': '^4.18.0',
        },
      })),
    ]);

    const results = runLayer3(ctx);
    const sdkFindings = results.filter((r) => r.type === 'ai-sdk-detected');

    expect(sdkFindings.length).toBeGreaterThan(0);
    expect(sdkFindings.some((r) => r.message.includes('OpenAI'))).toBe(true);
  });

  it('detects prohibited package in requirements.txt (pip project)', () => {
    const ctx = createScanCtx([
      createScanFile('requirements.txt', `anthropic>=0.7.0
deepface==1.0.2
flask>=2.0.0
`),
    ]);

    const results = runLayer3(ctx);
    const banned = results.filter((r) => r.type === 'banned-package');
    const sdks = results.filter((r) => r.type === 'ai-sdk-detected');

    expect(banned).toHaveLength(1);
    expect(banned[0].status).toBe('PROHIBITED');
    expect(banned[0].packageName).toBe('deepface');
    expect(banned[0].article).toBe('Art. 5(1)(f)');
    expect(banned[0].message).toContain('Art. 5 REVIEW:');
    expect(banned[0].message).toContain('Verify:');
    expect(banned[0].bannedPackage).toBeDefined();
    expect(banned[0].bannedPackage?.prohibitedWhen).toContain('workplace or educational');

    expect(sdks.some((r) => r.message.includes('Anthropic'))).toBe(true);
  });

  it('detects AI SDK in go.mod (Go project)', () => {
    const ctx = createScanCtx([
      createScanFile('go.mod', `module myapp

go 1.21

require (
	github.com/sashabaranov/go-openai v1.20.0
	github.com/gin-gonic/gin v1.9.1
)
`),
    ]);

    const results = runLayer3(ctx);
    const sdkFindings = results.filter((r) => r.type === 'ai-sdk-detected');

    expect(sdkFindings).toHaveLength(1);
    expect(sdkFindings[0].message).toContain('OpenAI');
  });

  it('aggregates mixed dependencies (npm + pip + .env)', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', JSON.stringify({
        dependencies: { 'openai': '^4.0.0' },
      })),
      createScanFile('requirements.txt', 'anthropic>=0.7.0\n'),
      createScanFile('.env', 'OPENAI_API_KEY=sk-xxx\nLOG_LEVEL=info\nSENTRY_DSN=https://xxx\n'),
    ]);

    const results = runLayer3(ctx);
    const sdkFindings = results.filter((r) => r.type === 'ai-sdk-detected');
    const envFindings = results.filter((r) => r.type === 'env-config');

    // At least 2 AI SDKs (openai from npm, anthropic from pip)
    expect(sdkFindings.length).toBeGreaterThanOrEqual(2);

    // .env has API key, LOG_LEVEL, and SENTRY_DSN — all OK
    const okEnvs = envFindings.filter((r) => r.status === 'OK');
    expect(okEnvs.length).toBeGreaterThan(0);
  });

  it('detects log retention in docker-compose.override.yml', () => {
    const ctx = createScanCtx([
      createScanFile('docker-compose.override.yml', `services:
  app:
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "60"
`),
    ]);

    const results = runLayer3(ctx);
    const retention = results.filter((r) => r.type === 'log-retention');

    expect(retention).toHaveLength(1);
    expect(retention[0].status).toBe('OK');
  });

  it('skips bias-testing warning when bias-testing config file present', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', JSON.stringify({
        dependencies: { 'openai': '^4.56.0' },
      })),
      createScanFile('bias-testing.config.json', '{ "enabled": true }'),
    ]);

    const results = runLayer3(ctx);
    const biasFindings = results.filter((r) => r.type === 'missing-bias-testing');

    expect(biasFindings).toHaveLength(0);
  });

  it('returns no AI SDK findings for non-AI project', () => {
    const ctx = createScanCtx([
      createScanFile('package.json', JSON.stringify({
        dependencies: {
          'express': '^4.18.0',
          'react': '^18.2.0',
          'lodash': '^4.17.0',
        },
      })),
    ]);

    const results = runLayer3(ctx);
    const sdkFindings = results.filter((r) => r.type === 'ai-sdk-detected');
    const bannedFindings = results.filter((r) => r.type === 'banned-package');

    expect(sdkFindings).toHaveLength(0);
    expect(bannedFindings).toHaveLength(0);
  });
});

describe('layer3ToCheckResults', () => {
  it('converts PROHIBITED finding to critical fail with contextual fix', () => {
    const results = layer3ToCheckResults([{
      type: 'banned-package',
      status: 'PROHIBITED',
      message: 'Art. 5 REVIEW: "deepface" detected — Emotion recognition. Prohibited under Art. 5(1)(f) when: Infers emotions in workplace or educational settings, except for medical or safety purposes. Verify: Is this used to detect emotions of employees or students? (Medical/safety use is exempt)',
      obligationId: 'eu-ai-act-OBL-002',
      article: 'Art. 5(1)(f)',
      packageName: 'deepface',
      ecosystem: 'pip',
      penalty: '€35M or 7% turnover',
      bannedPackage: {
        name: 'deepface',
        ecosystem: 'pip',
        reason: 'Emotion recognition',
        obligationId: 'eu-ai-act-OBL-002',
        article: 'Art. 5(1)(f)',
        penalty: '€35M or 7% turnover',
        prohibitedWhen: 'Infers emotions in workplace or educational settings, except for medical or safety purposes',
        verifyMessage: 'Is this used to detect emotions of employees or students? (Medical/safety use is exempt)',
      },
    }]);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('critical');
      expect(results[0].message).toContain('Art. 5 REVIEW:');
      expect(results[0].message).toContain('Verify:');
      expect(results[0].fix).toContain('Verify your use case');
      expect(results[0].fix).toContain('Document your use case to confirm compliance');
    }
  });

  it('converts OK finding to pass', () => {
    const results = layer3ToCheckResults([{
      type: 'ai-sdk-detected',
      status: 'OK',
      message: 'AI SDK detected: OpenAI (openai@4.56.0) in npm',
      packageName: 'openai',
      ecosystem: 'npm',
    }]);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });
});
