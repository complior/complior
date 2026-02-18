import { describe, it, expect } from 'vitest';
import { createScanner } from './index.js';
import type { ScanContext, FileInfo } from './scanner.types.js';

const createFile = (relativePath: string, content: string, extension?: string): FileInfo => ({
  path: `/test/project/${relativePath}`,
  content,
  extension: extension ?? `.${relativePath.split('.').pop()}`,
  relativePath,
});

const createCtx = (files: readonly FileInfo[]): ScanContext => ({
  files,
  projectPath: '/test/project',
});

describe('createScanner', () => {
  it('returns a scanner with a scan method', () => {
    const scanner = createScanner();

    expect(scanner).toBeDefined();
    expect(typeof scanner.scan).toBe('function');
  });

  it('scans empty project and returns results', () => {
    const scanner = createScanner();
    const ctx = createCtx([]);

    const result = scanner.scan(ctx);

    expect(result.projectPath).toBe('/test/project');
    expect(result.filesScanned).toBe(0);
    expect(result.findings).toBeDefined();
    expect(result.scannedAt).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeDefined();
  });

  it('produces findings for each check', () => {
    const scanner = createScanner();
    const ctx = createCtx([
      createFile('src/app.ts', 'function main() {}'),
    ]);

    const result = scanner.scan(ctx);

    // Each check produces at least 1 finding
    expect(result.findings.length).toBeGreaterThanOrEqual(7);
  });

  it('detects compliance issues in a project with AI code but no compliance docs', () => {
    const scanner = createScanner();
    const ctx = createCtx([
      createFile('src/chat.tsx', `
        import OpenAI from 'openai';
        function ChatBot() {
          return <div>chatbot</div>;
        }
      `),
      createFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}', '.json'),
    ]);

    const result = scanner.scan(ctx);

    const failFindings = result.findings.filter((f) => f.type === 'fail');
    expect(failFindings.length).toBeGreaterThan(0);

    // Should fail for missing disclosure (chatbot without disclosure text)
    const disclosureFinding = result.findings.find((f) => f.checkId === 'ai-disclosure');
    expect(disclosureFinding?.type).toBe('fail');

    // Should fail for missing logging
    const loggingFinding = result.findings.find((f) => f.checkId === 'interaction-logging');
    expect(loggingFinding?.type).toBe('fail');

    // Should fail for missing documentation
    const docFinding = result.findings.find((f) => f.checkId === 'documentation');
    expect(docFinding?.type).toBe('fail');
  });

  it('passes checks for a well-documented project', () => {
    const scanner = createScanner();
    const ctx = createCtx([
      createFile('src/Chat.tsx', `
        <div>
          <p>This is an AI-powered assistant</p>
          <ChatWidget />
        </div>
      `),
      createFile('src/logger.ts', `
        import pino from 'pino';
        const logger = pino();
        function logInteraction(session_id, input, output) {
          logger.info({ timestamp: Date.now(), session_id, input, output });
        }
      `),
      createFile('COMPLIANCE.md', '# EU AI Act Compliance\nRisk assessment documentation'),
      createFile('AI-LITERACY.md', '# AI Literacy Policy'),
      createFile('.complior/config.json', '{"version":"1.0"}', '.json'),
      createFile('.well-known/ai-compliance.json', '{"compliant":true}', '.json'),
    ]);

    const result = scanner.scan(ctx);

    const passFindings = result.findings.filter((f) => f.type === 'pass');
    expect(passFindings.length).toBeGreaterThanOrEqual(5);
  });

  it('includes placeholder score breakdown', () => {
    const scanner = createScanner();
    const ctx = createCtx([]);

    const result = scanner.scan(ctx);

    expect(result.score.totalScore).toBe(0);
    expect(result.score.zone).toBe('red');
    expect(result.score.totalChecks).toBe(result.findings.length);
  });

  it('counts pass/fail/skip correctly in score', () => {
    const scanner = createScanner();
    const ctx = createCtx([
      createFile('COMPLIANCE.md', '# Compliance Documentation'),
    ]);

    const result = scanner.scan(ctx);

    const passes = result.findings.filter((f) => f.type === 'pass').length;
    const fails = result.findings.filter((f) => f.type === 'fail').length;
    const skips = result.findings.filter((f) => f.type === 'skip').length;

    expect(result.score.passedChecks).toBe(passes);
    expect(result.score.failedChecks).toBe(fails);
    expect(result.score.skippedChecks).toBe(skips);
    expect(result.score.totalChecks).toBe(passes + fails + skips);
  });
});
