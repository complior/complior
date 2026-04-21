/**
 * V1-M12.1: Eval Pre-Filter — RED test spec.
 *
 * Verifies that eval-service filters tests BEFORE execution (not after),
 * so that provider-only / GPAI-only / wrong-domain tests never send HTTP requests.
 *
 * Key invariant: with a deployer profile, provider-only tests (CT-8-*)
 * must NOT appear in results at all — not as skip, not as error, just absent.
 * The adapter.send() call count must equal the filtered test count.
 *
 * Tests use category filters to limit scope and run fast (<30s each).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createEvalService } from './eval-service.js';
import type { LoggerPort } from '../ports/logger.port.js';

const TEST_DIR = `/tmp/eval-prefilter-test-${Date.now()}`;
const mockLog: LoggerPort = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

describe('V1-M12.1: Eval Pre-Filter (tests filtered BEFORE execution)', () => {
  let server: ReturnType<typeof serve>;
  let port: number;
  let httpCallCount: number;

  beforeAll(async () => {
    httpCallCount = 0;

    const app = new Hono();
    app.post('/v1/chat/completions', async (c) => {
      httpCallCount++;
      return c.json({
        id: 'mock-1',
        object: 'chat.completion',
        choices: [{ message: { role: 'assistant', content: 'EU AI Act compliant response with full transparency.' }, index: 0, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 50 },
      });
    });

    app.get('/v1/models', (c) => c.json({ data: [{ id: 'mock-model' }] }));

    port = 5100 + Math.floor(Math.random() * 900);
    server = serve({ fetch: app.fetch, port });
    await mkdir(resolve(TEST_DIR, '.complior', 'eval'), { recursive: true });
  });

  afterAll(async () => {
    server.close();
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('deployer profile + logging category: zero tests (all CT-8 are provider-only)', async () => {
    // CT-8 (logging) = 15 tests, ALL marked roles: ["provider"] in test-applicability.json
    // A deployer profile should filter out ALL of them → zero HTTP calls for this category.
    const deployerProfile = {
      role: 'deployer' as const,
      riskLevel: 'high',
      domain: null,
    };

    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
      getProjectProfile: async () => deployerProfile,
    });

    httpCallCount = 0;

    const result = await service.runEval({
      target: `http://127.0.0.1:${port}/v1/chat/completions`,
      model: 'mock-model',
      apiKey: 'test-key',
      deterministic: true,
      categories: ['logging'],
    });

    // ALL logging tests are provider-only → deployer should see ZERO
    expect(result.totalTests).toBe(0);
    expect(httpCallCount).toBe(0);
    expect(result.results).toHaveLength(0);

    // filterContext shows all skipped by role
    expect(result.filterContext).toBeDefined();
    expect(result.filterContext!.profileFound).toBe(true);
    expect(result.filterContext!.skippedByRole).toBeGreaterThan(0);
  }, 30_000);

  it('no profile + logging category: all logging tests execute', async () => {
    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
      // No getProjectProfile → no filtering
    });

    httpCallCount = 0;

    const result = await service.runEval({
      target: `http://127.0.0.1:${port}/v1/chat/completions`,
      model: 'mock-model',
      apiKey: 'test-key',
      deterministic: true,
      categories: ['logging'],
    });

    // Without profile: all 15 logging tests should run
    expect(result.totalTests).toBeGreaterThan(0);
    expect(result.totalTests).toBe(httpCallCount);
    expect(result.results.length).toBe(result.totalTests);

    // Every result should be a CT-8-* test
    for (const r of result.results) {
      expect(r.testId).toMatch(/^CT-8-/);
    }
  }, 30_000);

  it('deployer profile + gpai category: zero tests (all CT-10 are gpai-only)', async () => {
    // CT-10 (GPAI) = 12 tests, ALL marked riskLevels: ["gpai", "gpai_systemic"]
    // A deployer with riskLevel='high' should see ZERO GPAI tests.
    const deployerProfile = {
      role: 'deployer' as const,
      riskLevel: 'high',
      domain: null,
    };

    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
      getProjectProfile: async () => deployerProfile,
    });

    httpCallCount = 0;

    const result = await service.runEval({
      target: `http://127.0.0.1:${port}/v1/chat/completions`,
      model: 'mock-model',
      apiKey: 'test-key',
      deterministic: true,
      categories: ['gpai'],
    });

    // All GPAI tests should be filtered out for non-GPAI risk level
    expect(result.totalTests).toBe(0);
    expect(httpCallCount).toBe(0);
    expect(result.results).toHaveLength(0);

    expect(result.filterContext).toBeDefined();
    expect(result.filterContext!.skippedByRiskLevel).toBeGreaterThan(0);
  }, 30_000);

  it('deployer+healthcare + industry category: only healthcare tests remain', async () => {
    // CT-11 (industry) = 32 tests across 6 domains.
    // With domain='healthcare', only healthcare tests (CT-11-016..CT-11-020) should run.
    const healthcareDeployer = {
      role: 'deployer' as const,
      riskLevel: 'high',
      domain: 'healthcare',
    };

    const service = createEvalService({
      getProjectPath: () => TEST_DIR,
      log: mockLog,
      getProjectProfile: async () => healthcareDeployer,
    });

    httpCallCount = 0;

    const result = await service.runEval({
      target: `http://127.0.0.1:${port}/v1/chat/completions`,
      model: 'mock-model',
      apiKey: 'test-key',
      deterministic: true,
      categories: ['industry'],
    });

    // Only healthcare industry tests should execute
    expect(result.totalTests).toBeGreaterThan(0);
    expect(result.totalTests).toBe(httpCallCount);
    expect(result.totalTests).toBeLessThan(32); // Not all 32 industry tests

    // All results should be healthcare-related (CT-11-016..020)
    for (const r of result.results) {
      expect(r.testId).toMatch(/^CT-11-/);
      const num = parseInt(r.testId.replace('CT-11-', ''), 10);
      expect(num).toBeGreaterThanOrEqual(16);
      expect(num).toBeLessThanOrEqual(20);
    }

    // HR tests (CT-11-001..015) must NOT appear
    const hrResults = result.results.filter(r => {
      const num = parseInt(r.testId.replace('CT-11-', ''), 10);
      return num <= 15;
    });
    expect(hrResults).toHaveLength(0);

    // disclaimer present
    expect(result.disclaimer).toBeDefined();
    expect(result.disclaimer!.profileUsed).toBe(true);
    expect(result.disclaimer!.testsSkipped).toBeGreaterThan(0);
  }, 30_000);
});
