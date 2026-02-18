import { describe, it, expect } from 'vitest';
import { runLayer3, layer3ToCheckResults } from './layer3-config.js';
import type { ScanContext, FileInfo } from '../../../ports/scanner.port.js';

const createFile = (relativePath: string, content: string): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

describe('runLayer3', () => {
  it('detects AI SDK in package.json (npm project)', () => {
    const ctx = createCtx([
      createFile('package.json', JSON.stringify({
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
    const ctx = createCtx([
      createFile('requirements.txt', `anthropic>=0.7.0
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

    expect(sdks.some((r) => r.message.includes('Anthropic'))).toBe(true);
  });

  it('detects AI SDK in go.mod (Go project)', () => {
    const ctx = createCtx([
      createFile('go.mod', `module myapp

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
    const ctx = createCtx([
      createFile('package.json', JSON.stringify({
        dependencies: { 'openai': '^4.0.0' },
      })),
      createFile('requirements.txt', 'anthropic>=0.7.0\n'),
      createFile('.env', 'OPENAI_API_KEY=sk-xxx\nLOG_LEVEL=info\nSENTRY_DSN=https://xxx\n'),
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

  it('returns no AI SDK findings for non-AI project', () => {
    const ctx = createCtx([
      createFile('package.json', JSON.stringify({
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
  it('converts PROHIBITED finding to critical fail', () => {
    const results = layer3ToCheckResults([{
      type: 'banned-package',
      status: 'PROHIBITED',
      message: 'PROHIBITED: "deepface" (Emotion recognition) — Art. 5(1)(f)',
      obligationId: 'eu-ai-act-OBL-002',
      article: 'Art. 5(1)(f)',
      packageName: 'deepface',
      ecosystem: 'pip',
      penalty: '€35M',
    }]);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('critical');
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
