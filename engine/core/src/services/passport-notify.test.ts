/**
 * V1-M22 / B-1 (B-3): RED test — `complior passport notify <agent>` must generate
 * worker notification template.
 *
 * Background (V1-M21 review):
 *   `complior passport notify acme-bot` → "error: unrecognized subcommand 'notify'"
 *   PRODUCT-VISION §11 lists "Worker Notification template" as v1.0.0 feature.
 *
 * Specification:
 *   - `passportService.notifyWorkers(agentName)` returns notification content
 *   - Content is markdown, references EU AI Act Art. 26(7) (worker information)
 *   - Saves to `.complior/notifications/{agent}-{YYYY-MM-DD}.md`
 *   - HTTP route: `POST /passport/notify` with body `{ name: string }`
 *
 * Architecture:
 *   - Service method is async, returns `{ path, content }`
 *   - Object.freeze result
 *   - Idempotent for same agent+day (overwrites if exists)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m22-notify-${process.pid}`);

describe('V1-M22 / B-1: passport notify worker flow', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(resolve(TEST_PROJECT, '.complior/agents'), { recursive: true });
  });

  it('passportService exposes notifyWorkers method', async () => {
    const { createPassportService } = await import('./passport-service.js');
    // Lenient deps — test ensures method exists, actual invocation below
    const service = createPassportService(mockDeps());
    expect(typeof (service as unknown as { notifyWorkers?: unknown }).notifyWorkers).toBe(
      'function',
    );
  });

  it('notifyWorkers returns { path, content } with Art. 26(7) reference', async () => {
    const { createPassportService } = await import('./passport-service.js');
    const service = createPassportService(mockDeps()) as unknown as {
      notifyWorkers: (name: string) => Promise<{ path: string; content: string }>;
    };

    // Seed a passport first
    await seedPassport('test-agent');

    const result = await service.notifyWorkers('test-agent');
    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('content');
    expect(result.content).toMatch(/Art(icle)?\.?\s*26/i);
    expect(result.content).toMatch(/worker|employee/i);
  });

  it('notifyWorkers saves file to .complior/notifications/', async () => {
    const { createPassportService } = await import('./passport-service.js');
    const service = createPassportService(mockDeps()) as unknown as {
      notifyWorkers: (name: string) => Promise<{ path: string; content: string }>;
    };

    await seedPassport('test-agent');
    const result = await service.notifyWorkers('test-agent');

    expect(result.path).toMatch(/\.complior\/notifications\/test-agent-\d{4}-\d{2}-\d{2}\.md$/);
    expect(existsSync(result.path)).toBe(true);
  });

  it('result is frozen', async () => {
    const { createPassportService } = await import('./passport-service.js');
    const service = createPassportService(mockDeps()) as unknown as {
      notifyWorkers: (name: string) => Promise<{ path: string; content: string }>;
    };

    await seedPassport('test-agent');
    const result = await service.notifyWorkers('test-agent');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('throws typed error when agent not found', async () => {
    const { createPassportService } = await import('./passport-service.js');
    const service = createPassportService(mockDeps()) as unknown as {
      notifyWorkers: (name: string) => Promise<{ path: string; content: string }>;
    };

    await expect(service.notifyWorkers('nonexistent-agent')).rejects.toThrow(
      /not found|does not exist/i,
    );
  });
});

// ── Helpers ────────────────────────────────────────────────────────

function mockDeps(): unknown {
  return Object.freeze({
    projectPath: TEST_PROJECT,
    loadTemplate: async () => '# Worker Notification\n\n...',
    evidenceStore: Object.freeze({
      append: async () => undefined,
      verify: async () => ({ valid: true }),
    }),
    keyPair: null,
  });
}

async function seedPassport(name: string): Promise<void> {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(
    resolve(TEST_PROJECT, '.complior/agents', `${name}.json`),
    JSON.stringify({
      name,
      kind: 'deployer_agent',
      autonomyLevel: 'L3',
      riskLevel: 'high',
      role: 'provider',
      complianceStatus: 'in_progress',
    }),
    'utf-8',
  );
}
