import { describe, it, expect } from 'vitest';
import type { ScanContext, FileInfo } from '../../ports/scanner.port.js';
import type { ParsedDependency } from '../scanner/layers/layer3-parsers.js';
import { discoverAgents } from './agent-discovery.js';

// --- Helpers ---

const createFile = (
  relativePath: string,
  content: string,
  extension?: string,
): FileInfo => ({
  path: `/home/user/my-project/${relativePath}`,
  content,
  extension: extension ?? `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createMockContext = (
  files: readonly FileInfo[],
  projectPath = '/home/user/my-project',
): ScanContext => ({
  files,
  projectPath,
});

const createMockDeps = (names: readonly string[]): readonly ParsedDependency[] =>
  names.map((name) => ({ name, version: '1.0.0', ecosystem: 'npm' }));

// --- Tests ---

describe('discoverAgents', () => {
  it('returns empty array when no AI SDK detected', () => {
    const ctx = createMockContext([
      createFile('src/index.ts', 'console.log("hello")'),
    ]);
    const deps = createMockDeps(['express', 'lodash']);

    const result = discoverAgents(ctx, deps);

    expect(result).toEqual([]);
  });

  it('discovers agent with OpenAI SDK', () => {
    const ctx = createMockContext([
      createFile(
        'src/agent.ts',
        `import OpenAI from 'openai';
const client = new OpenAI();
const res = await client.chat.completions.create({ model: 'gpt-4' });`,
      ),
    ]);
    const deps = createMockDeps(['openai']);

    const result = discoverAgents(ctx, deps);

    expect(result).toHaveLength(1);
    expect(result[0].detectedSdks).toContain('openai');
    expect(result[0].framework).toBe('OpenAI');
  });

  it('discovers agent with LangChain framework', () => {
    const ctx = createMockContext([
      createFile(
        'src/chain.ts',
        `import { AgentExecutor } from 'langchain/agents';
const executor = new AgentExecutor({ agent, tools });`,
      ),
    ]);
    const deps = createMockDeps(['langchain']);

    const result = discoverAgents(ctx, deps);

    expect(result).toHaveLength(1);
    expect(result[0].detectedSdks).toContain('langchain');
    expect(result[0].framework).toBe('LangChain');
  });

  it('detects model names from source', () => {
    const ctx = createMockContext([
      createFile(
        'src/bot.ts',
        `import Anthropic from '@anthropic-ai/sdk';
const msg = await client.messages.create({ model: 'claude-sonnet-4-20250514' });`,
      ),
    ]);
    const deps = createMockDeps(['@anthropic-ai/sdk']);

    const result = discoverAgents(ctx, deps);

    expect(result).toHaveLength(1);
    expect(result[0].detectedModels).toContain('claude-sonnet-4-20250514');
  });

  it('infers name from package.json', () => {
    const ctx = createMockContext([
      createFile('package.json', JSON.stringify({ name: 'test-bot' }), '.json'),
      createFile(
        'src/index.ts',
        'import OpenAI from "openai"; openai.chat.completions.create({})',
      ),
    ]);
    const deps = createMockDeps(['openai']);

    const result = discoverAgents(ctx, deps);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test-bot');
  });

  it('infers name from project path', () => {
    const ctx = createMockContext(
      [
        createFile(
          'src/index.ts',
          'import OpenAI from "openai"; openai.chat.completions.create({})',
        ),
      ],
      '/home/user/my-agent',
    );
    const deps = createMockDeps(['openai']);

    const result = discoverAgents(ctx, deps);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('my-agent');
  });

  it('calculates confidence correctly', () => {
    // All signals present: sdk (0.2) + framework (0.2) + model (0.1) + base (0.5) = 1.0
    const ctx = createMockContext([
      createFile(
        'src/agent.ts',
        `import { AgentExecutor } from 'langchain/agents';
const executor = new AgentExecutor({ agent, tools });
const model = 'gpt-4o-mini';`,
      ),
    ]);
    const deps = createMockDeps(['langchain']);

    const result = discoverAgents(ctx, deps);

    expect(result).toHaveLength(1);
    // base 0.5 + sdk detected 0.2 + framework found 0.2 + model found 0.1 = 1.0
    expect(result[0].confidence).toBeCloseTo(1.0);
  });
});
