import { describe, it, expect } from 'vitest';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';
import { checkPermissions } from './permission-scanner.js';

const createPassportManifest = (tools: readonly string[] = []): string =>
  JSON.stringify({
    name: 'test-agent',
    version: '1.0.0',
    permissions: { tools },
  });

// --- Tests ---

describe('checkPermissions', () => {
  it('skips when no passport found', () => {
    const ctx = createScanCtx([
      createScanFile('src/agent.ts', 'const x = 1;'),
    ]);

    const results = checkPermissions(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skip');
  });

  it('passes when no tools and passport tools empty', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest([])),
      createScanFile('src/index.ts', 'console.log("hello");'),
    ]);

    const results = checkPermissions(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('detects undeclared LangChain StructuredTool', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest([])),
      createScanFile(
        'src/tools.ts',
        `class SearchTool extends StructuredTool {
  name = 'search';
}`,
      ),
    ]);

    const results = checkPermissions(ctx);

    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    expect(undeclared.length).toBeGreaterThanOrEqual(1);
    expect(undeclared[0].type === 'fail' && undeclared[0].severity).toBe('high');
  });

  it('detects undeclared OpenAI function definition', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest([])),
      createScanFile(
        'src/agent.ts',
        `const tools = [{
  function: { name: 'get_weather', parameters: {} }
}];`,
      ),
    ]);

    const results = checkPermissions(ctx);

    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    expect(undeclared.length).toBeGreaterThanOrEqual(1);
    expect(undeclared[0].message).toContain('get_weather');
  });

  it('detects undeclared Anthropic tool definition', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest([])),
      createScanFile(
        'src/tools.ts',
        `const tools = [{ name: 'calculator', input_schema: { type: 'object' } }];`,
      ),
    ]);

    const results = checkPermissions(ctx);

    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    expect(undeclared.length).toBeGreaterThanOrEqual(1);
    expect(undeclared[0].message).toContain('calculator');
  });

  it('detects undeclared MCP server.tool() registration', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest([])),
      createScanFile(
        'src/server.ts',
        `server.tool('read_file', { path: z.string() }, async (params) => {});`,
      ),
    ]);

    const results = checkPermissions(ctx);

    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    expect(undeclared.length).toBeGreaterThanOrEqual(1);
    expect(undeclared[0].message).toContain('read_file');
  });

  it('detects undeclared CrewAI tool', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest([])),
      createScanFile(
        'src/tools.py',
        `search = Tool(name='web_search', description='Search the web')`,
        '.py',
      ),
    ]);

    const results = checkPermissions(ctx);

    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    expect(undeclared.length).toBeGreaterThanOrEqual(1);
    expect(undeclared[0].message).toContain('web_search');
  });

  it('reports unused declared permission', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest(['delete_user', 'send_email'])),
      createScanFile('src/index.ts', 'console.log("no tools here");'),
    ]);

    const results = checkPermissions(ctx);

    const unused = results.filter((r) => r.type === 'fail' && r.checkId === 'unused-declared-permission');
    expect(unused).toHaveLength(2);
    expect(unused[0].type === 'fail' && unused[0].severity).toBe('low');
  });

  it('passes when discovered matches declared', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest(['read_file'])),
      createScanFile(
        'src/server.ts',
        `server.tool('read_file', {}, async () => {});`,
      ),
    ]);

    const results = checkPermissions(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('handles multiple undeclared tools', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest([])),
      createScanFile(
        'src/tools.ts',
        `server.tool('tool_a', {}, async () => {});
server.tool('tool_b', {}, async () => {});
server.tool('tool_c', {}, async () => {});`,
      ),
    ]);

    const results = checkPermissions(ctx);

    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    expect(undeclared).toHaveLength(3);
  });

  it('reports both undeclared and unused in same scan', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest(['old_tool'])),
      createScanFile(
        'src/server.ts',
        `server.tool('new_tool', {}, async () => {});`,
      ),
    ]);

    const results = checkPermissions(ctx);

    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    const unused = results.filter((r) => r.type === 'fail' && r.checkId === 'unused-declared-permission');
    expect(undeclared).toHaveLength(1);
    expect(unused).toHaveLength(1);
  });

  it('handles multiple passports independently', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/agent1-manifest.json', createPassportManifest([])),
      createScanFile('.complior/agents/agent2-manifest.json', createPassportManifest([])),
      createScanFile(
        'src/server.ts',
        `server.tool('read_file', {}, async () => {});`,
      ),
    ]);

    const results = checkPermissions(ctx);

    // Each passport should report undeclared independently
    const undeclared = results.filter((r) => r.type === 'fail' && r.checkId === 'undeclared-permission');
    expect(undeclared).toHaveLength(2);
  });

  it('normalizes tool names (case-insensitive, strips Tool suffix)', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/agents/test-manifest.json', createPassportManifest(['search'])),
      createScanFile(
        'src/tools.ts',
        `class SearchTool extends StructuredTool {
  name = 'search';
}`,
      ),
    ]);

    const results = checkPermissions(ctx);

    // 'SearchTool' normalizes to 'search', matching declared 'search'
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });
});
