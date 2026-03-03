import { describe, it, expect } from 'vitest';
import type { ScanContext, FileInfo } from '../../ports/scanner.port.js';
import { scanPermissions } from './permission-scanner.js';

// --- Helpers ---

const createFile = (
  relativePath: string,
  content: string,
  extension?: string,
): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: extension ?? `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

// --- Tests ---

describe('scanPermissions', () => {
  it('detects tool definitions', () => {
    const ctx = createCtx([
      createFile(
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
    const ctx = createCtx([
      createFile(
        'src/db.ts',
        `const users = await prisma.user.findMany({ where: { active: true } });`,
      ),
    ]);

    const result = scanPermissions(ctx);

    expect(result.dataAccess.read).toContain('user');
  });

  it('detects database write access', () => {
    const ctx = createCtx([
      createFile(
        'src/orders.ts',
        `const order = await prisma.order.create({ data: { total: 100 } });`,
      ),
    ]);

    const result = scanPermissions(ctx);

    expect(result.dataAccess.write).toContain('order');
  });

  it('detects MCP servers from JSON', () => {
    const ctx = createCtx([
      createFile(
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
    const ctx = createCtx([
      createFile(
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
    const ctx = createCtx([
      createFile('README.md', '# My Project\nJust a readme.', '.md'),
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
