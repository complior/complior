import { describe, it, expect } from 'vitest';
import { extractImports, isAiPackageImport, buildImportGraph } from './import-graph.js';
import type { FileInfo } from '../../ports/scanner.port.js';

const makeFile = (path: string, content: string): FileInfo => ({
  path: `/project/${path}`,
  relativePath: path,
  content,
  extension: '.' + (path.split('.').pop() ?? 'ts'),
});

describe('extractImports', () => {
  it('extracts ES import statements', () => {
    const content = `import { OpenAI } from 'openai';\nimport Anthropic from '@anthropic-ai/sdk';`;
    const imports = extractImports(content, '.ts');
    expect(imports).toContain('openai');
    expect(imports).toContain('@anthropic-ai/sdk');
  });

  it('extracts require statements', () => {
    const content = `const openai = require('openai');\nconst fs = require('fs');`;
    const imports = extractImports(content, '.js');
    expect(imports).toContain('openai');
    expect(imports).toContain('fs');
  });

  it('extracts relative imports', () => {
    const content = `import { client } from './llm-client.js';\nimport { config } from '../config.js';`;
    const imports = extractImports(content, '.ts');
    expect(imports).toContain('./llm-client.js');
    expect(imports).toContain('../config.js');
  });

  it('extracts Python imports', () => {
    const content = `import openai\nfrom anthropic import Anthropic\nimport os`;
    const imports = extractImports(content, '.py');
    expect(imports).toContain('openai');
    expect(imports).toContain('anthropic');
    expect(imports).toContain('os');
  });

  it('handles side-effect imports', () => {
    const content = `import 'reflect-metadata';`;
    const imports = extractImports(content, '.ts');
    expect(imports).toContain('reflect-metadata');
  });
});

describe('isAiPackageImport', () => {
  it('detects direct AI SDK packages', () => {
    expect(isAiPackageImport('openai')).toBe(true);
    expect(isAiPackageImport('@anthropic-ai/sdk')).toBe(true);
    expect(isAiPackageImport('@ai-sdk/openai')).toBe(true);
    expect(isAiPackageImport('langchain')).toBe(true);
  });

  it('detects scoped subpaths', () => {
    expect(isAiPackageImport('@ai-sdk/openai/chat')).toBe(true);
    expect(isAiPackageImport('@langchain/core/messages')).toBe(true);
  });

  it('detects Python AI packages', () => {
    expect(isAiPackageImport('openai')).toBe(true);
    expect(isAiPackageImport('anthropic')).toBe(true);
    expect(isAiPackageImport('transformers')).toBe(true);
    expect(isAiPackageImport('torch')).toBe(true);
  });

  it('rejects non-AI packages', () => {
    expect(isAiPackageImport('fs')).toBe(false);
    expect(isAiPackageImport('express')).toBe(false);
    expect(isAiPackageImport('react')).toBe(false);
    expect(isAiPackageImport('lodash')).toBe(false);
  });
});

describe('buildImportGraph', () => {
  it('detects direct AI SDK imports', () => {
    const files = [
      makeFile('src/llm.ts', `import { OpenAI } from 'openai';\nconst client = new OpenAI();`),
      makeFile('src/utils.ts', `export const helper = () => {};`),
    ];

    const graph = buildImportGraph(files);
    expect(graph.directAiFiles.has('src/llm.ts')).toBe(true);
    expect(graph.directAiFiles.has('src/utils.ts')).toBe(false);
    expect(graph.aiRelevantFiles.has('src/llm.ts')).toBe(true);
  });

  it('propagates AI relevance transitively', () => {
    const files = [
      makeFile('src/openai-client.ts', `import { OpenAI } from 'openai';\nexport const client = new OpenAI();`),
      makeFile('src/chat-service.ts', `import { client } from './openai-client.js';\nexport const chat = () => client.chat.completions.create({});`),
      makeFile('src/api.ts', `import { chat } from './chat-service.js';\nexport const handler = () => chat();`),
      makeFile('src/unrelated.ts', `import { readFile } from 'fs';\nexport const x = 1;`),
    ];

    const graph = buildImportGraph(files);

    // Direct
    expect(graph.directAiFiles.has('src/openai-client.ts')).toBe(true);

    // Transitive through imports
    expect(graph.aiRelevantFiles.has('src/chat-service.ts')).toBe(true);
    expect(graph.aiRelevantFiles.has('src/api.ts')).toBe(true);

    // Unrelated file should not be AI-relevant
    expect(graph.aiRelevantFiles.has('src/unrelated.ts')).toBe(false);
  });

  it('handles circular imports without infinite loop', () => {
    const files = [
      makeFile('src/a.ts', `import { b } from './b.js';\nimport { OpenAI } from 'openai';`),
      makeFile('src/b.ts', `import { a } from './a.js';\nexport const b = 1;`),
    ];

    const graph = buildImportGraph(files);
    expect(graph.aiRelevantFiles.has('src/a.ts')).toBe(true);
    expect(graph.aiRelevantFiles.has('src/b.ts')).toBe(true);
  });

  it('tracks AI relevance depth', () => {
    const files = [
      makeFile('src/llm.ts', `import { OpenAI } from 'openai';`),
      makeFile('src/service.ts', `import { x } from './llm.js';`),
      makeFile('src/handler.ts', `import { y } from './service.js';`),
    ];

    const graph = buildImportGraph(files);
    expect(graph.nodes.get('src/llm.ts')?.aiRelevanceDepth).toBe(0);
    expect(graph.nodes.get('src/service.ts')?.aiRelevanceDepth).toBe(1);
    expect(graph.nodes.get('src/handler.ts')?.aiRelevanceDepth).toBe(2);
  });

  it('returns non-AI-relevant files with depth -1', () => {
    const files = [
      makeFile('src/utils.ts', `export const add = (a: number, b: number) => a + b;`),
    ];

    const graph = buildImportGraph(files);
    const node = graph.nodes.get('src/utils.ts');
    expect(node?.isAiRelevant).toBe(false);
    expect(node?.aiRelevanceDepth).toBe(-1);
  });

  it('handles Python imports', () => {
    const files = [
      makeFile('src/llm.py', `import openai\nclient = openai.OpenAI()`),
      makeFile('src/utils.py', `def helper():\n    pass`),
    ];

    const graph = buildImportGraph(files);
    expect(graph.directAiFiles.has('src/llm.py')).toBe(true);
    expect(graph.directAiFiles.has('src/utils.py')).toBe(false);
  });

  it('handles empty file list', () => {
    const graph = buildImportGraph([]);
    expect(graph.nodes.size).toBe(0);
    expect(graph.aiRelevantFiles.size).toBe(0);
  });
});
