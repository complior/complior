import { describe, it, expect } from 'vitest';
import { checkDocumentation } from './documentation.js';
import type { ScanContext, FileInfo } from '../scanner.types.js';

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

const createFile = (relativePath: string, content: string, extension = '.md'): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension,
  relativePath,
});

describe('checkDocumentation', () => {
  it('passes when COMPLIANCE.md exists', () => {
    const ctx = createCtx([
      createFile('COMPLIANCE.md', '# Compliance Documentation'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].checkId).toBe('documentation');
  });

  it('passes when .complior/ directory has files', () => {
    const ctx = createCtx([
      createFile('.complior/config.json', '{"version": "1.0"}', '.json'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('passes when docs/ contains compliance content', () => {
    const ctx = createCtx([
      createFile('docs/regulatory.md', 'This document covers EU AI Act compliance requirements'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('fails when no compliance documentation found', () => {
    const ctx = createCtx([
      createFile('README.md', '# My Project\nA simple web app'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('medium');
      expect(results[0].obligationId).toBe('eu-ai-act-OBL-019');
      expect(results[0].fix).toBeDefined();
    }
  });

  it('fails when docs/ has unrelated content', () => {
    const ctx = createCtx([
      createFile('docs/setup.md', '# Setup Guide\nRun npm install'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
  });

  it('detects case-insensitive compliance doc names', () => {
    const ctx = createCtx([
      createFile('compliance.md', '# compliance info'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('detects AI-COMPLIANCE named files', () => {
    const ctx = createCtx([
      createFile('AI-COMPLIANCE.md', '# AI Compliance'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });
});
