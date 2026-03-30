/**
 * Eval integration test — runs the full eval pipeline against a mock target.
 * Verifies: scoring, grade, test counts, result persistence.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createEvalService } from './eval-service.js';
import type { LoggerPort } from '../ports/logger.port.js';

const TEST_DIR = `/tmp/eval-integration-test-${Date.now()}`;
const mockLog: LoggerPort = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

describe('eval integration', () => {
  let server: ReturnType<typeof serve>;
  let port: number;

  beforeAll(async () => {
    const app = new Hono();
    app.post('/v1/chat/completions', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const messages = (body as Record<string, unknown>).messages as Array<Record<string, unknown>> | undefined;
      const lastMessage = messages?.[messages.length - 1];
      const prompt = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

      const text = prompt.toLowerCase().includes('prohibited')
        ? 'I cannot help with that request. This falls under prohibited AI practices.'
        : 'This AI system provides transparent and compliant responses per EU AI Act. '
          + 'We implement human oversight measures and provide clear AI disclosure.';

      return c.json({
        id: 'mock-1',
        object: 'chat.completion',
        choices: [{ message: { role: 'assistant', content: text }, index: 0, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 50 },
      });
    });

    app.get('/v1/models', (c) => c.json({ data: [{ id: 'mock-model' }] }));

    port = 4098 + Math.floor(Math.random() * 900);
    server = serve({ fetch: app.fetch, port });
    await mkdir(resolve(TEST_DIR, '.complior', 'eval'), { recursive: true });
  });

  afterAll(async () => {
    server.close();
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('runs deterministic eval with category filter and produces valid result', async () => {
    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
    });

    // Limit to a single category for speed
    const result = await service.runEval({
      target: `http://127.0.0.1:${port}/v1/chat/completions`,
      model: 'mock-model',
      apiKey: 'test-key',
      deterministic: true,
      categories: ['transparency'],
    });

    // Basic structure validation
    expect(result.target).toContain(`${port}`);
    expect(typeof result.overallScore).toBe('number');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(typeof result.grade).toBe('string');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    expect(result.totalTests).toBeGreaterThan(0);
    expect(result.results.length).toBe(result.totalTests);

    // Verify each result has required fields
    for (const r of result.results) {
      expect(r.testId).toBeTruthy();
      expect(['pass', 'fail', 'error', 'skip', 'inconclusive']).toContain(r.verdict);
      expect(typeof r.score).toBe('number');
      expect(r.category).toBe('transparency');
    }

    // Verify report was persisted to disk
    const latestPath = resolve(TEST_DIR, '.complior', 'eval', 'latest.json');
    const persisted = JSON.parse(await readFile(latestPath, 'utf-8'));
    expect(persisted.overallScore).toBe(result.overallScore);
  }, 30_000);

  it('getLastResult reads persisted result', async () => {
    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
    });

    const last = await service.getLastResult();
    expect(last).not.toBeNull();
    expect(typeof last!.overallScore).toBe('number');
  });

  it('listResults returns eval files', async () => {
    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
    });

    const files = await service.listResults();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toMatch(/^eval-.*\.json$/);
  });

  it('runEvalWithReport returns both result and report', async () => {
    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
    });

    const { result, report } = await service.runEvalWithReport({
      target: `http://127.0.0.1:${port}/v1/chat/completions`,
      model: 'mock-model',
      apiKey: 'test-key',
      deterministic: true,
      categories: ['prohibited'],
    });

    expect(result.totalTests).toBeGreaterThan(0);
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
  }, 30_000);
});
