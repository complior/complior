import { describe, it, expect } from 'vitest';
import type { ScanContext, FileInfo } from '../../../ports/scanner.port.js';
import type { ParsedDependency } from '../../scanner/layers/layer3-parsers.js';
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

  describe('endpoint detection', () => {
    it('detects port from .env file', () => {
      const ctx = createMockContext([
        createFile('.env', 'PORT=4000\nNODE_ENV=production', '.env'),
        createFile(
          'src/index.ts',
          'import OpenAI from "openai"; openai.chat.completions.create({})',
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toEqual(['http://localhost:4000']);
    });

    it('detects port from code (serve pattern)', () => {
      const ctx = createMockContext([
        createFile(
          'src/server.ts',
          `import { Hono } from 'hono';
import OpenAI from 'openai';
const app = new Hono();
app.post('/api/chat', async (c) => { openai.chat.completions.create({}); });
export default { port: 3000, fetch: app.fetch };`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toEqual(['http://localhost:3000/api/chat']);
    });

    it('detects port from .listen() pattern', () => {
      const ctx = createMockContext([
        createFile(
          'src/app.ts',
          `import OpenAI from 'openai';
const app = express();
app.listen(8080);
openai.chat.completions.create({});`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toEqual(['http://localhost:8080']);
    });

    it('detects multiple routes and builds full URLs', () => {
      const ctx = createMockContext([
        createFile('.env', 'PORT=4000', '.env'),
        createFile(
          'src/routes.ts',
          `import OpenAI from 'openai';
app.post('/api/chat', handler);
app.post('/v1/chat/completions', handler);
app.get('/health', handler);
openai.chat.completions.create({});`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toContain('http://localhost:4000/api/chat');
      expect(result[0].detectedEndpoints).toContain('http://localhost:4000/v1/chat/completions');
      expect(result[0].detectedEndpoints).toContain('http://localhost:4000/health');
    });

    it('returns no endpoints when no port detected', () => {
      const ctx = createMockContext([
        createFile(
          'src/agent.ts',
          `import OpenAI from 'openai';
const client = new OpenAI();
openai.chat.completions.create({});`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toBeUndefined();
    });

    it('detects port from Dockerfile EXPOSE', () => {
      const ctx = createMockContext([
        createFile('Dockerfile', 'FROM node:20\nEXPOSE 3000\nCMD ["node", "server.js"]', 'Dockerfile'),
        createFile(
          'src/agent.ts',
          `import OpenAI from 'openai';
app.post('/api/chat', handler);
openai.chat.completions.create({});`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toContain('http://localhost:3000/api/chat');
    });

    it('detects port from docker-compose.yml ports mapping', () => {
      const ctx = createMockContext([
        createFile('docker-compose.yml', "services:\n  app:\n    ports:\n      - '8080:8080'", 'docker-compose.yml'),
        createFile(
          'src/agent.ts',
          `import OpenAI from 'openai';
app.post('/api/chat', handler);
openai.chat.completions.create({});`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toContain('http://localhost:8080/api/chat');
    });

    it('prefers .env PORT over code-detected port', () => {
      const ctx = createMockContext([
        createFile('.env', 'PORT=5000', '.env'),
        createFile(
          'src/server.ts',
          `import OpenAI from 'openai';
app.post('/api/chat', handler);
export default { port: 3000, fetch: app.fetch };
openai.chat.completions.create({});`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      expect(result[0].detectedEndpoints).toEqual(['http://localhost:5000/api/chat']);
    });

    // TD-14: Endpoint route validation — only /-prefixed strings are valid routes
    it('filters out non-path routes like Express config getters (TD-14)', () => {
      // Express `app.get('env')` reads a setting, NOT a route definition.
      // ROUTE_PATTERN captures it as a "route" → broken URL `http://localhost:3000env`
      // Fix: only keep routes that start with `/`
      const ctx = createMockContext([
        createFile('.env', 'PORT=3000', '.env'),
        createFile(
          'src/server.ts',
          `import OpenAI from 'openai';
const app = express();
app.get('/api/chat', chatHandler);
app.get('env');
app.get('trust proxy');
app.post('/v1/completions', completionHandler);
openai.chat.completions.create({});`,
        ),
      ]);
      const deps = createMockDeps(['openai']);

      const result = discoverAgents(ctx, deps);

      expect(result).toHaveLength(1);
      // Only /-prefixed paths should appear as endpoints
      const endpoints = result[0].detectedEndpoints ?? [];
      expect(endpoints).toContain('http://localhost:3000/api/chat');
      expect(endpoints).toContain('http://localhost:3000/v1/completions');
      // Non-path strings must NOT appear
      expect(endpoints).not.toContain('http://localhost:3000env');
      expect(endpoints).not.toContain('http://localhost:3000trust proxy');
      expect(endpoints).toHaveLength(2);
    });
  });
});
