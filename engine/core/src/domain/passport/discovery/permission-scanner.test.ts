import { describe, it, expect } from 'vitest';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';
import { scanPermissions, scanPermissionsDetailed } from './permission-scanner.js';
describe('scanPermissions', () => {
  it('detects tool definitions', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/agent.ts',
        `const config = {
  tools: [
    { name: 'search', description: 'Search the web' },
    { name: 'create_file', description: 'Create a file' },
  ],
};`,
      ),
    ]);

    const result = scanPermissions(ctx);

    expect(result.tools).toContain('search');
    expect(result.tools).toContain('create_file');
  });

  it('detects database read access', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/db.ts',
        `const users = await prisma.user.findMany({ where: { active: true } });`,
      ),
    ]);

    const result = scanPermissions(ctx);

    expect(result.dataAccess.read).toContain('user');
  });

  it('detects database write access', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/orders.ts',
        `const order = await prisma.order.create({ data: { total: 100 } });`,
      ),
    ]);

    const result = scanPermissions(ctx);

    expect(result.dataAccess.write).toContain('order');
  });

  it('detects MCP servers from JSON', () => {
    const ctx = createScanCtx([
      createScanFile(
        'mcp.json',
        JSON.stringify({
          mcpServers: {
            'test-server': { command: 'node', args: ['server.js'] },
          },
        }),
        '.json',
      ),
    ]);

    const result = scanPermissions(ctx);

    expect(result.mcpServers).toHaveLength(1);
    expect(result.mcpServers[0].name).toBe('test-server');
  });

  it('detects human approval patterns', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/actions.ts',
        `async function deleteAccount(id: string) {
  await confirm('delete');
  // proceed with deletion
}`,
      ),
    ]);

    const result = scanPermissions(ctx);

    expect(result.humanApprovalRequired).toContain('delete');
  });

  it('returns empty permissions for vanilla project', () => {
    const ctx = createScanCtx([
      createScanFile('README.md', '# My Project\nJust a readme.'),
    ]);

    const result = scanPermissions(ctx);

    expect(result.tools).toEqual([]);
    expect(result.dataAccess.read).toEqual([]);
    expect(result.dataAccess.write).toEqual([]);
    expect(result.dataAccess.delete).toEqual([]);
    expect(result.mcpServers).toEqual([]);
    expect(result.humanApprovalRequired).toEqual([]);
    expect(result.denied).toEqual([]);
  });
});

describe('scanPermissionsDetailed', () => {
  it('detects LangChain StructuredTool class', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/tools.ts',
        `class SearchTool extends StructuredTool {
  name = 'search';
}`,
      ),
    ]);

    const result = scanPermissionsDetailed(ctx);

    expect(result.toolsDetailed).toHaveLength(1);
    expect(result.toolsDetailed[0].name).toBe('SearchTool');
    expect(result.toolsDetailed[0].framework).toBe('langchain');
    expect(result.toolsDetailed[0].file).toBe('src/tools.ts');
  });

  it('detects OpenAI function definition', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/agent.ts',
        `const tools = [{
  function: { name: 'get_weather', parameters: {} }
}];`,
      ),
    ]);

    const result = scanPermissionsDetailed(ctx);

    expect(result.toolsDetailed).toHaveLength(1);
    expect(result.toolsDetailed[0].name).toBe('get_weather');
    expect(result.toolsDetailed[0].framework).toBe('openai');
  });

  it('detects MCP server.tool registration', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/server.ts',
        `server.tool('read_file', { path: z.string() }, async (params) => {});`,
      ),
    ]);

    const result = scanPermissionsDetailed(ctx);

    expect(result.toolsDetailed).toHaveLength(1);
    expect(result.toolsDetailed[0].name).toBe('read_file');
    expect(result.toolsDetailed[0].framework).toBe('mcp');
  });

  it('detects Python @tool decorator', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/tools.py',
        `@tool("Search the web")
def search_web():
    pass`,
        '.py',
      ),
    ]);

    const result = scanPermissionsDetailed(ctx);

    expect(result.toolsDetailed).toHaveLength(1);
    expect(result.toolsDetailed[0].name).toBe('search_web');
    expect(result.toolsDetailed[0].framework).toBe('generic');
  });

  it('returns accurate line numbers for discovered tools', () => {
    const ctx = createScanCtx([
      createScanFile(
        'src/multi.ts',
        `// line 1
// line 2
server.tool('tool_a', {}, async () => {});
// line 4
server.tool('tool_b', {}, async () => {});`,
      ),
    ]);

    const result = scanPermissionsDetailed(ctx);

    expect(result.toolsDetailed).toHaveLength(2);
    expect(result.toolsDetailed[0].name).toBe('tool_a');
    expect(result.toolsDetailed[0].line).toBe(3);
    expect(result.toolsDetailed[1].name).toBe('tool_b');
    expect(result.toolsDetailed[1].line).toBe(5);
  });
});
