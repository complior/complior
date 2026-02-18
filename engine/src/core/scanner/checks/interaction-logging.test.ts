import { describe, it, expect } from 'vitest';
import { checkInteractionLogging } from './interaction-logging.js';
import type { ScanContext, FileInfo } from '../scanner.types.js';

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

const createFile = (relativePath: string, content: string, extension = '.ts'): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension,
  relativePath,
});

describe('checkInteractionLogging', () => {
  it('passes when structured logging with fields found', () => {
    const ctx = createCtx([
      createFile('src/logger.ts', `
        import pino from 'pino';
        const logger = pino();
        logger.info({ timestamp: Date.now(), session_id: sid, input, output });
      `),
    ]);

    const results = checkInteractionLogging(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].checkId).toBe('interaction-logging');
  });

  it('fails with critical severity when AI API calls exist without logging', () => {
    const ctx = createCtx([
      createFile('src/ai.ts', `
        import OpenAI from 'openai';
        const client = new OpenAI();
        const result = await client.chat.completions.create({ model: 'gpt-4' });
      `),
    ]);

    const results = checkInteractionLogging(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('critical');
      expect(results[0].obligationId).toBe('eu-ai-act-OBL-006');
      expect(results[0].articleReference).toBe('Art. 12');
    }
  });

  it('fails with high severity when logging exists but missing fields', () => {
    const ctx = createCtx([
      createFile('src/ai.ts', `
        import OpenAI from 'openai';
        const client = new OpenAI();
      `),
      createFile('src/logger.ts', `
        import winston from 'winston';
        const logger = winston.createLogger();
        logger.info('something happened');
      `),
    ]);

    const results = checkInteractionLogging(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('high');
    }
  });

  it('skips when no AI API calls detected', () => {
    const ctx = createCtx([
      createFile('src/app.ts', 'function hello() { return "world"; }'),
    ]);

    const results = checkInteractionLogging(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('skip');
  });

  it('detects Vercel AI SDK patterns', () => {
    const ctx = createCtx([
      createFile('src/chat.ts', `
        import { generateText } from 'ai';
        const result = await generateText({ model, prompt });
      `),
    ]);

    const results = checkInteractionLogging(ctx);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('fail');
  });

  it('passes with audit-log and request_id fields', () => {
    const ctx = createCtx([
      createFile('src/service.ts', `
        import { anthropic } from '@anthropic-ai/sdk';
        const auditLog = { request_id: uuid(), timestamp: now() };
      `),
    ]);

    const results = checkInteractionLogging(ctx);

    expect(results).toHaveLength(1);
    // Has both audit-log pattern and request_id field
    expect(results[0].type).toBe('pass');
  });
});
