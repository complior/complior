import { describe, it, expect, vi } from 'vitest';
import { createPassportService } from './passport-service.js';
import type { PassportServiceDeps } from './passport-service.js';
import type { ScanContext, FileInfo } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';


// --- Helpers ---

const createFile = (
  relativePath: string,
  content: string,
  extension?: string,
): FileInfo => ({
  path: `/tmp/test/${relativePath}`,
  content,
  extension: extension ?? `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createMockDeps = (files: readonly FileInfo[] = []): PassportServiceDeps => ({
  collectFiles: vi.fn().mockResolvedValue({
    files,
    projectPath: '/tmp/test',
  } satisfies ScanContext),
  scanner: { scan: vi.fn() },
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  } as unknown as EventBusPort,
  getProjectPath: () => '/tmp/test',
  getLastScanResult: () => null,
});

// --- Tests ---

describe('createPassportService', () => {
  it('initPassport returns empty when no AI SDK', async () => {
    const deps = createMockDeps([
      createFile(
        'package.json',
        JSON.stringify({
          name: 'vanilla-app',
          dependencies: { express: '4.18.0', lodash: '4.17.21' },
        }),
        '.json',
      ),
      createFile('src/index.ts', 'console.log("hello world")'),
    ]);

    const service = createPassportService(deps);
    const result = await service.initPassport('/tmp/test');

    expect(result.manifests).toEqual([]);
    expect(result.savedPaths).toEqual([]);
  });

  it('initPassport discovers and generates passport', async () => {
    const deps = createMockDeps([
      createFile(
        'package.json',
        JSON.stringify({
          name: 'ai-bot',
          dependencies: { openai: '4.20.0' },
        }),
        '.json',
      ),
      createFile(
        'src/agent.ts',
        `import OpenAI from 'openai';
const client = new OpenAI();
const res = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});`,
      ),
    ]);

    const service = createPassportService(deps);
    const result = await service.initPassport('/tmp/test');

    expect(result.manifests).toHaveLength(1);
    expect(result.manifests[0].name).toBe('ai-bot');
    expect(result.manifests[0].agent_id).toMatch(/^ag_/);
    expect(result.manifests[0].signature).toBeDefined();
    expect(result.manifests[0].signature.algorithm).toBe('ed25519');
  });

  it('listPassports returns empty for new project', async () => {
    const deps = createMockDeps();

    const service = createPassportService(deps);
    // The .complior/agents/ directory does not exist, so readdir will throw
    const result = await service.listPassports('/tmp/nonexistent-project');

    expect(result).toEqual([]);
  });

  it('showPassport returns null for nonexistent', async () => {
    const deps = createMockDeps();

    const service = createPassportService(deps);
    const result = await service.showPassport('foo', '/tmp/nonexistent-project');

    expect(result).toBeNull();
  });

  it('analyzeProjectAutonomy returns autonomy analysis', async () => {
    const deps = createMockDeps([
      createFile(
        'package.json',
        JSON.stringify({
          name: 'ai-app',
          dependencies: { openai: '4.20.0' },
        }),
        '.json',
      ),
      createFile(
        'src/agent.ts',
        `import OpenAI from 'openai';
const client = new OpenAI();
const res = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});`,
      ),
    ]);

    const service = createPassportService(deps);
    const result = await service.analyzeProjectAutonomy('/tmp/test');

    expect(result).toBeDefined();
    expect(result.level).toMatch(/^L[1-5]$/);
    expect(result.agentType).toMatch(/^(autonomous|assistive|hybrid)$/);
    expect(result.evidence).toBeDefined();
    expect(typeof result.evidence.human_approval_gates).toBe('number');
    expect(typeof result.evidence.unsupervised_actions).toBe('number');
  });

  it('validatePassportByName returns null for nonexistent', async () => {
    const deps = createMockDeps();

    const service = createPassportService(deps);
    const result = await service.validatePassportByName('nonexistent', '/tmp/test');

    expect(result).toBeNull();
  });

  it('getPassportCompleteness returns null for nonexistent', async () => {
    const deps = createMockDeps();

    const service = createPassportService(deps);
    const result = await service.getPassportCompleteness('nonexistent', '/tmp/test');

    expect(result).toBeNull();
  });
});
