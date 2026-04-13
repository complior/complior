/**
 * V1-M09 T-5: Auto-detect GPAI model from project dependencies.
 *
 * RED tests — MUST fail until nodejs-dev extends autoDetect() with gpaiModelDetected field.
 *
 * Spec:
 * - autoDetect() adds gpaiModelDetected: boolean to AutoDetectResult
 * - true if any GPAI-capable SDK found in package.json (openai, @anthropic-ai/sdk, @google/generative-ai, @mistralai/mistralai, cohere-ai)
 * - true if model name patterns found in source files (gpt-4*, claude-*, gemini-*, mistral-*)
 * - false if no GPAI indicators found
 * - Non-GPAI AI libraries (langchain, huggingface, ollama) do NOT trigger gpaiModelDetected
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { autoDetect, type AutoDetectResult } from './auto-detect.js';

/**
 * Creates a temporary project directory with given package.json deps and optional source files.
 */
const createTempProject = async (opts: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  sourceFiles?: Record<string, string>; // relative path → content
}): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'complior-gpai-test-'));
  const pkg = {
    name: 'test-gpai-project',
    version: '1.0.0',
    ...(opts.dependencies ? { dependencies: opts.dependencies } : {}),
    ...(opts.devDependencies ? { devDependencies: opts.devDependencies } : {}),
  };
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  if (opts.sourceFiles) {
    for (const [relPath, content] of Object.entries(opts.sourceFiles)) {
      const fullPath = join(dir, relPath);
      await mkdir(resolve(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content);
    }
  }

  return dir;
};

describe('autoDetect — GPAI model detection (V1-M09 T-5)', () => {
  const tempDirs: string[] = [];

  afterAll(async () => {
    for (const dir of tempDirs) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('detects GPAI from openai dependency', async () => {
    const dir = await createTempProject({
      dependencies: { openai: '^4.0.0', express: '^4.18.0' },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.gpaiModelDetected).toBe(true);
    expect(result.aiLibraries).toContain('OpenAI SDK');
  });

  it('detects GPAI from @anthropic-ai/sdk dependency', async () => {
    const dir = await createTempProject({
      dependencies: { '@anthropic-ai/sdk': '^0.20.0' },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.gpaiModelDetected).toBe(true);
    expect(result.aiLibraries).toContain('Anthropic SDK');
  });

  it('detects GPAI from @google/generative-ai dependency', async () => {
    const dir = await createTempProject({
      dependencies: { '@google/generative-ai': '^0.5.0' },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.gpaiModelDetected).toBe(true);
    expect(result.aiLibraries).toContain('Google GenAI');
  });

  it('detects GPAI from @mistralai/mistralai dependency', async () => {
    const dir = await createTempProject({
      dependencies: { '@mistralai/mistralai': '^1.0.0' },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.gpaiModelDetected).toBe(true);
    expect(result.aiLibraries).toContain('Mistral');
  });

  it('detects GPAI from cohere-ai dependency', async () => {
    const dir = await createTempProject({
      dependencies: { 'cohere-ai': '^7.0.0' },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.gpaiModelDetected).toBe(true);
    expect(result.aiLibraries).toContain('Cohere');
  });

  it('does NOT flag GPAI for non-GPAI AI libraries (langchain, huggingface, ollama)', async () => {
    const dir = await createTempProject({
      dependencies: {
        '@langchain/core': '^0.3.0',
        '@huggingface/inference': '^2.0.0',
        'ollama': '^0.5.0',
      },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    // These are AI libraries but NOT GPAI foundation model providers
    expect(result.aiLibraries.length).toBeGreaterThan(0);
    expect(result.gpaiModelDetected).toBe(false);
  });

  it('detects GPAI from model name patterns in source files', async () => {
    const dir = await createTempProject({
      dependencies: { typescript: '^5.0.0' },
      sourceFiles: {
        'src/chat.ts': `
          import { Configuration, OpenAIApi } from 'openai';
          const model = 'gpt-4o';
          const response = await openai.chat.completions.create({ model });
        `,
      },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.detectedModels).toContain('gpt-4o');
    expect(result.gpaiModelDetected).toBe(true);
  });

  it('detects GPAI from claude model patterns in source files', async () => {
    const dir = await createTempProject({
      dependencies: { typescript: '^5.0.0' },
      sourceFiles: {
        'src/api.ts': `
          const MODEL = 'claude-3-sonnet-20240229';
        `,
      },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.detectedModels).toContain('claude-3-sonnet-20240229');
    expect(result.gpaiModelDetected).toBe(true);
  });

  it('returns gpaiModelDetected=false for project without any AI deps', async () => {
    const dir = await createTempProject({
      dependencies: { express: '^4.18.0', zod: '^3.22.0' },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.gpaiModelDetected).toBe(false);
    expect(result.aiLibraries).toHaveLength(0);
    expect(result.detectedModels).toHaveLength(0);
  });

  it('detects GPAI from devDependencies too', async () => {
    const dir = await createTempProject({
      devDependencies: { openai: '^4.0.0' },
    });
    tempDirs.push(dir);

    const result = await autoDetect(dir);

    expect(result.gpaiModelDetected).toBe(true);
  });
});
