import { describe, it, expect } from 'vitest';
import { createScanner } from './create-scanner.js';
import { createScanFile, createScanCtx } from '../../test-helpers/factories.js';

describe('createScanner', () => {
  it('returns a scanner with a scan method', () => {
    const scanner = createScanner();

    expect(scanner).toBeDefined();
    expect(typeof scanner.scan).toBe('function');
  });

  it('scans empty project and returns results', () => {
    const scanner = createScanner();
    const ctx = createScanCtx([]);

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
    const ctx = createScanCtx([
      createScanFile('src/app.ts', 'function main() {}'),
    ]);

    const result = scanner.scan(ctx);

    // Each check produces at least 1 finding
    expect(result.findings.length).toBeGreaterThanOrEqual(7);
  });

  it('detects compliance issues in a project with AI code but no compliance docs', () => {
    const scanner = createScanner();
    const ctx = createScanCtx([
      createScanFile('src/chat.tsx', `
        import OpenAI from 'openai';
        function ChatBot() {
          return <div>chatbot</div>;
        }
      `),
      createScanFile('package.json', '{"dependencies":{"openai":"^4.0.0"}}'),
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
    const ctx = createScanCtx([
      createScanFile('src/Chat.tsx', `
        <div>
          <p>This is an AI-powered assistant</p>
          <ChatWidget />
        </div>
      `),
      createScanFile('src/logger.ts', `
        import pino from 'pino';
        const logger = pino();
        function logInteraction(session_id, input, output) {
          logger.info({ timestamp: Date.now(), session_id, input, output });
        }
      `),
      createScanFile('COMPLIANCE.md', '# EU AI Act Compliance\nRisk assessment documentation'),
      createScanFile('AI-LITERACY.md', '# AI Literacy Policy'),
      createScanFile('.complior/config.json', '{"version":"1.0"}'),
      createScanFile('.well-known/ai-compliance.json', '{"compliant":true}'),
    ]);

    const result = scanner.scan(ctx);

    const passFindings = result.findings.filter((f) => f.type === 'pass');
    expect(passFindings.length).toBeGreaterThanOrEqual(5);
  });

  it('includes placeholder score breakdown', () => {
    const scanner = createScanner();
    const ctx = createScanCtx([]);

    const result = scanner.scan(ctx);

    expect(result.score.totalScore).toBeGreaterThanOrEqual(0);
    expect(['red', 'yellow']).toContain(result.score.zone);
    expect(result.score.totalChecks).toBe(result.findings.length);
  });

  it('counts pass/fail/skip correctly in score', () => {
    const scanner = createScanner();
    const ctx = createScanCtx([
      createScanFile('COMPLIANCE.md', '# Compliance Documentation'),
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
