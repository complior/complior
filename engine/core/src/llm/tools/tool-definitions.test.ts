import { describe, it, expect } from 'vitest';
import { createComplianceTools } from './compliance-tools.js';
import { createCodingTools } from './coding-tools.js';
import { createToolRegistry } from './index.js';

const mockDeps = {
  scan: async () => ({ score: 42 }),
  fix: async () => ({ applied: true }),
  getStatus: () => ({ score: 42 }),
  explain: async () => ({ article: 'Art. 50' }),
  searchTool: async () => ([]),
  classify: async () => ({ riskLevel: 'limited' }),
  report: async () => ({ report: 'test' }),
  getDeadlines: () => ([]),
  getMemory: () => null,
};

const mockCodingDeps = {
  createFile: async () => {},
  editFile: async () => {},
  readFile: async () => 'content',
  searchCode: async () => ([]),
  runCommand: async () => ({ stdout: '', exitCode: 0 }),
  gitOperation: async () => ({ status: 'ok' }),
  listFiles: async () => ([]),
};

const complianceTools = createComplianceTools(mockDeps);
const codingTools = createCodingTools(mockCodingDeps);
const registry = createToolRegistry(complianceTools, codingTools);

describe('Tool Registry', () => {
  it('registers all 23 tools', () => {
    expect(registry.getAllTools()).toHaveLength(23);
  });

  it('has 15 compliance tools', () => {
    const compliance = registry.getAllTools().filter((t) => t.category === 'compliance');
    expect(compliance).toHaveLength(15);
  });

  it('has 8 coding tools', () => {
    const coding = registry.getAllTools().filter((t) => t.category === 'coding');
    expect(coding).toHaveLength(8);
  });
});

describe('getToolsByMode', () => {
  it('build mode returns all 23', () => {
    expect(registry.getToolsByMode('build')).toHaveLength(23);
  });

  it('comply mode returns 17 (15 compliance + readFile + searchCode)', () => {
    const tools = registry.getToolsByMode('comply');
    expect(tools.length).toBe(17);
    expect(tools.some((t) => t.name === 'readFile')).toBe(true);
    expect(tools.some((t) => t.name === 'createFile')).toBe(false);
  });

  it('audit mode returns 6', () => {
    expect(registry.getToolsByMode('audit')).toHaveLength(6);
  });

  it('learn mode returns 4', () => {
    const tools = registry.getToolsByMode('learn');
    expect(tools).toHaveLength(4);
    expect(tools.every((t) => t.category === 'compliance')).toBe(true);
  });
});

describe('Tool execution', () => {
  it('compliance tool returns deterministic result', async () => {
    const tool = registry.getTool('scanProject')!;
    const result = JSON.parse(await tool.execute({ path: '.' }));
    expect(result.score).toBe(42);
  });

  it('each tool has Zod parameters', () => {
    for (const tool of registry.getAllTools()) {
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.safeParse).toBeDefined();
    }
  });
});
