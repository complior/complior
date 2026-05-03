/**
 * V1-M30.2 / HR-T1, HR-T4: INTEGRATION test — Tests tab + date humanization
 * against real production HTML output.
 *
 * Bug observed in /deep-e2e Profile C real report.html (2026-04-28):
 *   - Tests tab header: "Score (F): 0" while securityScore=96
 *   - Footer + multiple places render raw ISO timestamps like
 *     "2026-04-28T10:48:32.816Z" instead of human-readable dates.
 *
 * This integration test runs the real onboarding → scan → report pipeline
 * (V1-M30 INTEGRATION pattern, not mock-driven) and asserts the produced
 * HTML on disk.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-2-${process.pid}`);

describe('V1-M30.2: Tests tab + dates against real production HTML', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    writeFileSync(resolve(TEST_PROJECT, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('HR-T4: NO raw ISO datetime strings appear anywhere in the rendered HTML', async () => {
    const { loadApplication } = await import('../composition-root.js');
    const app = await loadApplication();

    await app.app.request('/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: {
          org_role: 'deployer', domain: 'general', data_types: ['public'],
          system_type: 'standalone', gpai_model: 'no', user_facing: 'yes',
          autonomous_decisions: 'no', biometric_data: 'no', company_size: 'sme',
        },
      }),
    });

    await app.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    const reportRes = await app.app.request('/report/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = (await reportRes.json()) as { path?: string };
    expect(data.path).toBeTruthy();

    const html = readFileSync(data.path!, 'utf-8');

    // ── HR-T4 Acceptance ──
    // No raw ISO datetime (with milliseconds + Z) like 2026-04-28T10:48:32.816Z
    expect(html, 'HTML must not contain raw ISO datetimes (use formatDateTimeHuman)')
      .not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/);

    // Footer must render the human "Generated: …" line with month name
    expect(html).toMatch(/Generated[:\s]*[A-Z][a-z]+\s+\d{1,2},\s+\d{4}/);

    app.shutdown();
  }, 30000);
});
