import { describe, it, expect } from 'vitest';
import { runLayer4, layer4ToCheckResults } from './layer4-patterns.js';
import type { L3CheckResult } from './layer3-config.js';
import type { ScanContext, FileInfo } from './scanner.types.js';

const createFile = (relativePath: string, content: string, extension?: string): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: extension ?? `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

const withAiSdk: readonly L3CheckResult[] = [{
  type: 'ai-sdk-detected',
  status: 'OK',
  message: 'AI SDK detected: OpenAI',
  packageName: 'openai',
  ecosystem: 'npm',
}];

const noAiSdk: readonly L3CheckResult[] = [];

describe('runLayer4', () => {
  it('detects bare LLM calls and missing disclosure in Next.js project', () => {
    const ctx = createCtx([
      createFile('src/api/chat.ts', `
import OpenAI from 'openai';
const client = new OpenAI();
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);

    const bareLlm = results.filter((r) => r.category === 'bare-llm');
    expect(bareLlm.length).toBeGreaterThan(0);
    expect(bareLlm[0].status).toBe('FOUND');
    expect(bareLlm[0].patternType).toBe('negative');
    expect(bareLlm[0].file).toBe('src/api/chat.ts');
    expect(bareLlm[0].line).toBeGreaterThan(0);

    const disclosure = results.filter((r) => r.category === 'disclosure');
    expect(disclosure.some((r) => r.status === 'NOT_FOUND')).toBe(true);
  });

  it('detects bare LLM calls and logging in Express project', () => {
    const ctx = createCtx([
      createFile('src/api.ts', `
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
const msg = await anthropic.messages.create({
  model: 'claude-3-opus',
  messages: [],
});
`),
      createFile('src/middleware/logger.ts', `
export function logAiCall(req, res, input, output) {
  auditLog({ timestamp: Date.now(), input, output });
}
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);

    const bareLlm = results.filter((r) => r.category === 'bare-llm');
    expect(bareLlm.some((r) => r.status === 'FOUND')).toBe(true);

    const logging = results.filter((r) => r.category === 'logging');
    expect(logging.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('returns no findings when no AI dependencies and no bare calls', () => {
    const ctx = createCtx([
      createFile('src/app.ts', `
function main() {
  console.log('Hello world');
}
`),
      createFile('src/utils.ts', `
export function add(a: number, b: number) {
  return a + b;
}
`),
    ]);

    const results = runLayer4(ctx, noAiSdk);

    // No AI SDK detected and no bare LLM calls → no findings
    expect(results).toHaveLength(0);
  });

  it('scans both .ts and .py files in multi-framework project', () => {
    const ctx = createCtx([
      createFile('frontend/src/chat.tsx', `
const response = await openai.chat.completions.create({ model: 'gpt-4' });
<div className="AIDisclosure">Powered by AI</div>
`),
      createFile('backend/api.py', `
import anthropic
client = anthropic.Anthropic()
message = anthropic.messages.create(model="claude-3")
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);

    // Should find bare LLM calls from both files
    const bareLlm = results.filter((r) => r.category === 'bare-llm');
    expect(bareLlm.length).toBeGreaterThanOrEqual(2);

    // Should find disclosure from tsx
    const disclosure = results.filter((r) => r.category === 'disclosure' && r.status === 'FOUND');
    expect(disclosure).toHaveLength(1);
  });

  it('ignores files in excluded directories', () => {
    const ctx = createCtx([
      createFile('node_modules/openai/index.js', `openai.chat.completions.create()`),
      createFile('dist/api.js', `openai.chat.completions.create()`),
      createFile('.git/hooks/pre-commit', `openai.chat.completions.create()`),
    ]);

    const results = runLayer4(ctx, withAiSdk);

    // All files are in ignored dirs, no bare-llm findings from them
    const bareLlm = results.filter((r) => r.category === 'bare-llm' && r.status === 'FOUND');
    expect(bareLlm).toHaveLength(0);
  });
});

describe('layer4ToCheckResults', () => {
  it('converts negative FOUND to fail warning', () => {
    const checkResults = layer4ToCheckResults([{
      obligationId: 'eu-ai-act-OBL-015',
      article: 'Art. 50(1)',
      category: 'bare-llm',
      patternType: 'negative',
      status: 'FOUND',
      file: 'src/chat.ts',
      line: 5,
      matchedPattern: 'OpenAI bare API call',
      recommendation: 'Wrap LLM calls',
    }]);

    expect(checkResults).toHaveLength(1);
    expect(checkResults[0].type).toBe('fail');
    if (checkResults[0].type === 'fail') {
      expect(checkResults[0].severity).toBe('medium');
      expect(checkResults[0].message).toContain('src/chat.ts:5');
    }
  });

  it('converts positive FOUND to pass', () => {
    const checkResults = layer4ToCheckResults([{
      obligationId: 'eu-ai-act-OBL-015',
      article: 'Art. 50(1)',
      category: 'disclosure',
      patternType: 'positive',
      status: 'FOUND',
      file: 'src/Chat.tsx',
      line: 10,
      matchedPattern: 'AI disclosure component/attribute',
      recommendation: 'Add AI disclosure',
    }]);

    expect(checkResults).toHaveLength(1);
    expect(checkResults[0].type).toBe('pass');
  });

  it('converts positive NOT_FOUND to fail', () => {
    const checkResults = layer4ToCheckResults([{
      obligationId: 'eu-ai-act-OBL-010',
      article: 'Art. 14',
      category: 'kill-switch',
      patternType: 'positive',
      status: 'NOT_FOUND',
      matchedPattern: 'AI kill switch / feature flag',
      recommendation: 'Add an AI kill switch',
    }]);

    expect(checkResults).toHaveLength(1);
    expect(checkResults[0].type).toBe('fail');
    if (checkResults[0].type === 'fail') {
      expect(checkResults[0].severity).toBe('low');
    }
  });
});
