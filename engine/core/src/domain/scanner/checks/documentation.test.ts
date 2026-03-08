import { describe, it, expect } from 'vitest';
import { checkDocumentation } from './documentation.js';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';

describe('checkDocumentation', () => {
  it('passes when COMPLIANCE.md exists', () => {
    const ctx = createScanCtx([
      createScanFile('COMPLIANCE.md', '# Compliance Documentation'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].checkId).toBe('documentation');
  });

  it('passes when .complior/ directory has files', () => {
    const ctx = createScanCtx([
      createScanFile('.complior/config.json', '{"version": "1.0"}'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('passes when docs/ contains compliance content', () => {
    const ctx = createScanCtx([
      createScanFile('docs/regulatory.md', 'This document covers EU AI Act compliance requirements'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('fails when no compliance documentation found', () => {
    const ctx = createScanCtx([
      createScanFile('README.md', '# My Project\nA simple web app'),
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
    const ctx = createScanCtx([
      createScanFile('docs/setup.md', '# Setup Guide\nRun npm install'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
  });

  it('detects case-insensitive compliance doc names', () => {
    const ctx = createScanCtx([
      createScanFile('compliance.md', '# compliance info'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });

  it('detects AI-COMPLIANCE named files', () => {
    const ctx = createScanCtx([
      createScanFile('AI-COMPLIANCE.md', '# AI Compliance'),
    ]);

    const results = checkDocumentation(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
  });
});
