import { describe, it, expect } from 'vitest';
import { runLayer4, layer4ToCheckResults } from './layer4-patterns.js';
import type { L3CheckResult } from './layer3-config.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

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
    const ctx = createScanCtx([
      createScanFile('src/api/chat.ts', `
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
    const ctx = createScanCtx([
      createScanFile('src/api.ts', `
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
const msg = await anthropic.messages.create({
  model: 'claude-3-opus',
  messages: [],
});
`),
      createScanFile('src/middleware/logger.ts', `
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
    const ctx = createScanCtx([
      createScanFile('src/app.ts', `
function main() {
  console.log('Hello world');
}
`),
      createScanFile('src/utils.ts', `
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
    const ctx = createScanCtx([
      createScanFile('frontend/src/chat.tsx', `
const response = await openai.chat.completions.create({ model: 'gpt-4' });
<div className="AIDisclosure">Powered by AI</div>
`),
      createScanFile('backend/api.py', `
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
    const ctx = createScanCtx([
      createScanFile('node_modules/openai/index.js', `openai.chat.completions.create()`),
      createScanFile('dist/api.js', `openai.chat.completions.create()`),
      createScanFile('.git/hooks/pre-commit', `openai.chat.completions.create()`),
    ]);

    const results = runLayer4(ctx, withAiSdk);

    // All files are in ignored dirs, no bare-llm findings from them
    const bareLlm = results.filter((r) => r.category === 'bare-llm' && r.status === 'FOUND');
    expect(bareLlm).toHaveLength(0);
  });
});

  it('detects data governance patterns', () => {
    const ctx = createScanCtx([
      createScanFile('src/data/validator.ts', `
export class DataValidator {
  validateData(input: unknown) { return true; }
  checkDataLineage(record: Record<string, unknown>) { return record; }
}
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const dataGov = results.filter((r) => r.category === 'data-governance');
    expect(dataGov.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('detects record-keeping patterns', () => {
    const ctx = createScanCtx([
      createScanFile('src/audit/trail.ts', `
export class AuditTrail {
  persistAudit(entry: unknown) {}
  complianceRecord(data: unknown) {}
}
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const records = results.filter((r) => r.category === 'record-keeping');
    expect(records.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('detects accuracy/robustness patterns', () => {
    const ctx = createScanCtx([
      createScanFile('src/test/model-validation.ts', `
export function modelValidation(model: unknown) { return true; }
export function adversarialTest(input: unknown) { return input; }
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const accuracy = results.filter((r) => r.category === 'accuracy-robustness');
    expect(accuracy.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('detects cybersecurity patterns', () => {
    const ctx = createScanCtx([
      createScanFile('src/middleware/security.ts', `
export const rateLimiter = new RateLimiter({ max: 100 });
export function sanitizeInput(text: string) { return text.replace(/[<>]/g, ''); }
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const cyber = results.filter((r) => r.category === 'cybersecurity');
    expect(cyber.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('detects deployer monitoring patterns', () => {
    const ctx = createScanCtx([
      createScanFile('src/monitoring/drift.ts', `
export class ModelMonitor {
  driftDetect(current: number[], baseline: number[]) {}
  reportIncident(details: unknown) {}
}
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const monitoring = results.filter((r) => r.category === 'deployer-monitoring');
    expect(monitoring.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('detects GPAI transparency patterns', () => {
    const ctx = createScanCtx([
      createScanFile('src/docs/model-card.ts', `
export const modelCard = { name: 'gpt-4', capabilities: [], limitations: [] };
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const gpai = results.filter((r) => r.category === 'gpai-transparency');
    expect(gpai.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('detects security risk: unsafe eval', () => {
    const ctx = createScanCtx([
      createScanFile('src/handler.ts', `
function handleRequest(req: any) {
  return eval(req.body.code);
}
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const securityRisks = results.filter((r) => r.category === 'security-risk' && r.status === 'FOUND');
    expect(securityRisks.length).toBeGreaterThan(0);
    expect(securityRisks[0].patternType).toBe('negative');
  });

  it('detects security risk: pickle.load', () => {
    const ctx = createScanCtx([
      createScanFile('src/loader.py', `
import pickle
data = pickle.load(open('model.pkl', 'rb'))
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const pickle = results.filter((r) => r.matchedPattern.includes('pickle'));
    expect(pickle.length).toBeGreaterThan(0);
  });

  it('reports missing new positive categories when AI SDK detected', () => {
    const ctx = createScanCtx([
      createScanFile('src/app.ts', 'const x = 1;'),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const missingCategories = results
      .filter((r) => r.patternType === 'positive' && r.status === 'NOT_FOUND')
      .map((r) => r.category);

    expect(missingCategories).toContain('data-governance');
    expect(missingCategories).toContain('record-keeping');
    expect(missingCategories).toContain('deployer-monitoring');
  });

  it('detects conformity assessment patterns', () => {
    const ctx = createScanCtx([
      createScanFile('src/compliance/declaration.ts', `
export const conformityDeclaration = { system: 'AI', standard: 'EU AI Act' };
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);
    const conformity = results.filter((r) => r.category === 'conformity-assessment');
    expect(conformity.some((r) => r.status === 'FOUND')).toBe(true);
  });

  it('excludes test and spec files from pattern scanning', () => {
    const ctx = createScanCtx([
      createScanFile('src/api/chat.test.ts', `
const response = await openai.chat.completions.create({ model: 'gpt-4' });
`),
      createScanFile('src/api/chat.spec.ts', `
const response = await openai.chat.completions.create({ model: 'gpt-4' });
`),
      createScanFile('__tests__/api.ts', `
const response = await openai.chat.completions.create({ model: 'gpt-4' });
`),
    ]);

    const results = runLayer4(ctx, withAiSdk);

    // Test/spec files should be excluded — no bare-llm findings from them
    const bareLlm = results.filter((r) => r.category === 'bare-llm' && r.status === 'FOUND');
    expect(bareLlm).toHaveLength(0);
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
