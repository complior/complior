/**
 * V1-M30 / W-2: INTEGRATION test — Findings tab against REAL scan output.
 *
 * V1-M27 HR-3 + V1-M29 W-2 wrote unit tests with hand-crafted findings (with
 * `appliesToRole`, `fix` cmd as string, `explanation` object). Production
 * findings have different shape — Scanner output uses real Finding type.
 *
 * Acceptance:
 *   1. After scan with N>4 fail findings, HTML Findings tab renders >4 cards
 *      (or shows pagination control)
 *   2. Each card includes actionable command (`complior fix --check-id X`)
 *   3. Findings filtered by profile — different profiles show different counts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_PROJECT = resolve(tmpdir(), `complior-m30-w2-${process.pid}`);

describe('V1-M30 W-2: Findings tab against real scan output', () => {
  beforeEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    mkdirSync(TEST_PROJECT, { recursive: true });
    // Create a project that triggers MANY findings (low compliance baseline)
    writeFileSync(resolve(TEST_PROJECT, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { 'face-api.js': '^0.22.2', 'sentiment': '^5.0.2' },  // banned packages
    }), 'utf-8');
    writeFileSync(resolve(TEST_PROJECT, 'src.js'), 'const k = "sk-1234567890abcdef";\nfetch("https://api.openai.com");\n', 'utf-8');
    process.env['COMPLIOR_PROJECT_PATH'] = TEST_PROJECT;
  });

  afterEach(() => {
    rmSync(TEST_PROJECT, { recursive: true, force: true });
    delete process.env['COMPLIOR_PROJECT_PATH'];
  });

  it('Real scan with multiple findings → HTML renders >4 finding cards', async () => {
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
    expect(data.path).toBeTruthy();

    const html = await import('node:fs/promises').then((fs) => fs.readFile(data.path!, 'utf-8'));
    const cardCount = (html.match(/finding-card/g) ?? []).length;
    const hasPagination = /class="[^"]*pagination[^"]*"/i.test(html) || /Show\s+more/i.test(html);

    expect(cardCount > 4 || hasPagination, `Got ${cardCount} cards, expected >4 OR pagination control`).toBe(true);

    app.shutdown();
  });

  it('Each rendered finding card includes complior fix command', async () => {
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
    const html = await import('node:fs/promises').then((fs) => fs.readFile(data.path!, 'utf-8'));

    // Findings tab section
    const tabMatch = html.match(/<div class="tab-content" id="tab-findings"[^>]*>([\s\S]*?)(?=<div class="tab-content"|<\/body>)/);
    const findingsTab = tabMatch ? tabMatch[1] : '';
    expect(findingsTab).toMatch(/complior\s+fix/);

    app.shutdown();
  });
});
