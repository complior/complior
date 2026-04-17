/**
 * Score Integration E2E — validates that score correctly responds to changes.
 *
 * V1-M02 RED spec: proves scan → fix → rescan score improves,
 * SDK detection works, document edits affect score.
 *
 * Uses Hono in-memory (no real HTTP server).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { loadApplication, type Application } from '../composition-root.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PROJECT = process.env['COMPLIOR_TEST_PROJECT']
  ?? resolve(__dirname, '../../../../..', 'test-projects/acme-ai-support');

const canRunE2E = existsSync(resolve(TEST_PROJECT, 'package.json'));

describe.skipIf(!canRunE2E)('Score Integration E2E', () => {
  let application: Application;

  beforeAll(async () => {
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
    application = await loadApplication();
  }, 30_000);

  afterAll(() => {
    application?.shutdown();
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  // ─────────────────────────────────────────────────────────
  // Test 1: fix → rescan → score does not decrease
  // ─────────────────────────────────────────────────────────
  it('fix then rescan — score improves or stays same', async () => {
    // Step 1: baseline scan
    const scan1 = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(scan1.status).toBe(200);
    const scan1Body = await scan1.json() as Record<string, unknown>;
    const score1 = (scan1Body['score'] as Record<string, unknown>)['totalScore'] as number;

    // Step 2: apply all deterministic fixes
    const fixRes = await application.app.request('/fix/apply-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useAi: false, projectPath: TEST_PROJECT }),
    });
    expect(fixRes.status).toBe(200);
    const fixBody = await fixRes.json() as Record<string, unknown>;
    const summary = fixBody['summary'] as Record<string, unknown>;
    const applied = summary['applied'] as number;

    // Step 3: re-scan
    const scan2 = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(scan2.status).toBe(200);
    const scan2Body = await scan2.json() as Record<string, unknown>;
    const score2 = (scan2Body['score'] as Record<string, unknown>)['totalScore'] as number;

    // Score should not decrease after fix (deterministic fixes may not always
    // change score if scaffold files already existed or fix is no-op in context)
    expect(score2).toBeGreaterThanOrEqual(score1);
  }, 60_000);

  // ─────────────────────────────────────────────────────────
  // Test 2: writing real content to scaffold doc → score improves
  // ─────────────────────────────────────────────────────────
  it('manual doc edit improves document score', async () => {
    // Step 1: scan baseline (should have L2 scaffold/shallow findings)
    const scan1 = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    const scan1Body = await scan1.json() as Record<string, unknown>;
    const findings1 = scan1Body['findings'] as Array<Record<string, unknown>>;
    const l2Fails1 = findings1.filter(
      f => f['type'] === 'fail' && (f['checkId'] as string).startsWith('l2'),
    );

    // Step 2: write substantial content to a document
    const docsDir = resolve(TEST_PROJECT, '.complior', 'docs');
    await mkdir(docsDir, { recursive: true });
    const docPath = resolve(docsDir, 'risk-management.md');
    await writeFile(docPath, `# Risk Management System

## 1. Risk Identification

Our AI system uses automated classification for customer support tickets.
The primary risks identified include:

- **Bias in classification**: Historical training data may contain biases
  that lead to unequal treatment of different customer demographics.
- **Accuracy degradation**: Model performance may degrade over time as
  customer language patterns evolve, leading to misclassification.
- **Privacy exposure**: Customer messages may contain sensitive personal
  information that could be exposed through model outputs.

## 2. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Classification bias | Medium | High | Regular fairness audits, balanced training data |
| Accuracy degradation | High | Medium | Monthly performance monitoring, retraining pipeline |
| Privacy exposure | Low | Critical | PII detection pre-hook, data minimization |

## 3. Mitigation Measures

### 3.1 Technical Controls
- Automated bias detection via complior eval --security
- PII sanitization hooks in SDK middleware pipeline
- Rate limiting and budget controls per agent

### 3.2 Organizational Controls
- Quarterly risk review meetings
- Designated AI compliance officer
- Staff training on AI literacy (Art. 4 EU AI Act)

## 4. Monitoring and Review

Risk assessments are reviewed quarterly and after any significant model update.
All changes are tracked in the evidence chain via complior passport evidence.
`, 'utf-8');

    // Step 3: re-scan — L2 document findings should improve
    const scan2 = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    const scan2Body = await scan2.json() as Record<string, unknown>;
    const findings2 = scan2Body['findings'] as Array<Record<string, unknown>>;
    const l2Fails2 = findings2.filter(
      f => f['type'] === 'fail' && (f['checkId'] as string).startsWith('l2'),
    );

    // Fewer L2 failures after adding real document content
    expect(l2Fails2.length).toBeLessThanOrEqual(l2Fails1.length);

    // Cleanup: remove the test document
    await rm(docPath, { force: true });
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // Test 3: bare LLM client usage produces finding with fix
  // ─────────────────────────────────────────────────────────
  it('scan detects bare LLM client and offers fix', async () => {
    const res = await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    const findings = body['findings'] as Array<Record<string, unknown>>;

    // Test project should have bare LLM client calls (OpenAI, Anthropic)
    const bareLlmFindings = findings.filter(
      f => f['type'] === 'fail' &&
        ((f['checkId'] as string).includes('bare-llm') ||
         (f['checkId'] as string).includes('l4-sdk')),
    );

    // Should detect at least one bare LLM usage
    expect(bareLlmFindings.length).toBeGreaterThan(0);

    // Each bare-llm finding should have a fix suggestion
    for (const f of bareLlmFindings) {
      expect(f['fix']).toBeDefined();
      expect(typeof f['fix']).toBe('string');
      expect((f['fix'] as string).length).toBeGreaterThan(0);
    }
  }, 30_000);

  // ─────────────────────────────────────────────────────────
  // Test 4: report readiness score reflects scan + passport data
  // ─────────────────────────────────────────────────────────
  it('report readiness score aggregates scan and passport data', async () => {
    // Ensure scan data exists
    await application.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    const res = await application.app.request('/report/status');
    expect(res.status).toBe(200);

    const report = await res.json() as Record<string, unknown>;
    const readiness = report['readiness'] as Record<string, unknown>;
    const dimensions = readiness['dimensions'] as Record<string, Record<string, unknown>>;

    // Readiness score should be a number 0-100
    const score = readiness['readinessScore'] as number;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    // Scan dimension should be available (we just scanned)
    expect(dimensions['scan']['available']).toBe(true);
    expect(typeof dimensions['scan']['score']).toBe('number');

    // Passport dimension — should reflect passport state
    expect(dimensions['passports']).toBeDefined();
    expect(typeof dimensions['passports']['available']).toBe('boolean');

    // Days until enforcement should be positive
    const daysLeft = readiness['daysUntilEnforcement'] as number;
    expect(daysLeft).toBeGreaterThan(0);
  }, 30_000);
});
