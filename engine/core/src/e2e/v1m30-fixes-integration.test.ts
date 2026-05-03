/**
 * V1-M30 / W-5: INTEGRATION test — Fixes tab renders REAL fix commands.
 *
 * V1-M27 HR-6 + V1-M29 W-2 wrote unit tests with `fix: 'complior fix --doc fria'`
 * field on findings. Production scan output uses different shape — `fix` field
 * may be a description string, not a command. Renderer must extract or generate
 * the command from `checkId`.
 *
 * Acceptance:
 *   1. After real scan with fixable findings, Fixes tab HTML contains ≥1
 *      `<code>complior fix [--check-id|...|--doc] X</code>` element
 *   2. Sections "Applied" + "Available/Recommended" both present
 *   3. If no fixable findings → shows "No fixes needed" message
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-w5-${process.pid}`);

describe('V1-M30 W-5: Fixes tab renders real commands', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    // Create project with multiple fixable issues (missing docs, banned deps)
    writeFileSync(resolve(TEST_PROJECT, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { 'face-api.js': '^0.22.2' },
    }), 'utf-8');
    writeFileSync(resolve(TEST_PROJECT, 'src.js'), 'fetch("https://api.openai.com");\n', 'utf-8');
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('Fixes tab contains ≥1 complior fix command from real scan', async () => {
    const { loadApplication } = await import('../composition-root.js');
    const app = await loadApplication();

    // Run real scan
    await app.app.request('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: TEST_PROJECT }),
    });

    // Generate HTML report
    const reportRes = await app.app.request('/report/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = (await reportRes.json()) as { path?: string };
    const html = readFileSync(data.path!, 'utf-8');

    // Extract fixes tab content
    const tabMatch = html.match(/<div class="tab-content" id="tab-fixes"[^>]*>([\s\S]*?)(?=<div class="tab-content"|<\/body>)/);
    const fixesTab = tabMatch ? tabMatch[1] : '';

    const cmdCount = (fixesTab.match(/<code[^>]*>complior\s+fix[^<]*<\/code>/g) ?? []).length;
    expect(cmdCount, `Fixes tab should have ≥1 complior fix code element, got ${cmdCount}`).toBeGreaterThanOrEqual(1);

    app.shutdown();
  }, 30000);

  it('Fixes tab contains both Applied + Available sections', async () => {
    const { loadApplication } = await import('../composition-root.js');
    const app = await loadApplication();

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
    const html = readFileSync(data.path!, 'utf-8');

    const tabMatch = html.match(/<div class="tab-content" id="tab-fixes"[^>]*>([\s\S]*?)(?=<div class="tab-content"|<\/body>)/);
    const fixesTab = tabMatch ? tabMatch[1] : '';

    expect(fixesTab).toMatch(/Applied|History/i);
    expect(fixesTab).toMatch(/Available|Recommended|Pending/i);

    app.shutdown();
  }, 30000);
});
